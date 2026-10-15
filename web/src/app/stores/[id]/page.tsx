import Link from "next/link";
import { notFound } from "next/navigation";

import { InventoryAdvicePanel } from "@/components/inventory-advice-panel";
import { getCurrentUser, getProducts, getStore, getStoreInventoryMovements, getStoreInventorySummary } from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type { StoreInventoryMovementRow, StoreInventoryRow } from "@/types";
import type { Platform, Product } from "@/types";

const storeCss = `
  /* ======================================================================
     页面级布局（store-detail）—— 只消费 design-system.css 的 token 与组件类
     硬约束：不新增视觉值；圆角一律 var(--radius)；色值一律 var(--)
     ====================================================================== */
  .app, .app-body { grid-template-columns: minmax(0, 1fr); }
  .pane, .wrap { min-width: 0; }
  .wrap { width: 100%; max-width: var(--max-w); margin-inline: auto; }
  .stack   { display: flex; flex-direction: column; gap: var(--sp-6); }
  .stack-5 { display: flex; flex-direction: column; gap: var(--sp-5); }
  .stack-4 { display: flex; flex-direction: column; gap: var(--sp-4); }
  .stack-3 { display: flex; flex-direction: column; gap: var(--sp-3); }
  .stack-2 { display: flex; flex-direction: column; gap: var(--sp-2); }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2) var(--sp-3); }
  .row-between { justify-content: space-between; }
  .grow { flex: 1; min-width: 0; }
  .mono-note { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }
  .mono-faint { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .cap { font-size: var(--fs-body); color: var(--muted); line-height: 1.75; min-width: 0; }
  .cap-2 { font-size: var(--fs-body); color: var(--fg-secondary); line-height: 1.75; min-width: 0; }
  .app-top nav a { min-height: 44px; display: inline-flex; align-items: center; white-space: nowrap; flex: 0 0 auto; }
  [id] { scroll-margin-top: 130px; }

  /* ---- 区块头 ---- */
  .sec { display: flex; flex-direction: column; gap: var(--sp-4); }
  .sec-hd {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp-3) var(--sp-4); flex-wrap: wrap;
    margin-bottom: var(--sp-1); padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .sec-hd h2 { font-size: var(--fs-h2); }
  .sec-hd .right { display: flex; flex-direction: column; align-items: flex-end; gap: .375rem; min-width: 0; }
  .sec-hd .right .cap { max-width: 42em; text-align: right; }
  .sec-hd .right .mono-note { max-width: 62ch; text-align: right; }

  /* ---- 页头：店铺身份 ---- */
  .store-hd { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-4) var(--sp-5); align-items: start; }
  .store-id { display: flex; gap: var(--sp-4); min-width: 0; }
  .store-mark {
    width: 52px; height: 52px; flex: none; border-radius: var(--radius);
    display: grid; place-items: center; font-size: 1.25rem;
    background: var(--fg); color: var(--bg);
  }
  .store-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
  .id-line { display: flex; flex-wrap: wrap; gap: .25rem .75rem; align-items: center; min-width: 0; }

  /* ---- KPI（与工作台首页同一表达） ---- */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--sp-4); }
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
  .kpi-val.is-idle { color: var(--muted); }
  .kpi-desc { font-size: var(--fs-body); color: var(--muted); line-height: 1.7; flex: 1; min-width: 0; }
  .kpi-desc b { color: var(--fg-secondary); font-weight: 600; }
  .kpi-foot {
    display: flex; align-items: center; justify-content: space-between;
    gap: .5rem; flex-wrap: wrap;
    padding-top: var(--sp-3); border-top: 1px solid var(--border);
  }

  /* ---- Tab / 状态票 ---- */
  .tabs { display: flex; gap: .25rem; flex-wrap: wrap; border-bottom: 1px solid var(--border); }
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

  .tick {
    display: inline-flex; align-items: center; gap: .4em;
    padding: .2em .55em; border: 1px solid var(--border); border-radius: var(--radius);
    font-family: var(--font-mono); font-size: var(--fs-mini);
    font-weight: 600; letter-spacing: .04em; white-space: nowrap;
  }
  .tick.is-live { border-color: var(--success); color: var(--success); }
  .tick.is-next { border-color: var(--accent); color: var(--accent); }

  /* ---- 流程步骤 ---- */
  .steps { display: grid; gap: var(--sp-2); margin: 0; padding: 0; list-style: none; }
  .steps-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .steps-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .step {
    min-width: 0; padding: var(--sp-3) var(--sp-3) var(--sp-3) calc(var(--sp-3) - 2px);
    border: 1px solid var(--border); border-left-width: 3px; border-radius: var(--radius);
    background: var(--surface);
    display: flex; flex-direction: column; gap: .5rem;
    min-height: 44px;
    transition: background-color var(--t-2) var(--ease-state);
  }
  a.step:hover { background: var(--surface-subtle); }
  .step.is-done { border-left-color: var(--success); }
  .step.is-open { border-left-color: var(--warn); }
  .step.is-idle { border-left-color: var(--border); }
  .step-hd { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
  .step-hd h4, .step-hd h3 { font-size: var(--fs-body); }
  .step p { font-size: var(--fs-body); color: var(--muted); line-height: 1.7; min-width: 0; }

  /* ---- 告警面板 ---- */
  .alert {
    border: 1px solid var(--border); border-left: 3px solid var(--warn);
    border-radius: var(--radius); background: var(--warn-tint);
    padding: var(--sp-4);
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-3) var(--sp-4);
    align-items: start;
  }
  .alert-hd { display: flex; gap: var(--sp-3); min-width: 0; }
  .alert-ic { color: var(--warn); flex: none; line-height: 1.2; display: grid; place-items: center; }
  .alert h3 { font-size: var(--fs-h3); }
  .alert p { font-size: var(--fs-body); color: var(--fg-secondary); line-height: 1.75; margin-top: .25rem; min-width: 0; }
  .alert .do { display: flex; align-items: center; }
  .sku-chips { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-2); }
  .sku-chip {
    display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
    min-height: 44px; padding: .5rem .75rem;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: var(--fs-body);
    transition: background-color var(--t-2) var(--ease-state);
  }
  .sku-chip:hover { background: var(--surface-subtle); }
  .sku-chip .nm { font-weight: 600; min-width: 0; }
  .sku-chip .mono { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); overflow-wrap: anywhere; }
  .sku-chip .qty { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--accent); margin-left: auto; }

  /* ---- 业务事实表（口径） ---- */
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr)); gap: var(--sp-3) var(--sp-4); margin: 0; }
  .fact { min-width: 0; border-left: 1px solid var(--border); padding-left: var(--sp-3); }
  .fact dt {
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase; color: var(--faint);
  }
  .fact dd { font-size: var(--fs-body); color: var(--fg-secondary); line-height: 1.7; margin: .125rem 0 0; overflow-wrap: anywhere; }
  .fact dd.mono { font-family: var(--font-mono); }

  /* ---- 表格 ---- */
  .tbl td { vertical-align: middle; }
  .tbl-cover {
    width: 44px; height: 44px; flex: none;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken);
    display: grid; place-items: center; color: var(--faint);
    font-family: var(--font-mono); font-size: 10px;
  }
  .cell-goods { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; }
  .cell-goods > span > b {
    display: block; min-width: 0;
    font-family: var(--font-body); font-size: var(--fs-body);
    font-weight: 600; color: var(--fg); line-height: 1.45;
  }
  .cell-goods > span > span,
  .cell-goods > span > .cg-sub {
    display: block; min-width: 0;
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint);
    overflow-wrap: anywhere;
  }
  .cell-price { font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }
  .cell-actions { display: flex; gap: .375rem; flex-wrap: wrap; }
  .cell-link { display: inline-flex; align-items: center; min-height: 44px; color: var(--fg-secondary); }
  .cell-link:hover { color: var(--accent); }
  .ta-r { text-align: right; }
  .txt-ok { color: var(--success); }
  .txt-warn { color: var(--warn); }
  .txt-accent { color: var(--accent); }
  .txt-faint { color: var(--faint); }
  .b700 { font-weight: 700; }
  .delta-pos { font-family: var(--font-mono); font-weight: 700; color: var(--success); }
  .delta-neg { font-family: var(--font-mono); font-weight: 700; color: var(--accent); }
  .delta-zero { font-family: var(--font-mono); font-weight: 700; color: var(--muted); }
  .tbl-note {
    display: flex; align-items: flex-start; gap: .5rem; flex-wrap: wrap;
    padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--border);
    background: var(--surface-subtle);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
    line-height: 1.7;
  }
  .tbl-scroll { min-width: 780px; }
  .tbl-scroll-sm { min-width: 640px; }

  /* ---- 空态（引导性） ---- */
  .empty { text-align: left; }
  .empty h4 { margin-top: var(--sp-3); }
  .empty p { margin: 0; max-width: none; font-size: var(--fs-body); }
  .empty-actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
  .empty-next {
    margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
    display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  }

  /* ---- 响应式 ---- */
  @media (max-width: 1199px) {
    .steps-5 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 1023px) {
    .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .store-hd { grid-template-columns: minmax(0, 1fr); }
    .store-actions { justify-content: flex-start; }
    .steps-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sec-hd .right { align-items: flex-start; }
    .sec-hd .right .cap, .sec-hd .right .mono-note { text-align: left; }
  }
  @media (max-width: 767px) {
    .kpi-grid { grid-template-columns: minmax(0, 1fr); }
    .steps-5, .steps-4 { grid-template-columns: minmax(0, 1fr); }
    .sku-chips { grid-template-columns: minmax(0, 1fr); }
    .alert { grid-template-columns: minmax(0, 1fr); }
    .tabs { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex: 0 0 auto; }
    .store-id { flex-direction: column; }
    .cell-actions .btn { width: 100%; }
    /* 窄屏：头部一行放不下时允许换行，徽标不再 nowrap，避免被裁掉 */
    .panel-head, .row-between, .confirm-bar { flex-wrap: wrap; }
    .panel-head .badge, .sec-hd .badge, .kpi-foot .badge { white-space: normal; }
  }
`;

type StorePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ inventory?: string }>;
};

/** 渲染stores页面；在服务端加载业务数据，并把交互交给对应表单或客户端组件。 */
export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [store, products, inventorySummary, inventoryMovements, token] = await Promise.all([
    getStore(id),
    getProducts(),
    getStoreInventorySummary(id),
    getStoreInventoryMovements(id),
    getAuthToken(),
  ]);

  if (!store) {
    notFound();
  }

  const storeProducts = products.filter((product) => product.store_id === store.id);
  const activeProducts = storeProducts.filter((product) => product.platform_status !== "offline").length;
  const unmappedProducts = storeProducts.filter((product) => !product.external_product_id).length;
  const lowStockRows = inventorySummary?.rows.filter((row) => row.is_low_stock) ?? [];
  const inventoryRows = query.inventory === "low" ? lowStockRows : inventorySummary?.rows ?? [];
  const workflowSteps = buildStoreWorkflowSteps(store.id, storeProducts, inventorySummary?.rows ?? [], lowStockRows, unmappedProducts);
  const currentUser = token ? await getCurrentUser(token) : null;
  const canEdit = Boolean(currentUser?.permissions.can_edit);

  // 可售库存按商品聚合（StoreInventoryRow.available_quantity 对该商品全部 SKU 求和）
  const availableByProduct = new Map<number, number>();
  for (const row of inventorySummary?.rows ?? []) {
    availableByProduct.set(row.product_id, (availableByProduct.get(row.product_id) ?? 0) + row.available_quantity);
  }

  const accounts = store.platform_accounts ?? [];
  const expiredAccounts = accounts.filter((account) => account.status === "expired").length;
  const disabledAccounts = accounts.filter((account) => account.status === "disabled").length;
  const accountStatusLabels: Record<string, { label: string; className: string }> = {
    active: { label: "已授权启用", className: "badge-online" },
    expired: { label: "已过期", className: "badge-warn" },
    disabled: { label: "已停用", className: "badge" },
  };
  const storeStatusLabels: Record<string, { label: string; className: string }> = {
    active: { label: "启用", className: "badge-online" },
    paused: { label: "暂停", className: "badge-warn" },
    closed: { label: "关闭", className: "badge" },
  };
  const storeStatus = storeStatusLabels[store.status] ?? { label: store.status, className: "badge" };

  // 库存处理流程 4 步状态（done 由真实数据推导，与设计稿一致）
  const inventorySteps = buildInventorySteps(store.id, inventorySummary?.rows ?? [], lowStockRows);
  const doneStoreSteps = workflowSteps.filter((step) => step.done).length;
  const nextStoreStep = workflowSteps.find((step) => !step.done) ?? workflowSteps[workflowSteps.length - 1];
  const doneInventorySteps = inventorySteps.filter((step) => step.state !== "idle").length;

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: storeCss }} />

      <StoreTopBar />
      <main className="app-body">
        <div className="pane">
          <div className="wrap stack" id="top">

            {/* ==================== 页头：店铺身份 ==================== */}
            <section className="panel" aria-labelledby="h-store">
              <div className="panel-body store-hd">
                <div className="store-id">
                  <span className="store-mark" aria-hidden="true"><svg className="ic ic-lg" aria-hidden="true" focusable="false"><use href="#i-server"></use></svg></span>
                  <div className="stack-2">
                    <div className="id-line">
                      <span className="badge">{platformLabels[store.platform]}</span>
                      <span className={`badge ${storeStatus.className}`}><span className="status-led" aria-hidden="true"></span>{storeStatus.label}</span>
                      <span className="badge mono">STORE {store.id}</span>
                      {store.external_store_id ? <span className="badge mono">{store.external_store_id}</span> : null}
                    </div>
                    <h1 className="t-h1" id="h-store">{store.name}</h1>
                    <p className="cap">
                      负责人 {store.owner_name ?? "未设置负责人"} · 建档 {formatDate(store.created_at)} · 最近同步 {formatDateTime(store.updated_at)}
                    </p>
                  </div>
                </div>
                <div className="store-actions">
                  <a className="btn btn-primary" href="#accounts">
                    <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-repo"></use></svg>
                    平台账号与授权
                  </a>
                  <Link className="btn" href={`/?store=${store.id}`}>
                    <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-arrow-r"></use></svg>
                    回工作台筛选本店
                  </Link>
                </div>
              </div>
              {store.note ? (
                <div className="panel-body">
                  <p className="cap">店铺备注：{store.note}</p>
                </div>
              ) : null}
            </section>

            {/* ==================== 平台账号与授权（Store.platform_accounts，三态） ==================== */}
            <section aria-labelledby="h-accounts" id="accounts" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">PLATFORM ACCOUNTS</span>
                  <h2 className="t-h2" id="h-accounts">平台账号与授权</h2>
                </div>
                <div className="right">
                  <span className="mono-note">
                    {accounts.length > 0
                      ? `${accounts.length} 个账号${expiredAccounts > 0 ? ` · ${expiredAccounts} 个已过期` : ""}${disabledAccounts > 0 ? ` · ${disabledAccounts} 个已停用` : ""}`
                      : "本店还没有接入任何平台账号"}
                  </span>
                  <p className="cap">授权状态直接决定这个店铺能拉到哪些数据：过期账号不会报错，只会静默停止同步。</p>
                </div>
              </div>

              <div className="panel">
                {accounts.length > 0 ? (
                  <>
                    <div className="tbl-wrap">
                      <table className="tbl tbl-scroll">
                        <caption className="sr-only">本店平台账号与授权状态，共 {accounts.length} 条</caption>
                        <thead>
                          <tr>
                            <th scope="col">账号</th>
                            <th scope="col">平台</th>
                            <th scope="col">外部账号 ID</th>
                            <th scope="col">状态</th>
                            <th scope="col">备注</th>
                            <th scope="col">最近更新</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account) => {
                            const status = accountStatusLabels[account.status] ?? { label: account.status, className: "badge" };
                            return (
                              <tr key={account.id}>
                                <td>
                                  <div className="cell-goods">
                                    <span>
                                      <b>{account.account_name}</b>
                                      <span>账号 ID {account.id}</span>
                                    </span>
                                  </div>
                                </td>
                                <td>{platformLabels[account.platform]}</td>
                                <td className="mono">{account.external_account_id ?? "—"}</td>
                                <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                                <td>{account.note ?? <span className="txt-faint">—</span>}</td>
                                <td className="mono">{formatDateTime(account.updated_at)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="panel-body">
                      <dl className="facts">
                        <div className="fact">
                          <dt>账号状态枚举</dt>
                          <dd>active → 已授权启用；expired → 已过期；disabled → 已停用</dd>
                        </div>
                        <div className="fact">
                          <dt>本店已接入</dt>
                          <dd>
                            {accounts.map((account) => `${platformLabels[account.platform]}（${accountStatusLabels[account.status]?.label ?? account.status}）`).join(" · ")}
                          </dd>
                        </div>
                        <div className="fact">
                          <dt>平台维度全集</dt>
                          <dd>{Object.values(platformLabels).join(" / ")}（8 值枚举）</dd>
                        </div>
                        <div className="fact">
                          <dt>店铺备注</dt>
                          <dd>{store.note ?? "未填写"}</dd>
                        </div>
                      </dl>
                    </div>
                    {expiredAccounts > 0 ? (
                      <div className="tbl-note">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-warn"></use></svg>
                        <span>有 {expiredAccounts} 个账号授权已过期：过期账号不会报错，只会静默停止同步。经营口径出现缺口时先查这里。</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="panel-body">
                    <div className="empty">
                      <svg className="ic ic-lg" aria-hidden="true" focusable="false"><use href="#i-repo"></use></svg>
                      <h4>这个店铺还没有接入平台账号</h4>
                      <p>没有平台账号，店铺只能人工登记商品与库存；经营数据、订单与授权同步都不会发生。</p>
                      <p className="empty-next">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                        接入后这里会出现：账号 · 平台 · 外部账号 ID · 授权状态（启用 / 过期 / 停用）· 最近更新
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ==================== KPI：经营概览（带口径） ==================== */}
            <section aria-labelledby="h-kpi" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">KEY FIGURES · 口径优先</span>
                  <h2 className="t-h2" id="h-kpi">经营概览</h2>
                </div>
                <div className="right">
                  <span className="mono-note">实时读取，无缓存</span>
                  <p className="cap">每个数字都带口径与样本量。没有口径的数字不显示，覆盖不到的地方写「未覆盖」而不是 0。</p>
                </div>
              </div>

              <div className="kpi-grid">
                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-doc"></use></svg>店铺商品</span>
                  <span className="kpi-val">{storeProducts.length}</span>
                  <p className="kpi-desc">口径：<b>store_id = {store.id} 的全部商品</b>，其中待补映射 {unmappedProducts} 个；不含已删除历史商品。</p>
                  <div className="kpi-foot"><span className="badge">实时</span></div>
                </article>

                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>在营商品</span>
                  <span className="kpi-val">{activeProducts}</span>
                  <p className="kpi-desc">口径：<b>platform_status ≠ offline</b> 的商品数。当前为空的是下架状态，未同步商品计入在营。</p>
                  <div className="kpi-foot"><span className="badge">实时</span></div>
                </article>

                <article className={`kpi${unmappedProducts > 0 ? " is-lead" : ""}`}>
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-repo"></use></svg>待补平台映射</span>
                  <span className="kpi-val">{unmappedProducts}</span>
                  <p className="kpi-desc">口径：<b>external_product_id 为空</b> 的商品数。这批商品拉不到平台侧数据，是经营口径缺口的来源。</p>
                  <div className="kpi-foot">
                    {unmappedProducts > 0 ? (
                      <>
                        <span className="badge badge-accent">需处理</span>
                        <span className="t-mini mono">下一步 · 导入中心</span>
                      </>
                    ) : (
                      <span className="badge badge-online"><span className="status-led" aria-hidden="true"></span>已映射</span>
                    )}
                  </div>
                </article>

                <article className={`kpi${lowStockRows.length > 0 ? " is-lead" : ""}`}>
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-db"></use></svg>可用库存</span>
                  <span className="kpi-val">{inventorySummary ? formatInteger(inventorySummary.total_available_quantity) : "未覆盖"}</span>
                  <p className="kpi-desc">口径：<b>Σ 可用量 = 现货 − 锁定</b>，覆盖 {inventorySummary?.sku_count ?? 0} 个 SKU；本店 {lowStockRows.length} 个 SKU 低于预警线。</p>
                  <div className="kpi-foot">
                    {lowStockRows.length > 0 ? (
                      <>
                        <span className="badge badge-warn">{lowStockRows.length} 个低库存</span>
                        <Link className="t-mini mono" href={`/stores/${store.id}?inventory=low`}>只看低库存</Link>
                      </>
                    ) : (
                      <span className="badge badge-online"><span className="status-led" aria-hidden="true"></span>库存健康</span>
                    )}
                  </div>
                </article>
              </div>
            </section>

            {/* ==================== 店铺运营流程 ==================== */}
            <section aria-labelledby="h-flow" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">STORE WORKFLOW · 5 STEPS</span>
                  <h2 className="t-h2" id="h-flow">店铺运营流程</h2>
                </div>
                <div className="right">
                  <span className="mono-note">已完成 {doneStoreSteps} / {workflowSteps.length} · 下一步：{nextStoreStep.title}</span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body stack-4">
                  <div className="row-between">
                    <p className="cap-2 grow">
                      流程按「能不能产生有效数据」排序，不按菜单顺序。<b>数据映射</b>卡住时，后面所有经营口径都会偏低——所以它必须出现在这里，而不是藏在导入页里。
                    </p>
                    <Link className="btn btn-primary" href={nextStoreStep.href}>
                      继续处理：{nextStoreStep.title}
                      <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-arrow-r"></use></svg>
                    </Link>
                  </div>

                  <ol className="steps steps-5">
                    {workflowSteps.map((step) => (
                      <li key={step.key} className={`step ${step.done ? "is-done" : "is-open"}`}>
                        <div className="step-hd">
                          <h3>{step.title}</h3>
                          <span className={`tick ${step.done ? "is-live" : "is-next"}`}>{step.done ? "已完成" : "待办"}</span>
                        </div>
                        <p>{step.hint}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>

            {/* ==================== 库存异常提示 ==================== */}
            {lowStockRows.length > 0 ? (
              <section aria-labelledby="h-alert" className="sec">
                <div className="sec-hd">
                  <div className="stack-2">
                    <span className="eyebrow">STOCK ALERT · 唯一需要立即决策的区块</span>
                    <h2 className="t-h2" id="h-alert">库存异常提示</h2>
                  </div>
                  <div className="right">
                    <span className="mono-note">判据：available_quantity ≤ warning_threshold</span>
                  </div>
                </div>

                <div className="alert" role="status">
                  <div className="alert-hd">
                    <span className="alert-ic" aria-hidden="true"><svg className="ic ic-lg" focusable="false"><use href="#i-warn"></use></svg></span>
                    <div>
                      <h3>{lowStockRows.length} 个 SKU 可用库存已低于或等于预警线</h3>
                      <p>
                        建议优先补货或下调投放节奏。判定口径：可用量 = 现货 − 锁定；预警线按 SKU 单独配置。
                      </p>
                    </div>
                  </div>
                  <div className="do">
                    <Link className="btn btn-primary" href={`/stores/${store.id}?inventory=low`}>
                      只看低库存
                      <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-arrow-r"></use></svg>
                    </Link>
                  </div>
                  <div className="sku-chips">
                    {lowStockRows.slice(0, 4).map((row) => (
                      <Link key={row.sku_id} className="sku-chip" href={`/products/${row.product_id}?tab=overview`}>
                        <span className="nm">{row.product_name}</span>
                        <span className="mono">{row.sku_code}</span>
                        <span className="qty">可用 {row.available_quantity} · 预警 {row.warning_threshold}</span>
                      </Link>
                    ))}
                    {lowStockRows.length > 4 ? (
                      <Link className="sku-chip" href={`/stores/${store.id}?inventory=low`}>
                        <span className="nm">还有 {lowStockRows.length - 4} 个低库存 SKU</span>
                        <span className="mono">筛选视图 inventory=low</span>
                        <span className="qty">点击查看全部</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {/* ==================== 库存处理流程 ==================== */}
            <section aria-labelledby="h-istock" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">INVENTORY WORKFLOW · 4 STEPS</span>
                  <h2 className="t-h2" id="h-istock">库存处理流程</h2>
                </div>
                <div className="right">
                  <span className="mono-note">已完成 {doneInventorySteps} / {inventorySteps.length}{lowStockRows.length > 0 ? ` · 卡在「分析销量」` : ""}</span>
                  <p className="cap">这一步需要经营数据；数据没导进来之前，补货优先级只能靠猜。</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body">
                  <div className="steps steps-4">
                    {inventorySteps.map((step) => (
                      <Link key={step.title} className={`step ${step.state}`} href={step.href}>
                        <div className="step-hd">
                          <h3>{step.title}</h3>
                          <span className={`tick ${step.state === "done" ? "is-live" : step.state === "open" ? "is-next" : ""}`}>
                            {step.state === "done" ? "已完成" : step.state === "open" ? "待办" : "未发起"}
                          </span>
                        </div>
                        <p>{step.hint}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== 库存建议（AI / 规则，人工确认制） ==================== */}
            <section aria-labelledby="h-advice" id="advice" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">INVENTORY ADVICE · 人工确认制</span>
                  <h2 className="t-h2" id="h-advice">库存建议</h2>
                </div>
                <div className="right">
                  <p className="cap">建议只给动作，不给结论。执行与否由有编辑权限的账号确认。</p>
                </div>
              </div>
              <InventoryAdvicePanel storeId={store.id} canEdit={canEdit} />
            </section>

            {/* ==================== 店铺商品 ==================== */}
            <section aria-labelledby="h-products" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">STORE PRODUCTS</span>
                  <h2 className="t-h2" id="h-products">店铺商品</h2>
                </div>
                <div className="right">
                  <span className="mono-note">{storeProducts.length} 个商品{storeProducts.length > 6 ? " · 显示前 6 个" : ""}</span>
                  <p className="cap">从店铺维度进入单品运营闭环：每个商品都能继续做主图生成、诊断和投放实验。</p>
                </div>
              </div>

              <div className="panel">
                {storeProducts.length === 0 ? (
                  <div className="panel-body">
                    <div className="empty">
                      <svg className="ic ic-lg" aria-hidden="true" focusable="false"><use href="#i-doc"></use></svg>
                      <h4>这个店铺还没有绑定商品</h4>
                      <p>商品必须归属于某个 store_id 才能进入运营闭环。没有商品，库存、素材生成和经营口径都不会产生任何数据。</p>
                      <div className="empty-actions">
                        <Link className="btn btn-primary" href="/imports">
                          去导入中心导入商品
                          <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-arrow-r"></use></svg>
                        </Link>
                        <Link className="btn" href="/">回首页手动创建</Link>
                      </div>
                      <p className="empty-next">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                        创建后这里会出现：平台状态 · 售价 · 可售库存 · 卖点 · 进入单品
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tbl-wrap">
                      <table className="tbl tbl-scroll">
                        <caption className="sr-only">本店商品列表，显示前 {Math.min(6, storeProducts.length)} 条，共 {storeProducts.length} 条</caption>
                        <thead>
                          <tr>
                            <th scope="col">商品</th>
                            <th scope="col">平台状态</th>
                            <th scope="col" className="ta-r">售价</th>
                            <th scope="col" className="ta-r">可售库存</th>
                            <th scope="col">卖点</th>
                            <th scope="col">动作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storeProducts.slice(0, 6).map((product) => {
                            const available = availableByProduct.get(product.id);
                            const unmapped = !product.external_product_id;
                            return (
                              <tr key={product.id}>
                                <td>
                                  <div className="cell-goods">
                                    <span className="tbl-cover" aria-hidden="true">IMG</span>
                                    <span>
                                      <b>{product.name}</b>
                                      <span>类目 {product.category ?? "未分类"}{product.external_product_id ? ` · 映射 ${product.external_product_id}` : " · 待补平台映射"}</span>
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  {product.platform_status
                                    ? <span className={product.platform_status === "offline" ? "badge badge-warn" : "badge badge-online"}><span className="status-led" aria-hidden="true"></span>{product.platform_status === "offline" ? "未同步" : "在售"}</span>
                                    : <span className="badge badge-warn">未同步</span>}
                                </td>
                                <td className="cell-price ta-r">{product.price ? `¥${formatMoney(product.price)}` : "—"}</td>
                                <td className={`mono ta-r ${available === undefined ? "txt-faint" : available <= 0 ? "txt-accent" : ""}`}>
                                  {available === undefined ? "—" : formatInteger(available)}
                                </td>
                                <td>
                                  <span className="tag-row">
                                    {product.selling_points.slice(0, 3).map((point) => (
                                      <span key={point} className="tag">{point}</span>
                                    ))}
                                  </span>
                                </td>
                                <td>
                                  <div className="cell-actions">
                                    <Link className="btn" href={`/products/${product.id}`}>进入</Link>
                                    {unmapped ? (
                                      <Link className="btn" href="/imports">补映射</Link>
                                    ) : (
                                      <Link className="btn" href={`/products/${product.id}?tab=creative`}>生成素材</Link>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="tbl-note">
                      <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-warn"></use></svg>
                      <span>可售库存列 = StoreInventoryRow.available_quantity（现货 − 锁定），取该商品所有 SKU 之和；显示为 — 表示该商品还没有 SKU 记录，而不是 0。平台状态列取 product.platform_status，空值显示「未同步」。</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ==================== 库存概览 ==================== */}
            <section aria-labelledby="h-inv" id="inventory" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">INVENTORY OVERVIEW · SKU 维度</span>
                  <h2 className="t-h2" id="h-inv">库存概览</h2>
                </div>
                <div className="right">
                  <span className="mono-note">
                    {inventorySummary
                      ? `${inventorySummary.sku_count} 个 SKU · 现货 ${formatInteger(inventorySummary.total_quantity)} · 锁定 ${formatInteger(inventorySummary.total_locked_quantity)} · 可用 ${formatInteger(inventorySummary.total_available_quantity)}`
                      : "暂无库存汇总"}
                  </span>
                  <p className="cap">按 SKU 汇总库存、锁定量、可用量和低库存风险。锁定量的口径是「已下单未出库」。</p>
                </div>
              </div>

              <div className="panel">
                {inventorySummary ? (
                  <div className="panel-body">
                    <div className="tabs" role="tablist" aria-label="库存筛选">
                      <Link className="tab" role="tab" aria-selected={query.inventory !== "low"} href={`/stores/${store.id}`}>
                        全部库存 <span className="n">{inventorySummary.sku_count}</span>
                      </Link>
                      <Link className="tab" role="tab" aria-selected={query.inventory === "low"} href={`/stores/${store.id}?inventory=low`}>
                        低库存 <span className="n">{inventorySummary.low_stock_count}</span>
                      </Link>
                    </div>
                  </div>
                ) : null}

                {!inventorySummary || inventoryRows.length === 0 ? (
                  <div className="panel-body">
                    <div className="empty">
                      <svg className="ic ic-lg" aria-hidden="true" focusable="false"><use href="#i-db"></use></svg>
                      {query.inventory === "low" ? (
                        <>
                          <h4>当前没有低库存 SKU</h4>
                          <p>判据：可用量 ≤ 预警线。全部 {inventorySummary?.sku_count ?? 0} 个 SKU 都在预警线以上，本区块不会再出现告警条。</p>
                          <div className="empty-actions">
                            <Link className="btn" href={`/stores/${store.id}`}>查看全部库存</Link>
                          </div>
                          <p className="empty-next">
                            <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                            建议顺手做一次：把常销 SKU 的预警线按 7 天日均销量重设
                          </p>
                        </>
                      ) : (
                        <>
                          <h4>这个店铺还没有 SKU 库存数据</h4>
                          <p>库存按 SKU 登记：没有 SKU 记录，锁定量与可用量都无从谈起，低库存预警也不会生效。</p>
                          <div className="empty-actions">
                            <Link className="btn btn-primary" href="/products">去商品详情创建 SKU</Link>
                          </div>
                          <p className="empty-next">
                            <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                            登记后这里会出现：SKU · 商品 · 现货 · 锁定 · 可用 · 状态（低库存 ≤ 预警线）
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tbl-wrap">
                      <table className="tbl tbl-scroll-sm">
                        <caption className="sr-only">本店 SKU 库存汇总，共 {inventoryRows.length} 条</caption>
                        <thead>
                          <tr>
                            <th scope="col">SKU</th>
                            <th scope="col">商品</th>
                            <th scope="col" className="ta-r">现货</th>
                            <th scope="col" className="ta-r">锁定</th>
                            <th scope="col" className="ta-r">可用</th>
                            <th scope="col">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryRows.map((row) => (
                            <InventoryRow key={row.sku_id} row={row} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="tbl-note">
                      <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-warn"></use></svg>
                      <span>状态列同时给出判据与阈值（低库存 ≤ N），读者不用回头翻配置。零可用但现货不为 0 的行显示「全部锁定」，与「缺货」区分——前者是履约队列，后者是采购问题。</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ==================== 库存流水 ==================== */}
            <section aria-labelledby="h-move" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">INVENTORY MOVEMENTS</span>
                  <h2 className="t-h2" id="h-move">库存流水</h2>
                </div>
                <div className="right">
                  <span className="mono-note">共 {inventoryMovements.length} 条</span>
                  <p className="cap">集中查看店铺最近的库存变化。每行都给变化前后值，便于直接核对账实一致。</p>
                </div>
              </div>

              <div className="panel">
                {inventoryMovements.length === 0 ? (
                  <div className="panel-body">
                    <div className="empty">
                      <svg className="ic ic-lg" aria-hidden="true" focusable="false"><use href="#i-db"></use></svg>
                      <h4>这个店铺还没有库存流水</h4>
                      <p>流水在「入库 / 出库 / 盘点 / 锁定 / 释放」时生成。只有 SKU 库存数据、没有流水，通常说明库存是直接建档而不是走单据登记。</p>
                      <div className="empty-actions">
                        <Link className="btn btn-primary" href="/imports">导入入库单</Link>
                        <Link className="btn" href="/products">去商品详情登记 SKU</Link>
                      </div>
                      <p className="empty-next">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                        登记后这里会显示：类型 · 商品 · SKU · 现货变化 · 锁定变化 · 原因 · 时间
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tbl-wrap">
                      <table className="tbl tbl-scroll">
                        <caption className="sr-only">本店库存流水，共 {inventoryMovements.length} 条</caption>
                        <thead>
                          <tr>
                            <th scope="col">类型</th>
                            <th scope="col">商品</th>
                            <th scope="col">SKU</th>
                            <th scope="col" className="ta-r">现货变化</th>
                            <th scope="col" className="ta-r">锁定变化</th>
                            <th scope="col">原因</th>
                            <th scope="col">时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryMovements.slice(0, 20).map((movement) => (
                            <InventoryMovementRow key={movement.id} movement={movement} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="tbl-note">
                      <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-warn"></use></svg>
                      <span>类型映射：inbound 入库 · outbound 出库 · adjustment 盘点 · lock 锁定 · release 释放。变化列保留 before → after，避免只看到 delta 时无法对账；reason 为空时回退显示创建时间。</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ==================== 口径脚注 ==================== */}
            <section className="panel" aria-labelledby="h-legend">
              <div className="panel-head"><h3 id="h-legend">本页口径约定</h3><span className="badge mono">READING NOTES</span></div>
              <div className="panel-body stack-3">
                <dl className="facts">
                  <div className="fact">
                    <dt>未覆盖 ≠ 0</dt>
                    <dd>能力未开通或数据缺失显示「未覆盖」，不用 0 冒充。</dd>
                  </div>
                  <div className="fact">
                    <dt>可用量口径</dt>
                    <dd>可用 = 现货 − 锁定；锁定量是「已下单未出库」的履约占用。</dd>
                  </div>
                  <div className="fact">
                    <dt>低库存判据</dt>
                    <dd>available_quantity ≤ warning_threshold，预警线按 SKU 单独配置。</dd>
                  </div>
                  <div className="fact">
                    <dt>授权与数据</dt>
                    <dd>平台账号授权过期后数据静默断流：不报错、只停更，经营口径随之出现缺口。</dd>
                  </div>
                </dl>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

function StoreTopBar() {
  return (
    <header className="app-top">
      <Link className="brand" href="/">
        <span className="mark-slot" aria-hidden="true">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect x="12" y="12" width="8" height="8" rx="2" />
            <rect x="4" y="4" width="4" height="4" rx="1" />
            <rect x="24" y="4" width="4" height="4" rx="1" />
            <rect x="4" y="24" width="4" height="4" rx="1" />
            <rect x="24" y="24" width="4" height="4" rx="1" />
          </svg>
        </span>
        <span>运营智能体</span>
        <span className="sub">STORES / :id</span>
      </Link>
      <nav aria-label="主导航">
        <Link href="/">工作台</Link>
        <Link href="/imports">导入中心</Link>
        <Link href="/settings">模型配置</Link>
        <Link href="/agent">Agent 中心</Link>
      </nav>
      <div className="app-top-actions">
        <span className="badge badge-online"><span className="status-led" aria-hidden="true"></span>服务在线</span>
        <button type="button" className="btn btn-ghost btn-sm" id="themeBtn" aria-label="切换明暗主题">
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
          <span>主题</span>
        </button>
      </div>
    </header>
  );
}

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

type StoreWorkflowStep = {
  key: string;
  title: string;
  href: string;
  done: boolean;
  hint: string;
};

/** 构建店铺工作流steps，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function buildStoreWorkflowSteps(
  storeId: number,
  products: Product[],
  inventoryRows: StoreInventoryRow[],
  lowStockRows: StoreInventoryRow[],
  unmappedProducts: number,
): StoreWorkflowStep[] {
  return [
    {
      key: "store",
      title: "1 建店",
      href: `/stores/${storeId}`,
      done: true,
      hint: "店铺档案已创建，平台与主体信息齐全。",
    },
    {
      key: "products",
      title: "2 商品",
      href: `/?store=${storeId}`,
      done: products.length > 0,
      hint: products.length > 0 ? `${products.length} 个商品已归属本店，可直接进入单品运营闭环。` : "创建或导入商品并归属到本店。",
    },
    {
      key: "inventory",
      title: "3 SKU / 库存",
      href: `/stores/${storeId}`,
      done: inventoryRows.length > 0,
      hint: inventoryRows.length > 0 ? `${inventoryRows.length} 个 SKU 有库存记录，现货与锁定量可查。` : "进入商品维护 SKU 和库存。",
    },
    {
      key: "mapping",
      title: "4 数据映射",
      href: "/imports",
      done: products.length > 0 && unmappedProducts === 0,
      hint: unmappedProducts > 0 ? `${unmappedProducts} 个商品待补平台映射，补完才能拉平台侧经营数据。` : "导入经营数据或字段映射。",
    },
    {
      key: "risk",
      title: "5 异常处理",
      href: lowStockRows.length > 0 ? `/stores/${storeId}?inventory=low` : `/stores/${storeId}`,
      done: inventoryRows.length > 0 && lowStockRows.length === 0,
      hint: lowStockRows.length > 0 ? `${lowStockRows.length} 个 SKU 低库存，需人工确认补货或调整投放。` : "库存异常入口。",
    },
  ];
}

type InventoryStep = {
  title: string;
  href: string;
  state: "done" | "open" | "idle";
  hint: string;
};

/** 构建库存处理流程 4 步：done / open / idle 三态由真实数据推导。 */
function buildInventorySteps(
  storeId: number,
  inventoryRows: StoreInventoryRow[],
  lowStockRows: StoreInventoryRow[],
): InventoryStep[] {
  const hasInventory = inventoryRows.length > 0;
  const hasLowStock = lowStockRows.length > 0;
  return [
    {
      title: "1 发现低库存",
      href: hasLowStock ? `/stores/${storeId}?inventory=low` : `/stores/${storeId}`,
      state: hasInventory ? "done" : "idle",
      hint: hasLowStock ? `${lowStockRows.length} 个 SKU 低于预警线，已进入待处理清单。` : "当前无低库存风险。",
    },
    {
      title: "2 分析销量",
      href: "/imports",
      state: "open",
      hint: "导入经营数据后判断补货优先级。",
    },
    {
      title: "3 生成建议",
      href: "#advice",
      state: "open",
      hint: "使用库存异常 AI / 规则建议，产出补货与投放两套动作。",
    },
    {
      title: "4 人工确认",
      href: "#advice",
      state: !hasLowStock && hasInventory ? "done" : "idle",
      hint: "补货、调拨和投放节奏由人工确认，系统不自动下单。",
    },
  ];
}

/** 渲染 InventoryRow 组件：状态列同时给出判据与阈值，零可用与缺货区分。 */
function InventoryRow({ row }: { row: StoreInventoryRow }) {
  const allLocked = row.available_quantity <= 0 && row.quantity > 0;
  return (
    <tr>
      <td>
        <div className="cell-goods">
          <span>
            <b>{row.sku_name}</b>
            <span>SKU {row.sku_id}{row.location ? ` · ${row.location}` : " · 未分配库位"}</span>
          </span>
        </div>
      </td>
      <td><Link className="cell-link" href={`/products/${row.product_id}?tab=overview`}>{row.product_name}</Link></td>
      <td className="mono ta-r">{formatInteger(row.quantity)}</td>
      <td className="mono ta-r">{formatInteger(row.locked_quantity)}</td>
      <td className={`mono ta-r b700 ${row.available_quantity <= 0 ? "txt-accent" : ""}`}>{formatInteger(row.available_quantity)}</td>
      <td>
        {row.is_low_stock ? (
          <span className="badge badge-warn">低库存 ≤ {row.warning_threshold}</span>
        ) : allLocked ? (
          <span className="badge">全部锁定</span>
        ) : (
          <span className="badge badge-online"><span className="status-led" aria-hidden="true"></span>正常</span>
        )}
      </td>
    </tr>
  );
}

const movementTypeMeta: Record<string, { label: string; className: string }> = {
  inbound: { label: "入库", className: "badge-online" },
  outbound: { label: "出库", className: "badge-accent" },
  adjustment: { label: "盘点", className: "badge" },
  lock: { label: "锁定", className: "badge-info" },
  release: { label: "释放", className: "badge-info" },
};

/** 渲染 InventoryMovementRow 组件：类型徽标 + before → after + 原因回退。 */
function InventoryMovementRow({ movement }: { movement: StoreInventoryMovementRow }) {
  const typeMeta = movementTypeMeta[movement.movement_type] ?? { label: movement.movement_type, className: "badge" };
  return (
    <tr>
      <td><span className={`badge ${typeMeta.className}`}>{typeMeta.label}</span></td>
      <td><Link className="cell-link" href={`/products/${movement.product_id}?tab=overview`}>{movement.product_name}</Link></td>
      <td className="mono">{movement.sku_code}</td>
      <td className="ta-r">
        <span className={formatDeltaClass(movement.quantity_delta)}>{formatSigned(movement.quantity_delta)}</span>{" "}
        <span className="mono txt-faint">{movement.before_quantity} → {movement.after_quantity}</span>
      </td>
      <td className="ta-r">
        <span className={movement.locked_delta === 0 ? "delta-zero" : "delta-neg"}>{formatSigned(movement.locked_delta)}</span>{" "}
        <span className="mono txt-faint">{movement.before_locked_quantity} → {movement.after_locked_quantity}</span>
      </td>
      <td>{movement.reason ?? <span className="mono txt-faint">{formatDateTime(movement.created_at)}</span>}</td>
      <td className="mono">{formatShortTime(movement.created_at)}</td>
    </tr>
  );
}

/** 格式化带符号，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatSigned(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

/** 现货变化配色：入库（正）为成功色、出库（负）为强调色、零变动为中性色。 */
function formatDeltaClass(value: number): string {
  if (value > 0) {
    return "delta-pos";
  }
  if (value < 0) {
    return "delta-neg";
  }
  return "delta-zero";
}

/** 日期（YYYY-MM-DD）。 */
function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** 日期时间（YYYY-MM-DD HH:mm）。 */
function formatDateTime(iso: string): string {
  if (iso.length < 16) {
    return iso;
  }
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** 短时间（MM-DD HH:mm）。 */
function formatShortTime(iso: string): string {
  if (iso.length < 16) {
    return iso;
  }
  return iso.slice(5, 16);
}

/** 千分位整数。 */
function formatInteger(value: number): string {
  return value.toLocaleString("zh-CN");
}

/** 金额（去掉小数尾零，保留最多两位）。 */
function formatMoney(value: string | number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return num.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
