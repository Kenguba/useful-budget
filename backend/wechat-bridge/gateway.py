#!/usr/bin/env python3
"""Standalone WeChat ClawBot (iLink) gateway for Muse.

Implements the protocol from Tencent/openclaw-weixin (docs/protocol_zh_CN.md):
- QR login: POST /ilink/bot/get_bot_qrcode?bot_type=3, GET /ilink/bot/get_qrcode_status
- Long-poll receive: POST /ilink/bot/getupdates
- Send: POST /ilink/bot/sendmessage

Messages land in inbox.jsonl; replies are taken from outbox/*.json files.
Credentials live in creds.json (mode 600) and are never printed.
"""
import argparse
import base64
import json
import os
import random
import sys
import time

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDS_PATH = os.path.join(BASE_DIR, "creds.json")
STATE_PATH = os.path.join(BASE_DIR, "state.json")
INBOX_PATH = os.path.join(BASE_DIR, "inbox.jsonl")
OUTBOX_DIR = os.path.join(BASE_DIR, "outbox")
SENT_DIR = os.path.join(BASE_DIR, "sent")
MEDIA_DIR = os.path.join(BASE_DIR, "media")
LOG_PATH = os.path.join(BASE_DIR, "gateway.log")
CDN_BASE = "https://novac2c.cdn.weixin.qq.com/c2c"
MAX_MEDIA_BYTES = 25 * 1024 * 1024

FIXED_BASE = "https://ilinkai.weixin.qq.com"
CHANNEL_VERSION = "2.4.10"
BOT_AGENT = "Muse/1.0"
APP_ID = "bot"
_maj, _min, _pat = (int(x) for x in CHANNEL_VERSION.split("."))
CLIENT_VERSION = str((_maj << 16) | (_min << 8) | _pat)


def log(msg):
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def rand_uin():
    return base64.b64encode(str(random.getrandbits(32)).encode()).decode()


def common_headers():
    return {"iLink-App-Id": APP_ID, "iLink-App-ClientVersion": CLIENT_VERSION}


def post_headers(token=None):
    h = {
        "Content-Type": "application/json",
        "AuthorizationType": "ilink_bot_token",
        "X-WECHAT-UIN": rand_uin(),
    }
    h.update(common_headers())
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def base_info():
    return {"channel_version": CHANNEL_VERSION, "bot_agent": BOT_AGENT}


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_json(path, data, mode=None):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    if mode is not None:
        os.chmod(tmp, mode)
    os.replace(tmp, path)


