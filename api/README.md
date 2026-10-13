# Ecommerce Operation Assistant API

电商运营助手后端服务，基于 **FastAPI + SQLAlchemy + Celery + LangGraph**。
应用入口为 `app.main:app`，业务接口统一挂在 `/api/v1` 前缀下。

## 目录说明

| 路径 | 说明 |
| --- | --- |
| `app/main.py` | 应用装配：CORS 中间件、`/health`、以及 `/api/v1` 下的业务路由 |
| `app/core/config.py` | `Settings`（pydantic-settings），读取本目录 `.env`，含生产环境密钥强度校验 |
| `app/api/routes/` | 路由层：`auth`、`products`、`stores`、`workspace`、`users`、`model_settings`、`promotion_links`、`agent_platform`、`agent_runs`、`health` |
| `app/services/` | 业务服务层：商品导入、库存、广告实验与投放推荐、素材生成、竞品监控、运营诊断、审核等 |
| `app/agents/` | LangGraph 智能体：`graph` 图编排、`specialists` 专家节点、`tool_gateway` 工具网关、`registry` 注册表、`evaluation` 评估、`persistence` 检查点 |
| `app/worker/` | Celery 应用（`celery_app.py`）与任务（`tasks.py`） |
| `app/models.py` / `app/schemas.py` | ORM 模型 / Pydantic 出入参 |
| `app/db/` | `session.py` 会话工厂、`base.py` Base |
| `alembic/` | 迁移环境与 `versions/` 脚本 |
| `scripts/` | 运维脚本，例如 `bootstrap_user.py` |
| `tests/` | pytest 用例（`conftest.py` 强制使用内存 SQLite） |
| `evals/` | 运营场景评估样本 |

## 安装

```bash
uv sync                                  # 按 pyproject.toml / uv.lock 安装
cp .env.example .env                     # 再填写数据库、Redis、LLM 等凭证
uv run alembic upgrade head              # 建表 / 升级
```

> 未安装 uv 时可用传统方式：`python -m venv .venv && .venv/Scripts/pip install -r requirements.txt`。

## 运行

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- 健康检查 `/health`，接口文档 `/docs`
- 异步任务模式需要 Redis，将 `TASK_QUEUE_BACKEND` 设为 `celery` 后启动 worker：

```bash
uv run celery -A app.worker.celery_app.celery_app worker \
  --loglevel=INFO --pool=solo -B \
  -Q generation,agent,agent.workflow,maintenance
```

Windows 上**必须** `--pool=solo`，否则默认 prefork 池会报 `PermissionError(13, 拒绝访问)`。

## 测试与静态检查

```bash
uv run pytest            # 单元测试（内存 SQLite）
uv run ruff check .      # 静态检查
uv run ruff format .     # 格式化
```

## 关键环境变量

完整清单见 `.env.example`，重点是：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 业务库连接串，如 `mysql+pymysql://root:***@127.0.0.1:3306/ecommerce_operation` |
| `REDIS_URL` | Celery broker / backend |
| `TASK_QUEUE_BACKEND` | `inline`（同步执行）或 `celery` |
| `AUTH_SECRET_KEY` | JWT 签名密钥，生产环境要求 ≥32 位强随机值 |
| `AGENT_CHECKPOINT_*` | LangGraph 检查点 PostgreSQL 连接参数 |
| `LLM_*` / `IMAGE_*` / `VIDEO_*` | 大模型与素材生成服务凭证 |
