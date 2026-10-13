# -*- coding: utf-8 -*-
"""
电商运营助手（轻量版）
- 可视化看板：KPI / GMV 趋势 / 品类占比 / 转化漏斗 / 热销榜
- 自然语言问答：基于看板数据的 AI 运营分析师（DashScope qwen-plus，流式 SSE）
"""
import json
import random
import time
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"

DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
CHAT_MODEL = os.environ.get("CHAT_MODEL", "qwen-plus")

app = FastAPI(title="电商运营助手")

# ---------------------------------------------------------------- mock 数据
rng = random.Random(20261012)
CATEGORIES = {
    "女装": 0.26, "美妆": 0.21, "数码家电": 0.18, "食品生鲜": 0.14,
    "家居日用": 0.12, "母婴": 0.09,
}
PRODUCTS = {
    "女装": ["法式碎花连衣裙", "高腰直筒牛仔裤", "针织开衫外套", "白衬衫宽松款"],
    "美妆": ["水光精华液30ml", "哑光口红礼盒", "氨基酸洁面乳", "防晒霜SPF50"],
    "数码家电": ["无线蓝牙耳机Pro", "智能手环7代", "便携榨汁杯", "65W氮化镓充电器"],
    "食品生鲜": ["每日坚果750g", "五常大米10kg", "冻干咖啡冷萃液", "即食鸡胸肉"],
    "家居日用": ["抗菌四件套", "香薰蜡烛套装", "免手洗拖把", "收纳箱三件套"],
    "母婴": ["婴儿纸尿裤L码", "儿童保温杯", "宝宝辅食机", "婴儿润肤霜"],
}

DAYS = 30
today = date.today()
trend = []          # 近30天 GMV/订单
for i in range(DAYS):
    d = today - timedelta(days=DAYS - 1 - i)
    base = 86000 + 26000 * (i / DAYS)          # 稳步增长
    weekend = 1.18 if d.weekday() >= 5 else 1.0
    noise = rng.uniform(0.88, 1.12)
    gmv = round(base * weekend * noise)
    orders = round(gmv / rng.uniform(95, 130))
    trend.append({"date": d.strftime("%m-%d"), "gmv": gmv, "orders": orders,
                  "uv": round(orders / rng.uniform(0.018, 0.026))})

today_row, yest_row = trend[-1], trend[-2]
kpi = {
    "gmv": today_row["gmv"],
    "gmv_huan": round((today_row["gmv"] - yest_row["gmv"]) / yest_row["gmv"] * 100, 1),
    "orders": today_row["orders"],
    "orders_huan": round((today_row["orders"] - yest_row["orders"]) / yest_row["orders"] * 100, 1),
    "aov": round(today_row["gmv"] / today_row["orders"], 1),
    "conv": 3.2,
    "conv_huan": 0.4,
    "refund_rate": 4.6,
    "refund_huan": -0.3,
}

# 品类与商品
category_sales = {k: round(today_row["gmv"] * 30 * v) for k, v in CATEGORIES.items()}
products = []
for cat, p_rate in CATEGORIES.items():
    for name in PRODUCTS[cat]:
        sales_gmv = round(category_sales[cat] * rng.uniform(0.15, 0.35))
        products.append({
            "name": name, "category": cat, "gmv": sales_gmv,
            "orders": round(sales_gmv / rng.uniform(80, 150)),
            "refund": round(rng.uniform(1.5, 7.5), 1),
            "stock": rng.choice([120, 340, 520, 80, 45, 2600]),
        })
products.sort(key=lambda x: -x["gmv"])
top_products = products[:10]

funnel = {"曝光": 1286000, "点击": 386000, "加购": 152000, "下单": 58000, "支付": today_row["orders"] * 30}
regions = [("华东", 0.34), ("华南", 0.22), ("华北", 0.18), ("西南", 0.12),
           ("华中", 0.08), ("东北", 0.04), ("西北", 0.02)]
region_data = [{"name": n, "gmv": round(sum(t["gmv"] for t in trend) * p)} for n, p in regions]

DASHBOARD = {"kpi": kpi, "trend": trend, "category": category_sales,
             "top_products": top_products, "funnel": funnel, "regions": region_data}

