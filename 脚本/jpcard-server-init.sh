#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# jpcard 服务器初始化 + 用户/组权限 + GitHub SSH + 仓库拉取
# 完整版：主组 / 附加组关系清晰版
# ============================================================
#
# 设计：
#
# grp_employees ← 员工公共组
# ├── deployer ← 主组：grp_employees
# ├── frontend ← 以后可设主组：grp_employees
# ├── backend ← 以后可设主组：grp_employees
# └── ops ← 以后可设主组：grp_employees
#
# grp_deploy
# └── deployer ← deployer 的附加组
#
# grp_frontend
# └── frontend ← 前端用户的附加组（本脚本只创建组，不创建该用户）
#
# grp_backend
# └── backend ← 后端用户的附加组（本脚本只创建组，不创建该用户）
#
# grp_ops
# └── ops ← 运维用户的附加组（本脚本只创建组，不创建该用户）
#
# Linux 中：
# -g = 设置主组
# -aG = 添加附加组
#
# 主要规则：
# 1. 只有 root 才创建/修改系统用户和组。
# 2. 非 root：
# - 不执行 groupadd / useradd / usermod / passwd / apt-get
# - 不尝试 sudo
# - 仅继续执行当前用户有权限完成的 Git / SSH 操作
# 3. 所有修改操作执行前显示完整命令。
# 4. 只有输入小写 y 才执行。
# Enter / 空格 / Y / n / yes 等都不执行。
# 5. 已存在/已配置项目使用红色提示。
# 6. GitHub 使用 SSH，不保存 GitHub PAT/API Key。
# ============================================================


# ============================================================
# 一、变量配置区
# ============================================================

# ---------- Linux 用户 ----------
DEPLOY_USER="deployer"

# ---------- 主组 ----------
# deployer 的主组
EMPLOYEE_GROUP="grp_employees"

# ---------- 附加组 ----------
DEPLOY_GROUP="grp_deploy"

# 预留的角色组
FRONTEND_GROUP="grp_frontend"
BACKEND_GROUP="grp_backend"
OPS_GROUP="grp_ops"

# ---------- GitHub / Git ----------
GITHUB_USER="Kenguba"
GIT_NAME="Kenguba"
GIT_EMAIL="ken***@gmail.com"

# ---------- 仓库 ----------
REPO_NAME="jpcard"
REPO_URL="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"

# ---------- SSH ----------
SSH_KEY_NAME="id_rsa"


# ============================================================
# 二、颜色
# ============================================================

RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
CYAN='\033[1;36m'
BLUE='\033[1;34m'
NC='\033[0m'


# ============================================================
# 三、通用函数
# ============================================================

section() {
echo
echo "============================================================"
echo "$1"
echo "============================================================"
}

info() {
printf '%b[INFO]%b %s\n' "$BLUE" "$NC" "$1"
}

ok() {
printf '%b[完成]%b %s\n' "$GREEN" "$NC" "$1"
}

warn() {
printf '%b[提示]%b %s\n' "$YELLOW" "$NC" "$1"
}

exists_red() {
printf '%b[已存在]%b %s\n' "$RED" "$NC" "$1"
}

not_configured_red() {
printf '%b[未配置]%b %s\n' "$RED" "$NC" "$1"
}

fail() {
printf '%b[错误]%b %s\n' "$RED" "$NC" "$1" >&2
}

show_cmd() {
printf '%b%s%b\n' "$CYAN" "$1" "$NC"
}

# 只有严格输入小写 y 才返回成功
confirm_y() {
local prompt="$1"
local answer=""

printf "%s" "$prompt"
IFS= read -r answer

[ "$answer" = "y" ]
}


# ============================================================
# 四、判断当前是否 root
# ============================================================

section "0. 权限检查"

CURRENT_USER="$(id -un)"
CURRENT_UID="$(id -u)"

if [ "$CURRENT_UID" -eq 0 ]; then
IS_ROOT=true
ok "当前用户：root，可以执行系统级配置。"
else
IS_ROOT=false

printf '%b[非 ROOT]%b 当前用户：%s\n' "$RED" "$NC" "$CURRENT_USER"
echo
warn "当前不是 root，系统级用户/组操作全部跳过。"
echo
echo "不会执行："
echo " groupadd"
echo " useradd"
echo " usermod"
echo " passwd"
echo " apt-get install"
echo " 修改其他用户目录所有权"
fi


# ============================================================
# 五、root：检查 / 创建组
# ============================================================

section "1. 检查 Linux 用户组"

GROUPS_TO_ENSURE=(
"$EMPLOYEE_GROUP"
"$DEPLOY_GROUP"
"$FRONTEND_GROUP"
"$BACKEND_GROUP"
"$OPS_GROUP"
)

for GROUP_NAME in "${GROUPS_TO_ENSURE[@]}"; do

CREATE_CMD="groupadd ${GROUP_NAME}"

