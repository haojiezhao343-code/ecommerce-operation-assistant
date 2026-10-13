# Ecommerce Operation Assistant（电商运营助手）

面向电商运营场景的全栈应用：**FastAPI 后端 + Next.js 前端 + LangGraph 多智能体编排**。
覆盖商品与店铺管理、SKU 库存与补货建议、广告实验与投放推荐、素材（图片 / 视频）生成、
竞品监控、运营诊断等模块。

## 仓库结构

```text
ecommerce-operation-assistant/
├── api/                        # FastAPI 后端（Python 3.12，uv 管理依赖）
│   ├── app/
│   │   ├── agents/             # LangGraph 智能体：图编排、专家节点、工具网关、评估
│   │   ├── api/routes/         # HTTP 路由层（auth / products / stores / workspace / agent_* ...）
│   │   ├── core/config.py      # pydantic-settings 配置中心（读取 api/.env）
│   │   ├── db/                 # SQLAlchemy 会话与 Base
│   │   ├── services/           # 业务服务层（生成任务、库存、诊断、广告实验 ...）
│   │   ├── worker/             # Celery 应用与任务
│   │   ├── models.py           # ORM 模型
│   │   ├── schemas.py          # Pydantic 出入参模型
│   │   └── main.py             # 应用入口：app.main:app
│   ├── alembic/versions/       # 数据库迁移脚本
│   ├── scripts/                # 运维脚本（如初始化首个管理员账号）
│   ├── tests/                  # pytest 用例（默认走内存 SQLite，不连课堂 MySQL）
│   ├── evals/                  # 运营场景评估样本
│   ├── .env                    # 后端本地环境变量（不入库）
│   └── pyproject.toml          # 依赖与构建配置（uv）
├── web/                        # Next.js 16 前端（React 19 + TypeScript + Tailwind 4）
│   └── src/app/                # App Router 页面：login / products / stores / workspace / agent ...
├── .idea/                      # PyCharm 工程配置（运行配置已预置）
├── docker-compose.yml          # 全栈编排：mysql + redis + agent-checkpoints + api + worker + web
├── docker-compose.offline.yml  # 仅数据依赖的离线编排（不含 api / web 容器）
└── .env                        # docker compose 变量（不入库）
```

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端框架 | FastAPI + Uvicorn |
| 数据访问 | SQLAlchemy 2.x + Alembic + PyMySQL |
| 任务队列 | Celery + Redis（`TASK_QUEUE_BACKEND=inline` 时退化为同步执行） |
| 智能体 | LangGraph + langgraph-checkpoint-postgres（PostgreSQL 持久化检查点） |
| 可观测性 | OpenTelemetry（OTLP HTTP 导出，可选） |
| 配置 | pydantic-settings（`.env` 强校验，生产环境拒绝弱密钥） |
| 前端 | Next.js 16 / React 19 / TypeScript 5 / Tailwind CSS 4 / ESLint 9 |
| 依赖管理 | 后端 uv（`uv.lock`）、前端 npm（`package-lock.json`） |

## 端口约定

| 服务 | 端口 | 配置项 |
| --- | --- | --- |
| API | 8000 | `API_PORT` |
| Web | 3000 | `WEB_PORT` |
| MySQL 8.4 | 3306 | `MYSQL_PORT` |
| Redis 7 | 6379 | `REDIS_PORT` |
| PostgreSQL 16（Agent 检查点） | 6433 | `AGENT_POSTGRES_PORT` |

## 快速开始

### 1. 启动本地数据依赖

```bash
docker compose up -d mysql redis agent-checkpoints
```

> MySQL 8.4 默认关闭 `mysql_native_password`，旧版 Navicat 无法连接；
> `docker-compose.yml` 已通过 `--mysql-native-password=ON` 显式开启。

### 2. 启动后端

```bash
cd api
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- 健康检查：<http://127.0.0.1:8000/health>
- 接口文档：<http://127.0.0.1:8000/docs>
- 业务接口统一挂在 `/api/v1` 下

需要异步任务时，把 `api/.env` 的 `TASK_QUEUE_BACKEND` 改为 `celery` 并另开一个终端：

```bash
cd api
uv run celery -A app.worker.celery_app.celery_app worker \
  --loglevel=INFO --pool=solo -B \
  -Q generation,agent,agent.workflow,maintenance
