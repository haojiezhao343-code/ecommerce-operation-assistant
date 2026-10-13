#!/usr/bin/env bash
# 服务器侧一键准备脚本（Ubuntu 24.04，腾讯云轻量）
# 作用：装 Docker + 配国内镜像加速 + 调内核参数，为部署 ecommerce-operation-assistant 做好底座。
# 用法：在服务器上执行  bash server-prepare.sh
# 幂等：可重复执行，已装好的步骤会自动跳过。

set -euo pipefail

log() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

log "1/5 系统信息"
grep -E '^(PRETTY_NAME)' /etc/os-release || true
ARCH="$(uname -m)"
echo "架构: ${ARCH}"
if [ "${ARCH}" != "x86_64" ]; then
  echo "警告：本脚本按 x86_64 编写，当前为 ${ARCH}，请改用对应架构的 Docker 源。" >&2
fi
echo "内存:"
free -m | head -2

log "2/5 安装 Docker（走阿里云镜像源）"
if command -v docker >/dev/null 2>&1; then
  echo "已安装：$(docker --version)"
else
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl gnupg
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg \
    | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  $SUDO systemctl enable --now docker
  $SUDO usermod -aG docker "${USER:-ubuntu}" || true
  echo "安装完成：$(docker --version)"
  echo "注意：docker 组权限需重新登录后生效；本次脚本内统一用 sudo 调用。"
fi

log "3/5 配置镜像加速与日志上限"
$SUDO mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  $SUDO tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://mirror.ccs.tencentyun.com"
  ],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
JSON
  echo "已写入 /etc/docker/daemon.json"
else
  echo "已存在 /etc/docker/daemon.json，未覆盖，请自行确认 registry-mirrors 是否齐全。"
fi
$SUDO systemctl daemon-reload
$SUDO systemctl restart docker

log "4/5 校验 Docker 可用"
$SUDO docker version --format 'Server: {{.ServerVersion}}'
$SUDO docker compose version

log "5/5 配置 swap（构建前端镜像需要约 1.5G 峰值内存，2G 机器必须靠 swap 兜底）"
SWAPFILE=/swapfile
if swapon --show | grep -q "$SWAPFILE"; then
  echo "swap 已启用，跳过"
else
  if [ ! -f "$SWAPFILE" ]; then
    $SUDO fallocate -l 4G "$SWAPFILE" || $SUDO dd if=/dev/zero of="$SWAPFILE" bs=1M count=4096
    $SUDO chmod 600 "$SWAPFILE"
    $SUDO mkswap "$SWAPFILE"
  fi
  $SUDO swapon "$SWAPFILE"
  if ! grep -q "^$SWAPFILE" /etc/fstab; then
    echo "$SWAPFILE none swap sw 0 0" | $SUDO tee -a /etc/fstab >/dev/null
  fi
  echo "已启用 4G swap 并写入 /etc/fstab"
fi
# 2G 内存 + 4G swap 下，让内核更愿意换出，减少构建期被 OOM 杀掉
$SUDO sysctl -w vm.swappiness=60 >/dev/null
echo "内存与 swap 现状："
free -m

cat <<'NEXT'

------------------------------------------------------------
后续步骤（见仓库 DEPLOY.md §7.3）：
  1) 停掉 Hermes 与 Caddy，腾出 80 端口与约 430MB 内存
       systemctl --user stop 'hermes*'
       pkill -f hermes-agent
       sudo systemctl disable --now caddy
  2) 导入镜像
       gunzip -c /tmp/eo-portfolio.tar.gz | sudo docker load
  3) 准备目录与 .env
       sudo mkdir -p /opt/ecommerce-portfolio && sudo chown $USER /opt/ecommerce-portfolio
       cd /opt/ecommerce-portfolio   # 上传 docker-compose.portfolio.yml 与 .env
  4) 启动
       sudo docker compose -f docker-compose.portfolio.yml up -d
  5) 建演示账号
       sudo docker compose -f docker-compose.portfolio.yml exec api python scripts/bootstrap_user.py
  6) 防火墙放通 80/TCP
------------------------------------------------------------
NEXT