echo
echo "检查组：$GROUP_NAME"

if getent group "$GROUP_NAME" >/dev/null 2>&1; then

exists_red "用户组 ${GROUP_NAME} 已经存在。"
echo "对应创建命令："
show_cmd "$CREATE_CMD"
warn "不会重复执行。"

else

not_configured_red "用户组 ${GROUP_NAME} 尚未创建。"
echo "准备执行："
show_cmd "$CREATE_CMD"

if [ "$IS_ROOT" = false ]; then

warn "当前不是 root，跳过创建 ${GROUP_NAME}。"

else

if confirm_y "是否创建 ${GROUP_NAME}？只有输入 y 才执行 [y/N]: "; then
groupadd "$GROUP_NAME"
ok "${GROUP_NAME} 创建完成。"
else
warn "没有输入 y，跳过 ${GROUP_NAME}。"
fi

fi
fi

done


# ============================================================
# 六、root：检查 / 创建 deployer
# ============================================================

section "2. 检查 deployer 用户"

# 新建 deployer 时，直接把 grp_employees 设置为主组
USER_CREATE_CMD="useradd -m -s /bin/bash -g ${EMPLOYEE_GROUP} ${DEPLOY_USER}"

if id "$DEPLOY_USER" >/dev/null 2>&1; then

exists_red "用户 ${DEPLOY_USER} 已经存在。"
echo
echo "新建用户时对应的命令："
show_cmd "$USER_CREATE_CMD"
echo
warn "已经存在，不会重复执行 useradd，也不会自动修改密码。"

else

not_configured_red "用户 ${DEPLOY_USER} 尚未创建。"
echo
echo "准备执行："
show_cmd "$USER_CREATE_CMD"
echo

if [ "$IS_ROOT" = false ]; then

warn "当前不是 root，跳过创建 ${DEPLOY_USER}。"

else

# 主组必须先存在
if ! getent group "$EMPLOYEE_GROUP" >/dev/null 2>&1; then
fail "主组 ${EMPLOYEE_GROUP} 不存在，不能创建 ${DEPLOY_USER}。"
echo "请先创建 ${EMPLOYEE_GROUP}，然后重新运行脚本。"
exit 1
fi

if confirm_y "是否创建 ${DEPLOY_USER}？只有输入 y 才执行 [y/N]: "; then

useradd \
-m \
-s /bin/bash \
-g "$EMPLOYEE_GROUP" \
"$DEPLOY_USER"

ok "${DEPLOY_USER} 创建成功。"

echo
echo "准备执行："
show_cmd "passwd ${DEPLOY_USER}"
echo

if confirm_y "是否设置 ${DEPLOY_USER} 登录密码？只有输入 y 才执行 [y/N]: "; then
passwd "$DEPLOY_USER"
else
warn "已跳过密码设置。"
fi

else
warn "没有输入 y，跳过创建 ${DEPLOY_USER}。"
fi

fi
fi


# ============================================================
# 七、root：检查 deployer 主组
# ============================================================

section "3. 检查 deployer 主组"

if id "$DEPLOY_USER" >/dev/null 2>&1; then

CURRENT_PRIMARY_GROUP="$(id -gn "$DEPLOY_USER")"

echo
echo "当前用户：$DEPLOY_USER"
echo "当前主组：$CURRENT_PRIMARY_GROUP"
echo "目标主组：$EMPLOYEE_GROUP"
echo

if [ "$CURRENT_PRIMARY_GROUP" = "$EMPLOYEE_GROUP" ]; then

exists_red "${DEPLOY_USER} 的主组已经是 ${EMPLOYEE_GROUP}。"
echo
echo "对应命令："
show_cmd "usermod -g ${EMPLOYEE_GROUP} ${DEPLOY_USER}"
echo
warn "主组已经正确，不会重复修改。"

else

not_configured_red "${DEPLOY_USER} 当前主组不是 ${EMPLOYEE_GROUP}。"
echo
echo "当前主组：$CURRENT_PRIMARY_GROUP"
echo "目标主组：$EMPLOYEE_GROUP"
echo
echo "准备执行："
show_cmd "usermod -g ${EMPLOYEE_GROUP} ${DEPLOY_USER}"
echo

if [ "$IS_ROOT" = false ]; then

warn "当前不是 root，不能修改主组，已跳过。"

else

if ! getent group "$EMPLOYEE_GROUP" >/dev/null 2>&1; then
fail "目标主组 ${EMPLOYEE_GROUP} 不存在。"
exit 1
fi

if confirm_y "是否修改主组？只有输入 y 才执行 [y/N]: "; then
usermod -g "$EMPLOYEE_GROUP" "$DEPLOY_USER"
ok "${DEPLOY_USER} 主组已修改为 ${EMPLOYEE_GROUP}。"
else
warn "没有输入 y，主组保持不变。"
fi

fi

fi

