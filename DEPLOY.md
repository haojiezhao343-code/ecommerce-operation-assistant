# 部署运行手册

面向本仓库（FastAPI + Celery + MySQL/Redis/PostgreSQL + Next.js）在**腾讯云轻量应用服务器**上的部署。
服务器实测数据来自 2026-10-12。

---

## 0. 服务器现状体检（实测，非推测）

| 项 | 实测值 | 影响 |
| --- | --- | --- |
| 实例 | `lhins-3z868rxe` / ap-beijing-3 / Hermes Agent 镜像 | 2026-11-09 到期 |
| 公网 IP | `49.233.198.106` | 暂无域名，只能用 IP |
| 规格 | **2 核 2G** / 50G SSD（36G 空闲）/ **4Mbps** | 内存是唯一瓶颈；上行传镜像很慢 |
| 系统 | Ubuntu 24.04.4 LTS | 装 Docker 无障碍 |
| Docker | **未安装** | 需先装 |
| 内存占用 | 已用 803MB / 可用 1164MB | 见 §1 |
| Swap | 1987MB，swappiness=60 | 兜底，但会明显变慢 |
| 端口 | **Caddy 已占 80**（+ 管理口 2019） | 部署前必须决策 |
| 防火墙 | 仅放通 **22 + ICMP** | 80/443/8000 全关闭 |

已占用内存明细：Hermes Agent gateway 261MB、微信支付 MCP(node) 172MB、云镜 YDService 76MB、caddy 45MB、journald 41MB、barad_agent 27MB。

---

## 1. 资源预算：2G 是超支的

| 组件 | 估算 RSS |
| --- | --- |
| Hermes Agent 等已有 | 803 MB |
| MySQL 8.4 | 400 MB |
| Celery worker | 250 MB |
| FastAPI uvicorn | 250 MB |
| Next.js node | 200 MB |
| PostgreSQL 16 | 150 MB |
| Redis 7 | 20 MB |
| **合计** | **约 2073 MB** |

物理内存 1967MB → **超支约 106MB**，且没有任何余量吸收峰值。三条路线：

| 路线 | 做法 | 结果 |
| --- | --- | --- |
| **A** | 保留 Hermes，精简我方栈（不起 worker、调小 DB 缓冲） | 约 1000MB，可行但紧，靠 swap 兜底 |
| **B** | 部署前停掉 Hermes Agent，释放约 430MB | 约 1650MB，余量正常，**推荐** |
| **C** | 升配到 2 核 4G 再部署 | 最省心，无需精简 |

下文按 **B** 为主线，A/C 的差异在对应步骤标注。

---

## 2. 部署拓扑

```
本地 Windows                    服务器 2C2G (49.233.198.106)
─────────────                   ──────────────────────────────
docker build ×3  ──scp──▶       docker compose up
  api / worker / web              ├─ mysql :3306      (数据)
                                  ├─ redis :6379      (队列)
                                  ├─ agent-checkpoints :6433 (PG 检查点)
                                  ├─ api :8000  ──┐
                                  ├─ worker      │ 同一镜像
                                  └─ web :3000 ◀─┘ 对外入口
```

**构建放哪里**：`web/Dockerfile` 里 `npm run build`（Next.js 16）峰值需 1.5G+ 内存，
在已经被 Hermes 吃掉 800MB 的 2G 机器上无法直接构建。两条路：

| 方式 | 上行开销 | 前置条件 |
| --- | --- | --- |
| 在服务器构建（§7.3 默认） | 仅约 4MB 源码 | 服务器需先加 swap（`scripts/server-prepare.sh` 已含） |
| 本地构建后上传（§7.4 备用） | 约 1.8GB，4Mbps 下约 63 分钟 | 本机 Docker 需稳定（内存占用低于 85%） |

下文 §3.2/§3.3 按「本地构建后上传」写；若采用服务器构建，把这两步换成 §7.3 的 ①②④ 即可。

---

