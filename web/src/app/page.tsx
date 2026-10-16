import Link from "next/link";

import { ProductCreateForm } from "@/components/product-create-form";
import { StoreCreateForm } from "@/components/store-create-form";
import { getCurrentUser, getProducts, getStores } from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type { Platform, Product, Store } from "@/types";

/* ==========================================================================
   页面样式（对照 designs/workspace.html 内联 <style> 移植）
   —— 只消费 design-system.css 的 token，不引入任何裸色值/裸圆角/裸阴影
   ========================================================================== */
const workspaceCss = `
  .app { grid-template-rows: auto 1fr; grid-template-columns: minmax(0, 1fr); }

  /* ---- 结构修复：文档大纲（品牌名 h1、步骤标题 h2→h3，渲染像素不变） ---- */
  .app-top .brand h1 { font: inherit; letter-spacing: inherit; text-wrap: wrap; }
  .panel-head h2 { font-size: var(--fs-h3); }
  .panel-inverted h2 { color: var(--bg); }
  /* 反白面板的头部去掉实底，只留发丝线（明暗双主题都成立） */
  .panel-head-inverted { background: transparent; border-bottom-color: var(--border); }
  .app-top-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
  .app-top-form { display: flex; align-items: center; gap: .5rem; }
  .onboard-step h3 { font-size: var(--fs-h3); }

  .wrap { width: 100%; max-width: var(--max-w); margin-inline: auto; }
  .sec { margin-bottom: var(--sp-7); }
  .sec:last-child { margin-bottom: 0; }
  .sec-hd {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp-3) var(--sp-4); flex-wrap: wrap;
    margin-bottom: var(--sp-4); padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .sec-hd h2 { font-size: var(--fs-h2); }
  .sec-hd .mono-note { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .sec-hd-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

  /* ---- 反白面板内的文字与按钮（明暗双主题对比度均达标） ---- */
  .panel-inverted h4 { color: var(--bg); }
  .panel-inverted .tick,
  .panel-inverted .step-idx { color: var(--bg); }
  .panel-inverted .t-mini { color: color-mix(in oklch, var(--bg) 72%, var(--fg)); }
  .panel-inverted .eyebrow { color: color-mix(in oklch, var(--bg) 72%, var(--fg)); }
  .panel-inverted .btn:disabled {
    opacity: 1;
    background: transparent;
    border-color: var(--border);
    color: color-mix(in oklch, var(--bg) 62%, var(--fg));
  }

  .tick {
    display: inline-flex; align-items: center; gap: .4em;
    padding: .2em .55em; border: 1px solid var(--border); border-radius: var(--radius);
    font-family: var(--font-mono); font-size: var(--fs-mini);
    font-weight: 600; letter-spacing: .04em; white-space: nowrap;
  }
  .tick.is-done { border-color: var(--success); color: var(--success); }
  .tick.is-next { border-color: var(--accent); color: var(--accent); }

  /* ---- 上手清单（前置，反白面板承担全页最高层级） ---- */
  .onboard { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .onboard-step {
    min-width: 0; padding: var(--sp-4);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; gap: .5rem;
  }
  .onboard-step:last-child { border-right: 0; }
  .step-idx {
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .12em; opacity: .8;
  }
  .onboard-step p { font-size: var(--fs-meta); line-height: 1.7; flex: 1; }
  .onboard-step .tick { align-self: flex-start; }
  .onboard-step .btn { align-self: stretch; }

  /* ---- 初始化引导（全 0 时的替代物：引导面板而不是三个没有意义的零） ---- */
  .callout {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    gap: var(--sp-4) var(--sp-6); align-items: center;
    border: 1px solid var(--border); border-left: 3px solid var(--accent);
    border-radius: var(--radius); background: var(--accent-tint);
    padding: var(--sp-4) var(--sp-5); margin-top: var(--sp-4);
  }
  .callout h3 { font-size: var(--fs-h3); margin-bottom: .375rem; }
  .callout p { font-size: var(--fs-meta); color: var(--fg-secondary); }
  .guide { display: flex; flex-direction: column; gap: var(--sp-3); }
  .guide-item {
    display: grid; grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: var(--sp-3); align-items: center;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); padding: var(--sp-3);
  }
  .guide-idx {
    width: 28px; height: 28px; display: grid; place-items: center;
    border: 1px solid var(--border-strong); border-radius: var(--radius);
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700; color: var(--fg);
  }
  .guide-text { min-width: 0; }
  .guide-text b { display: block; font-size: var(--fs-meta); }
  .guide-text span { font-size: var(--fs-mini); color: var(--muted); }

  /* ---- KPI 面板（统计条有容器 + 2px 顶边做层级） ---- */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-4); }
  .kpi {
    min-width: 0; padding: var(--sp-4);
    border: 1px solid var(--border); border-top-width: 2px; border-radius: var(--radius);
    background: var(--surface);
    display: flex; flex-direction: column; gap: .5rem;
  }
  .kpi.is-lead { border-top-color: var(--accent); }
  .kpi-lbl {
    display: flex; align-items: center; gap: .5rem;
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--faint);
  }
  .kpi-val { font-family: var(--font-display); font-size: var(--fs-h1); font-weight: 700; line-height: 1.12; }
  /* 未初始化态：数字不再是「数据」，只是缺省占位 */
  .kpi-val.is-idle { color: var(--muted); }
  .kpi-desc { font-size: var(--fs-meta); color: var(--muted); line-height: 1.7; flex: 1; }
  .kpi-foot {
    display: flex; align-items: center; justify-content: space-between;
    gap: .5rem; flex-wrap: wrap;
    padding-top: var(--sp-3); border-top: 1px solid var(--border);
  }

  /* ---- Tab（平台筛选） ---- */
  .tabs { display: flex; gap: .25rem; flex-wrap: wrap; border-bottom: 1px solid var(--border); margin-bottom: var(--sp-4); }
  .tab {
    display: inline-flex; align-items: center; justify-content: center; gap: .4em;
    min-height: 44px; padding: .5rem .875rem;
    border: 1px solid transparent; border-bottom: 0;
    border-radius: var(--radius) var(--radius) 0 0;
    background: transparent; color: var(--muted);
    font-family: var(--font-mono); font-size: var(--fs-mini);
    font-weight: 600; letter-spacing: .06em; white-space: nowrap;
    transition: color var(--t-2) var(--ease-state), background-color var(--t-2) var(--ease-state);
  }
  .tab:hover { color: var(--fg); background: var(--surface-subtle); }
  .tab[aria-selected="true"] { background: var(--surface); border-color: var(--border); color: var(--fg); margin-bottom: -1px; }
  .tab .n { color: var(--faint); }
  .tab[aria-selected="true"] .n { color: var(--accent); }

  /* ---- 店铺卡片 ---- */
  .store-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); }
  .store-card {
    min-width: 0; padding: var(--sp-4);
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface);
    display: flex; flex-direction: column; gap: var(--sp-3);
  }
  .store-card.is-selected { border-color: var(--border-accent); background: var(--accent-tint); }
  .store-card-hd { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); }
  .store-name { font-weight: 700; font-size: var(--fs-meta); }
  .store-sub { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .store-stats { display: flex; gap: var(--sp-4); flex-wrap: wrap; font-size: var(--fs-mini); color: var(--muted); }
  .store-stats b { color: var(--fg); }
  .store-actions { display: flex; gap: .375rem; flex-wrap: wrap; }

  /* ---- 建档表单栅格 ---- */
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); }

  /* ---- 提示行 ---- */
  .notice {
    display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
    font-size: var(--fs-mini); color: var(--muted); line-height: 1.7;
  }
  .notice .ic { color: var(--faint); flex: none; }
  .notice-warn .ic { color: var(--warn); }
  .notice-ok .ic { color: var(--success); }

  /* ---- 空态：指向下一步而不是只说「暂无数据」 ---- */
  .empty-actions { display: flex; justify-content: center; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
  .empty-next {
    margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
    display: flex; align-items: center; justify-content: center; gap: .5rem; flex-wrap: wrap;
  }

  /* ---- 商品池表格 ---- */
  .tbl-cover {
    width: 44px; height: 44px; flex: none;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken);
    display: grid; place-items: center; color: var(--faint);
    font-family: var(--font-mono); font-size: 10px;
  }
  .cell-goods { display: flex; align-items: center; gap: var(--sp-3); min-width: 12rem; }
  .cell-goods b { font-weight: 600; }
  .cell-goods span { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .cell-price { font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }
  .cell-actions { display: flex; gap: .375rem; flex-wrap: wrap; }
  .tbl-note {
    display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
    padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--border);
    background: var(--surface-subtle);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
  }

  /* ---- 响应式 ---- */
  @media (max-width: 1023px) {
    .onboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .onboard-step:nth-child(2) { border-right: 0; }
    .onboard-step:nth-child(-n+2) { border-bottom: 1px solid var(--border); }
    .callout { grid-template-columns: minmax(0, 1fr); gap: var(--sp-4); }
    .form-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 899px) {
    .store-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767px) {
    .kpi-grid { grid-template-columns: minmax(0, 1fr); }
    .onboard { grid-template-columns: minmax(0, 1fr); }
    .onboard-step { border-right: 0; border-bottom: 1px solid var(--border); }
    .onboard-step:last-child { border-bottom: 0; }
    .guide-item { grid-template-columns: 28px minmax(0, 1fr); }
    .guide-item .btn { grid-column: 1 / -1; }
    /* 窄屏表格：按最大内容宽度铺开，由 .tbl-wrap 承担横向滚动 */
    .tbl-wrap .tbl { width: max-content; max-width: 960px; min-width: 100%; }
    .tabs { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex: 0 0 auto; }
  }
`;