else
warn "${DEPLOY_USER} 不存在，跳过主组检查。"
fi


# ============================================================
# 八、root：检查 deployer 附加组 grp_deploy
# ============================================================

section "4. 检查 deployer 附加组"

ADD_DEPLOY_GROUP_CMD="usermod -aG ${DEPLOY_GROUP} ${DEPLOY_USER}"

if id "$DEPLOY_USER" >/dev/null 2>&1 && getent group "$DEPLOY_GROUP" >/dev/null 2>&1; then

if id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -Fxq "$DEPLOY_GROUP"; then

exists_red "${DEPLOY_USER} 已经属于附加组 ${DEPLOY_GROUP}。"
echo
echo "对应命令："
show_cmd "$ADD_DEPLOY_GROUP_CMD"
echo
warn "附加组关系已经存在，不会重复执行。"

else

not_configured_red "${DEPLOY_USER} 还不属于附加组 ${DEPLOY_GROUP}。"
echo
echo "准备执行："
show_cmd "$ADD_DEPLOY_GROUP_CMD"
echo

if [ "$IS_ROOT" = false ]; then

warn "当前不是 root，跳过附加组配置。"

else

if confirm_y "是否加入附加组？只有输入 y 才执行 [y/N]: "; then
usermod -aG "$DEPLOY_GROUP" "$DEPLOY_USER"
ok "${DEPLOY_USER} 已加入 ${DEPLOY_GROUP}。"
else
warn "没有输入 y，已跳过。"
fi

fi

fi

else
warn "${DEPLOY_USER} 或 ${DEPLOY_GROUP} 不存在，跳过附加组检查。"
fi


# ============================================================
# 九、显示当前组关系
# ============================================================

section "5. 当前组关系"

if id "$DEPLOY_USER" >/dev/null 2>&1; then

echo
echo "用户：$DEPLOY_USER"
echo "主组：$(id -gn "$DEPLOY_USER")"
echo "全部所属组：$(id -nG "$DEPLOY_USER")"
echo
echo "结构理解："
echo
echo "${EMPLOYEE_GROUP} ← 主组"
echo "└── ${DEPLOY_USER}"
echo
echo "${DEPLOY_GROUP} ← 附加组"
echo "└── ${DEPLOY_USER}"
echo

else
warn "${DEPLOY_USER} 尚不存在。"
fi


# ============================================================
# 十、确定 Git / SSH 的目标用户
# ============================================================

section "6. 确定 Git / SSH 执行用户"

if [ "$IS_ROOT" = true ]; then

if id "$DEPLOY_USER" >/dev/null 2>&1; then
TARGET_USER="$DEPLOY_USER"
else
fail "当前为 root，但 ${DEPLOY_USER} 不存在。"
echo "为了避免把项目和 SSH 密钥创建在 /root 下，脚本停止。"
exit 1
fi

else

# 非 root 不创建 deployer，也不切换用户
TARGET_USER="$CURRENT_USER"

fi

TARGET_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"

if [ -z "$TARGET_HOME" ] || [ ! -d "$TARGET_HOME" ]; then
fail "无法取得 ${TARGET_USER} 的 HOME 目录。"
exit 1
fi

TARGET_PRIMARY_GROUP="$(id -gn "$TARGET_USER")"

PROJECT_DIR="${TARGET_HOME}/${REPO_NAME}"
SSH_DIR="${TARGET_HOME}/.ssh"
SSH_KEY="${SSH_DIR}/${SSH_KEY_NAME}"
SSH_PUB_KEY="${SSH_KEY}.pub"

echo
echo "目标用户：$TARGET_USER"
echo "目标主组：$TARGET_PRIMARY_GROUP"
echo "HOME ：$TARGET_HOME"
echo "项目目录：$PROJECT_DIR"
echo "SSH 私钥：$SSH_KEY"


# ============================================================
# 十一、以目标用户执行命令
# ============================================================

run_as_target() {
if [ "$(id -un)" = "$TARGET_USER" ]; then
HOME="$TARGET_HOME" "$@"
elif [ "$IS_ROOT" = true ]; then
runuser -u "$TARGET_USER" -- env HOME="$TARGET_HOME" "$@"
else
fail "当前用户不能切换到 ${TARGET_USER}。"
exit 1
fi
}


# ============================================================
# 十二、检查 Git / OpenSSH
# ============================================================

section "7. 检查 Git / OpenSSH"

if command -v git >/dev/null 2>&1 && command -v ssh >/dev/null 2>&1; then

exists_red "Git / OpenSSH 已经安装。"
echo
echo "Git：$(git --version)"
echo
echo "对应安装命令："
show_cmd "apt-get update"
show_cmd "apt-get install -y git openssh-client"
echo
warn "已经安装，不会重复执行。"

else

not_configured_red "Git 或 OpenSSH 尚未安装。"
echo
echo "准备执行："
show_cmd "apt-get update"
show_cmd "apt-get install -y git openssh-client"
echo