## 3. 分步操作

### 3.1 服务器：安装 Docker

```bash
# 用阿里云镜像装，避开 get.docker.com 慢
curl -fsSL https://get.docker.com | sudo sh -s -- --mirror Aliyun
sudo systemctl enable --now docker
sudo usermod -aG docker $USER    # 需要重新登录 SSH 才生效
```

配置镜像加速 + 限制日志体积（50G 盘要防日志涨满）：

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com", "https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
sudo systemctl restart docker
```

> `mirror.ccs.tencentyun.com` 只在腾讯云内网可用，正好本机就是。

### 3.2 本地：构建镜像

```bash
cd /f/ecommerce-operation-assistant

docker build -t ecommerce-operation-assistant-api:latest ./api

# worker 与 api 是同一个镜像，只是启动命令不同 —— 打同一个 tag，省一半传输量
docker tag ecommerce-operation-assistant-api:latest ecommerce-operation-assistant-worker:latest

# 关键：NEXT_PUBLIC_API_BASE_URL 是「构建期」烘焙进客户端 bundle 的，
# 运行期改 docker-compose 的环境变量对它无效，必须在这里定死。
docker build -t ecommerce-operation-assistant-web:latest \
  --build-arg NEXT_PUBLIC_API_BASE_URL= ./web
```

**`NEXT_PUBLIC_API_BASE_URL` 怎么填**——这决定网络拓扑，二选一：

| 方案 | 构建参数 | 需开的端口 | 说明 |
| --- | --- | --- | --- |
| **甲（推荐）同源反代** | 留空 `=` | 只开 **80** | 配合 §3.6 的 Next.js rewrite，浏览器只访问 80，API 不暴露 |
| 乙 直连 API | `http://49.233.198.106:8000` | 80 + **8000** | 改动少，但 API 裸奔，且需把公网地址加进 `API_CORS_ORIGINS` |

选乙时还要改 `docker-compose.offline.yml` 里 api/worker 的
`API_CORS_ORIGINS`，把 `http://49.233.198.106:3000`（或对外端口）加进去，否则浏览器跨域被拒。

### 3.3 传输镜像（4Mbps 上行，耐心）

```bash
docker save ecommerce-operation-assistant-api:latest \
            ecommerce-operation-assistant-web:latest | gzip -9 > eo-images.tar.gz

ls -lh eo-images.tar.gz          # 预期 600MB ~ 1GB，4Mbps 约需 20~40 分钟
scp eo-images.tar.gz ubuntu@49.233.198.106:/tmp/
```

服务器上加载：

```bash
gunzip -c /tmp/eo-images.tar.gz | docker load
docker tag ecommerce-operation-assistant-api:latest ecommerce-operation-assistant-worker:latest
rm /tmp/eo-images.tar.gz           # 别占磁盘
```

> 更省事的替代：推到**腾讯云 TCR 个人版**（免费），服务器侧 `docker compose pull`。
> 但首次拉取仍受 4Mbps 限制，收益主要在后续增量更新。

### 3.4 服务器：准备目录与生产环境变量

```bash
sudo mkdir -p /opt/ecommerce-operation-assistant
sudo chown $USER /opt/ecommerce-operation-assistant
cd /opt/ecommerce-operation-assistant

# 本地执行：上传 compose 文件（重命名为 docker-compose.yml，这样不用带 -f）
# scp docker-compose.offline.yml ubuntu@49.233.198.106:/opt/ecommerce-operation-assistant/docker-compose.yml
```

生成密钥（`APP_ENV=production` 会强制校验强度，见下）：

```bash
openssl rand -base64 36    # 跑几次，填下面的占位符
```

写入 `.env`：

