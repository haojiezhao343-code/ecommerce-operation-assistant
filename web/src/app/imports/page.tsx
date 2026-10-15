import Link from "next/link";

import { PerformanceImportCenterPanel, ProductImportPanel, SkuInventoryImportPanel } from "@/components/product-import-panel";

/* ==========================================================================
   页面样式（对照 designs/imports.html 内联 <style> 移植）
   —— 只消费 design-system.css 的 token 与组件类，不新增视觉值
   ========================================================================== */
const importsCss = `
  .app-top-actions { display: flex; align-items: center; gap: var(--sp-2); }

  .stack   { display: flex; flex-direction: column; gap: var(--sp-6); }
  .stack-5 { display: flex; flex-direction: column; gap: var(--sp-5); }
  .stack-4 { display: flex; flex-direction: column; gap: var(--sp-4); }
  .stack-3 { display: flex; flex-direction: column; gap: var(--sp-3); }
  .stack-2 { display: flex; flex-direction: column; gap: var(--sp-2); }
  .row     { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3); }
  .row-between { justify-content: space-between; }

  .page-hd { display: flex; flex-direction: column; gap: var(--sp-3); }
  .page-hd .t-lead { max-width: 52em; }

  /* ---- 侧栏 ---- */
  .rail-group { display: flex; flex-direction: column; gap: var(--sp-2); }
  .rail-cap {
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--faint);
    padding: 0 .75rem;
  }
  .rail-link {
    display: flex; align-items: center; gap: .5rem;
    min-height: 44px; padding: 0 .75rem;
    border: 1px solid transparent; border-radius: var(--radius);
    font-size: var(--fs-meta); color: var(--muted);
    transition: background-color var(--t-2) var(--ease-state),
                border-color var(--t-2) var(--ease-state),
                color var(--t-2) var(--ease-state);
  }
  .rail-link .code { margin-left: auto; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .rail-link:hover { color: var(--fg); background: var(--surface-subtle); }
  .rail-link[aria-current="page"] { color: var(--fg); background: var(--surface-subtle); border-color: var(--border); font-weight: 600; }

  /* ---- 模板卡 ---- */
  .tpl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: var(--sp-4); }
  .tpl { display: flex; flex-direction: column; }
  .tpl .panel-head { align-items: center; justify-content: flex-start; gap: .5rem; }
  .tpl-ic { font-size: 1.25rem; color: var(--muted); line-height: 1.1; }
  .card-foot { margin-top: auto; }
  .tpl-meta { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .375rem var(--sp-3); font-size: var(--fs-mini); }
  .tpl-meta dt { font-family: var(--font-mono); color: var(--faint); white-space: nowrap; }
  .tpl-meta dd { color: var(--fg-secondary); text-align: right; }

  /* ---- 导入表单锚点与能力卡 ---- */
  .cap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: var(--sp-4); }

  .ta-r { text-align: right; }
  .txt-warn { color: var(--warn); }
  .txt-accent { color: var(--accent); }
  .txt-ok { color: var(--success); }
  .txt-faint { color: var(--faint); }
  .b700 { font-weight: 700; }
  .mt-3 { margin-top: var(--sp-3); }
  .grow { flex: 1; min-width: 0; }

  @media (max-width: 899px) {
    .cap-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767px) {
    .app-top .brand .sub { display: none; }
  }

  /* 页眉眉标在窄屏会折成单字孤行，按标题同一手法配平换行 */
  .page-hd .eyebrow { text-wrap: balance; }
`;