if [ "$IS_ROOT" = false ]; then
fail "当前不是 root，不能安装软件。请让 root 安装后重新运行。"
exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
fail "当前系统没有 apt-get；自动安装部分目前针对 Ubuntu/Debian。"
exit 1
fi

if confirm_y "是否安装 Git / OpenSSH？只有输入 y 才执行 [y/N]: "; then
apt-get update
apt-get install -y git openssh-client
ok "Git / OpenSSH 安装完成。"
else
fail "缺少 Git / OpenSSH，且你取消安装，无法继续。"
exit 1
fi

fi


# ============================================================
# 十三、配置 Git 用户名 / 邮箱
# ============================================================

section "8. Git 用户信息"

CURRENT_GIT_NAME="$(run_as_target git config --global user.name 2>/dev/null || true)"
CURRENT_GIT_EMAIL="$(run_as_target git config --global user.email 2>/dev/null || true)"

GIT_NAME_CMD="git config --global user.name \"${GIT_NAME}\""
GIT_EMAIL_CMD="git config --global user.email \"${GIT_EMAIL}\""

if [ "$CURRENT_GIT_NAME" = "$GIT_NAME" ] && [ "$CURRENT_GIT_EMAIL" = "$GIT_EMAIL" ]; then

exists_red "Git 用户信息已经配置。"
echo
echo "user.name = $CURRENT_GIT_NAME"
echo "user.email = $CURRENT_GIT_EMAIL"
echo
echo "对应命令："
show_cmd "$GIT_NAME_CMD"
show_cmd "$GIT_EMAIL_CMD"
warn "配置一致，不会重复修改。"

else

echo
echo "当前配置："
echo "user.name = ${CURRENT_GIT_NAME:-未设置}"
echo "user.email = ${CURRENT_GIT_EMAIL:-未设置}"
echo
echo "准备执行："
show_cmd "$GIT_NAME_CMD"
show_cmd "$GIT_EMAIL_CMD"
echo

if confirm_y "是否写入 Git 用户信息？只有输入 y 才执行 [y/N]: "; then
run_as_target git config --global user.name "$GIT_NAME"
run_as_target git config --global user.email "$GIT_EMAIL"
ok "Git 用户信息配置完成。"
else
warn "已跳过 Git 用户信息配置。"
fi

fi


# ============================================================
# 十四、检查 ~/.ssh
# ============================================================

section "9. 检查 SSH 目录"

if [ -d "$SSH_DIR" ]; then

exists_red "SSH 目录已经存在：$SSH_DIR"
echo
echo "对应命令："
show_cmd "mkdir -p \"$SSH_DIR\""
show_cmd "chmod 700 \"$SSH_DIR\""
echo
warn "不会重复创建。"

else

not_configured_red "SSH 目录不存在：$SSH_DIR"
echo
echo "准备执行："
show_cmd "mkdir -p \"$SSH_DIR\""
show_cmd "chmod 700 \"$SSH_DIR\""
echo

if confirm_y "是否创建 SSH 目录？只有输入 y 才执行 [y/N]: "; then

run_as_target mkdir -p "$SSH_DIR"
run_as_target chmod 700 "$SSH_DIR"

ok "SSH 目录创建完成。"

else
fail "没有 SSH 目录且取消创建，无法继续。"
exit 1
fi

fi


# ============================================================
# 十五、检查 / 生成 RSA
# ============================================================

section "10. 检查 RSA SSH 密钥"

KEYGEN_CMD="ssh-keygen -t rsa -b 4096 -C \"${GIT_EMAIL}\" -f \"${SSH_KEY}\" -N \"\""

if [ -f "$SSH_KEY" ] && [ -f "$SSH_PUB_KEY" ]; then

exists_red "RSA SSH 密钥已经存在。"
echo
echo "私钥：$SSH_KEY"
echo "公钥：$SSH_PUB_KEY"
echo
echo "对应生成命令："
show_cmd "$KEYGEN_CMD"
echo
warn "不会覆盖现有密钥。"

else

not_configured_red "没有检测到完整 RSA SSH 密钥。"
echo
echo "准备执行："
show_cmd "$KEYGEN_CMD"
echo

if confirm_y "是否生成 RSA 密钥？只有输入 y 才执行 [y/N]: "; then

run_as_target ssh-keygen \
-t rsa \
-b 4096 \
-C "$GIT_EMAIL" \
-f "$SSH_KEY" \
-N ""

run_as_target chmod 600 "$SSH_KEY"
run_as_target chmod 644 "$SSH_PUB_KEY"

ok "RSA SSH 密钥生成完成。"

echo
echo "============================================================"
echo "请把下面这一整行【公钥】添加到 GitHub"
echo "============================================================"
cat "$SSH_PUB_KEY"
echo
echo "推荐："
echo "GitHub -> Kenguba/jpcard -> Settings -> Deploy keys -> Add deploy key"
echo
echo "添加完成后重新运行此脚本。"
echo