```bash
cat > /opt/ecommerce-operation-assistant/.env <<'EOF'
MYSQL_ROOT_PASSWORD=<替换为强密码>
MYSQL_DATABASE=ecommerce_operation
MYSQL_PORT=3306

REDIS_PASSWORD=<替换为强密码>
REDIS_PORT=6379

AGENT_POSTGRES_USER=agent
AGENT_POSTGRES_PASSWORD=<替换为强密码>
AGENT_POSTGRES_DATABASE=agent_checkpoints
AGENT_POSTGRES_PORT=6433

API_PORT=8000
WEB_PORT=3000

APP_ENV=production
AUTH_SECRET_KEY=<至少 32 字符的随机串>
AGENT_MAX_TOTAL_TOKENS=12000
AGENT_MAX_REVISIONS=1
EOF
chmod 600 /opt/ecommerce-operation-assistant/.env
```

> **生产校验规则**（`api/app/core/config.py`）：`APP_ENV=production` 时
> `AUTH_SECRET_KEY` 需 ≥32 字符且不能是 `dev-auth-secret-change-me` 这类占位值，
> `AGENT_CHECKPOINT_PASSWORD` 需 ≥16 字符。不满足会直接启动失败。

### 3.5 启动

```bash
cd /opt/ecommerce-operation-assistant
docker compose up -d
docker compose ps
```

api 容器启动命令自带 `alembic upgrade head`（迁移历史已于 2026-10-12 清理为单一 head，可正常执行）。

**路线 A（保留 Hermes，内存吃紧）**：不启动 worker，并把队列降级为进程内执行 ——
需要同时改 `docker-compose.yml` 里 api 的 `TASK_QUEUE_BACKEND` 为 `inline`，否则任务只会堆积：

```bash
docker compose up -d mysql redis agent-checkpoints api web   # 刻意不含 worker
```

再叠加内存上限（`docker-compose.override.yml`，compose 会自动合并）：

```yaml
services:
  mysql:
    command: --mysql-native-password=ON --innodb-buffer-pool-size=128M --performance-schema=OFF
  redis:
    command: ["sh", "-c", "exec redis-server --requirepass \"$${REDIS_PASSWORD}\" --maxmemory 128mb --maxmemory-policy allkeys-lru"]
  api:
    mem_limit: 512m
  web:
    mem_limit: 384m
```

**路线 B（推荐）**：部署前释放 Hermes 占用的内存：

```bash
systemctl --user stop 'hermes*' 2>/dev/null; pkill -f hermes-agent 2>/dev/null
pkill -f 'weixinpay/dist/mcp-server.mjs' 2>/dev/null
free -m      # 确认可用内存涨到 ~1.6G
```

> Hermes 是通过 systemd user service 跑的，重启机器后会自动回来。想长期停用要 `systemctl --user disable`。

### 3.6 对外入口（与 §3.2 的方案对应）

**方案甲：只开 80（推荐）**

1. 在 `web/next.config.ts` 加同源反代，让 `/api/v1/*` 转发到 api 容器：

```ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: "http://api:8000/api/v1/:path*" },
    ];
  },
};
```

2. 腾出 80 端口。Caddy 当前占着 80，两种情况：

```bash
# 情况一：已按路线 B 停掉 Hermes —— Caddy 是它带来的，一并停掉，web 直接占 80
sudo systemctl disable --now caddy
# 并在 .env 中设 WEB_PORT=80

# 情况二：想保留 Caddy 做反代 —— 改 /etc/caddy/Caddyfile 加站点，再 reload
#   :80 { reverse_proxy 127.0.0.1:3000 }
sudo systemctl reload caddy
```

> 第二种要小心：Caddyfile 由 Hermes Agent 管理，改动可能被它覆盖，改前先备份。

**方案乙：直连 API**：`WEB_PORT=80` + `API_PORT=8000`，两个端口都放通。

### 3.7 放通防火墙

轻量服务器有独立防火墙，**只放通 22 和 ICMP**，必须在控制台或 API 加规则：

| 端口 | 协议 | 用途 |
| --- | --- | --- |
| 80 | TCP | web 入口 |
| 8000 | TCP | 仅方案乙需要 |
| 443 | TCP | 配 HTTPS 后 |

