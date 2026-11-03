# 子域名接入自有服务器：配置规则（Cloudflare + 腾讯云主机）

适用场景：域名托管在 Cloudflare，手里有一台腾讯云大陆主机（未实名、域名未备案），要让「用户 → 我的子域名 → 中转 → 我的真实后端」跑通，且不暴露真实 IP、不限请求次数。

定版路线只有一条：**Cloudflare Tunnel（服务器本地 cloudflared 建隧道）**。其余路线全部实测阵亡，见文末「阵亡路线」。

链路：

```
用户 ──HTTPS──► CF 边缘 ──加密隧道──► cloudflared ──HTTP──► 本机 nginx:80
     (CF 证书)        (Tunnel 自带)        (服务器内部回环，不出机器)
```

域名与 IP 在公开文档里按惯例打码：子域名写作 `word.xxxxx.asia`，源站 IP 写作 `111.230.x.x`。实操版（含真实值）在工作区同目录脚本里，公开前必须先打码。

---

## 一、Cloudflare 侧规则

账号：域名所在账号（下称 CF 账号）。所有规则只对目标子域名生效，不动 zone 全局、不动其他子域名。

### 1. 前置：指向

- 域名的 NS 必须在注册商（腾讯云 / DNSPod）那边改指到 Cloudflare。指向不对，CF 里配什么都不生效。这一步在腾讯云侧完成，一次性。

### 2. DNS：由隧道自动生成，不手建 A 记录

- 隧道建好后由服务器端命令 `cloudflared tunnel route dns --overwrite-dns <隧道名> <子域名>` 自动生成 CNAME：`<子域名> → <隧道UUID>.cfargotunnel.com`（橙云代理）。
- 公开解析只能查到 CF 的 Anycast IP，真实 IP 不出现在任何记录里。
- 禁忌：不要手建 A 记录把子域名直指源站 IP（后果见阵亡路线 1、2）。

### 3. Worker 路由豁免（本 zone 特有，必做）

- 本 zone 有通配 Worker 路由 `*.xxxxx.asia/*` 指向 site-router。隧道子域名会被它截走，必须单独建一条更具体的路由 `<子域名>/*`，设置为「Workers 已在此路由上禁用」。
- 切换顺序：先等隧道在服务器端跑起来并切好 DNS，再摘这条路由到「禁用」，最后删掉一切临时 Worker。

### 4. HTTPS：边缘自动 + 单主机名强制跳转

- 用户侧 HTTPS 由 CF 的 Universal SSL 自动签发、自动续期，不用配。
- 回源最后一段是服务器内部回环 HTTP，不出机器，不需要为它配证书。
- 强制跳转用 Redirect Rules 单独建一条，仅对目标子域名生效：
  - 名称：`<子域名> - force https`
  - 条件：主机名等于该子域名，且请求协议为 http
  - 动作：动态重定向到 https，保留路径与查询参数，状态码 301
- 禁忌：不要打开 zone 级 Always Use HTTPS（全域开关，会波及其他子域名）。

### 5. CF 侧提示词模板（派给控制台操作时用）

模板一：隧道切换清理（服务器端隧道已就绪后用）

```
在 Cloudflare 控制台（域名所在账号，用已保存的登录自行完成登录并保持登录、不退出）
对 <根域名> 做最后的切换清理。背景：<子域名> 的流量已改走服务器上的
Cloudflare Tunnel（隧道 <隧道名> 已在运行，DNS 已由 cloudflared 配置为指向隧道），
但目前该子域名的请求仍被一条指向 <临时Worker名> 的 Worker 路由拦截。请精确执行：
1) Workers 路由：把 <子域名>/* 从指向 <临时Worker名> 改为「Workers 已在此路由上禁用」；
2) 删除临时 Worker 本体（删前确认没有其他路由还指向它）；
3) 删除仅对该子域名生效的临时 SSL 配置规则（如有）。
不要改动其他子域名的记录、路由或规则，不要动通配路由。
完成后打开 https://<子域名> 验证是目标应用，再打开一个静态资源路径验证 200，
如实回报现象与错误码。
```

模板二：argotunnel 授权（服务器端脚本停在 tunnel login 时用）

```
打开用户给的 Cloudflare argotunnel 授权链接（用户在服务器运行
cloudflared tunnel login 生成，交给我们完成授权）：
<授权链接原样>
1) 如需登录，用已保存的登录自行完成并保持登录状态；
2) 在授权页选择域名 <根域名> 并点击授权，完成回调；
3) 回报最终页面的成功提示原文或报错原文。只做这一个授权动作，
   不改动账号内任何其他设置、DNS、路由。
```

模板三：强制 HTTPS 跳转