exit 0

else
fail "没有 SSH 密钥且取消生成，无法继续。"
exit 1
fi

fi


# ============================================================
# 十六、测试 GitHub SSH
# ============================================================

section "11. 测试 GitHub SSH"

echo
echo "准备执行："
show_cmd "ssh -i \"$SSH_KEY\" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -T git@github.com"
echo

set +e
SSH_OUTPUT="$(
run_as_target ssh \
-i "$SSH_KEY" \
-o IdentitiesOnly=yes \
-o StrictHostKeyChecking=accept-new \
-o ConnectTimeout=10 \
-T git@github.com 2>&1
)"
SSH_STATUS=$?
set -e

echo "$SSH_OUTPUT"

# GitHub 成功认证时 ssh -T 往往仍返回非 0，
# 因此通过输出内容判断。
if printf '%s' "$SSH_OUTPUT" | grep -qi "successfully authenticated"; then
ok "GitHub SSH 身份验证成功。"
else
echo
fail "GitHub SSH 身份验证未成功。"
echo
echo "请确认以下公钥已经添加到 GitHub："
echo
cat "$SSH_PUB_KEY"
echo
echo "添加完成后重新运行脚本。"
exit 1
fi


# ============================================================
# 十七、检查 jpcard 仓库
# ============================================================

section "12. 检查 jpcard 仓库"

echo
echo "仓库：$REPO_URL"
echo "目录：$PROJECT_DIR"
echo

if [ -d "$PROJECT_DIR/.git" ]; then

exists_red "本地 jpcard Git 仓库已经存在。"
echo
echo "拉取时准备执行："
show_cmd "git -C \"$PROJECT_DIR\" pull --ff-only"

elif [ -e "$PROJECT_DIR" ]; then

fail "$PROJECT_DIR 已经存在，但不是 Git 仓库。"
echo "为了防止覆盖现有文件，脚本停止。"
exit 1

else

not_configured_red "本地还没有 jpcard 仓库。"
echo
echo "拉取时准备执行："
show_cmd "git clone \"$REPO_URL\" \"$PROJECT_DIR\""

fi


# ============================================================
# 十八、最终确认是否拉取
# ============================================================

echo

if ! confirm_y "是否拉取 jpcard 仓库？只有输入 y 才执行 [y/N]: "; then
warn "没有输入小写 y，本次不拉取仓库。"
exit 0
fi


# ============================================================
# 十九、执行 clone / pull
# ============================================================

GIT_SSH_COMMAND_VALUE="ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

if [ -d "$PROJECT_DIR/.git" ]; then

CURRENT_ORIGIN="$(run_as_target git -C "$PROJECT_DIR" remote get-url origin 2>/dev/null || true)"

if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then

echo
not_configured_red "当前 origin 与目标仓库不同。"
echo
echo "当前：${CURRENT_ORIGIN:-未设置}"
echo "目标：$REPO_URL"
echo
echo "准备执行："
show_cmd "git -C \"$PROJECT_DIR\" remote set-url origin \"$REPO_URL\""
echo

if confirm_y "是否修改 origin？只有输入 y 才执行 [y/N]: "; then
run_as_target git -C "$PROJECT_DIR" remote set-url origin "$REPO_URL"
ok "origin 已修改。"
else
fail "origin 不一致，已取消拉取。"
exit 1
fi

fi

info "开始执行 git pull --ff-only ..."

run_as_target env \
GIT_SSH_COMMAND="$GIT_SSH_COMMAND_VALUE" \
git -C "$PROJECT_DIR" pull --ff-only

ok "jpcard 拉取完成。"

else

info "开始执行 git clone ..."

run_as_target env \
GIT_SSH_COMMAND="$GIT_SSH_COMMAND_VALUE" \
git clone "$REPO_URL" "$PROJECT_DIR"

ok "jpcard clone 完成。"

fi


# ============================================================
# 二十、项目读取权限
# ============================================================

section "13. 配置项目读取权限"

# 目标：
# deployer（所有者） -> 可读 / 可写 / 可进入
# grp_employees（员工组） -> 可读 / 可进入，不可写
# 其他用户 -> 无权限
#
# SSH 私钥目录不共享：
# ~/.ssh -> 700
# id_rsa -> 600

if [ "$TARGET_USER" = "$DEPLOY_USER" ] && getent group "$EMPLOYEE_GROUP" >/dev/null 2>&1; then

echo
echo "目标权限："
echo " owner : ${DEPLOY_USER}"
echo " group : ${EMPLOYEE_GROUP}"
echo " 员工组：只读"
echo " 其他人：无权限"
echo
echo "准备执行："
show_cmd "chgrp -R ${EMPLOYEE_GROUP} \"$PROJECT_DIR\""
show_cmd "chmod -R g+rX,g-w,o-rwx \"$PROJECT_DIR\""
show_cmd "find \"$PROJECT_DIR\" -type d -exec chmod g+s {} \\;"
echo