---

## 4. 验证

```bash
# 服务器本机
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/login        # 期望 200
docker compose logs --tail=50 api                                       # 看有无迁移/连接报错

# 本地（走公网）
curl -s -o /dev/null -w "%{http_code}\n" http://49.233.198.106/login
curl -s -o /dev/null -w "%{http_code}\n" http://49.233.198.106/health   # 方案甲应 200
```

初始化管理员账号：

```bash
docker compose exec api python scripts/bootstrap_user.py
```

浏览器打开 `http://49.233.198.106/login`，用初始化出来的账号登录，确认能进工作台、能加载商品/店铺列表。

---

## 5. 必须注意的坑

| # | 坑 | 说明 |
| --- | --- | --- |
| 1 | `NEXT_PUBLIC_API_BASE_URL` 是构建期变量 | 运行期改 compose 环境变量**无效**，必须 `--build-arg` 重构建。填错的表现是浏览器去请求用户自己机器的 `127.0.0.1:8000` |
| 2 | 服务器不能构建 Next.js | 2G 内存 + Hermes 常驻，`npm run build` 会 OOM。必须本地构建 |
| 3 | Caddy 占用 80 | 部署前先决策：停掉 / 复用反代 / 换端口 |
| 4 | 防火墙默认只开 22 | 不开 80 的话外网一律连不上，且现象是"连接超时"而非"拒绝" |
| 5 | 4Mbps 上行 | 传 1GB 镜像约 30 分钟，别以为卡死了 |
| 6 | Docker Hub 拉取慢 | `mysql:8.4`/`redis:7-alpine`/`postgres:16-alpine` 需镜像加速器，见 §3.1 |
| 7 | 数据库名要一致 | offline compose 内 `MYSQL_DATABASE` 与 `DATABASE_URL` 都是 `ecommerce_operation`，容器内自洽；但**本机非容器**跑 api 时 `api/.env` 指向的是 `ecommerce`，两者不同名 |
| 8 | 无域名 | Lighthouse 未托管域名，只能 IP 访问。要上 HTTPS 需先有域名 + 证书 |
| 9 | 磁盘日志 | 已配 `max-size: 10m`，否则 MySQL/容器日志能涨满 50G |

---

## 6. 常用运维命令

```bash
cd /opt/ecommerce-operation-assistant

docker compose ps                      # 状态
docker compose logs -f api             # 跟踪 api 日志
docker compose restart api             # 重启单个服务
docker compose pull && docker compose up -d   # 更新（用 TCR 时）

# 更新代码后的完整流程
#   本地：docker build -t ...-api:latest ./api && 重新 save/scp/load
#   服务器：docker compose up -d --force-recreate api worker

docker compose exec mysql mysql -uroot -p -e "show databases;"   # 进库
docker compose exec api alembic current                           # 看迁移版本
docker compose down                                               # 停止（保留数据卷）
docker compose down -v                                            # 停止并删数据（危险）
```

数据在两个命名卷里：`mysql-data`、`agent-checkpoint-data`（另加 `api-uploads` 存上传文件）。
`docker compose down` 不会删它们，只有 `-v` 才会。

---

## 7. 作品集展示路线（「给别人看」用这条）

目标：部署成**访客打开一个 IP 就能浏览演示**的在线作品集。与 §1-§6 的生产部署相比，
这条路线**只跑 3 个容器、只开 1 个端口**，为本机 2C2G 的规格做的裁剪版本。

### 7.1 与生产部署的差异

| 项 | 生产部署（§1-§6） | 作品集展示 |
| --- | --- | --- |
| 容器 | mysql + redis + agent-checkpoints + api + worker + web（6 个） | **mysql + api + web（3 个）** |
| 异步任务 | Celery worker | `TASK_QUEUE_BACKEND=inline`，在 api 进程内执行 |
| 内存 | 约 1270MB | 约 800MB（compose 里限额合计 1408MB） |
| 对外端口 | 80（8000 视方案） | **仅 80** |
| 编排文件 | `docker-compose.offline.yml` | **`docker-compose.portfolio.yml`** |
| 环境变量模板 | 手写 `.env` | **`.env.portfolio.example`** |