```
在 Cloudflare 控制台（域名所在账号，自行登录并保持）给 <根域名> 加一条仅对
<子域名> 生效的 http→https 强制跳转规则，不要动其他子域名、不要开 zone 级
Always Use HTTPS：用 Redirect Rules 新建规则，名称「<子域名> - force https」，
条件为主机名等于 <子域名> 且请求协议为 http，动作是动态重定向到 https、
保留路径与查询参数、状态码 301。保存启用后回报，并实测 http 打开自动跳 https。
```

---

## 二、腾讯云主机侧规则

### 1. nginx

- 应用监听 80 端口即可：默认站点、任意 Host 都返回应用，隧道回源就走这个口。
- 443 不需要为本链路做任何事（回源不走 443）。只有将来想「IP/域名直连也走 HTTPS」时，才需要在 443 块里补 `server_name <子域名>;` 并配覆盖该子域名的证书（可用 CF 源站证书）。

### 2. cloudflared（一键脚本）

- 一键配置脚本：同目录 `word-tunnel-setup.sh`（工作版含真实域名与隧道信息，公开前打码）。在服务器上执行 `bash word-tunnel-setup.sh` 完成全部六步：安装 → 登录授权 → 建隧道 → 写配置 → 切 DNS → 装系统服务。脚本 v2 起支持迁移模式：检测到拷入的已有凭据时跳过授权与建隧道、直接复用，迁移步骤见第三节。
- 配置定版位置：`/etc/cloudflared/config.yml`，凭据与证书同目录。ingress 模板：

```yaml
tunnel: <隧道UUID>
credentials-file: /etc/cloudflared/<隧道UUID>.json
ingress:
  - hostname: <子域名>
    service: http://localhost:80
  - service: http_status:404
```

- 登录授权：`cloudflared tunnel login` 打印的 argotunnel 链接是一次性的，生成后尽快完成授权（可把链接发给助手代点，选根域名授权即可）。
- 服务常驻：`cloudflared` 注册为 systemd 服务，开机自启；查状态 `systemctl status cloudflared`。

### 3. 防火墙（建议项，未做前 IP 仍可直连）

- 隧道模式下 Web 流量不需要任何公网入站。在腾讯云安全组关掉 80/443 的公网入站（只留 SSH 等管理口），才算真正藏住源站：关掉后用真实 IP 直连打不开应用，只有域名经隧道能进。
- 本次 word 上线时该项未做（IP 直连 80 仍能打开应用），作为遗留建议留在这里，由机主决定。

---

## 三、迁移服务器（换 IP）

这套架构里**没有任何一处配置写了源站 IP**（DNS 是隧道 CNAME、CF 侧认的是隧道、回源是本机回环），所以换服务器、换 IP 时，域名、DNS、CF 侧全部零改动，迁移只发生在服务器之间：

1. 新服务器先把应用本体部署好（nginx 80 能在本机打开应用；应用文件和数据不在本手册范围内，单独 rsync 过去）
2. 把老服务器 `/etc/cloudflared/` 的三个文件拷到新服务器 `~/.cloudflared/`：`cert.pem`、`<隧道UUID>.json`、`config.yml`
3. 在新服务器跑一键脚本 `bash word-tunnel-setup.sh`：它识别到已有凭据后进入迁移模式，跳过授权和建隧道，只装服务并接管
4. 验证域名打开正常后，关掉老服务器的 cloudflared（`systemctl stop cloudflared`），迁移完成

零停机提示：新老两台同时跑同一个隧道凭据是允许的（CF 会把流量分给在线的连接器），所以可以先起新机、验完再关老机，切换无感。反过来，凭据文件就是这条隧道的命门，迁移时只走服务器间直传，不要发到聊天或网盘。

---

## 四、验收清单（每次接入/切换后逐项跑）

1. `curl https://<子域名>/` 返回 200，内容与源站 `curl http://<源站IP>/` 逐字节一致
2. 任一静态资源（如 `/routes.js`）返回 200
3. 公开 DNS 查询该子域名，只见 CF 的 IP，不见源站 IP
4. `curl http://<子域名>/` 返回 301 跳 https（强制跳转规则生效后）
5. 回归同 zone 其他子域名与主域名，全部 200

---

## 五、阵亡路线（实测结论，不要再试）

1. **橙云 A 记录直连大陆源站**：CF 侧配好后，访问被腾讯云 302 跳到备案拦截页（dnspod.qcloud.com 的 webblock）。拦截认的是「未备案域名 Host 落到大陆 IP」，与 80/443 端口无关，在 nginx 补 443 域名救不了。
2. **Worker 中转裸 IP 回源**：CF 直接报 error 1003，禁止 Worker 用裸 IP 做 fetch 回源。用域名回源又会撞第 1 条的备案拦截。
3. **Zero Trust 后台建隧道（token 方式）**：免费版开通页强制填支付卡 + 账单地址 + 勾选超额扣费授权。改走服务器本地 `cloudflared tunnel login` 授权建隧道，免绑卡、效果相同。