if [ "$IS_ROOT" = true ]; then

if confirm_y "是否配置以上项目权限？只有输入 y 才执行 [y/N]: "; then

chown -R "$DEPLOY_USER:$EMPLOYEE_GROUP" "$PROJECT_DIR"
chmod -R g+rX,g-w,o-rwx "$PROJECT_DIR"
find "$PROJECT_DIR" -type d -exec chmod g+s {} \;

# deployer 的 HOME 需要允许员工组“穿过”才能访问 jpcard
# 但 ~/.ssh 本身仍保持 700，员工无法读取私钥。
chgrp "$EMPLOYEE_GROUP" "$TARGET_HOME"
chmod 750 "$TARGET_HOME"

chmod 700 "$SSH_DIR"
chmod 600 "$SSH_KEY"
chmod 644 "$SSH_PUB_KEY"

ok "项目权限配置完成。"

else
warn "已跳过项目权限配置。"
fi

else

# 普通 deployer 用户如果主组就是 grp_employees，
# 可以设置自己项目目录的组权限，不需要 root。
if [ "$CURRENT_USER" = "$DEPLOY_USER" ] && id -nG "$CURRENT_USER" | tr ' ' '\n' | grep -Fxq "$EMPLOYEE_GROUP"; then

if confirm_y "是否配置当前项目的员工只读权限？只有输入 y 才执行 [y/N]: "; then

chgrp -R "$EMPLOYEE_GROUP" "$PROJECT_DIR"
chmod -R g+rX,g-w,o-rwx "$PROJECT_DIR"
find "$PROJECT_DIR" -type d -exec chmod g+s {} \;

chmod 700 "$SSH_DIR"
chmod 600 "$SSH_KEY"
chmod 644 "$SSH_PUB_KEY"

ok "项目权限配置完成。"

else
warn "已跳过项目权限配置。"
fi

else
warn "当前非 root 且不是符合条件的 deployer，跳过项目权限配置。"
fi

fi

else
warn "当前目标用户不是 deployer，或 ${EMPLOYEE_GROUP} 不存在，跳过项目共享权限配置。"
fi


# ============================================================
# 二十一、最终结果
# ============================================================

section "全部完成"

echo
echo "当前脚本用户 ：$CURRENT_USER"
echo "是否 root ：$IS_ROOT"
echo
echo "Git/SSH 用户 ：$TARGET_USER"
echo "主组 ：$(id -gn "$TARGET_USER")"
echo "全部所属组 ：$(id -nG "$TARGET_USER")"
echo
echo "员工主组 ：$EMPLOYEE_GROUP"
echo "部署附加组 ：$DEPLOY_GROUP"
echo "前端角色组 ：$FRONTEND_GROUP"
echo "后端角色组 ：$BACKEND_GROUP"
echo "运维角色组 ：$OPS_GROUP"
echo
echo "GitHub 用户 ：$GITHUB_USER"
echo "Git 用户名 ：$GIT_NAME"
echo "Git 邮箱 ：$GIT_EMAIL"
echo
echo "项目目录 ：$PROJECT_DIR"
echo "仓库地址 ：$REPO_URL"
echo "SSH 私钥 ：$SSH_KEY"
echo "SSH 公钥 ：$SSH_PUB_KEY"
echo
echo "组关系说明："
echo " -g = 主组"
echo " -aG = 添加附加组"
echo








# ============================================================
# 二十二、命令行速查总结
# ============================================================
#
# 下面这一段只是命令说明，不会被执行。
# 可以直接复制需要的命令到终端使用。
#
: <<'COMMAND_LINE_SUMMARY'

============================================================
Linux 用户 / 用户组 / 文件权限命令行总结
============================================================


------------------------------------------------------------
1. 创建用户组
------------------------------------------------------------

创建员工公共组：

groupadd grp_employees

创建前端附加组：

groupadd grp_frontend

创建后端附加组：

groupadd grp_backend

创建运维附加组：

groupadd grp_ops

创建部署附加组：

groupadd grp_deploy


------------------------------------------------------------
2. 查看用户组
------------------------------------------------------------

查看系统所有组：

getent group

查看指定组：

getent group grp_employees

getent group grp_backend

查看某个组中明确列出的附加成员：

getent group grp_backend


------------------------------------------------------------
3. 创建用户
------------------------------------------------------------

创建 backend 用户，并把 grp_employees 设置为主组：

useradd -m -s /bin/bash -g grp_employees backend

创建 frontend 用户，并把 grp_employees 设置为主组：

useradd -m -s /bin/bash -g grp_employees frontend

创建 ops 用户，并把 grp_employees 设置为主组：

useradd -m -s /bin/bash -g grp_employees ops