作品集版没有 Redis 和 worker，所以「生成图片/视频」「Agent 工作流」这类耗时任务不会真的执行完——
页面能打开、能登录、能浏览演示数据，但触发重活的按钮不会有结果。这是刻意取舍，换 2C2G 上的稳定性。

### 7.2 三个已核实的结论

1. **不用备案**。腾讯云官方口径：域名不解析到境内云资源时，「仅通过服务器公网 IP 直接访问测试，可暂不备案」。
   备案约束的对象是**域名**，纯 IP 访问不在其列。
2. **HTTP 下能正常登录**。登录 cookie 只设了 `httpOnly + sameSite=lax`，**没有 `secure` 标志**
   （`web/src/app/login/submit/route.ts`），所以 http:// 下 cookie 照常写入。日后换 HTTPS 也无需改代码。
3. **只需要开一个端口**。前端全部 API 调用都在 Next.js 服务端完成，浏览器对后端的访问只有同源的
   `/api/v1/*`，由 `web/next.config.ts` 的 rewrite 转发进 api 容器，因此 8000/3306 不必对公网开放。

### 7.3 步骤（默认路线：在服务器构建镜像）

**为什么在服务器构建**：本机上行只有 4Mbps，上传约 1.8G 的镜像需要一小时以上；
而服务器的**下行不受该带宽限制**，只需上传约 4MB 源码，其余依赖由服务器自行拉取。
代价是构建时占用服务器内存，所以第 ② 步会先加 4G swap 兜底。

**① 本地：打包源码**

```bash
cd /f/ecommerce-operation-assistant

tar --exclude=node_modules --exclude=.next --exclude=.venv --exclude=.git \
    --exclude=.logs --exclude=uploads --exclude=__pycache__ --exclude=.pytest_cache \
    -czf eo-src.tar.gz \
    api web scripts docker-compose.portfolio.yml .env.portfolio.example DEPLOY.md

scp eo-src.tar.gz ubuntu@49.233.198.106:/tmp/
```

**② 服务器：解包 + 装 Docker + 加 swap**

```bash
sudo mkdir -p /opt/ecommerce-portfolio/src && sudo chown $USER /opt/ecommerce-portfolio/src
tar -xzf /tmp/eo-src.tar.gz -C /opt/ecommerce-portfolio/src
bash /opt/ecommerce-portfolio/src/scripts/server-prepare.sh
```

该脚本做三件事：装 Docker（阿里云源）、配国内镜像加速器与日志上限、加 4G swap。
若最后提示 `docker 组权限需重新登录`，重新登录一次即可；未重登时后续命令前面加 `sudo`。

**③ 服务器：停掉 Hermes 与 Caddy，腾出 80 端口和内存**

```bash
systemctl --user stop 'hermes*' 2>/dev/null || true
pkill -f hermes-agent 2>/dev/null || true
sudo systemctl disable --now caddy     # Caddy 由 Hermes 带来，正占着 80

free -m                                # 可用内存应涨到约 1.4G（外加 4G swap）
ss -tlnp | grep ':80 ' || echo "80 已空闲"
```

> Hermes 是 systemd user service，重启机器后会自己回来。长期停用需 `systemctl --user disable`。

**④ 服务器：构建镜像**（2 核 2G，首次约 10~20 分钟）

```bash
bash /opt/ecommerce-portfolio/src/scripts/server-build.sh
```

**⑤ 服务器：准备编排与生产变量**

```bash
cd /opt/ecommerce-portfolio
cp src/docker-compose.portfolio.yml .
cp src/.env.portfolio.example .env
openssl rand -base64 36     # 跑几次，填 MYSQL_ROOT_PASSWORD / AUTH_SECRET_KEY / AGENT_CHECKPOINT_PASSWORD
vi .env                     # WEB_PORT 保持 80
chmod 600 .env
```