const templates = [
  {
    id: "tpl-performance",
    anchor: "tpl-performance",
    title: "经营数据模板",
    code: "PERFORMANCE",
    description: "用于导入曝光、点击、成交、花费、成交额等投放复盘数据。",
    endpoint: "/imports/performance-records",
    meta: [
      ["内容", "曝光 / 点击 / 成交 / 花费 / 成交额"],
      ["格式", "CSV · 带表头"],
    ],
    href: "/workspace/templates/performance-records",
    icon: "#i-terminal",
  },
  {
    id: "tpl-product",
    anchor: "tpl-product",
    title: "商品档案模板",
    code: "PRODUCT",
    description: "用于导入店铺商品、平台、价格、受众、卖点和平台商品 ID。",
    endpoint: "/imports/products",
    meta: [
      ["内容", "商品 / 平台 / 价格 / 受众 / 卖点"],
      ["格式", "CSV · 带表头"],
    ],
    href: "/workspace/templates/products",
    icon: "#i-doc",
  },
  {
    id: "tpl-sku",
    anchor: "tpl-sku",
    title: "SKU 库存模板",
    code: "SKU",
    description: "用于导入 SKU 编码、规格、初始库存、预警线、仓位和平台 SKU ID。",
    endpoint: "/imports/sku-inventory",
    meta: [
      ["内容", "SKU 编码 / 规格 / 库存 / 预警线"],
      ["格式", "CSV · 带表头"],
    ],
    href: "/workspace/templates/sku-inventory",
    icon: "#i-db",
  },
  {
    id: "tpl-mapping",
    anchor: "tpl-mapping",
    title: "字段映射模板",
    code: "FIELD MAPPING",
    description: "用于把淘宝、天猫、拼多多、京东、抖音等平台字段映射到系统字段。",
    meta: [
      ["内容", "平台字段 → 系统字段对照"],
      ["格式", "CSV · 带表头"],
    ],
    href: "/workspace/templates/field-mapping",
    icon: "#i-repo",
  },
];

const capabilities = [
  { title: "商品 CSV 导入", status: "已支持预览", tone: "badge-online" },
  { title: "SKU 库存 CSV 导入", status: "已支持预览", tone: "badge-online" },
  { title: "经营数据 CSV 导入", status: "已支持预览", tone: "badge-online" },
  { title: "字段映射模板", status: "已提供", tone: "badge-info" },
];