```

> Windows 上 Celery 默认 prefork 池会报 `PermissionError(13, 拒绝访问)`，**必须加 `--pool=solo`**。

### 3. 启动前端

```bash
cd web
npm install
npm run dev
```

打开 <http://localhost:3000>。前端通过 `web/.env.local` 的 `NEXT_PUBLIC_API_BASE_URL` 访问后端。

### 4. 一键全栈容器（可选）

```bash
docker compose --profile '*' up --build
```

## 环境变量

三个 `.env` 各管一段，均不入库，请从同名 `.env.example` 复制后填写：

| 文件 | 作用域 | 说明 |
| --- | --- | --- |
| `.env` | docker compose | MySQL / Redis / PostgreSQL 端口与密码、API / Web 对外端口 |
| `api/.env` | 后端进程 | `DATABASE_URL`、`REDIS_URL`、`AUTH_SECRET_KEY`、LLM 与图片 / 视频生成凭证 |
| `web/.env.local` | 前端进程 | `NEXT_PUBLIC_API_BASE_URL`、`API_INTERNAL_BASE_URL` |

后端 `api/.env` 由 `app/core/config.py` 强制校验：`APP_ENV=production` 时
`AUTH_SECRET_KEY` 必须 ≥32 位且不能是占位值，`AGENT_CHECKPOINT_PASSWORD` 必须 ≥16 位。

## 数据库迁移

```bash
cd api
uv run alembic upgrade head                          # 升级到最新
uv run alembic revision --autogenerate -m "说明"      # 生成迁移
uv run alembic downgrade -1                          # 回退一步
```

## 初始化首个账号

```bash
cd api
BOOTSTRAP_EMAIL=owner@example.com \
BOOTSTRAP_PASSWORD='一个足够强的密码' \
BOOTSTRAP_DISPLAY_NAME=Owner \
BOOTSTRAP_ROLE=owner \
uv run python scripts/bootstrap_user.py
```

`BOOTSTRAP_ROLE` 可选值：`owner`、`operator`、`viewer`。

## 测试

```bash
cd api
uv run pytest
```

`tests/conftest.py` 会把 `DATABASE_URL` 覆盖为 `sqlite:///:memory:`，因此**测试不会写入业务库**。

## 在 PyCharm 中开发

仓库已内置 `.idea/` 工程配置，用 PyCharm 直接 **Open** 仓库根目录 `ecommerce-operation-assistant` 即可。

1. **解释器**：工程默认指向 `Python 3.12 (ecommerce-operation-assistant)`。
   若提示解释器无效，按 `Settings → Project: ecommerce-operation-assistant → Python Interpreter →
   Add Local Interpreter → Existing`，选择 `api/.venv/Scripts/python.exe`（uv 创建的虚拟环境）。
2. **源码根**：`api` 已被标记为 Sources Root、`api/tests` 标记为 Test Sources Root，
   因此 `import app.xxx` 可正常解析。
3. **已内置的运行配置**（运行下拉框直接可用）：

   | 名称 | 作用 |
   | --- | --- |
   | `API · uvicorn (热重载)` | 启动后端，工作目录 `api/`，自动加载 `api/.env` |
   | `API · Celery worker + beat` | 启动 Celery worker 与 beat（已带 `--pool=solo`） |
   | `API · Alembic upgrade head` | 执行数据库迁移 |
   | `API · pytest` | 运行 `api/tests` 全部用例 |
   | `API · bootstrap 初始账号` | 初始化首个账号（需先填 `BOOTSTRAP_PASSWORD`） |

4. **数据库面板**：`.idea/dataSources.xml` 已预置两个数据源
   （`ecommerce_operation` @ MySQL 3306、`agent_checkpoints` @ PostgreSQL 6433），首次连接需补填密码。

> `.idea/workspace.xml`、`.idea/dataSources.local.xml` 属本地个人状态，已在 `.idea/.gitignore` 中排除。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| `PermissionError(13, 拒绝访问)` 启动 Celery | Windows 平台问题，worker 加 `--pool=solo` |
| `[WinError 10013]` 启动 uvicorn | 端口被占用（非权限问题），用 `netstat -ano \| findstr :8000` 找到进程后释放 |
| 旧版 Navicat 连不上 MySQL | 8.4 默认禁用 `mysql_native_password`，compose 已开启；如自建容器需手动加该参数 |
| 前端请求 404 / CORS 报错 | 检查 `api/.env` 的 `API_CORS_ORIGINS` 是否包含前端地址与端口 |
| PyCharm 不识别 `import app.*` | 确认 `api` 目录已被标记为 Sources Root（见上文第 2 点） |