const platformLabels: Record<Platform, string> = {
  douyin: "抖音",
  taobao: "淘宝",
  tmall: "天猫",
  pinduoduo: "拼多多",
  jd: "京东",
  tiktok_shop: "TikTok",
  amazon: "Amazon",
  other: "其他",
};

const platformFilters: Array<{ value: "all" | Platform; label: string }> = [
  { value: "all", label: "全部" },
  { value: "douyin", label: "抖音" },
  { value: "taobao", label: "淘宝" },
  { value: "tmall", label: "天猫" },
  { value: "pinduoduo", label: "拼多多" },
  { value: "jd", label: "京东" },
];

type HomeProps = {
  searchParams?: Promise<{ platform?: string; store?: string; demo?: string }>;
};

/** 渲染首页页面；在服务端加载业务数据，并把交互交给对应表单或客户端组件。 */
export default async function Home({ searchParams }: HomeProps) {
  const query = searchParams ? await searchParams : {};
  const selectedPlatform = parsePlatform(query.platform);
  const selectedStoreId = parseStoreId(query.store);
  // 首页聚合商品、店铺和当前用户权限；写操作入口只在 canEdit 为 true 时展示。
  const [products, stores, token] = await Promise.all([getProducts(), getStores(), getAuthToken()]);
  const currentUser = token ? await getCurrentUser(token) : null;
  const canEdit = Boolean(currentUser?.permissions.can_edit);

  const storeById = new Map(stores.map((store) => [store.id, store]));
  const productsByStore = countProductsByStore(products);
  const activeStores = stores.filter((store) => store.status === "active").length;
  const platformCount = new Set([...stores.map((store) => store.platform), ...products.map((product) => product.platform)]).size;
  const unboundProducts = products.filter((product) => product.store_id === null).length;
  const missingSellingPoints = products.filter((product) => product.selling_points.length === 0).length;
  const missingPlatformIds = products.filter((product) => !product.external_product_id).length;
  const productsByPlatform = countProductsByPlatform(products);
  const filteredProducts = products.filter((product) => {
    if (selectedPlatform !== "all" && product.platform !== selectedPlatform) {
      return false;
    }
    if (selectedStoreId !== null && product.store_id !== selectedStoreId) {
      return false;
    }
    return true;
  });

  // 上手清单四步的真实推进状态（只根据本页已加载的数据推导，不臆造第三步/第四步的完成态）。
  const stepStoreDone = stores.length > 0;
  const stepImportDone = products.length > 0;
  const onboardDoneCount = (stepStoreDone ? 1 : 0) + (stepImportDone ? 1 : 0);
  const notInitialized = stores.length === 0 && products.length === 0;

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: workspaceCss }} />

      {/* ================= 顶栏 ================= */}
      <header className="app-top">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect x="12" y="12" width="8" height="8" rx="2" />
            <rect x="4" y="4" width="4" height="4" rx="1" />
            <rect x="24" y="4" width="4" height="4" rx="1" />
            <rect x="4" y="24" width="4" height="4" rx="1" />
            <rect x="24" y="24" width="4" height="4" rx="1" />
          </svg>
          <h1>运营智能体</h1>
          <span className="sub">OPERATIONS WORKSPACE</span>
        </div>
        <nav aria-label="主导航">
          <Link href="/" aria-current="page">工作台</Link>
          <Link href="/imports">导入中心</Link>
          <Link href="/settings">模型配置</Link>
          <Link href="/agent">Agent 中心</Link>
        </nav>
        <div className="app-top-actions">
          <span className="badge badge-online"><span className="status-led" aria-hidden="true"></span>服务在线</span>
          {currentUser ? (
            <form action="/logout" method="post" className="app-top-form">
              <span className="badge">{currentUser.display_name}</span>
              <button type="submit" className="btn btn-sm">退出</button>
            </form>
          ) : (
            <Link href="/login" className="btn btn-sm">登录</Link>
          )}
          <button type="button" className="btn btn-ghost btn-sm" id="themeBtn" aria-label="切换明暗主题">
            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>主题
          </button>
        </div>
      </header>

      {/* ================= 主体 ================= */}
      <main className="app-body">
        <div className="pane">
          <div className="wrap" id="top">

            {/* ============ 上手清单（前置 · 反白面板） ============ */}
            <section className="panel panel-inverted sec" aria-labelledby="onboard-title">
              <div className="panel-head panel-head-inverted">
                <div>
                  <span className="eyebrow">GETTING STARTED · 4 STEPS</span>
                  <h2 id="onboard-title" style={{ marginTop: ".25rem" }}>上线前必须完成的 4 步</h2>
                </div>
                <span className="tick">已完成 {onboardDoneCount} / 4</span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <ol className="onboard">
                  <li className="onboard-step">
                    <span className="step-idx">STEP 01</span>
                    <h3>建店建档</h3>
                    <p>登记店铺主体、平台授权与经营类目，生成唯一 store_id，后续所有数据都挂在它下面。</p>
                    <span className={`tick${stepStoreDone ? " is-done" : ""}`}>{stepStoreDone ? "已完成" : "未开始"}</span>
                    {canEdit ? (
                      <a className="btn btn-primary" href="#panel-store">开始建档</a>
                    ) : (
                      <button type="button" className="btn btn-primary" disabled>开始建档</button>
                    )}
                  </li>
                  <li className="onboard-step">
                    <span className="step-idx">STEP 02</span>
                    <h3>导入数据</h3>
                    <p>导入商品、订单、库存。支持 CSV / 平台开放接口两种来源，导入后自动生成卖点草稿。</p>
                    <span className={`tick${stepImportDone ? " is-done" : ""}`}>
                      {stepImportDone ? "已完成" : stepStoreDone ? "未开始" : "依赖 STEP 01"}
                    </span>
                    <Link className="btn btn-primary" href="/imports" aria-disabled={stepStoreDone ? undefined : "true"}>去导入中心</Link>
                  </li>
                  <li className="onboard-step">
                    <span className="step-idx">STEP 03</span>
                    <h3>配置模型</h3>
                    <p>指定意图识别、向量化、生成的模型与密钥来源，配好后才能跑通 RAG 与文案生成。</p>
                    <span className="tick">{stepStoreDone ? "未开始" : "依赖 STEP 01"}</span>
                    <Link className="btn btn-primary" href="/settings" aria-disabled={stepStoreDone ? undefined : "true"}>去模型配置</Link>
                  </li>
                  <li className="onboard-step">
                    <span className="step-idx">STEP 04</span>
                    <h3>启动 Agent</h3>
                    <p>开启竞品监控与素材生成子智能体，工作台开始出现真实数据与待办任务。</p>
                    <span className="tick">{stepStoreDone && stepImportDone ? "未开始" : "依赖 STEP 02 / 03"}</span>
                    <Link className="btn btn-primary" href="/agent" aria-disabled={stepStoreDone && stepImportDone ? undefined : "true"}>启动智能体</Link>
                  </li>
                </ol>
              </div>
            </section>

            {/* ============ KPI + 初始化引导 ============ */}
            <section className="sec" aria-labelledby="kpi-title">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">KEY FIGURES</span>
                  <h2 id="kpi-title">经营概览</h2>
                </div>
                <div className="sec-hd-actions">
                  <span className="mono-note">统计口径：当前账号可见范围 · 实时读取</span>
                  {canEdit ? (
                    <form action="/workspace/demo-data" method="post">
                      <button type="submit" className="btn btn-sm">生成演示数据</button>
                    </form>
                  ) : null}
                  <a className="btn btn-sm" href="/workspace/templates/performance-records">下载导入模板</a>
                </div>
              </div>

              {query.demo === "created" ? (
                <p className="notice notice-ok" style={{ marginBottom: "var(--sp-3)" }}>
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-check"></use></svg>
                  <span>演示数据已准备好。</span>
                </p>
              ) : null}
              {query.demo === "failed" ? (
                <p className="notice notice-warn" style={{ marginBottom: "var(--sp-3)" }}>
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>
                  <span>演示数据创建失败，请确认当前账号有编辑权限。</span>
                </p>
              ) : null}
              {!canEdit ? (
                <p className="notice notice-warn" style={{ marginBottom: "var(--sp-3)" }}>
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>
                  <span>当前账号为只读权限，只能查看数据，不能创建或导入。</span>
                </p>
              ) : null}

              <div className="kpi-grid">
                <article className="kpi is-lead">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-db"></use></svg>店铺</span>
                  <span className={`kpi-val mono${stores.length === 0 ? " is-idle" : ""}`}>{stores.length}</span>
                  <p className="kpi-desc">
                    {stores.length === 0
                      ? "还没有已建档的店铺。建档后这里显示店铺数、平台授权状态与最近同步时间。"
                      : `已建档 ${stores.length} 家店铺，其中 ${activeStores} 家处于启用状态。`}
                  </p>
                  <div className="kpi-foot">
                    {stores.length === 0 ? (
                      <>
                        <span className="badge badge-warn">未初始化</span>
                        <span className="t-mini mono">下一步 · STEP 01</span>
                      </>
                    ) : (
                      <>
                        <span className="badge badge-online">已建档</span>
                        <span className="t-mini mono">活跃 {activeStores} / {stores.length}</span>
                      </>
                    )}
                  </div>
                </article>

                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-search"></use></svg>商品</span>
                  <span className={`kpi-val mono${products.length === 0 ? " is-idle" : ""}`}>{products.length}</span>
                  <p className="kpi-desc">
                    {products.length === 0
                      ? "商品池为空。先到导入中心上传商品 CSV，或直接在下方建档表单新建。"
                      : `商品池共 ${products.length} 个，其中 ${unboundProducts} 个未绑定店铺。`}
                  </p>
                  <div className="kpi-foot">
                    {products.length === 0 ? (
                      <>
                        <span className="badge badge-warn">未初始化</span>
                        <span className="t-mini mono">下一步 · STEP 02</span>
                      </>
                    ) : (
                      <>
                        <span className="badge badge-online">已入库</span>
                        <span className="t-mini mono">待补卖点 {missingSellingPoints}</span>
                      </>
                    )}
                  </div>
                </article>

                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-repo"></use></svg>平台</span>
                  <span className={`kpi-val mono${platformCount === 0 ? " is-idle" : ""}`}>{platformCount}</span>
                  <p className="kpi-desc">
                    {platformCount === 0
                      ? "抖音、淘宝、天猫、拼多多、京东 5 个渠道均未授权，无法拉取商品与订单。"
                      : `已覆盖 ${platformCount} 个平台渠道，授权状态见各店铺详情。`}
                  </p>
                  <div className="kpi-foot">
                    {platformCount === 0 ? (
                      <>
                        <span className="badge badge-warn">未初始化</span>
                        <span className="t-mini mono">下一步 · STEP 01</span>
                      </>
                    ) : (
                      <>
                        <span className="badge badge-online">已授权</span>
                        <span className="t-mini mono">共 {platformCount} 个渠道</span>
                      </>
                    )}
                  </div>
                </article>
              </div>

              {/* 全 0 状态的替代物：引导面板，而不是三个没有意义的零 */}
              {notInitialized ? (
                <div className="callout">
                  <div>
                    <span className="eyebrow">SYSTEM NOT INITIALIZED</span>
                    <h3 style={{ marginTop: ".375rem" }}>系统尚未初始化</h3>
                    <p>店铺与商品统计全为 0 说明不是经营结果，而是环境尚未建档。此时展示统计数字没有意义 —— 先把下面两步做完，工作台会立刻有数据。</p>
                  </div>
                  <div className="guide">
                    <div className="guide-item">
                      <span className="guide-idx">1</span>
                      <div className="guide-text">
                        <b>建店建档</b>
                        <span>登记主体与平台授权 → 生成 store_id</span>
                      </div>
                      {canEdit ? (
                        <a className="btn btn-primary" href="#panel-store">去建档</a>
                      ) : (
                        <button type="button" className="btn btn-primary" disabled>去建档</button>
                      )}
                    </div>
                    <div className="guide-item">
                      <span className="guide-idx">2</span>
                      <div className="guide-text">
                        <b>导入数据</b>
                        <span>上传商品与订单 CSV，或接平台开放接口</span>
                      </div>
                      <Link className="btn" href="/imports">去导入中心</Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {/* ============ 平台筛选 + 店铺视图 ============ */}
            <section className="sec" aria-labelledby="stores-title">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">CHANNELS &amp; STORES</span>
                  <h2 id="stores-title">平台与店铺</h2>
                </div>
                <span className="mono-note">店铺 {stores.length} · 覆盖平台 {platformCount}</span>
              </div>

              <div className="tabs" role="tablist" aria-label="平台筛选">
                {platformFilters.map((platform) => {
                  const selected = selectedPlatform === platform.value;
                  const count = platform.value === "all"
                    ? products.length
                    : productsByPlatform.get(platform.value) ?? 0;
                  return (
                    <Link
                      key={platform.value}
                      role="tab"
                      aria-selected={selected}
                      className="tab"
                      href={platform.value === "all" ? "/" : `/?platform=${platform.value}`}
                    >
                      {platform.label} <span className="n">{count}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>店铺视图</h3>
                  <span className="badge">{selectedStoreId !== null ? "已筛选单品店铺" : "全部平台"}</span>
                </div>
                <div className="panel-body">
                  {stores.length === 0 ? (
                    /* 空态要有引导性：说清楚为什么空、下一步做什么 */
                    <div className="empty">
                      <svg className="ic ic-lg" aria-hidden="true" style={{ color: "var(--faint)" }}><use href="#i-db"></use></svg>
                      <h4 style={{ marginTop: "var(--sp-3)" }}>还没有已建档的店铺</h4>
                      <p>店铺是一切数据的地基：商品、订单、库存、监控任务都必须挂在某个 store_id 下。没有店铺，平台筛选和经营概览都无法产生有效数据。</p>
                      <div className="empty-actions">
                        {canEdit ? (
                          <a className="btn btn-primary" href="#panel-store">
                            <svg className="ic" aria-hidden="true"><use href="#i-arrow-r"></use></svg>开始建店建档
                          </a>
                        ) : (
                          <button type="button" className="btn btn-primary" disabled>开始建店建档</button>
                        )}
                        <Link className="btn" href="/imports">去导入中心</Link>
                      </div>
                      <p className="empty-next">
                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                        建档完成后，这里会显示店铺卡片：授权状态 · 商品数 · 负责人
                      </p>
                    </div>
                  ) : (
                    <div className="store-grid">
                      {stores.map((store) => (
                        <StoreSummaryCard
                          key={store.id}
                          store={store}
                          productCount={productsByStore.get(store.id) ?? 0}
                          selected={store.id === selectedStoreId}
                        />
                      ))}
                    </div>
                  )}
                  {unboundProducts > 0 ? (
                    <p className="notice" style={{ marginTop: "var(--sp-4)" }}>
                      <svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>
                      <span>有 {unboundProducts} 个商品未绑定店铺，需要补店铺归属后才会计入上方店铺统计。</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {/* ============ 商品池表格 ============ */}
            <section className="sec" aria-labelledby="pool-title">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">PRODUCT POOL</span>
                  <h2 id="pool-title">商品池</h2>
                </div>
                <div className="sec-hd-actions">
                  <span className="badge">筛选 {filteredProducts.length} / {products.length}</span>
                  <Link className="btn btn-sm" href="/imports">批量导入</Link>
                </div>
              </div>

              <div className="panel">
                {/* 列宽交给 table 自身，绝不硬编码 grid 列宽 */}
                <div className="tbl-wrap">
                  <table className="tbl">
                    <caption className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                      商品池列表，当前筛选下共 {filteredProducts.length} 条记录
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">商品</th>
                        <th scope="col">平台</th>
                        <th scope="col">售价</th>
                        <th scope="col">卖点</th>
                        <th scope="col">状态</th>
                        <th scope="col">动作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty">
                              <svg className="ic ic-lg" aria-hidden="true" style={{ color: "var(--faint)" }}><use href="#i-search"></use></svg>
                              <h4 style={{ marginTop: "var(--sp-3)" }}>当前筛选下没有商品</h4>
                              <p>可以切换到「全部」平台，或先到导入中心上传商品数据；也可以直接在下方建档表单新建商品。</p>
                              <div className="empty-actions">
                                <Link className="btn" href="/">查看全部平台</Link>
                                <Link className="btn btn-primary" href="/imports">去导入中心</Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => (
                          <ProductRow
                            key={product.id}
                            product={product}
                            store={product.store_id ? storeById.get(product.store_id) : null}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="tbl-note">
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>
                  <span>
                    {missingPlatformIds > 0 ? `有 ${missingPlatformIds} 个商品待补平台 ID；` : ""}
                    {missingSellingPoints > 0 ? `有 ${missingSellingPoints} 个商品待补卖点；` : ""}
                    点击「进入」打开单品运营，补全竞品、素材与投放数据。
                  </span>
                </div>
              </div>
            </section>

            {/* ============ 建档表单（编辑权限可见） ============ */}
            {canEdit ? (
              <section className="sec" id="panel-store" aria-labelledby="setup-title">
                <div className="sec-hd">
                  <div>
                    <span className="eyebrow">SETUP</span>
                    <h2 id="setup-title">建店与商品建档</h2>
                  </div>
                  <span className="mono-note">仅具备编辑权限的账号可见</span>
                </div>
                <div className="form-grid">
                  <div className="panel">
                    <div className="panel-head"><h3>新建店铺</h3></div>
                    <div className="panel-body">
                      <StoreCreateForm />
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-head"><h3>新建商品</h3></div>
                    <div className="panel-body">
                      <ProductCreateForm stores={stores} />
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

          </div>
        </div>
      </main>
    </div>
  );
}

/** 渲染 StoreSummaryCard 组件，集中展示店铺汇总卡片所需的数据、状态和操作入口。 */
function StoreSummaryCard({
  store,
  productCount,
  selected,
}: {
  store: Store;
  productCount: number;
  selected: boolean;
}) {
  return (
    <div className={`store-card${selected ? " is-selected" : ""}`}>
      <div className="store-card-hd">
        <div style={{ minWidth: 0 }}>
          <p className="store-name">{store.name}</p>
          <p className="store-sub">
            {platformLabels[store.platform]}
            {store.external_store_id ? ` · ${store.external_store_id}` : ""}
          </p>
        </div>
        <span className={`badge${store.status === "active" ? " badge-online" : store.status === "paused" ? " badge-warn" : ""}`}>
          {store.status === "active" ? "启用" : store.status === "paused" ? "暂停" : "关闭"}
        </span>
      </div>
      <div className="store-stats">
        <span>商品 <b>{productCount}</b></span>
        <span>负责人 <b>{store.owner_name ?? "-"}</b></span>
      </div>
      <div className="store-actions">
        <Link className="btn btn-sm" href={`/?store=${store.id}`}>筛选商品</Link>
        <Link className="btn btn-sm btn-primary" href={`/stores/${store.id}`}>店铺详情</Link>
      </div>
    </div>
  );
}

/** 渲染 ProductRow 组件，集中展示商品行所需的数据、状态和操作入口。 */
function ProductRow({ product, store }: { product: Product; store: Store | null | undefined }) {
  const status = product.platform_status;
  const statusBadge = !status
    ? <span className="badge">草稿</span>
    : status === "online"
      ? <span className="badge badge-online">{status}</span>
      : <span className="badge badge-info">{status}</span>;
  return (
    <tr>
      <td>
        <div className="cell-goods">
          <span className="tbl-cover" aria-hidden="true">IMG</span>
          <span>
            <b>{product.name}</b>
            <span>{product.category ?? "未分类"}{store ? ` · ${store.name}` : " · 未绑定店铺"}</span>
          </span>
        </div>
      </td>
      <td>{platformLabels[product.platform]}</td>
      <td className="cell-price">{product.price ? `¥${product.price}` : "-"}</td>
      <td>
        {product.selling_points.length > 0 ? (
          <div className="tag-row">
            {product.selling_points.slice(0, 3).map((point) => (
              <span key={point} className="tag">{point}</span>
            ))}
          </div>
        ) : (
          <span className="t-meta">待补充</span>
        )}
      </td>
      <td>{statusBadge}</td>
      <td>
        <div className="cell-actions">
          <Link className="btn btn-sm" href={`/products/${product.id}`}>
            进入
            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>
          </Link>
        </div>
      </td>
    </tr>
  );
}

/** 统计商品 by 店铺，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function countProductsByStore(products: Product[]): Map<number, number> {
  return products.reduce((counts, product) => {
    if (product.store_id !== null) {
      counts.set(product.store_id, (counts.get(product.store_id) ?? 0) + 1);
    }
    return counts;
  }, new Map<number, number>());
}

/** 统计商品 by 平台，供平台筛选 Tab 显示各渠道商品数。 */
function countProductsByPlatform(products: Product[]): Map<Platform, number> {
  return products.reduce((counts, product) => {
    counts.set(product.platform, (counts.get(product.platform) ?? 0) + 1);
    return counts;
  }, new Map<Platform, number>());
}

/** 解析平台，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function parsePlatform(value: string | undefined): "all" | Platform {
  // URL 筛选参数做白名单校验，避免无效平台值影响服务端渲染结果。
  if (!value || value === "all") {
    return "all";
  }
  return Object.hasOwn(platformLabels, value) ? (value as Platform) : "all";
}

/** 解析店铺ID，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function parseStoreId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const storeId = Number(value);
  return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
}