/** 渲染导入页面；在服务端加载业务数据，并把交互交给对应表单或客户端组件。 */
export default function ImportCenterPage() {
  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: importsCss }} />

      {/* ================= 应用顶栏 ================= */}
      <header className="app-top">
        <Link className="brand" href="/">
          <svg className="mark ic-lg" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect x="12" y="12" width="8" height="8" rx="2" />
            <rect x="4" y="4" width="4" height="4" rx="1" />
            <rect x="24" y="4" width="4" height="4" rx="1" />
            <rect x="4" y="24" width="4" height="4" rx="1" />
            <rect x="24" y="24" width="4" height="4" rx="1" />
          </svg>
          <span>运营智能体</span>
          <span className="sub">:80 / IMPORTS</span>
        </Link>
        <nav aria-label="页面导航">
          <a href="#templates">模板下载</a>
          <a href="#forms" aria-current="page">导入表单</a>
          <a href="#matrix">能力矩阵</a>
        </nav>
        <div className="app-top-actions">
          <Link className="btn btn-sm" href="/">
            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>
            <span>返回工作台</span>
          </Link>
          <button type="button" className="btn btn-sm" id="themeBtn" aria-label="切换明暗主题">
            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-agent"></use></svg>
            <span>主题</span>
          </button>
        </div>
      </header>

      <div className="app-body has-rail">
        {/* ================= 左栏导航 ================= */}
        <nav className="rail" aria-label="运营智能体导航">
          <div className="rail-group">
            <span className="rail-cap">工作台</span>
            <Link className="rail-link" href="/">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-server"></use></svg>
              <span>运营智能体</span>
              <span className="code">/</span>
            </Link>
            <Link className="rail-link" href="/imports" aria-current="page">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-doc"></use></svg>
              <span>导入中心</span>
              <span className="code">/imports</span>
            </Link>
            <Link className="rail-link" href="/settings">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-terminal"></use></svg>
              <span>模型配置</span>
              <span className="code">/settings</span>
            </Link>
            <Link className="rail-link" href="/agent">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-agent"></use></svg>
              <span>Agent 中心</span>
              <span className="code">/agent</span>
            </Link>
          </div>

          <div className="rail-group">
            <span className="rail-cap">模板下载</span>
            {templates.map((template) => (
              <a className="rail-link" key={template.id} href={`#${template.anchor}`}>
                <span>{template.title}</span>
              </a>
            ))}
          </div>

          <div className="rail-group">
            <span className="rail-cap">导入表单</span>
            <a className="rail-link" href="#form-product"><span>商品数据导入</span></a>
            <a className="rail-link" href="#form-sku"><span>SKU 数据导入</span></a>
            <a className="rail-link" href="#form-performance"><span>经营数据导入</span></a>
          </div>

          <div className="rail-group">
            <span className="rail-cap">说明</span>
            <a className="rail-link" href="#matrix">
              <span>已接入能力矩阵</span>
              <span className="code">{capabilities.length}</span>
            </a>
          </div>
        </nav>

        {/* ================= 主栏 ================= */}
        <main className="pane">
          <div className="stack">

            {/* 页头 */}
            <header className="page-hd">
              <span className="eyebrow">DATA IMPORT · 运营数据入口</span>
              <h1 className="t-h1">导入中心</h1>
              <p className="t-lead">
                汇总商品、SKU 库存、经营数据和平台字段映射模板。先下载模板对齐字段，再走「选文件 → 预览 → 确认导入」——
                预览阶段就把脏行拦在库外，不让一次手滑的表格污染三个月的经营分析。
              </p>
              <div className="row">
                <span className="badge badge-accent">4 TEMPLATES</span>
                <span className="badge">3 CSV FORMS</span>
                <span className="badge">{capabilities.length} CAPABILITIES</span>
                <span className="status-led" aria-hidden="true"></span>
                <span className="t-mini mono">预览不写库，确认后才落数据</span>
              </div>
            </header>

            {/* 模板下载 */}
            <section className="stack-4 reveal" id="templates" aria-labelledby="h-tpl">
              <div className="row row-between">
                <div className="stack-2">
                  <span className="eyebrow">STEP 00 · 模板</span>
                  <h2 className="t-h2" id="h-tpl">模板下载</h2>
                </div>
                <span className="badge mono">TEMPLATES · CSV WITH HEADER</span>
              </div>

              <div className="tpl-grid">
                {templates.map((template) => (
                  <article className="panel tpl" key={template.id} id={template.anchor}>
                    <div className="panel-head">
                      <span className="tpl-ic" aria-hidden="true"><svg className="ic"><use href={template.icon}></use></svg></span>
                      <h3 className="t-h3">{template.title}</h3>
                    </div>
                    <div className="panel-body stack-3">
                      <div className="row row-between">
                        <span className="t-mini mono">{template.code}</span>
                        {template.endpoint ? <span className="badge">可导入</span> : <span className="badge badge-info">映射工具</span>}
                      </div>
                      <p className="t-meta">{template.description}</p>
                      <dl className="tpl-meta">
                        {template.meta.map(([dt, dd]) => (
                          <div key={dt} style={{ display: "contents" }}>
                            <dt>{dt}</dt>
                            <dd>{dd}</dd>
                          </div>
                        ))}
                      </dl>
                      <a className="btn btn-sm card-foot" href={template.href}>
                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-search"></use></svg>
                        <span>下载模板</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 导入表单（三段式：预览不写库，确认才落数据） */}
            <section className="stack-4" id="forms" aria-labelledby="h-forms">
              <div className="row row-between">
                <div className="stack-2">
                  <span className="eyebrow">STEP 01 · 导入</span>
                  <h2 className="t-h2" id="h-forms">CSV 导入</h2>
                </div>
                <span className="badge badge-warn mono">预览 → 确认两段式</span>
              </div>

              <p className="t-meta">
                三个导入表单共用同一套「先预览、后确认」机制：预览只做字段解析与逐行校验，不写库；确认导入时只落有效行，错误行在结果里逐行列原因。
              </p>

              <div className="stack-5" id="form-product">
                <ProductImportPanel />
              </div>
              <div className="stack-5" id="form-sku">
                <SkuInventoryImportPanel />
              </div>
              <div className="stack-5" id="form-performance">
                <PerformanceImportCenterPanel />
              </div>
            </section>

            {/* 能力矩阵 */}
            <section className="panel reveal" id="matrix" aria-labelledby="h-matrix">
              <div className="panel-head">
                <h3 id="h-matrix">已接入能力</h3>
                <span className="badge mono">CAPABILITY MATRIX · {capabilities.length}</span>
              </div>
              <div className="panel-body stack-4">
                <div className="cap-grid">
                  {capabilities.map((capability) => (
                    <div className="panel" key={capability.title}>
                      <div className="panel-body stack-2">
                        <div className="row row-between">
                          <span className="b700">{capability.title}</span>
                          <span className={`badge ${capability.tone}`}>{capability.status}</span>
                        </div>
                        <p className="t-mini">模板下载 → 选文件 → 预览逐行校验 → 确认导入。</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="t-mini">
                  导入接口与既有端点保持一致：预览与确认都打到原导入路由，本页只负责模板分发与结果呈现。
                </p>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