> `APP_ENV=production` 会强制校验：`AUTH_SECRET_KEY` 至少 32 字符、`AGENT_CHECKPOINT_PASSWORD` 至少 16 字符。
> 作品集不连接 PostgreSQL 检查点，但该校验与连接无关，仍须填一个随机串（`.env.portfolio.example` 已注明）。

**⑥ 启动**

```bash
docker compose -f docker-compose.portfolio.yml up -d
docker compose -f docker-compose.portfolio.yml ps
```

api 容器启动时自带 `alembic upgrade head`，首次会建表（迁移已于 2026-10-12 清理为单一 head）。

**⑦ 建账号 + 灌演示数据**

```bash
docker compose -f docker-compose.portfolio.yml exec api python scripts/bootstrap_user.py
```

账号取自 `.env` 的 `BOOTSTRAP_EMAIL` / `BOOTSTRAP_PASSWORD`，默认角色 `owner`。
登录后在首页点「生成演示数据」即可（对应后端 `/api/v1/workspace/demo-data`，**幂等**，重复点不会重复生成），
会创建演示店铺 + 商品 / SKU / 投放实验等成套数据。

若要给访客一个**只读账号**（推荐，避免演示数据被改乱）：

```bash
docker compose -f docker-compose.portfolio.yml exec \
  -e BOOTSTRAP_EMAIL=guest@example.com \
  -e BOOTSTRAP_PASSWORD=<访客密码> \
  -e BOOTSTRAP_DISPLAY_NAME=访客 \
  -e BOOTSTRAP_ROLE=viewer \
  api python scripts/bootstrap_user.py
```

> 角色取值只有三个：`owner` / `operator` / `viewer`。`viewer` 无编辑权限，
> 因此**不能**用它去点「生成演示数据」——先用 owner 生成，再把 viewer 账号给访客。

**⑧ 放通防火墙**

轻量服务器默认只放通 22 + ICMP，需在控制台放通 **80/TCP**。
没放通的现象是「连接超时」而不是「连接被拒绝」，容易误判为服务没起来。

**⑨ 验证并分享**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/login        # 服务器本机，期望 200
curl -s -o /dev/null -w "%{http_code}\n" http://49.233.198.106/login   # 走公网
```

分享链接就是 `http://49.233.198.106`，连同演示账号密码一起发给访客。
微信内打开会提示「非官方网页」，点继续即可正常浏览。

### 7.4 备用路线：本机构建后上传镜像

只有当服务器不便联网拉依赖、或需要固定镜像产物时才用这条。**注意本机上行的 4Mbps 是硬瓶颈**。

```bash
cd /f/ecommerce-operation-assistant

docker build -t ecommerce-operation-assistant-api:latest ./api
# NEXT_PUBLIC_API_BASE_URL 默认留空 → 页面拼出的链接走相对路径，换 IP/域名都不用重建
docker build -t ecommerce-operation-assistant-web:latest ./web

docker save ecommerce-operation-assistant-api:latest \
            ecommerce-operation-assistant-web:latest | gzip -9 > eo-portfolio.tar.gz
scp eo-portfolio.tar.gz ubuntu@49.233.198.106:/tmp/
```

服务器侧：

```bash
gunzip -c /tmp/eo-portfolio.tar.gz | sudo docker load && rm /tmp/eo-portfolio.tar.gz
```

> 基础镜像 `mysql:8.4` 仍由服务器自行拉取（走腾讯云内网镜像源，通常几分钟）。

**本机构建的已知障碍（本机实测）**：Docker Desktop 的 WSL 虚拟机在物理内存吃紧时会被反复压垮，
表现为构建中途报 `error reading connection: rpc error: code = Unavailable ... EOF`。
构建前请先确认任务管理器里内存占用低于 85%（本机实测 96% 时必然失败）。

