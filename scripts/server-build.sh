#!/usr/bin/env bash
# 在服务器上构建 api / web 镜像。
#
# 为什么在服务器构建而不是本机构建后上传：
#   本机上行仅 4Mbps，上传约 1.8G 的镜像需要一小时以上；
#   而服务器的下行不受该带宽限制，只上传约 4MB 源码即可，其余依赖在服务器拉取。
#
# 用法：bash server-build.sh [源码目录]
#   默认源码目录：/opt/ecommerce-portfolio/src
set -euo pipefail

SRC="${1:-/opt/ecommerce-portfolio/src}"
API_TAG="ecommerce-operation-assistant-api:latest"
WEB_TAG="ecommerce-operation-assistant-web:latest"

if [ ! -d "$SRC/api" ] || [ ! -d "$SRC/web" ]; then
  echo "错误：$SRC 下找不到 api/ 与 web/，请先上传源码。" >&2
  exit 1
fi

DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

echo "== 构建前资源检查 =="
free -m | head -2
echo

if [ -n "$($DOCKER ps -aq)" ]; then
  echo "提示：当前有已停止/运行的容器，可能占用内存。"
fi

cd "$SRC"

echo "== 1/2 构建 api 镜像 =="
$DOCKER build -t "$API_TAG" ./api

echo
echo "== 2/2 构建 web 镜像（依赖已缓存，通常 5-10 分钟）=="
$DOCKER build -t "$WEB_TAG" ./web

echo
echo "== 构建结果 =="
$DOCKER images --format '{{.Repository}}:{{.Tag}} | {{.Size}}' | grep ecommerce || true

cat <<'NEXT'

------------------------------------------------------------
接下来（见 DEPLOY.md §7.3）：
  cd /opt/ecommerce-portfolio
  docker compose -f docker-compose.portfolio.yml up -d
  docker compose -f docker-compose.portfolio.yml exec api python scripts/bootstrap_user.py
------------------------------------------------------------
NEXT