创建 deployer 用户，并把 grp_employees 设置为主组：

useradd -m -s /bin/bash -g grp_employees deployer


参数说明：

-m
创建 HOME 目录，例如：

/home/backend

-s /bin/bash
设置登录 Shell。

-g grp_employees
指定主组。


------------------------------------------------------------
4. 给用户设置密码
------------------------------------------------------------

passwd backend

passwd frontend

passwd ops

passwd deployer


------------------------------------------------------------
5. 设置主组
------------------------------------------------------------

把 backend 的主组修改为 grp_employees：

usermod -g grp_employees backend

把 frontend 的主组修改为 grp_employees：

usermod -g grp_employees frontend

把 ops 的主组修改为 grp_employees：

usermod -g grp_employees ops

把 deployer 的主组修改为 grp_employees：

usermod -g grp_employees deployer


记忆：

-g
=
主组


------------------------------------------------------------
6. 添加附加组
------------------------------------------------------------

backend 加入后端附加组：

usermod -aG grp_backend backend

frontend 加入前端附加组：

usermod -aG grp_frontend frontend

ops 加入运维附加组：

usermod -aG grp_ops ops

deployer 加入部署附加组：

usermod -aG grp_deploy deployer


一个用户同时加入多个附加组：

usermod -aG grp_backend,grp_deploy backend


记忆：

-aG
=
追加附加组

注意：

不要为了“添加附加组”单独使用：

usermod -G grp_backend backend

因为不带 -a 时，可能会覆盖用户原来的其他附加组。


------------------------------------------------------------
7. 从附加组移除用户
------------------------------------------------------------

把 backend 从 grp_backend 移除：

gpasswd -d backend grp_backend

把 deployer 从 grp_deploy 移除：

gpasswd -d deployer grp_deploy


------------------------------------------------------------
8. 查看用户的主组
------------------------------------------------------------

查看 backend 主组：

id -gn backend

查看 deployer 主组：

id -gn deployer


例如输出：

grp_employees

说明：

backend
└── 主组：grp_employees


------------------------------------------------------------
9. 查看用户属于哪些组
------------------------------------------------------------

查看完整 UID / GID / 组：

id backend

查看所有组名：

id -nG backend

查看 deployer：

id deployer

id -nG deployer


例如：

uid=1002(backend) gid=1001(grp_employees) groups=1001(grp_employees),1003(grp_backend)

表示：

backend
├── 主组：grp_employees
└── 附加组：grp_backend


------------------------------------------------------------
10. 查看组里的用户
------------------------------------------------------------

查看 grp_backend：

getent group grp_backend

查看 grp_frontend：

getent group grp_frontend

查看 grp_ops：

getent group grp_ops

查看 grp_deploy：

getent group grp_deploy


注意：

getent group 某个组

主要会显示该组中明确记录的附加成员。

如果某个用户把这个组作为“主组”，最可靠的判断方式仍然是：

id 用户名

或者：

id -gn 用户名


------------------------------------------------------------
11. 当前推荐的组关系
------------------------------------------------------------

grp_employees
├── deployer 主组
├── frontend 主组
├── backend 主组
└── ops 主组


grp_deploy
└── deployer 附加组


grp_frontend
└── frontend 附加组


grp_backend
└── backend 附加组


grp_ops
└── ops 附加组


------------------------------------------------------------
12. 修改文件 / 目录所有者和所属组
------------------------------------------------------------

格式：

chown 用户:组 文件或目录


例如：

chown deployer:grp_employees /home/deployer/jpcard


递归修改整个项目：

chown -R deployer:grp_employees /home/deployer/jpcard


只修改所属组：

chgrp grp_employees /home/deployer/jpcard


递归修改所属组：

chgrp -R grp_employees /home/deployer/jpcard


------------------------------------------------------------
13. 查看文件权限
------------------------------------------------------------

查看目录：

ls -ld /home/deployer/jpcard

查看目录里的文件：

ls -l /home/deployer/jpcard


例如：

drwxr-x--- deployer grp_employees jpcard

可以理解为：

deployer
=
rwx
=
读 + 写 + 进入目录

grp_employees
=
r-x
=
读 + 进入目录，不可写

其他用户
=
---
=
没有权限


------------------------------------------------------------
14. chmod 数字权限
------------------------------------------------------------

r = 4
w = 2
x = 1


7 = rwx
6 = rw-
5 = r-x
4 = r--


例如：

chmod 750 目录

表示：

所有者：
7 = rwx

组：
5 = r-x

其他人：
0 = ---


例如：

chmod 640 文件

表示：

所有者：
6 = rw-

组：
4 = r--

其他人：
0 = ---


------------------------------------------------------------
15. 项目设置为“deployer 可写，员工只读”
------------------------------------------------------------

先设置所有者和组：

chown -R deployer:grp_employees /home/deployer/jpcard


目录：

