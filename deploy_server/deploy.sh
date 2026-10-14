#!/bin/bash
# 服务器端：部署 ecommerce-operation-assistant 完整版到 80 端口（替代 lite_assistant）
set -euo pipefail

echo "== [1/4] 停止旧的 lite_assistant 服务并释放 80 端口 =="
systemctl stop ecommerce-assistant 2>/dev/null || true
systemctl disable ecommerce-assistant 2>/dev/null || true

echo "== [2/4] 加载镜像 =="
docker load < /opt/ecommerce-images.tar.gz

echo "== [3/4] 准备部署目录 =="
mkdir -p /opt/ecommerce-portfolio
cd /opt/ecommerce-portfolio

echo "== [4/4] 启动 compose =="
docker compose -f /opt/ecommerce-portfolio/docker-compose.portfolio.yml --env-file /opt/ecommerce-portfolio/.env up -d

echo "== 完成，等待服务健康 =="
sleep 20
docker compose -f /opt/ecommerce-portfolio/docker-compose.portfolio.yml ps