def api_post(base, endpoint, body, token=None, timeout=40):
    r = requests.post(
        base.rstrip("/") + "/" + endpoint,
        headers=post_headers(token),
        json=body,
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json()


# ---------------- login ----------------

def fetch_qrcode(base):
    last = None
    for attempt in range(3):
        try:
            return api_post(
                base,
                "ilink/bot/get_bot_qrcode?bot_type=3",
                {"local_token_list": []},
                timeout=30,
            )
        except requests.RequestException as e:
            last = e
            log(f"get_bot_qrcode attempt {attempt + 1} failed: {e}")
            time.sleep(2)
    raise last


def poll_status(base, qrcode, verify_code=None):
    url = base.rstrip("/") + "/ilink/bot/get_qrcode_status"
    params = {"qrcode": qrcode}
    if verify_code:
        params["verify_code"] = verify_code
    try:
        r = requests.get(url, headers=common_headers(), params=params, timeout=35)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        log(f"poll status network error (treated as wait): {e}")
        return {"status": "wait"}


def cmd_login(_args):
    base = FIXED_BASE
    resp = fetch_qrcode(base)
    qrcode = resp.get("qrcode")
    img_content = resp.get("qrcode_img_content")
    if not qrcode:
        log(f"get_bot_qrcode unexpected response keys: {list(resp.keys())}")
        return 1
    save_json(os.path.join(BASE_DIR, "qr.json"), {"qrcode": qrcode, "img_content": img_content})
    # Render a scannable PNG from the img content (it is the URL/content to encode).
    try:
        import qrcode as qr_lib

        img = qr_lib.make(img_content)
        img.save(os.path.join(BASE_DIR, "qr.png"))
    except ImportError:
        log("python qrcode lib missing; qr.png not generated")
    log("QR_READY")
    deadline = time.time() + 280
    verify_code = None
    while time.time() < deadline:
        st = poll_status(base, qrcode, verify_code)
        verify_code = None
        status = st.get("status")
        log(f"qr status: {status}")
        if status == "confirmed":
            creds = {
                "bot_token": st.get("bot_token"),
                "ilink_bot_id": st.get("ilink_bot_id"),
                "baseurl": st.get("baseurl") or base,
                "ilink_user_id": st.get("ilink_user_id"),
            }
            if not creds["bot_token"]:
                log("confirmed but no bot_token in response")
                return 1
            save_json(CREDS_PATH, creds, mode=0o600)
            log("LOGIN_OK")
            return 0
        if status == "scaned_but_redirect" and st.get("redirect_host"):
            base = "https://" + st["redirect_host"]
            log(f"redirect to {base}")
            continue
        if status == "binded_redirect":
            log("ALREADY_BOUND")
            return 0
        if status == "need_verifycode":
            code_file = os.path.join(BASE_DIR, "verify_code.txt")
            log("NEED_VERIFYCODE: waiting for verify_code.txt")
            for _ in range(60):
                if os.path.exists(code_file):
                    with open(code_file, encoding="utf-8") as f:
                        verify_code = f.read().strip()
                    os.remove(code_file)
                    break
                time.sleep(2)
            if not verify_code:
                log("verify code timeout")
                return 1
            continue
        if status in ("expired", "verify_code_blocked"):
            log(f"LOGIN_FAILED: {status}")
            return 1
        time.sleep(1)
    log("LOGIN_FAILED: timeout")
    return 1


# ---------------- messaging ----------------

def send_text(creds, to_user_id, text, context_token=None):
    msg = {
        "from_user_id": "",
        "to_user_id": to_user_id,
        "client_id": f"muse-{int(time.time()*1000)}-{random.getrandbits(24):x}",
        "message_type": 2,
        "message_state": 2,
        "item_list": [{"type": 1, "text_item": {"text": text}}],
    }
    if context_token:
        msg["context_token"] = context_token
    resp = api_post(
        creds.get("baseurl") or FIXED_BASE,
        "ilink/bot/sendmessage",
        {"msg": msg, "base_info": base_info()},
        token=creds["bot_token"],
        timeout=20,
    )
    if resp.get("ret") not in (0, None):
        raise RuntimeError(f"sendmessage ret={resp.get('ret')} errmsg={resp.get('errmsg')}")
    return resp


def _parse_aes_key(aes_key_b64):
    """CDNMedia.aes_key: base64 of raw 16 bytes, or base64 of a 32-char hex string."""
    decoded = base64.b64decode(aes_key_b64)
    if len(decoded) == 16:
        return decoded
    if len(decoded) == 32:
        try:
            return bytes.fromhex(decoded.decode("ascii"))
        except (ValueError, UnicodeDecodeError):
            pass
    raise ValueError(f"bad aes_key length {len(decoded)}")


def _aes_ecb_decrypt(data, key):
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    dec = Cipher(algorithms.AES(key), modes.ECB()).decryptor()
    plain = dec.update(data) + dec.finalize()
    if plain:
        pad = plain[-1]
        if 1 <= pad <= 16 and plain[-pad:] == bytes([pad]) * pad:
            plain = plain[:-pad]
    return plain


def _sniff_ext(data, default):
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    if data[4:8] == b"ftyp":
        return ".mp4"
    return default


def download_item_media(item, message_id, idx):
    """Download + decrypt one media item; returns saved path or None."""
    t = item.get("type")
    sub_key = {2: "image_item", 3: "voice_item", 4: "file_item", 5: "video_item"}.get(t)
    if not sub_key:
        return None
    sub = item.get(sub_key) or {}
    media = sub.get("media") or {}
    full_url = media.get("full_url")
    eqp = media.get("encrypt_query_param")
    if not full_url and not eqp:
        return None
    key = None
    if t == 2 and sub.get("aeskey"):
        try:
            key = bytes.fromhex(sub["aeskey"])
        except ValueError:
            key = None
    if key is None and media.get("aes_key"):
        try:
            key = _parse_aes_key(media["aes_key"])
        except Exception as e:
            log(f"media key parse failed msg={message_id}: {e}")
            return None
    try:
        if full_url:
            resp = requests.get(full_url, timeout=30)
        else:
            resp = requests.get(CDN_BASE + "/download",
                                params={"encrypted_query_param": eqp}, timeout=30)
        resp.raise_for_status()
        data = resp.content
    except requests.RequestException as e:
        log(f"media download failed msg={message_id}: {e}")
        return None
    if len(data) > MAX_MEDIA_BYTES:
        log(f"media too large msg={message_id}: {len(data)} bytes")
        return None
    if key:
        try:
            data = _aes_ecb_decrypt(data, key)
        except Exception as e:
            log(f"media decrypt failed msg={message_id}: {e}")
            return None
    default_ext = {2: ".jpg", 3: ".silk", 5: ".mp4"}.get(t, ".bin")
    name_hint = sub.get("file_name") or ""
    if t == 4 and "." in name_hint:
        ext = "." + name_hint.rsplit(".", 1)[-1].lower()
    else:
        ext = _sniff_ext(data, default_ext)
    os.makedirs(MEDIA_DIR, exist_ok=True)
    path = os.path.join(MEDIA_DIR, f"{message_id}_{idx}{ext}")
    with open(path, "wb") as f:
        f.write(data)
    log(f"media saved msg={message_id}: {path} ({len(data)} bytes)")
    return path


def extract_media(msg):
    paths = []
    for idx, item in enumerate(msg.get("item_list") or []):
        if item.get("type") in (2, 3, 4, 5):
            p = download_item_media(item, msg.get("message_id"), idx)
            if p:
                paths.append(p)
    return paths


def extract_text(msg):
    parts = []
    for item in msg.get("item_list") or []:
        t = item.get("type")
        if t == 1:
            parts.append((item.get("text_item") or {}).get("text", ""))
        elif t == 3:
            vt = (item.get("voice_item") or {}).get("text")
            parts.append(vt if vt else "[语音]")
        elif t == 2:
            parts.append("[图片]")
        elif t == 4:
            name = (item.get("file_item") or {}).get("file_name", "")
            parts.append(f"[文件 {name}]".rstrip())
        elif t == 5:
            parts.append("[视频]")
    return "\n".join(p for p in parts if p)


def cmd_run(_args):
    creds = load_json(CREDS_PATH, None)
    if not creds or not creds.get("bot_token"):
        log("no credentials; run login first")
        return 1
    os.makedirs(OUTBOX_DIR, exist_ok=True)
    os.makedirs(SENT_DIR, exist_ok=True)
    base = creds.get("baseurl") or FIXED_BASE
    try:
        api_post(base, "ilink/bot/msg/notifystart", {"base_info": base_info()},
                 token=creds["bot_token"], timeout=10)
    except requests.RequestException as e:
        log(f"notifystart failed (continuing): {e}")
    state = load_json(STATE_PATH, {})
    buf = state.get("get_updates_buf", "")
    log("gateway running")
    backoff = 2
    while True:
        # flush outbox first so replies go out promptly
        try:
            for name in sorted(os.listdir(OUTBOX_DIR)):
                if not name.endswith(".json"):
                    continue
                path = os.path.join(OUTBOX_DIR, name)
                try:
                    job = load_json(path, None)
                    if job:
                        send_text(creds, job["to_user_id"], job["text"],
                                  job.get("context_token"))
                        log(f"sent outbox {name}")
                    os.replace(path, os.path.join(SENT_DIR, name))
                except Exception as e:  # keep file for retry, but avoid hot loop
                    log(f"outbox {name} send failed: {e}")
                    time.sleep(2)
        except OSError as e:
            log(f"outbox scan failed: {e}")
        try:
            resp = api_post(base, "ilink/bot/getupdates",
                            {"get_updates_buf": buf, "base_info": base_info()},
                            token=creds["bot_token"], timeout=40)
        except requests.RequestException as e:
            log(f"getupdates network error: {e}; backoff {backoff}s")
            time.sleep(backoff)
            backoff = min(backoff * 2, 30)
            continue
        backoff = 2
        ret = resp.get("ret", 0)
        errcode = resp.get("errcode", 0)
        if ret not in (0, None) or errcode not in (0, None):
            if ret == -14 or errcode == -14:
                log("SESSION_EXPIRED (-14): login no longer valid, stopping")
                return 2
            log(f"getupdates ret={ret} errcode={errcode} errmsg={resp.get('errmsg')}")
            time.sleep(3)
            continue
        if resp.get("get_updates_buf"):
            buf = resp["get_updates_buf"]
            save_json(STATE_PATH, {"get_updates_buf": buf})
        for msg in resp.get("msgs") or []:
            if msg.get("message_type") != 1:
                continue
            record = {
                "ts": int(time.time()),
                "message_id": msg.get("message_id"),
                "from_user_id": msg.get("from_user_id"),
                "context_token": msg.get("context_token"),
                "text": extract_text(msg),
                "raw_item_types": [i.get("type") for i in msg.get("item_list") or []],
                "media_paths": extract_media(msg),
            }
            with open(INBOX_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
            log(f"inbox: new message id={record['message_id']}")


def cmd_send(args):
    creds = load_json(CREDS_PATH, None)
    if not creds:
        log("no credentials")
        return 1
    os.makedirs(OUTBOX_DIR, exist_ok=True)
    job = {"to_user_id": args.to, "text": args.text}
    if args.context_token:
        job["context_token"] = args.context_token
    name = f"{int(time.time()*1000)}.json"
    save_json(os.path.join(OUTBOX_DIR, name), job)
    log(f"queued {name}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("login")
    sub.add_parser("run")
    s = sub.add_parser("send")
    s.add_argument("--to", required=True)
    s.add_argument("--text", required=True)
    s.add_argument("--context-token")
    args = ap.parse_args()
    if args.cmd == "login":
        return cmd_login(args)
    if args.cmd == "run":
        return cmd_run(args)
    if args.cmd == "send":
        return cmd_send(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