find /home/deployer/jpcard -type d -exec chmod 750 {} \;


文件：

find /home/deployer/jpcard -type f -exec chmod 640 {} \;


这样通常得到：

deployer
=
可以读、写、进入目录

grp_employees
=
可以读取文件、进入目录

其他用户
=
没有权限


------------------------------------------------------------
16. 使用一条 chmod 命令设置员工只读
------------------------------------------------------------

chmod -R g+rX,g-w,o-rwx /home/deployer/jpcard


含义：

g+rX
=
组增加读取权限；
目录增加进入权限。

g-w
=
组删除写权限。

o-rwx
=
其他用户删除所有权限。


------------------------------------------------------------
17. 让新建文件继续继承项目组
------------------------------------------------------------

给目录设置 setgid：

find /home/deployer/jpcard -type d -exec chmod g+s {} \;


之后在这些目录里新建文件/目录时，
会优先继承目录所属组：

grp_employees


查看：

ls -ld /home/deployer/jpcard


权限中可能看到：

drwxr-s---


其中组执行位上的 s
表示 setgid。


------------------------------------------------------------
18. 允许员工进入 /home/deployer，但不允许读取 SSH 私钥
------------------------------------------------------------

项目位于：

/home/deployer/jpcard

那么员工必须有权限“穿过”：

/home/deployer


设置：

chgrp grp_employees /home/deployer

chmod 750 /home/deployer


但是 SSH 目录必须继续保护：

chmod 700 /home/deployer/.ssh

chmod 600 /home/deployer/.ssh/id_rsa

chmod 644 /home/deployer/.ssh/id_rsa.pub


因此：

grp_employees
可以访问：

/home/deployer/jpcard

但是不能进入：

/home/deployer/.ssh


------------------------------------------------------------
19. 关于删除文件权限
------------------------------------------------------------

Linux 删除一个文件，主要看“父目录”有没有写权限，
而不是只看文件本身能不能写。

例如员工组目录权限是：

750

也就是：

owner = rwx
group = r-x
other = ---

那么 grp_employees 没有目录写权限，
通常就不能：

rm 文件

mv 文件

创建文件

覆盖目录内容


所以员工只读目录推荐：

目录：
750

文件：
640


------------------------------------------------------------
20. 快速检查 jpcard 权限
------------------------------------------------------------

查看 deployer：

id deployer

查看 deployer 主组：

id -gn deployer

查看 deployer 所有组：

id -nG deployer

查看员工组：

getent group grp_employees

查看部署组：

getent group grp_deploy

查看项目目录权限：

ls -ld /home/deployer/jpcard

查看 deployer HOME：

ls -ld /home/deployer

查看 SSH 权限：

ls -ld /home/deployer/.ssh

ls -l /home/deployer/.ssh


------------------------------------------------------------
21. 最常用的完整例子：创建 backend
------------------------------------------------------------

# 1. 创建公共员工组（如果还没有）
groupadd grp_employees

# 2. 创建后端角色组（如果还没有）
groupadd grp_backend

# 3. 创建 backend，主组直接指定为 grp_employees
useradd -m -s /bin/bash -g grp_employees backend

# 4. 设置密码
passwd backend

# 5. 把 backend 加到后端附加组
usermod -aG grp_backend backend

# 6. 查看结果
id backend

# 7. 查看主组
id -gn backend

# 8. 查看全部组
id -nG backend


结果逻辑：

backend
├── 主组：grp_employees
└── 附加组：grp_backend


------------------------------------------------------------
22. 最常用的完整例子：创建 deployer
------------------------------------------------------------

# 1. 创建员工公共组
groupadd grp_employees

# 2. 创建部署附加组
groupadd grp_deploy

# 3. 创建 deployer，主组为 grp_employees
useradd -m -s /bin/bash -g grp_employees deployer

# 4. 设置密码
passwd deployer

# 5. 加入部署附加组
usermod -aG grp_deploy deployer

# 6. 查看
id deployer

# 7. 主组
id -gn deployer

# 8. 所有组
id -nG deployer


结果逻辑：

deployer
├── 主组：grp_employees
└── 附加组：grp_deploy


============================================================
最短记忆
============================================================

创建组：

groupadd 组名


创建用户 + 指定主组：

useradd -m -s /bin/bash -g 主组 用户名


设置密码：

passwd 用户名


修改主组：

usermod -g 主组 用户名


添加附加组：

usermod -aG 附加组 用户名


查看主组：

id -gn 用户名


查看所有组：

id -nG 用户名


查看完整用户信息：

id 用户名


查看组：

getent group 组名


文件归属：

chown 用户:组 文件


递归归属：

chown -R 用户:组 目录


目录员工只读：

chmod 750 目录


文件员工只读：

chmod 640 文件


递归员工只读：

chmod -R g+rX,g-w,o-rwx 目录


============================================================

COMMAND_LINE_SUMMARY