def data_digest() -> str:
    """把看板数据压缩成文本上下文，注入给 LLM。"""
    t30 = sum(t["gmv"] for t in trend)
    o30 = sum(t["orders"] for t in trend)
    lines = [
        f"数据日期：{today}（近30天）",
        f"今日GMV：{today_row['gmv']}元，环比{kpi['gmv_huan']}%",
        f"今日订单：{today_row['orders']}单，环比{kpi['orders_huan']}%；客单价：{kpi['aov']}元",
        f"近30天总GMV：{t30}元，总订单：{o30}单，平均客单价：{round(t30/o30,1)}元",
        f"支付转化率：{kpi['conv']}%，退款率：{kpi['refund_rate']}%",
        "近30天GMV趋势（日期:GMV）：" + "，".join(f"{t['date']}:{t['gmv']}" for t in trend),
        "品类GMV（近30天）：" + "，".join(f"{k}:{v}" for k, v in category_sales.items()),
        "热销TOP10：" + "；".join(f"{p['name']}({p['category']}) GMV{p['gmv']}元 订单{p['orders']} 退款率{p['refund']}% 库存{p['stock']}" for p in top_products),
        "转化漏斗：" + "，".join(f"{k}:{v}" for k, v in funnel.items()),
        "地区GMV：" + "，".join(f"{r['name']}:{r['gmv']}" for r in region_data),
    ]
    return "\n".join(lines)

SYSTEM_PROMPT = (
    "你是「电商运营助手」的 AI 运营分析师，面向电商运营人员提供数据问答与经营建议。\n"
    "以下是店铺真实运营数据（模拟数据源），回答时必须基于这些数据，给出具体数字；"
    "涉及经营建议时给出可执行的动作。用简体中文，条理清晰，重要数字加粗（markdown），"
    "回答控制在300字以内。\n\n" + data_digest()
)

# ---------------------------------------------------------------- 限速
RATE = defaultdict(list)
RATE_LIMIT, RATE_WINDOW = 20, 60

def too_fast(ip: str) -> bool:
    now = time.time()
    q = [t for t in RATE[ip] if now - t < RATE_WINDOW]
    q.append(now)
    RATE[ip] = q
    return len(q) > RATE_LIMIT

# ---------------------------------------------------------------- 路由
@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")

@app.get("/api/dashboard")
def dashboard():
    return DASHBOARD

@app.post("/api/chat")
async def chat(req: Request):
    body = await req.json()
    question = (body.get("message") or "").strip()
    if not question:
        return JSONResponse({"error": "消息不能为空"}, status_code=400)
    if too_fast(req.client.host):
        return JSONResponse({"error": "提问太频繁，请稍后再试"}, status_code=429)
    if not DASHSCOPE_KEY:
        return JSONResponse({"error": "服务端未配置 DASHSCOPE_API_KEY"}, status_code=500)

    history = body.get("history") or []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-6:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])[:2000]})
    messages.append({"role": "user", "content": question[:1000]})

    payload = {"model": CHAT_MODEL, "messages": messages,
               "stream": True, "temperature": 0.6, "max_tokens": 800}

    async def gen():
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                async with client.stream(
                    "POST", f"{DASHSCOPE_BASE}/chat/completions",
                    headers={"Authorization": f"Bearer {DASHSCOPE_KEY}"},
                    json=payload,
                ) as resp:
                    if resp.status_code != 200:
                        text = (await resp.aread()).decode("utf-8", "ignore")[:300]
                        yield f"data: {json.dumps({'error': f'LLM服务异常 {resp.status_code}: {text}'}, ensure_ascii=False)}\n\n"
                        return
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        chunk = line[5:].strip()
                        if chunk == "[DONE]":
                            break
                        try:
                            delta = json.loads(chunk)["choices"][0]["delta"]
                            c = delta.get("content")
                            if c:
                                yield f"data: {json.dumps({'content': c}, ensure_ascii=False)}\n\n"
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except httpx.HTTPError as e:
            yield f"data: {json.dumps({'error': f'网络异常: {e}'}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

app.mount("/", StaticFiles(directory=STATIC), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "80")), log_level="warning")
