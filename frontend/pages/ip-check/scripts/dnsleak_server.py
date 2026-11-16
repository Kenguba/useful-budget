#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dnsleak 权威 DNS 检测服务（ip-check 的 DNS 泄露检测后端）

原理（与 dnsleaktest / ip.net.coffee 同类）：本服务是 zone（默认 leak.jpedu.asia）
的权威 DNS。页面为每次检测生成随机令牌，让浏览器解析 t<令牌>-<序号>.<zone> 若干个
从未出现过的子域名；递归解析器必然回源到本服务查询，本服务由此记录下：
  - 来查询的解析器出口 IP（即访客真实的 DNS 出口）
  - 查询携带的 EDNS Client Subnet（ECS），若有
页面再按令牌调用结果接口取回记录，与出口 IP 对照判定是否泄露。

对外接口：
  - UDP/TCP 53（环境变量 DNS_PORT 可改）：权威应答 + 记录
  - HTTP 127.0.*.*:8053（环境变量 HTTP_PORT 可改，仅监听本机，由隧道/nginx 转发）：
      GET /result?token=<令牌>  -> {"token":..., "count":n, "queries":[{ip, ecs, qtype, age_s}]}
      GET /health                -> {"ok":true}

只用 Python 标准库。只应答本 zone，其余一律 REFUSED，避免被当成开放解析器滥用。
"""

import json
import os
import re
import socket
import struct
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socketserver import ThreadingUDPServer, ThreadingTCPServer, BaseRequestHandler
from urllib.parse import urlparse, parse_qs

ZONE = os.environ.get("DNSLEAK_ZONE", "leak.jpedu.asia").lower().rstrip(".")
BIND_IP = os.environ.get("DNS_BIND", "0.0.*.*")  # 部署时绑公网 IP，避开本机 127.0.*.* 存根的 TCP 监听冲突
ANSWER_IP = os.environ.get("DNSLEAK_A", "127.0.*.*")
DNS_PORT = int(os.environ.get("DNS_PORT", "53"))
HTTP_PORT = int(os.environ.get("HTTP_PORT", "8053"))
KEEP_SECONDS = 600  # 令牌记录保留时长

TOKEN_RE = re.compile(r"^t([a-z0-9]{10,24})-(\d{1,2})$")

_lock = threading.Lock()
_log = {}  # token -> {"created": ts, "queries": [ {ip, ecs, qtype, ts} ]}


# ---------- DNS 报文解析 ----------

def parse_name(msg, off):
    """解析域名（含压缩指针），返回 (name, next_offset)。"""
    labels = []
    jumped = False
    next_off = off
    seen = 0
    while True:
        if off >= len(msg):
            raise ValueError("name out of range")
        ln = msg[off]
        if ln == 0:
            if not jumped:
                next_off = off + 1
            break
        if ln & 0xC0 == 0xC0:
            if off + 1 >= len(msg):
                raise ValueError("bad pointer")
            ptr = ((ln & 0x3F) << 8) | msg[off + 1]
            if not jumped:
                next_off = off + 2
            off = ptr
            jumped = True
            seen += 1
            if seen > 10:
                raise ValueError("pointer loop")
            continue
        off += 1
        labels.append(msg[off:off + ln].decode("ascii", "replace"))
        off += ln
    return ".".join(labels), next_off


def parse_ecs_from_opt(rdata):
    """从 OPT 的 rdata 里取 ECS（option code 8），返回如 '1.2.*.*/24' 或 None。"""
    i = 0
    while i + 4 <= len(rdata):
        code, ln = struct.unpack(">HH", rdata[i:i + 4])
        data = rdata[i + 4:i + 4 + ln]
        if code == 8 and len(data) >= 4:
            family, src, _scope = struct.unpack(">HBB", data[:4])
            addr = data[4:]
            try:
                if family == 1:
                    full = (addr + b"\x00" * 4)[:4]
                    return "%s/%d" % (socket.inet_ntoa(full), src)
                if family == 2:
                    full = (addr + b"\x00" * 16)[:16]
                    return "%s/%d" % (socket.inet_ntop(socket.AF_INET6, full), src)
            except Exception:
                return None
        i += 4 + ln
    return None


def extract_ecs(msg, arcount, off):
    """从 additional 段找 OPT 记录并取 ECS。off 为 question 段结束偏移。"""
    try:
        for _ in range(arcount):
            _name, off = parse_name(msg, off)
            if off + 10 > len(msg):
                return None
            rtype, _rclass, _ttl, rdlen = struct.unpack(">HHIH", msg[off:off + 10])
            rdata = msg[off + 10:off + 10 + rdlen]
            if rtype == 41:
                return parse_ecs_from_opt(rdata)
            off += 10 + rdlen
    except Exception:
        return None
    return None


# ---------- 记录 ----------

def record_query(qname_l, resolver_ip, ecs, qtype):
    first = qname_l.split(".")[0]
    m = TOKEN_RE.match(first)
    if not m:
        return
    token = m.group(1)
    now = time.time()
    with _lock:
        ent = _log.get(token)
        if ent is None:
            ent = _log[token] = {"created": now, "queries": []}
        ent["queries"].append({"ip": resolver_ip, "ecs": ecs, "qtype": qtype, "ts": now})
        # 顺手清理过期令牌
        dead = [k for k, v in _log.items() if now - v["created"] > KEEP_SECONDS]
        for k in dead:
            _log.pop(k, None)


# ---------- 应答构造 ----------

def build_response(query, qname_l, qtype, qclass, question_bytes, rd_flag):
    tid = query[0:2]
    in_zone = qname_l == ZONE or qname_l.endswith("." + ZONE)
    rcode = 0
    answers = b""
    ancount = 0
    if not in_zone:
        rcode = 5  # REFUSED
    elif qtype == 1:  # A
        answers = b"\xc0\x0c" + struct.pack(">HHIH", 1, 1, 60, 4) + socket.inet_aton(ANSWER_IP)
        ancount = 1
    elif qtype == 2 and qname_l == ZONE:  # NS @ apex
        nsname = "ns1." + ZONE
        rdata = b"".join(bytes([len(p)]) + p.encode() for p in nsname.split(".")) + b"\x00"
        answers = b"\xc0\x0c" + struct.pack(">HHIH", 2, 1, 3600, len(rdata)) + rdata
        ancount = 1
    elif qtype == 6 and qname_l == ZONE:  # SOA @ apex
        nsname = ("ns1." + ZONE).split(".")
        mbox = ("hostmaster." + ZONE).split(".")
        enc = lambda parts: b"".join(bytes([len(p)]) + p.encode() for p in parts) + b"\x00"
        rdata = enc(nsname) + enc(mbox) + struct.pack(">IIIII", 1, 7200, 3600, 1209600, 3600)
        answers = b"\xc0\x0c" + struct.pack(">HHIH", 6, 1, 3600, len(rdata)) + rdata
        ancount = 1
    # 其余类型（AAAA 等）回 NOERROR 无记录（NODATA）
    flags = 0x8400 | (0x0100 if rd_flag else 0) | rcode  # QR=1 AA=1
    header = tid + struct.pack(">HHHHH", flags, 1, ancount, 0, 0)
    return header + question_bytes + answers


def handle_dns_packet(data, resolver_ip):
    if len(data) < 12:
        return None
    _tid, flags, qd, _an, _ns, ar = struct.unpack(">HHHHHH", data[:12])
    if qd != 1:
        return None
    try:
        qname, off = parse_name(data, 12)
        if off + 4 > len(data):
            return None
        qtype, qclass = struct.unpack(">HH", data[off:off + 4])
        question_bytes = data[12:off + 4]
        ecs = extract_ecs(data, ar, off + 4)
    except Exception:
        return None
    qname_l = qname.lower()
    if qname_l == ZONE or qname_l.endswith("." + ZONE):
        record_query(qname_l, resolver_ip, ecs, qtype)
    return build_response(data, qname_l, qtype, qclass, question_bytes, bool(flags & 0x0100))


# ---------- 网络服务 ----------

class UDPHandler(BaseRequestHandler):
    def handle(self):
        data, sock = self.request
        resp = handle_dns_packet(data, self.client_address[0])
        if resp:
            sock.sendto(resp, self.client_address)


class TCPHandler(BaseRequestHandler):
    def handle(self):
        while True:
            hdr = self.request.recv(2)
            if len(hdr) < 2:
                return
            (ln,) = struct.unpack(">H", hdr)
            data = b""
            while len(data) < ln:
                chunk = self.request.recv(ln - len(data))
                if not chunk:
                    return
                data += chunk
            resp = handle_dns_packet(data, self.client_address[0])
            if resp:
                self.request.sendall(struct.pack(">H", len(resp)) + resp)


class ResultHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/health", "/dnsleak/health"):
            body = {"ok": True}
        elif u.path in ("/result", "/dnsleak/result"):
            token = (parse_qs(u.query).get("token") or [""])[0].lower()
            now = time.time()
            with _lock:
                ent = _log.get(token)
                qs = list(ent["queries"]) if ent else []
            body = {
                "token": token,
                "count": len(qs),
                "queries": [
                    {"ip": q["ip"], "ecs": q["ecs"], "qtype": q["qtype"],
                     "age_s": round(now - q["ts"], 1)}
                    for q in qs
                ],
            }
        else:
            self.send_response(404)
            self.end_headers()
            return
        raw = json.dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def main():
    # 与本机 systemd-resolved 的 127.0.*.* 存根共存：SO_REUSEADDR 下通配绑定可成功，
    # 发往 127.0.*.* 的本机解析仍归存根，外网查询落到本服务
    ThreadingUDPServer.allow_reuse_address = True
    ThreadingTCPServer.allow_reuse_address = True
    udp = ThreadingUDPServer((BIND_IP, DNS_PORT), UDPHandler)
    tcp = ThreadingTCPServer((BIND_IP, DNS_PORT), TCPHandler)
    http = ThreadingHTTPServer(("127.0.*.*", HTTP_PORT), ResultHandler)
    for srv in (udp, tcp, http):
        threading.Thread(target=srv.serve_forever, daemon=True).start()
    print("dnsleak up: zone=%s dns_port=%d http_port=%d answer=%s" % (ZONE, DNS_PORT, HTTP_PORT, ANSWER_IP), flush=True)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