### 7.5 作品集路线专属的坑

| # | 坑 | 说明 |
| --- | --- | --- |
| 1 | 「只上传网址」不成立 | 服务器不会凭一个 URL 变出项目，必须把程序传上去跑起来；IP 只是访问入口 |
| 2 | 80 被 Caddy 占着 | 不先 `systemctl disable --now caddy`，web 容器会因端口冲突起不来 |
| 3 | 服务器 2026-11-09 到期 | 不续费则链接立即失效，作品集有保质期 |
| 4 | 服务器内存不足以构建 | 2G 机器构建 Next.js 需要约 1.5G 峰值，**必须先加 swap**（`server-prepare.sh` 已含） |
| 5 | `NEXT_PUBLIC_API_BASE_URL` 不能留 127.0.0.1 | 它是**构建期**烘焙进客户端 bundle 的。Dockerfile 已改为默认留空 → 分享/资源链接走相对路径，访客不会去请求自己电脑的 8000 |
| 6 | 无 HTTPS | IP + HTTP，浏览器可能提示「不安全」；上 HTTPS 需要域名 + 证书 |
| 7 | 定时任务不执行 | 没有 worker/beat，outbox 投递与图片/视频生成任务不会跑完 |
| 8 | 访客会改数据 | 给 viewer 账号可避免；给 owner 则任何人都能增删演示数据 |
| 9 | 不要在本项目里跑 `alembic upgrade heads` | 迁移历史已于 2026-10-12 归并为唯一 head，用 `head` 即可 |
| 10 | 缺两个直接依赖声明 | `lucide-react`、`zod` 被源码引用却没写进 `web/package.json`；本地 `node_modules` 里存在所以开发正常，容器里 `npm ci` 严格按 lock 安装就会缺包（报 `Module not found`）。已于 2026-10-12 补进 `dependencies`。**其中 `zod` 是运行期依赖**（用于 `route.ts` 的入参校验），若只补 `lucide-react`，构建能过但接口会在运行时崩 |
| 11 | `python scripts/bootstrap_user.py` 直接跑会 ImportError | `sys.path[0]` 是 `scripts/`，找不到 `app` 包。已在脚本头部补上项目根目录，现在可直接运行 |

### 7.6 本次实际部署记录（2026-10-12）

按 §7.3 路线完成，实际耗时与结果如下，可作为二次部署的参照。

| 步骤 | 实际结果 |
| --- | --- |
| 服务器环境 | Ubuntu 24.04 / 2C2G / 已装 Docker 29.9.0 + Compose v5.6.0（apt 装 docker-ce 用**腾讯内网源** `mirrors.tencentyun.com`，比阿里云快一倍） |
| swap | 镜像自带 1.9G + 新增 4G = **6.1G**，构建与运行期都够用 |
| 构建耗时 | apt 阶段 498s（走 aliyun Debian 源）、pip 阶段 56s（走清华源）、`next build` 约 90s、npm ci 16s（走 npmmirror） |
| 镜像体积 | api 797MB、web 1.12GB |
| 启动 | 三容器 90 秒内全部 healthy |
| 对外访问 | `http://49.233.198.106` 首页与登录页 200（公网实测约 65ms） |
| 端到端 | 前端表单登录 → 303 + httpOnly cookie → 商品/店铺/导入/设置页全 200，`/products/1` 渲染出演示数据；未登录访问 `/agent` → 307 跳登录 |

**演示账号**（访客用 `guest` 只读账号，避免演示数据被改乱）：

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `demo@example.com` | `PortfolioDemo2026` | owner（可编辑、可重新生成演示数据） |
| `guest@example.com` | `GuestDemo2026` | viewer（只读） |

> 演示数据由 `demo` 账号调用 `/api/v1/workspace/demo-data` 生成（幂等）：
> 1 个店铺 + 2 个商品 + 3 个 SKU。

