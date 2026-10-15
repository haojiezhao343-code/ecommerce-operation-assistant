import Link from "next/link";
import { notFound } from "next/navigation";

import { CompetitorCreateForm } from "@/components/competitor-create-form";
import { CompetitorUrlImportForm } from "@/components/competitor-url-import-form";
import { AgentRunPanel } from "@/components/agent-run-panel";
import { CreativePlanStatusActions } from "@/components/creative-plan-status-actions";
import { DiagnosisEditForm } from "@/components/diagnosis-edit-form";
import { GenerationJobAutoRefresh } from "@/components/generation-job-auto-refresh";
import { MainImagePlanEditForm } from "@/components/main-image-plan-edit-form";
import { PerformanceImportForm } from "@/components/performance-import-form";
import { PerformanceRecordForm } from "@/components/performance-record-form";
import { PlatformMappingPanel } from "@/components/platform-mapping-panel";
import { ProductEditForm } from "@/components/product-edit-form";
import { ReviewReportEditForm } from "@/components/review-report-edit-form";
import { SkuCreateForm, SkuInventoryPanel } from "@/components/sku-inventory-forms";
import { VideoScriptEditForm } from "@/components/video-script-edit-form";
import { getAdExperimentDashboard, getAgentRuns, getCurrentUser, getProduct, getStores } from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type {
  AdExperiment,
  AdExperimentDashboard,
  Competitor,
  CompetitorMonitor,
  GeneratedAsset,
  GenerationJob,
  InventoryMovement,
  PerformanceRecord,
  ProductDetail,
  PromotionLink,
} from "@/types";

/* ==========================================================================
   页面样式（对照 designs/product-detail.html 内联 <style> 移植）
   —— 只消费 design-system.css 的 token 与组件类，不新增视觉值
   ========================================================================== */
const productCss = `
  /* 宽表格 min-width 会经由 grid 项的自动最小尺寸把整页撑宽（375px 会溢出），
     这里把外壳轨道的最小值钉成 0，让 .tbl-wrap 自己横向滚动。 */
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
  .row-end { align-items: flex-end; }
  .grow { flex: 1; min-width: 0; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-4); }
  .grid-2-1 { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: var(--sp-4); }
  .grid-1-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); gap: var(--sp-4); }
  .code { font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.75; color: var(--fg-secondary);
          background: var(--surface-sunken); border: 1px solid var(--border); border-radius: var(--radius);
          padding: var(--sp-3); overflow-x: auto; white-space: pre; }
  .url { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); overflow-wrap: anywhere; }
  .mono-note { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .app-top nav a { min-height: 44px; display: inline-flex; align-items: center; white-space: nowrap; flex: 0 0 auto; }
  .ic-back { transform: rotate(90deg); }
  [id] { scroll-margin-top: 130px; }

  /* --- 区块头 -------------------------------------------------------- */
  .sec { display: flex; flex-direction: column; gap: var(--sp-4); }
  .sec-hd {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp-3) var(--sp-4); flex-wrap: wrap;
    margin-bottom: var(--sp-1); padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .sec-hd h2 { font-size: var(--fs-h2); }
  .sec-hd .mono-note { max-width: 62ch; text-align: right; }
  .sec-hd .stack-2 { min-width: 0; }

  /* --- 粘性页签导航 --------------------------------------------------- */
  .subnav { border-bottom: 1px solid var(--border); background: var(--bg); }
  .tabs { display: flex; gap: .25rem; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    flex: 0 0 auto;
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

  /* --- 页头与 KPI ------------------------------------------------------ */
  .page-hd { display: flex; flex-direction: column; gap: var(--sp-4); }
  .crumb {
    display: inline-flex; align-items: center; gap: .4rem; min-height: 44px;
    font-size: var(--fs-meta); color: var(--muted);
  }
  .crumb:hover { color: var(--fg); }
  .hd-split { display: flex; flex-direction: column; gap: var(--sp-4); }
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
  .kpi-desc { color: var(--muted); line-height: 1.7; flex: 1; }
  .kpi-foot {
    display: flex; align-items: center; justify-content: space-between;
    gap: .5rem; flex-wrap: wrap;
    padding-top: var(--sp-3); border-top: 1px solid var(--border);
  }

  /* --- 反白 lead 面板（全页唯一最高层级） ------------------------------ */
  .panel-inverted .lead-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
  .panel-inverted .lead-main { padding: var(--sp-5); border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: var(--sp-3); }
  .panel-inverted .lead-side { padding: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-3); }
  .panel-inverted h3, .panel-inverted h2 { font-size: var(--fs-h2); }
  .panel-inverted h2 { color: var(--bg); }
  .panel-inverted .do { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-3); align-items: center; }
  .panel-inverted .trace { background: transparent; border-color: color-mix(in oklch, var(--bg) 26%, var(--fg)); margin-bottom: 0; }
  .panel-inverted .trace-hd {
    border-bottom-color: color-mix(in oklch, var(--bg) 26%, var(--fg));
    color: color-mix(in oklch, var(--bg) 74%, var(--fg));
  }
  .panel-inverted .trace-step { border-bottom-color: color-mix(in oklch, var(--bg) 18%, var(--fg)); }
  .panel-inverted .trace-step p { color: color-mix(in oklch, var(--bg) 82%, var(--fg)); }
  .panel-inverted .trace-time { color: color-mix(in oklch, var(--bg) 66%, var(--fg)); }
  .panel-inverted .trace-dot { background: color-mix(in oklch, var(--bg) 46%, var(--fg)); }
  .panel-inverted .trace-dot.done { background: var(--success); }
  .panel-inverted .trace-dot.run { background: var(--warn); }
  .panel-inverted .trace-dot.fail { background: var(--accent); }
  .panel-inverted .btn:not(.btn-primary) {
    background: transparent;
    border-color: color-mix(in oklch, var(--bg) 42%, var(--fg));
    color: var(--bg);
  }
  .todo-step { padding: .5rem 0; }
  .todo-step p { font-size: var(--fs-meta); line-height: 1.7; }

  /* --- 闭环进度轨（7 步 / 5 步共用） ---------------------------------- */
  .flow {
    display: grid; gap: 0; border: 1px solid var(--border);
    border-radius: var(--radius); background: var(--surface); overflow: hidden;
  }
  .flow-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .flow-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .flow-step {
    min-width: 0; padding: var(--sp-3);
    border-right: 1px solid var(--border);
    border-top: 2px solid transparent;
    display: flex; flex-direction: column; gap: .375rem;
  }
  .flow-step:last-child { border-right: 0; }
  .flow-step.is-done { border-top-color: var(--success); }
  .flow-step.is-next { border-top-color: var(--accent); background: var(--accent-tint); }
  .flow-step.is-idle h4, .flow-step.is-idle h3 { color: var(--muted); }
  .flow-step a { display: flex; flex-direction: column; gap: .375rem; min-height: 44px; }
  .flow-idx { font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700; letter-spacing: .1em; color: var(--faint); }
  .flow-step h4, .flow-step h3 { font-size: var(--fs-body); }
  .flow-step p { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); line-height: 1.6; }
  .flow-mark { display: inline-flex; align-items: center; gap: .375rem; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .flow-step.is-next .flow-mark { color: var(--accent); }
  .wf-icon {
    width: 36px; height: 36px; flex: none; display: grid; place-items: center;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken); color: var(--fg-secondary); font-size: 18px;
  }

  /* --- 语义 tint 块 ---------------------------------------------------- */
  .tint {
    border: 1px solid var(--border); border-left: 3px solid var(--border-strong);
    border-radius: var(--radius); padding: var(--sp-3) var(--sp-4); min-width: 0;
  }
  .tint-lbl {
    display: block; margin-bottom: .375rem;
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: var(--faint);
  }
  .tint p { color: var(--fg-secondary); }
  .tint ul { margin: 0; padding: 0; list-style: none; }
  .tint li { font-size: var(--fs-body); line-height: 1.7; color: var(--fg-secondary); }
  .tint-ok     { background: var(--success-tint); border-left-color: var(--success); }
  .tint-warn   { background: var(--warn-tint);    border-left-color: var(--warn); }
  .tint-info   { background: var(--info-tint);    border-left-color: var(--info); }
  .tint-accent { background: var(--accent-tint);  border-left-color: var(--accent); }
  .tint-accent .tint-lbl { color: var(--accent); }
  .tint-ok .tint-lbl { color: var(--success); }
  .tint-warn .tint-lbl { color: var(--warn); }
  .tint-info .tint-lbl { color: var(--info); }

  /* --- 提示条 ---------------------------------------------------------- */
  .alert {
    display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: .75rem;
    align-items: center; min-height: 44px;
    border: 1px solid var(--border); border-left: 3px solid var(--border-strong);
    border-radius: var(--radius); background: var(--surface);
    padding: var(--sp-3) var(--sp-4);
  }
  .alert-ok     { background: var(--success-tint); border-left-color: var(--success); }
  .alert-warn   { background: var(--warn-tint);    border-left-color: var(--warn); }
  .alert-fail   { background: var(--accent-tint);  border-left-color: var(--accent); }
  .alert-info   { background: var(--info-tint);    border-left-color: var(--info); }
  .alert .h { font-weight: 700; }
  .alert > span { font-size: var(--fs-body); line-height: 1.7; color: var(--fg-secondary); min-width: 0; }

  /* --- 指标小卡 -------------------------------------------------------- */
  .metrics { display: grid; gap: var(--sp-2); grid-template-columns: repeat(auto-fit, minmax(min(118px, 100%), 1fr)); }
  .metrics-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .metric {
    min-width: 0; padding: .5rem .75rem;
    border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-sunken);
  }
  .metric .lbl { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .metric .val { display: block; margin-top: .125rem; font-family: var(--font-mono); font-weight: 700; font-size: var(--fs-meta); }
  .metric .val.is-ok { color: var(--success); }
  .metric .val.is-warn { color: var(--warn); }
  .metric .val.is-accent { color: var(--accent); }
  .metric .val.is-idle { color: var(--muted); font-weight: 400; }

  /* --- 生成任务三态 ---------------------------------------------------- */
  .job {
    display: flex; flex-direction: column; gap: var(--sp-2); min-width: 0;
    border: 1px solid var(--border); border-left-width: 3px; border-left-color: var(--border-strong);
    border-radius: var(--radius); background: var(--surface); padding: var(--sp-3);
  }
  .job.is-run  { border-left-color: var(--warn); }
  .job.is-ok   { border-left-color: var(--success); }
  .job.is-fail { border-left-color: var(--accent); }
  .job-hd { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); flex-wrap: wrap; }
  .job-body { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--sp-3); align-items: start; }
  .job-id { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }

  /* --- 进度条 / 趋势条 -------------------------------------------------- */
  .bar { height: 8px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-sunken); overflow: hidden; }
  .bar > i { display: block; height: 100%; background: var(--border-strong); }
  .bar > .is-run { background: var(--warn); }
  .bar > .is-ok { background: var(--success); }
  .bar > .is-accent { background: var(--accent); }
  .bar > .is-info { background: var(--info); }
  .trend { display: grid; grid-template-columns: 52px minmax(0, 1fr) 84px; gap: .5rem; align-items: center; }
  .trend .t-lbl { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .trend .t-val { text-align: right; font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700; }

  /* --- 媒体占位 --------------------------------------------------------- */
  .thumb {
    aspect-ratio: 1 / 1; width: 100%;
    display: grid; place-items: center; text-align: center;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint);
    padding: var(--sp-2);
  }
  .thumb-169 { aspect-ratio: 16 / 9; }
  .thumb-sm { width: 64px; aspect-ratio: 1 / 1; }
  .asset { display: flex; flex-direction: column; gap: var(--sp-3); }
  .asset-fig { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--surface-sunken); }

  /* --- 键值表 / 表单 ---------------------------------------------------- */
  .kv { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .375rem var(--sp-3); margin: 0; }
  .kv dt { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); white-space: nowrap; }
  .kv dd { margin: 0; color: var(--fg-secondary); min-width: 0; overflow-wrap: anywhere; font-size: var(--fs-body); line-height: 1.7; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: var(--sp-3); }
  .input, select.input, input.input, textarea.input { min-width: 0; }
  .input { min-height: 44px; }
  textarea.input { min-height: 44px; }
  details > summary {
    display: flex; align-items: center; gap: .5rem; min-height: 44px;
    cursor: pointer; color: var(--fg-secondary); font-weight: 600;
  }
  details > summary:hover { color: var(--fg); }
  details.boxed {
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-subtle); padding: 0 var(--sp-3) var(--sp-3);
  }
  details.boxed[open] { padding-bottom: var(--sp-4); }
  .lnk { display: inline-flex; align-items: center; gap: .375rem; min-height: 44px; color: var(--info); font-weight: 600; }
  .lnk:hover { text-decoration: underline; }
  .chip-row { display: flex; flex-wrap: wrap; gap: .375rem .5rem; }

  /* --- 表格 ------------------------------------------------------------- */
  .tbl { font-size: var(--fs-body); min-width: 100%; }
  .tbl-l { min-width: 720px; }
  .tbl-x { min-width: 980px; }
  .tbl .num { font-family: var(--font-mono); text-align: right; white-space: nowrap; }
  .tbl .key { font-family: var(--font-mono); color: var(--faint); white-space: nowrap; }
  .tbl .wrap-cell { min-width: 14rem; }
  .tbl .actions { display: flex; flex-wrap: wrap; gap: .375rem; }
  .cell-goods { display: flex; align-items: center; gap: var(--sp-3); min-width: 14rem; }
  .cell-goods b { font-weight: 600; }
  .cell-goods span { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .tbl-note {
    display: flex; align-items: flex-start; gap: .5rem;
    padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--border);
    background: var(--surface-subtle);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); line-height: 1.7;
  }

  /* --- 空态 -------------------------------------------------------------- */
  .empty-actions { display: flex; justify-content: center; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
  .empty-next {
    margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
    display: flex; align-items: center; justify-content: center; gap: .5rem; flex-wrap: wrap;
    text-align: left;
  }

  /* --- 响应式 ------------------------------------------------------------ */
  @media (min-width: 768px) {
    .subnav { position: sticky; top: 60px; z-index: 30; }
  }
  @media (max-width: 1199px) {
    .metrics-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 1023px) {
    .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .flow-7, .flow-5 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .flow-step { border-bottom: 1px solid var(--border); }
    .panel-inverted .lead-grid { grid-template-columns: minmax(0, 1fr); }
    .panel-inverted .lead-main { border-right: 0; border-bottom: 1px solid var(--border); }
  }
  @media (max-width: 899px) {
    .grid-2, .grid-3, .grid-2-1, .grid-1-2 { grid-template-columns: minmax(0, 1fr); }
    .sec-hd .mono-note { text-align: left; }
    .job-body { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767px) {
    .app-top .brand .sub { display: none; }
    .kpi-grid { grid-template-columns: minmax(0, 1fr); }
    .flow-7, .flow-5 { grid-template-columns: minmax(0, 1fr); }
    .flow-step { border-right: 0; }
    .metrics-6 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .thumb-sm { width: 44px; }
  }
`;

const platformLabels: Record<string, string> = {
  douyin: "抖音",
  taobao: "淘宝",
  tmall: "天猫",
  pinduoduo: "拼多多",
  jd: "京东",
  tiktok_shop: "TikTok",
  amazon: "Amazon",
  other: "其他",
};

const productTabs = [
  { key: "overview", label: "商品&竞品" },
  { key: "agent", label: "运营 Agent" },
  { key: "diagnosis", label: "诊断" },
  { key: "main-images", label: "主图" },
  { key: "video", label: "视频" },
  { key: "assets", label: "素材库" },
  { key: "links", label: "链接" },
  { key: "ads", label: "投放" },
  { key: "jobs", label: "任务" },
  { key: "review", label: "复盘" },
] as const;

type ProductTabKey = (typeof productTabs)[number]["key"];

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    assets?: string;
    experiment?: string;
    competitor?: string;
    competitor_import?: string;
    monitor?: string;
    count?: string;
    import?: string;
    inventory?: string;
    links?: string;
    mapping?: string;
    performance?: string;
    sku?: string;
    tab?: string;
    section?: string;
  }>;
};

/** 渲染商品页面；在服务端加载业务数据，并把交互交给对应表单或客户端组件。 */
export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  // 商品详情页是单品运营闭环主入口，首屏并行读取详情、实验看板、店铺和登录态。
  const [product, adExperimentDashboard, agentRuns, stores, token] = await Promise.all([
    getProduct(id),
    getAdExperimentDashboard(id),
    getAgentRuns(id),
    getStores(),
    getAuthToken(),
  ]);

  if (!product) {
    notFound();
  }

  const priceSpread =
    product.competitors.length > 0
      ? product.competitors
          .map((competitor) => Number(competitor.price))
          .filter((price) => Number.isFinite(price) && price > 0)
      : [];
  const latestDiagnosis = product.diagnoses[0];
  const mainImagePlans = product.creative_plans
    .filter((plan) => plan.type === "main_image")
    .sort((a, b) => b.id - a.id)
    .slice(0, 4);
  const videoScripts = product.creative_plans
    .filter((plan) => plan.type === "video_script")
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);
  const performanceSummary = summarizePerformance(product.performance_records);
  const performanceRecords = [...product.performance_records].sort((a, b) => b.id - a.id).slice(0, 5);
  const latestReviewReport = [...product.review_reports].sort((a, b) => b.id - a.id)[0];
  const latestAdRecommendation = [...product.ad_recommendations].sort((a, b) => b.id - a.id)[0];
  const adExperiments = [...product.ad_experiments].sort((a, b) => b.id - a.id).slice(0, 4);
  // ?section= 锚点参数与 ?tab= 等价（设计稿以 section 锚点导航，线上系统用 tab 路由切换）
  const activeTab = resolveProductTab(resolvedSearchParams?.tab ?? resolvedSearchParams?.section);
  const workflowSteps = buildProductWorkflowSteps(product);
  const competitorInsights = buildCompetitorInsights(product.competitors, product.price);
  // InventoryMovement 挂在每个 SKU 上，这里跨 SKU 聚合后按时间倒序展示最近流水
  const inventoryMovements = (product.skus ?? [])
    .flatMap((sku) => sku.inventory_movements ?? [])
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
  const assetLibrary = collectAssetLibrary(product.generated_assets, product.creative_plans);
  const hasActiveGenerationJobs = product.generation_jobs.some((job) =>
    ["pending", "running"].includes(job.status),
  );
  const currentUser = token ? await getCurrentUser(token) : null;
  // canEdit 只控制前端写操作入口展示；真实鉴权仍由后端 API 权限依赖兜底。
  const canEdit = Boolean(currentUser?.permissions.can_edit);
  const doneStepCount = workflowSteps.filter((step) => step.done).length;
  const nextStep = workflowSteps.find((step) => !step.done) ?? workflowSteps[workflowSteps.length - 1];
  const recentJobs = product.generation_jobs.slice(0, 5);
  const blockedJobs = recentJobs.filter((job) => job.status === "failed");
  const runningJobCount = recentJobs.filter((job) => ["pending", "running"].includes(job.status)).length;
  const missingLinkCompetitors = product.competitors.filter((competitor) => !competitor.url).length;
  const imageAssetCount = assetLibrary.filter((asset) => asset.kind === "image").length;
  const videoAssetCount = assetLibrary.filter((asset) => asset.kind === "video").length;
  const assetStatusCounts = countAssetStatuses(assetLibrary);

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: productCss }} />

      <ProductTopBar />

      <main className="app-body">
        <div className="pane">
          <div className="wrap">
            <div className="stack">
              <GenerationJobAutoRefresh active={hasActiveGenerationJobs} />

              {/* 页头：这个单品是谁 */}
              <header className="page-hd">
                <Link className="crumb" href="/">
                  <svg className="ic ic-sm ic-back" aria-hidden="true"><use href="#i-chev"></use></svg>
                  返回商品池
                </Link>

                <div className="hd-split">
                  <div className="row row-between row-end">
                    <div className="stack-3">
                      <span className="eyebrow">
                        {platformLabels[product.platform]} · {product.category ?? "未分类"} · 店铺 #{product.store_id}
                      </span>
                      <h1 className="t-h1">{product.name}</h1>
                      <div className="chip-row">
                        {product.selling_points.length === 0 ? (
                          <span className="tag">暂无卖点</span>
                        ) : (
                          product.selling_points.map((point) => (
                            <span key={point} className="tag">{point}</span>
                          ))
                        )}
                      </div>
                      <div className="row">
                        <span className="mono-note">商品 #{product.id}</span>
                        <span className="mono-note">外部 ID {product.external_product_id ?? "—"}</span>
                        <span className="mono-note">资料更新 {formatDateTime(product.updated_at)}</span>
                        <span className="mono-note">
                          {product.skus.length} SKU · {product.competitors.length} 竞品 · {assetLibrary.length} 素材
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* 反白 lead 面板：现在什么状态、下一步干什么、有什么要人工处理 */}
              <section className="panel panel-inverted" aria-labelledby="h-lead">
                <div className="lead-grid">
                  <div className="lead-main">
                    <span className="eyebrow">CURRENT STATE · 单品闭环 {doneStepCount} / {workflowSteps.length}</span>
                    <h2 id="h-lead">
                      {nextStep.done ? "闭环已跑通：回到复盘把结论固化下来" : `下一步 · ${nextStep.title}`}
                    </h2>
                    <p>
                      {nextStep.done
                        ? "建档、竞品、诊断、素材、投放、数据与复盘七个环节均已完成。最近一次复盘结论在复盘页签，可继续据此迭代下一轮动作。"
                        : `${nextStep.hint}。完成后这一步会标记为已完成，再进入下一个环节。`}
                      {runningJobCount > 0 ? ` 当前有 ${runningJobCount} 个生成任务在后台执行，页面会自动刷新状态。` : ""}
                    </p>
                    <div className="do">
                      <span className="badge badge-accent">下一步 · STEP {String(workflowSteps.indexOf(nextStep) + 1).padStart(2, "0")} {nextStep.title}</span>
                      <Link className="btn btn-primary" href={nextStep.href}>
                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>
                        {nextStep.done ? "查看复盘" : "继续处理"}
                      </Link>
                      <Link className="btn" href={`/products/${product.id}?tab=review`}>查看经营数据</Link>
                    </div>
                  </div>

                  <div className="lead-side">
                    <span className="eyebrow">BLOCKERS · 待你处理 {blockedJobs.length} 项</span>
                    {blockedJobs.length > 0 ? (
                      <div className="trace">
                        <div className="trace-hd">
                          <span>需要人工介入</span>
                          <span>{blockedJobs.length} 项</span>
                        </div>
                        {blockedJobs.map((job) => (
                          <div key={job.id} className="trace-step todo-step">
                            <span className="trace-dot fail" aria-hidden="true"></span>
                            <p>
                              <b>生成任务 #{job.id} {job.kind === "video_asset" ? "视频" : "图片"}草稿失败</b>
                              {job.error ? ` · ${job.error}` : ""}
                            </p>
                            {canEdit ? (
                              <form action={`/products/${product.id}/generation-jobs/${job.id}/retry`} method="post">
                                <input type="hidden" name="tab" value={activeTab} />
                                <button type="submit" className="btn">重试</button>
                              </form>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="trace">
                        <div className="trace-hd">
                          <span>需要人工介入</span>
                          <span>0 项</span>
                        </div>
                        <div className="trace-step todo-step">
                          <span className="trace-dot done" aria-hidden="true"></span>
                          <p><b>没有失败的生成任务</b> · 有新任务时这里会出现重试入口</p>
                        </div>
                      </div>
                    )}
                    <p className="t-mini mono">只读权限账号下，以上写操作按钮全部隐藏（canEdit 逻辑）。</p>
                  </div>
                </div>
              </section>

              {/* 首屏 KPI：只有 1 个 accent 顶边 = 当前关注项 */}
              <section aria-label="关键数字">
                <div className="kpi-grid">
                  <article className={competitorInsights.cheaperCount > 0 ? "kpi is-lead" : "kpi"}>
                    <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-db"></use></svg>售价</span>
                    <span className={`kpi-val${product.price ? "" : " is-idle"}`}>{product.price ? `¥${product.price}` : "未填写"}</span>
                    <p className="kpi-desc">
                      {priceSpread.length > 0
                        ? `竞品价格带 ${formatNumberMoney(competitorInsights.minPrice ?? 0)} - ${formatNumberMoney(competitorInsights.maxPrice ?? 0)}，均价 ${formatNumberMoney(competitorInsights.averagePrice ?? 0)}。`
                        : "还没有竞品价格样本，补竞品后这里会出现价格带对比。"}
                    </p>
                    <div className="kpi-foot">
                      {competitorInsights.cheaperCount > 0 ? (
                        <span className="badge badge-accent">{competitorInsights.cheaperCount} 个竞品低于本品</span>
                      ) : (
                        <span className="badge badge-info">价格在样本区间内</span>
                      )}
                      <span className="mono-note">下一步 · 复盘决定是否调价</span>
                    </div>
                  </article>

                  <article className="kpi">
                    <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-search"></use></svg>竞品样本</span>
                    <span className="kpi-val">{product.competitors.length}</span>
                    <p className="kpi-desc">
                      {competitorInsights.competitorCount > 0
                        ? `价格带 ${competitorInsights.minPrice !== null ? formatNumberMoney(competitorInsights.minPrice) : "—"} – ${competitorInsights.maxPrice !== null ? formatNumberMoney(competitorInsights.maxPrice) : "—"}；本品低于 ${competitorInsights.higherCount} 个、高于 ${competitorInsights.cheaperCount} 个。已启用监控 ${product.competitor_monitors?.filter((monitor) => monitor.status === "active").length ?? 0} 个。`
                        : "建议先录入 3 个同价位或同类目爆款，价格带与卖点判断才有抓手。"}
                    </p>
                    <div className="kpi-foot">
                      <span className="badge badge-info">数据完整度 {competitorInsights.completeness}%</span>
                      <span className="mono-note">{missingLinkCompetitors > 0 ? `${missingLinkCompetitors} 个竞品缺少链接` : "链接齐备"}</span>
                    </div>
                  </article>

                  <article className="kpi">
                    <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-copy"></use></svg>素材资产</span>
                    <span className="kpi-val">{assetLibrary.length}</span>
                    <p className="kpi-desc">
                      主图 {imageAssetCount} · 视频 {videoAssetCount}
                      {assetLibrary.length > 0 ? "；素材状态与评分在素材库页签维护，可挂经营数据做归因。" : "。先生成主图方案与视频脚本，再出图出片。"}
                    </p>
                    <div className="kpi-foot">
                      <span className="badge">主图 {imageAssetCount} · 视频 {videoAssetCount}</span>
                      <span className="mono-note">{assetStatusCounts}</span>
                    </div>
                  </article>

                  <article className="kpi">
                    <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-check"></use></svg>整体 ROI</span>
                    <span className={`kpi-val${performanceSummary.roi === null ? " is-idle" : ""}`}>
                      {performanceSummary.roi === null ? "待回填" : formatNumberDecimal(performanceSummary.roi)}
                    </span>
                    <p className="kpi-desc">
                      {performanceSummary.recordCount > 0
                        ? `${performanceSummary.recordCount} 条经营数据：曝光 ${formatInteger(performanceSummary.impressions)}、成交 ${performanceSummary.conversions} 单、花费 ${formatNumberMoney(performanceSummary.spend)}。`
                        : "还没有经营数据。录入一条数据，才谈得上归因与复盘。"}
                    </p>
                    <div className="kpi-foot">
                      <span className="badge">口径：人工回填</span>
                      <span className="mono-note">非平台实时扣费数据</span>
                    </div>
                  </article>
                </div>
              </section>

              {/* 单品运营流程（7 步闭环） */}
              <ProductWorkflowPanel steps={workflowSteps} />

              {/* 页签导航（?tab= 路由切换，与 ?section= 锚点参数等价） */}
              <ProductTabNav productId={product.id} activeTab={activeTab} />

              {!canEdit ? (
                <div className="alert alert-warn">
                  <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
                  <span><b className="h">当前账号为只读权限</b> —— 生成、保存、取消、重试和导入等写操作按钮已隐藏。真实鉴权仍由后端 API 兜底，前端隐藏只是减少误操作。</span>
                  <span className="badge badge-warn">canEdit = false</span>
                </div>
              ) : null}

              <GenerationJobSummary
                activeTab={activeTab}
                canEdit={canEdit}
                jobs={recentJobs}
                productId={product.id}
              />

              {activeTab === "agent" ? (
                <AgentRunPanel productId={product.id} initialRuns={agentRuns} canEdit={canEdit} />
              ) : null}

              {activeTab === "overview" ? (
                <section className="sec" id="overview" aria-labelledby="h-overview">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 01 · TAB=OVERVIEW · 商品&竞品</span>
                      <h2 id="h-overview">建档 · SKU 库存 · 平台映射 · 竞品洞察 · 快照监控</h2>
                    </div>
                    <span className="mono-note">左侧 4 个录入表单折叠收纳；事实面板提到前面</span>
                  </div>

                  <div className="grid-1-2">
                    <div className="stack-4">
                      <div className="panel">
                        <div className="panel-head"><h3>商品档案</h3><span className="badge">ProductEditForm</span></div>
                        <div className="panel-body">
                          <ProductEditForm product={product} canEdit={canEdit} />
                        </div>
                      </div>
                      <div className="panel">
                        <div className="panel-head"><h3>新建 SKU</h3><span className="badge">SkuCreateForm</span></div>
                        <div className="panel-body">
                          <SkuCreateForm productId={product.id} canEdit={canEdit} />
                        </div>
                      </div>
                      <div className="panel">
                        <div className="panel-head"><h3>竞品链接导入</h3><span className="badge">CompetitorUrlImportForm</span></div>
                        <div className="panel-body">
                          <CompetitorUrlImportForm productId={product.id} canEdit={canEdit} />
                        </div>
                      </div>
                      <div className="panel">
                        <div className="panel-head"><h3>手动录入竞品</h3><span className="badge">CompetitorCreateForm</span></div>
                        <div className="panel-body">
                          <CompetitorCreateForm productId={product.id} canEdit={canEdit} />
                        </div>
                      </div>
                    </div>

                    <div className="stack-4">
                      <SkuInventoryPanel
                        productId={product.id}
                        skus={product.skus ?? []}
                        skuStatus={resolvedSearchParams?.sku}
                        inventoryStatus={resolvedSearchParams?.inventory}
                        canEdit={canEdit}
                      />

                      {/* 库存流水：InventoryMovement 五类型（inbound / outbound / adjustment / lock / release） */}
                      <div className="panel">
                        <div className="panel-head">
                          <h3>库存流水</h3>
                          <div className="row">
                            <span className="badge">{inventoryMovements.length} 条</span>
                            <span className="mono-note">全部库存变化可追溯到 InventoryMovement</span>
                          </div>
                        </div>
                        {inventoryMovements.length > 0 ? (
                          <div className="tbl-wrap">
                            <table className="tbl tbl-l">
                              <caption className="sr-only">库存变动流水，共 {inventoryMovements.length} 条</caption>
                              <thead>
                                <tr>
                                  <th scope="col">时间</th>
                                  <th scope="col">类型</th>
                                  <th scope="col" className="num">库存变化</th>
                                  <th scope="col" className="num">锁定变化</th>
                                  <th scope="col">原因</th>
                                  <th scope="col">操作人</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventoryMovements.slice(0, 20).map((movement: InventoryMovement) => (
                                  <InventoryMovementRow key={movement.id} movement={movement} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="panel-body">
                            <div className="empty">
                              <svg className="ic ic-lg" aria-hidden="true"><use href="#i-db"></use></svg>
                              <h4>还没有库存流水</h4>
                              <p>人工盘点、导入修正、下单锁定与释放都会在这里留下流水，方便追溯每一次库存变化。</p>
                              <p className="empty-next">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                调整库存后这里出现：类型 · 库存变化 · 锁定变化 · 原因 · 操作人
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <PlatformMappingPanel
                        productId={product.id}
                        productPlatform={product.platform}
                        productStoreId={product.store_id}
                        stores={stores}
                        skus={product.skus ?? []}
                        mappings={product.platform_mappings ?? []}
                        mappingStatus={resolvedSearchParams?.mapping}
                        canEdit={canEdit}
                      />

                      <div className="stack-4">
                        <CompetitorImportAlert
                          competitorStatus={resolvedSearchParams?.competitor}
                          importStatus={resolvedSearchParams?.competitor_import}
                        />
                        <CompetitorInsightsPanel insights={competitorInsights} />

                        <div className="panel">
                          <div className="panel-head">
                            <div className="stack-2">
                              <h3>竞品列表</h3>
                              <p className="mono-note">先把市场参照物摆上桌面，后续分析才有抓手</p>
                            </div>
                            <span className="badge">
                              {priceSpread.length > 0
                                ? `价格样本 ${Math.min(...priceSpread)}-${Math.max(...priceSpread)}`
                                : "待补充价格"}
                            </span>
                          </div>
                          <div className="tbl-wrap">
                            <table className="tbl tbl-x">
                              <caption className="sr-only">竞品列表，共 {product.competitors.length} 条</caption>
                              <thead>
                                <tr>
                                  <th scope="col">竞品</th>
                                  <th scope="col">平台</th>
                                  <th scope="col" className="num">售价</th>
                                  <th scope="col" className="wrap-cell">标题</th>
                                  <th scope="col" className="wrap-cell">卖点</th>
                                  <th scope="col">动作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.competitors.length === 0 ? (
                                  <tr>
                                    <td colSpan={6}>
                                      <div className="empty">
                                        <svg className="ic ic-lg" aria-hidden="true"><use href="#i-search"></use></svg>
                                        <h4>还没有竞品样本</h4>
                                        <p>建议先录入 3 个同价位或同类目爆款。没有竞品，价格带与卖点判断只能靠猜，诊断和主图方向都会偏。</p>
                                        <p className="empty-next">
                                          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                          录入后这里出现价格带 / 均价 / 卖点频次，以及每条竞品的监控节奏与快照变化
                                        </p>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  product.competitors.map((competitor) => (
                                    <tr key={competitor.id}>
                                      <td>
                                        <div className="cell-goods">
                                          <span className="thumb thumb-sm" aria-hidden="true">IMG</span>
                                          <span>
                                            <b>{competitor.name}</b>
                                            <span>{competitor.url ? "已录入链接" : "缺少链接"}</span>
                                          </span>
                                        </div>
                                      </td>
                                      <td>{platformLabels[competitor.platform]}</td>
                                      <td className="num">{competitor.price ? `¥${competitor.price}` : "-"}</td>
                                      <td>{competitor.title ?? "-"}</td>
                                      <td>
                                        <div className="chip-row">
                                          {competitor.selling_points.slice(0, 3).map((point) => (
                                            <span key={point} className="tag">{point}</span>
                                          ))}
                                        </div>
                                      </td>
                                      <td>
                                        <div className="actions">
                                          {competitor.url ? (
                                            <a className="lnk" href={competitor.url} target="_blank" rel="noreferrer">
                                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>查看链接
                                            </a>
                                          ) : (
                                            <span className="mono-note">未填链接</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <CompetitorMonitorPanel
                          competitors={product.competitors}
                          monitors={product.competitor_monitors ?? []}
                          productId={product.id}
                          canEdit={canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "diagnosis" ? (
                <section className="sec" id="diagnosis" aria-labelledby="h-diagnosis">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 03 · TAB=DIAGNOSIS · 诊断</span>
                      <h2 id="h-diagnosis">定位 · 价格带 · 痛点 · 卖点判断 · 风险 · 下一步建议</h2>
                    </div>
                    <span className="mono-note">诊断是下游一切生成物（主图 / 视频 / 投放建议）的输入</span>
                  </div>

                  <div className="grid-2-1">
                    <div className="panel">
                      <div className="panel-head">
                        <h3>商品诊断</h3>
                        {canEdit ? (
                          <form action={`/products/${product.id}/diagnoses/generate`} method="post">
                            <button type="submit" className="btn btn-primary">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>生成诊断
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="panel-body stack-4">
                        {latestDiagnosis ? (
                          <>
                            <div className="tint tint-ok">
                              <span className="tint-lbl">定位判断</span>
                              <p>{latestDiagnosis.positioning}</p>
                            </div>
                            <div className="tint">
                              <span className="tint-lbl">价格带判断</span>
                              <p>{latestDiagnosis.price_band}</p>
                            </div>
                            <div className="grid-2">
                              <DiagnosisList title="用户痛点" items={latestDiagnosis.pain_points} />
                              <DiagnosisList title="卖点判断" items={latestDiagnosis.selling_point_analysis} />
                              <DiagnosisList title="风险点" items={latestDiagnosis.risks} tone="warn" />
                              <DiagnosisList title="下一步建议" items={latestDiagnosis.recommendations} tone="accent" />
                            </div>
                            {canEdit ? (
                              <details className="boxed">
                                <summary>
                                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                  编辑诊断（人工可改）
                                </summary>
                                <div className="stack-3" style={{ marginTop: "var(--sp-2)" }}>
                                  <DiagnosisEditForm productId={product.id} diagnosis={latestDiagnosis} />
                                </div>
                              </details>
                            ) : null}
                          </>
                        ) : (
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-search"></use></svg>
                            <h4>还没有诊断报告</h4>
                            <p>建议补充至少 1-3 个竞品后生成第一版诊断。诊断是主图、视频与投放建议的共同输入，没有诊断时生成方向容易偏。</p>
                            {canEdit ? (
                              <div className="empty-actions">
                                <form action={`/products/${product.id}/diagnoses/generate`} method="post">
                                  <button type="submit" className="btn btn-primary">生成诊断</button>
                                </form>
                              </div>
                            ) : null}
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              生成后这里出现：定位 · 价格带 · 痛点 · 卖点判断 · 风险 · 下一步建议
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="stack-4">
                      <div className="panel">
                        <div className="panel-head"><h3>主图方案</h3><span className={mainImagePlans.length > 0 ? "badge badge-online" : "badge"}>{mainImagePlans.length > 0 ? `已有 ${mainImagePlans.length} 个` : "待生成"}</span></div>
                        <div className="panel-body stack-3">
                          <p>根据诊断结果生成可交给设计执行的画面方向。</p>
                          {canEdit ? (
                            <form action={`/products/${product.id}/creative-plans/main-images/generate`} method="post">
                              <button type="submit" className="btn">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-copy"></use></svg>生成主图
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <div className="panel">
                        <div className="panel-head"><h3>短视频脚本</h3><span className={videoScripts.length > 0 ? "badge badge-online" : "badge"}>{videoScripts.length > 0 ? `已有 ${videoScripts.length} 个` : "待生成"}</span></div>
                        <div className="panel-body stack-3">
                          <p>生成开头钩子、镜头分镜、口播和转化引导。</p>
                          {canEdit ? (
                            <form action={`/products/${product.id}/creative-plans/video-scripts/generate`} method="post">
                              <button type="submit" className="btn">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-terminal"></use></svg>生成脚本
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <StageCard
                        icon="#i-db"
                        title="投放复盘"
                        detail="录入曝光、点击、转化、ROI 后判断下一步动作"
                        actionLabel="去复盘"
                        actionHref={`/products/${product.id}?tab=review`}
                      />
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "review" ? (
                <section className="sec" id="review" aria-labelledby="h-review">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 09 · TAB=REVIEW · 数据与复盘</span>
                      <h2 id="h-review">回填经营数据 · 汇总与趋势 · 周期复盘报告</h2>
                    </div>
                    <span className="mono-note">PerformanceRecord 可关联素材 / 链接 / 实验用于归因；复盘拆成洞察与下一步动作两个可编辑列表</span>
                  </div>

                  <div className="grid-1-2">
                    <div className="stack-4">
                      <div className="panel">
                        <div className="panel-head"><h3>录入经营数据</h3><span className="badge">PerformanceRecordForm</span></div>
                        <div className="panel-body">
                          <PerformanceRecordForm
                            productId={product.id}
                            creativePlans={product.creative_plans}
                            generatedAssets={product.generated_assets}
                            promotionLinks={product.promotion_links}
                            adExperiments={product.ad_experiments}
                            canEdit={canEdit}
                          />
                        </div>
                      </div>
                      <div className="panel">
                        <div className="panel-head"><h3>CSV 导入经营数据</h3><span className="badge">PerformanceImportForm</span></div>
                        <div className="panel-body">
                          <PerformanceImportForm productId={product.id} canEdit={canEdit} />
                        </div>
                      </div>
                    </div>

                    <div className="stack-4">
                      <PerformanceImportAlert
                        count={resolvedSearchParams?.count}
                        importStatus={resolvedSearchParams?.import}
                        performanceStatus={resolvedSearchParams?.performance}
                      />
                      <PerformanceSummaryCards summary={performanceSummary} />
                      <PerformanceTrendPanel records={product.performance_records} />

                      <div className="panel">
                        <div className="panel-head">
                          <div className="stack-2">
                            <h3>投放复盘报告</h3>
                            <p className="mono-note">录入经营数据后生成周期复盘，判断下一步换图、调价还是调人群</p>
                          </div>
                          {canEdit ? (
                            <form action={`/products/${product.id}/review-reports/generate`} method="post">
                              <button type="submit" className="btn btn-primary">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-check"></use></svg>生成复盘
                              </button>
                            </form>
                          ) : null}
                        </div>
                        <div className="panel-body stack-4">
                          {latestReviewReport ? (
                            <>
                              <div className="tint tint-warn">
                                <span className="tint-lbl">本期摘要 · {latestReviewReport.period_start} 至 {latestReviewReport.period_end}</span>
                                <p>{latestReviewReport.summary}</p>
                              </div>
                              <div className="grid-2">
                                <ReviewList title="复盘洞察" items={latestReviewReport.insights} />
                                <ReviewList title="下一步动作" items={latestReviewReport.next_actions} tone="accent" />
                              </div>
                              {canEdit ? (
                                <details className="boxed">
                                  <summary>
                                    <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                    编辑复盘（摘要 / 洞察 / 下一步动作）
                                  </summary>
                                  <div className="stack-3" style={{ marginTop: "var(--sp-2)" }}>
                                    <ReviewReportEditForm productId={product.id} report={latestReviewReport} />
                                  </div>
                                </details>
                              ) : null}
                            </>
                          ) : (
                            <div className="empty">
                              <svg className="ic ic-lg" aria-hidden="true"><use href="#i-doc"></use></svg>
                              <h4>暂无复盘报告</h4>
                              <p>先录入一条经营数据，再生成复盘。复盘会把周期数据拆成洞察与下一步动作两个可编辑列表。</p>
                              <p className="empty-next">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                生成后这里出现：本期摘要 · 复盘洞察 · 下一步动作
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="panel">
                        <div className="panel-head">
                          <h3>最近经营数据</h3>
                          <span className="badge">{performanceRecords.length} 条记录</span>
                        </div>
                        <div className="tbl-wrap">
                          <table className="tbl tbl-x">
                            <caption className="sr-only">最近经营数据，共 {performanceRecords.length} 条</caption>
                            <thead>
                              <tr>
                                <th scope="col">周期</th>
                                <th scope="col">实验</th>
                                <th scope="col">素材</th>
                                <th scope="col">链接</th>
                                <th scope="col" className="num">CTR</th>
                                <th scope="col" className="num">转化率</th>
                                <th scope="col" className="num">花费</th>
                                <th scope="col" className="num">ROI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {performanceRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={8}>
                                    <div className="empty">
                                      <svg className="ic ic-lg" aria-hidden="true"><use href="#i-db"></use></svg>
                                      <h4>还没有经营数据</h4>
                                      <p>录入一条数据，才谈得上归因与复盘。没有数据时，素材放量建议、实验决策与复盘都不会出现。</p>
                                      <p className="empty-next">
                                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                        录入后出现汇总卡、趋势条，以及按素材 / 链接维度的归因表
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                performanceRecords.map((record) => (
                                  <tr key={record.id}>
                                    <td className="key">{record.period_start} 至 {record.period_end}</td>
                                    <td>{adExperimentTitle(product.ad_experiments, record.ad_experiment_id)}</td>
                                    <td>{creativePlanTitle(product.creative_plans, record.creative_plan_id)}</td>
                                    <td>{promotionLinkTitle(product.promotion_links, record.promotion_link_id)}</td>
                                    <td className="num">{formatPercent(record.ctr)}</td>
                                    <td className="num">{formatPercent(record.conversion_rate)}</td>
                                    <td className="num">{formatMoney(record.spend)}</td>
                                    <td className="num">{formatDecimal(record.roi)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="tbl-note">
                          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-doc"></use></svg>
                          <span>列口径：周期 / 实验 / 素材 / 链接 / CTR / 转化率 / 花费 / ROI —— ROI 由 成交额 ÷ 花费 计算。</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "links" ? (
                <section className="sec" id="links" aria-labelledby="h-links">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 06 · TAB=LINKS · 链接</span>
                      <h2 id="h-links">系统生成链接 · 手动录入 · 短链归因</h2>
                    </div>
                    <span className="mono-note">PromotionLink：link_type · short_code 短链 · tracking_code 归因参数 · click_count 点击计数</span>
                  </div>

                  <div className="grid-1-2">
                    <div className="stack-4">
                      <div className="panel">
                        <div className="panel-head"><h3>生成推荐链接</h3><span className="badge badge-accent">系统链接</span></div>
                        <div className="panel-body stack-3">
                          <p>按商品承接页、短视频投放和主图测试三种场景各生成一条带 tracking_code 的链接。</p>
                          {canEdit ? (
                            <form action={`/products/${product.id}/promotion-links/generate`} method="post">
                              <button type="submit" className="btn btn-primary">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>生成链接
                              </button>
                            </form>
                          ) : null}
                          <p className="mono-note">生成失败会提示检查商品 ID 与承接页配置。</p>
                        </div>
                      </div>

                      <div className="panel">
                        <div className="panel-head"><h3>手动添加链接</h3><span className="badge">PromotionLinkCreateForm</span></div>
                        <div className="panel-body">
                          <PromotionLinkCreateForm canEdit={canEdit} productId={product.id} />
                        </div>
                      </div>
                    </div>

                    <div className="stack-4">
                      <PromotionLinkAlert status={resolvedSearchParams?.links} />
                      <PromotionLinkAttributionPanel
                        links={product.promotion_links}
                        records={product.performance_records}
                      />

                      <div className="panel">
                        <div className="panel-head">
                          <div className="stack-2">
                            <h3>推荐链接库</h3>
                            <p className="mono-note">管理商品承接、短视频投放、主图测试和私域转发链接</p>
                          </div>
                          <span className="badge">{product.promotion_links.length} 个链接</span>
                        </div>
                        <div className="panel-body stack-3">
                          {product.promotion_links.length > 0 ? (
                            product.promotion_links.map((link) => (
                              <PromotionLinkCard key={link.id} link={link} />
                            ))
                          ) : (
                            <div className="empty">
                              <svg className="ic ic-lg" aria-hidden="true"><use href="#i-ext"></use></svg>
                              <h4>还没有推荐链接</h4>
                              <p>可以先生成一组系统链接，或手动添加平台推广链接。短链点击只计数，不触发投放或库存动作。</p>
                              <p className="empty-next">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                保存后这里出现：链接名称 · 类型 · 短链与原链 · tracking_code · 归因数据
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "ads" ? (
                <section className="sec" id="ads" aria-labelledby="h-ads">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 07 · TAB=ADS · 投放</span>
                      <h2 id="h-ads">投放工作流 · 实验看板 · 实验计划 · 投放建议与人工确认</h2>
                    </div>
                    <span className="mono-note">系统只做计划与记录，不自动执行资金操作；建议确认与实验状态都必须由人工维护</span>
                  </div>

                  <div className="stack-4">
                    <AdWorkflowPanel product={product} />
                    <AdLinkRecommendationPanel
                      links={product.promotion_links}
                      records={product.performance_records}
                    />
                    <AdAssetRecommendationPanel
                      assets={product.generated_assets}
                      records={product.performance_records}
                    />
                    <AdExperimentDashboardPanel
                      dashboard={adExperimentDashboard}
                      assets={product.generated_assets}
                      links={product.promotion_links}
                    />
                    <AdExperimentPanel
                      experiments={adExperiments}
                      assets={product.generated_assets}
                      links={product.promotion_links}
                      productId={product.id}
                      status={resolvedSearchParams?.experiment}
                      canEdit={canEdit}
                    />

                    <div className="panel">
                      <div className="panel-head">
                        <div className="stack-2">
                          <h3>投放建议</h3>
                          <p className="mono-note">基于诊断、素材方向和经营数据，生成下一轮人群、预算、素材测试和风控建议</p>
                        </div>
                        {canEdit ? (
                          <form action={`/products/${product.id}/ad-recommendations/generate`} method="post">
                            <button type="submit" className="btn btn-primary">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>生成投放建议
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="panel-body stack-4">
                        {latestAdRecommendation ? (
                          <>
                            <div className="tint tint-ok">
                              <span className="tint-lbl">建议摘要 · {latestAdRecommendation.source === "llm" ? "LLM 生成" : "规则生成"}</span>
                              <p>{latestAdRecommendation.summary}</p>
                              <div className="row" style={{ marginTop: "var(--sp-2)" }}>
                                <span className={`badge ${adRecommendationConfirmationTone(latestAdRecommendation.confirmation_status)}`}>
                                  {adRecommendationConfirmationLabel(latestAdRecommendation.confirmation_status)}
                                </span>
                                {latestAdRecommendation.confirmed_at ? (
                                  <span className="mono-note">{formatDateTime(latestAdRecommendation.confirmed_at)}</span>
                                ) : null}
                              </div>
                              {latestAdRecommendation.confirmation_note ? (
                                <p style={{ marginTop: "var(--sp-2)" }}>{latestAdRecommendation.confirmation_note}</p>
                              ) : null}
                            </div>
                            <PlanField label="本轮目标" value={contentText(latestAdRecommendation.content, "objective")} highlight />
                            <div className="grid-2">
                              <AdObjectList title="人群建议" items={contentObjects(latestAdRecommendation.content, "audience_segments")} />
                              <BudgetPlan content={latestAdRecommendation.content} />
                              <AdObjectList title="素材测试" items={contentObjects(latestAdRecommendation.content, "creative_tests")} />
                              <AdTextList title="出价策略" items={contentList(latestAdRecommendation.content, "bid_strategy")} />
                              <AdTextList title="风险控制" items={contentList(latestAdRecommendation.content, "risk_controls")} tone="warn" />
                              <AdTextList title="下一步动作" items={contentList(latestAdRecommendation.content, "next_steps")} tone="accent" />
                            </div>
                            {canEdit ? (
                              <details className="boxed" open>
                                <summary>
                                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                  人工确认建议（投放前必须确认）
                                </summary>
                                <form
                                  action={`/products/${product.id}/ad-recommendations/${latestAdRecommendation.id}/confirmation`}
                                  method="post"
                                  className="stack-3"
                                  style={{ marginTop: "var(--sp-2)" }}
                                >
                                  <div className="field">
                                    <label htmlFor="cf-note">确认备注</label>
                                    <textarea
                                      className="input"
                                      id="cf-note"
                                      name="confirmation_note"
                                      defaultValue={latestAdRecommendation.confirmation_note ?? ""}
                                      rows={2}
                                      placeholder="记录确认人判断、预算边界或暂不执行原因"
                                    />
                                  </div>
                                  <div className="row">
                                    <button type="submit" name="confirmation_status" value="confirmed" className="btn btn-primary">
                                      <svg className="ic ic-sm" aria-hidden="true"><use href="#i-check"></use></svg>确认建议
                                    </button>
                                    <button type="submit" name="confirmation_status" value="rejected" className="btn">暂不采纳</button>
                                    <span className="mono-note">确认后记录 confirmed_at 与备注，进入实验计划；不触发任何扣费动作。</span>
                                  </div>
                                </form>
                              </details>
                            ) : null}
                          </>
                        ) : (
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-agent"></use></svg>
                            <h4>还没有投放建议</h4>
                            <p>建议先生成诊断、主图/视频方案，并录入至少一条经营数据。投放建议只做计划，不自动执行资金操作。</p>
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              生成后这里出现：建议摘要 · 本轮目标 · 人群 / 预算 / 素材测试 / 风控 · 人工确认入口
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "assets" ? (
                <section className="sec" id="assets" aria-labelledby="h-assets">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 05 · TAB=ASSETS · 素材库</span>
                      <h2 id="h-assets">素材效果归因 · 放量建议 · 版本 / 评分 / 标签</h2>
                    </div>
                    <span className="mono-note">GeneratedAsset：status · rating · tags · usage_contexts · asset_version；归因只汇总用户回填的经营数据</span>
                  </div>

                  <div className="stack-4">
                    <AssetsSyncAlert status={resolvedSearchParams?.assets} />
                    <AssetAttributionPanel
                      assets={product.generated_assets}
                      records={product.performance_records}
                    />
                    <AssetScaleRecommendationPanel
                      assets={product.generated_assets}
                      records={product.performance_records}
                    />

                    <div className="panel">
                      <div className="panel-head">
                        <div className="stack-2">
                          <h3>素材资产库</h3>
                          <p className="mono-note">汇总当前商品已生成的主图和视频草稿，可按版本 / 评分 / 标签管理并挂经营数据归因</p>
                        </div>
                        <div className="row">
                          {canEdit ? (
                            <form action={`/products/${product.id}/assets/sync`} method="post">
                              <button type="submit" className="btn btn-sm">同步历史素材</button>
                            </form>
                          ) : null}
                          <span className="badge">{assetLibrary.length} 个素材</span>
                        </div>
                      </div>
                      <div className="panel-body">
                        {assetLibrary.length > 0 ? (
                          <div className="grid-3">
                            {assetLibrary.map((asset) => (
                              <article key={asset.url} className="asset">
                                <div className="asset-fig">
                                  {asset.kind === "image" ? (
                                    <a href={absoluteMediaUrl(asset.url)} target="_blank" rel="noreferrer">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={absoluteMediaUrl(asset.url)}
                                        alt={asset.title}
                                        style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                                      />
                                    </a>
                                  ) : (
                                    <video
                                      src={absoluteMediaUrl(asset.url)}
                                      controls
                                      style={{ width: "100%", aspectRatio: "16 / 9", display: "block", background: "var(--surface-sunken)" }}
                                    />
                                  )}
                                </div>
                                <div className="stack-2">
                                  <div className="row row-between">
                                    <b>{asset.title}</b>
                                    <div className="row">
                                      {asset.status ? (
                                        <span className={`badge ${assetStatusTone(asset.status)}`}>{asset.status}</span>
                                      ) : null}
                                      {asset.rating ? <span className="badge badge-warn">{asset.rating} 分</span> : null}
                                    </div>
                                  </div>
                                  <div className="row">
                                    <span className="badge">{asset.kind === "image" ? "主图" : "视频"}</span>
                                    <span className="badge">V{asset.assetVersion}</span>
                                  </div>
                                  <p className="mono-note">
                                    {asset.model || "model"} · {asset.size || "size"}
                                    {asset.duration ? ` · ${asset.duration}s` : ""}
                                  </p>
                                  <div className="chip-row">
                                    {asset.tags.map((tag) => (
                                      <span key={tag} className="tag">{tag}</span>
                                    ))}
                                    {asset.usageContexts.map((context) => (
                                      <span key={context} className="tag">使用场景：{context}</span>
                                    ))}
                                  </div>
                                  {asset.note ? <p className="mono-note">备注：{asset.note}</p> : null}
                                  <div className="row">
                                    <a
                                      href={absoluteMediaUrl(asset.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm"
                                    >
                                      <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开素材
                                    </a>
                                  </div>
                                  {canEdit ? (
                                    <details className="boxed">
                                      <summary>
                                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>评价素材
                                      </summary>
                                      <form
                                        action={`/products/${product.id}/creative-plans/${asset.planId}/assets/update`}
                                        method="post"
                                        className="stack-3"
                                        style={{ marginTop: "var(--sp-2)" }}
                                      >
                                        <input type="hidden" name="url" value={asset.url} />
                                        <input type="hidden" name="asset_type" value={asset.kind} />
                                        <div className="form-grid">
                                          <div className="field">
                                            <label htmlFor={`a-${asset.url}-rating`}>评分</label>
                                            <input
                                              className="input mono"
                                              id={`a-${asset.url}-rating`}
                                              name="rating"
                                              type="number"
                                              min="1"
                                              max="5"
                                              defaultValue={asset.rating ?? ""}
                                            />
                                          </div>
                                          <div className="field">
                                            <label htmlFor={`a-${asset.url}-status`}>状态</label>
                                            <select
                                              className="input"
                                              id={`a-${asset.url}-status`}
                                              name="status"
                                              defaultValue={asset.status || "待评估"}
                                            >
                                              <option value="待评估">待评估</option>
                                              <option value="通过">通过</option>
                                              <option value="弃用">弃用</option>
                                              <option value="复测">复测</option>
                                            </select>
                                          </div>
                                          <div className="field">
                                            <label htmlFor={`a-${asset.url}-version`}>素材版本</label>
                                            <input
                                              className="input mono"
                                              id={`a-${asset.url}-version`}
                                              name="asset_version"
                                              type="number"
                                              min="1"
                                              defaultValue={asset.assetVersion}
                                            />
                                          </div>
                                          <div className="field">
                                            <label htmlFor={`a-${asset.url}-usage`}>使用场景</label>
                                            <input
                                              className="input"
                                              id={`a-${asset.url}-usage`}
                                              name="usage_contexts"
                                              defaultValue={asset.usageContexts.join("，")}
                                              placeholder="冷启动，人群测试，复测"
                                            />
                                          </div>
                                        </div>
                                        <div className="field">
                                          <label htmlFor={`a-${asset.url}-tags`}>标签</label>
                                          <input
                                            className="input"
                                            id={`a-${asset.url}-tags`}
                                            name="tags"
                                            defaultValue={asset.tags.join("，")}
                                            placeholder="通勤，控油，高点击潜力"
                                          />
                                        </div>
                                        <div className="field">
                                          <label htmlFor={`a-${asset.url}-note`}>备注</label>
                                          <textarea
                                            className="input"
                                            id={`a-${asset.url}-note`}
                                            name="note"
                                            defaultValue={asset.note}
                                            rows={2}
                                            placeholder="记录适合投放的人群、需要优化的问题或复盘观察"
                                          />
                                        </div>
                                        <div className="row">
                                          <button type="submit" className="btn btn-primary">保存评价</button>
                                        </div>
                                      </form>
                                    </details>
                                  ) : null}
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-copy"></use></svg>
                            <h4>还没有生成素材</h4>
                            <p>素材来自主图方案与视频脚本。先生成方向（免费），确认角度后再出图出片，避免把钱花在错的方向上。</p>
                            <div className="empty-actions">
                              <Link className="btn btn-primary" href={`/products/${product.id}?tab=main-images`}>生成主图方案</Link>
                              <Link className="btn" href={`/products/${product.id}?tab=video`}>生成视频脚本</Link>
                            </div>
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              素材入库后可按版本 / 评分 / 标签管理，并挂上经营数据做效果归因
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "jobs" ? (
                <section className="sec" id="jobs" aria-labelledby="h-jobs">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 08 · TAB=JOBS · 任务</span>
                      <h2 id="h-jobs">生成任务中心 · 公开链接解析任务</h2>
                    </div>
                    <span className="mono-note">GenerationJob（图片 / 视频）与 PublicLinkParseTask（竞品解析）分开管理；有活动任务时页面自动刷新</span>
                  </div>

                  <div className="stack-4">
                    <div className="panel">
                      <div className="panel-head">
                        <div className="stack-2">
                          <h3>生成任务中心</h3>
                          <p className="mono-note">查看当前商品所有图片和视频生成任务，包括状态、结果、错误和重试入口</p>
                        </div>
                        <div className="row">
                          {hasActiveGenerationJobs ? (
                            <span className="badge badge-warn"><span className="status-led is-busy" aria-hidden="true"></span>自动刷新中</span>
                          ) : null}
                          <span className="badge">{product.generation_jobs.length} 个生成任务</span>
                        </div>
                      </div>

                      {product.generation_jobs.length > 0 ? (
                        <div className="tbl-wrap">
                          <table className="tbl tbl-x">
                            <caption className="sr-only">生成任务列表，共 {product.generation_jobs.length} 条</caption>
                            <thead>
                              <tr>
                                <th scope="col">ID</th>
                                <th scope="col">类型</th>
                                <th scope="col">状态</th>
                                <th scope="col" className="wrap-cell">结果 / 错误</th>
                                <th scope="col" className="num">尝试</th>
                                <th scope="col">时间</th>
                                <th scope="col">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.generation_jobs.map((job) => (
                                <tr key={job.id}>
                                  <td className="key">#{job.id}</td>
                                  <td>{job.kind === "video_asset" ? "视频" : "图片"}</td>
                                  <td><JobStatusBadge job={job} /></td>
                                  <td>
                                    {job.status === "succeeded" && jobResultUrl(job) ? (
                                      <a
                                        className="lnk"
                                        href={absoluteMediaUrl(jobResultUrl(job) || "")}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开生成结果
                                      </a>
                                    ) : job.error ? (
                                      <span style={{ color: "var(--accent)" }}>{job.error}</span>
                                    ) : (
                                      <span className="mono-note">
                                        {job.started_at ? `开始于 ${formatDateTime(job.started_at)}` : "等待后台执行"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="num">{job.attempts} / {job.max_attempts}</td>
                                  <td className="key">{job.created_at ? formatDateTime(job.created_at) : "—"}</td>
                                  <td>
                                    <div className="actions">
                                      <Link className="btn btn-sm" href={`/products/${product.id}/generation-jobs/${job.id}`}>详情</Link>
                                      {canEdit && job.status === "failed" ? (
                                        <form action={`/products/${product.id}/generation-jobs/${job.id}/retry`} method="post">
                                          <input type="hidden" name="tab" value="jobs" />
                                          <button type="submit" className="btn btn-sm btn-primary">重试</button>
                                        </form>
                                      ) : canEdit && (job.status === "pending" || job.status === "running") ? (
                                        <form action={`/products/${product.id}/generation-jobs/${job.id}/cancel`} method="post">
                                          <input type="hidden" name="tab" value="jobs" />
                                          <button type="submit" className="btn btn-sm">取消</button>
                                        </form>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="panel-body">
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-terminal"></use></svg>
                            <h4>还没有生成任务</h4>
                            <p>生成任务由创意方案触发。每张图 / 每条视频都会留下任务记录，失败可重试，取消不留费用。</p>
                            <div className="empty-actions">
                              <Link className="btn btn-primary" href={`/products/${product.id}?tab=main-images`}>去主图页签出图</Link>
                            </div>
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              出任务后这里按状态分组：排队中 · 生成中 · 已完成 · 失败 · 已取消
                            </p>
                          </div>
                        </div>
                      )}
                      {product.generation_jobs.length > 0 ? (
                        <div className="tbl-note">
                          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>
                          <span>三态动作规则：进行中 / 排队中只给「取消」；已完成给「打开结果」；失败给「重试」并显示尝试次数与错误原文。</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="panel">
                      <div className="panel-head">
                        <div className="stack-2">
                          <h3>公开链接解析任务</h3>
                          <p className="mono-note">把用户提交的公开商品页异步解析成竞品档案，最多重试 3 次</p>
                        </div>
                        <span className="badge">{product.public_link_parse_tasks.length} 个任务</span>
                      </div>
                      {product.public_link_parse_tasks.length > 0 ? (
                        <div className="tbl-wrap">
                          <table className="tbl tbl-x">
                            <caption className="sr-only">公开链接解析任务，共 {product.public_link_parse_tasks.length} 条</caption>
                            <thead>
                              <tr>
                                <th scope="col">ID</th>
                                <th scope="col">状态</th>
                                <th scope="col" className="wrap-cell">链接</th>
                                <th scope="col" className="wrap-cell">结果 / 错误</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.public_link_parse_tasks.map((task) => (
                                <tr key={task.id}>
                                  <td className="key">#{task.id}</td>
                                  <td><LinkParseTaskStatusBadge status={task.status} /></td>
                                  <td className="url">
                                    <a href={task.url} target="_blank" rel="noreferrer" className="lnk">{task.url}</a>
                                  </td>
                                  <td>
                                    {task.error ? (
                                      <span style={{ color: "var(--accent)" }}>{task.error}</span>
                                    ) : task.result.competitor_id ? (
                                      <span>已生成竞品 #{String(task.result.competitor_id)}</span>
                                    ) : (
                                      <span className="mono-note">
                                        {task.next_run_at ? `等待执行：${formatDateTime(task.next_run_at)}` : "等待后台调度"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="panel-body">
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-search"></use></svg>
                            <h4>还没有公开链接解析任务</h4>
                            <p>在概览页签提交竞品链接后，这里会显示解析进度与结果，失败可重试 3 次。</p>
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              解析成功会自动生成竞品档案；失败时给出错误原文
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "video" ? (
                <section className="sec" id="video" aria-labelledby="h-video">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 04 · TAB=VIDEO · 短视频脚本</span>
                      <h2 id="h-video">脚本方向 → 视频草稿 → 素材入库</h2>
                    </div>
                    <span className="mono-note">先生成可拍摄脚本，后续再接视频生成或达人协作流程</span>
                  </div>

                  <div className="stack-4">
                    <div className="panel">
                      <div className="panel-head">
                        <h3>短视频脚本</h3>
                        <div className="row">
                          <span className="badge">{videoScripts.length > 0 ? `最近 ${videoScripts.length} 条脚本` : "待生成"}</span>
                          {canEdit ? (
                            <form action={`/products/${product.id}/creative-plans/video-scripts/generate`} method="post">
                              <button type="submit" className="btn btn-primary">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-terminal"></use></svg>生成脚本
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <div className="panel-body stack-4">
                        {videoScripts.length === 0 ? (
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-terminal"></use></svg>
                            <h4>还没有短视频脚本</h4>
                            <p>建议先有诊断和主图方向后再生成。脚本包含开头钩子、分镜、口播与转化引导，可人工编辑。</p>
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              生成后这里出现：脚本方向 · 钩子 · 分镜表 · 视频草稿任务
                            </p>
                          </div>
                        ) : (
                          videoScripts.map((script) => (
                            <div key={script.id} className="panel">
                              <div className="panel-head">
                                <div className="stack-2">
                                  <h3>{script.title}</h3>
                                  <p className="mono-note">{planText(script.content, "angle")}</p>
                                </div>
                                <div className="row">
                                  <span className="badge badge-info">{planValue(script.content, "duration_seconds")}s</span>
                                  <CreativePlanStatusActions productId={product.id} plan={script} tab="video" canEdit={canEdit} />
                                </div>
                              </div>
                              <div className="panel-body stack-4">
                                <div className="tint tint-info">
                                  <span className="tint-lbl">开头钩子</span>
                                  <p>{planText(script.content, "hook")}</p>
                                </div>

                                <div className="tbl-wrap">
                                  <table className="tbl tbl-l">
                                    <caption className="sr-only">分镜表，共 {planScenes(script.content).length} 镜</caption>
                                    <thead>
                                      <tr><th scope="col">镜头</th><th scope="col">画面</th><th scope="col">口播</th></tr>
                                    </thead>
                                    <tbody>
                                      {planScenes(script.content).map((scene) => (
                                        <tr key={`${script.id}-${scene.shot}`}>
                                          <td className="key">{scene.shot}</td>
                                          <td>{scene.visual}</td>
                                          <td>{scene.voiceover}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="grid-2">
                                  <div>
                                    <span className="eyebrow">卖点证明</span>
                                    <div className="chip-row" style={{ marginTop: ".5rem" }}>
                                      {planList(script.content, "selling_point_proof").map((point) => (
                                        <span key={point} className="tag">{point}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <PlanField label="转化引导" value={planText(script.content, "cta")} highlight />
                                </div>

                                <div className="stack-2">
                                  <div className="row row-between">
                                    <span className="eyebrow">视频草稿</span>
                                    <div className="row">
                                      <JobStatusBadge job={latestJob(product.generation_jobs, script.id, "video_asset")} />
                                      {canEdit ? (
                                        <form action={`/products/${product.id}/creative-plans/${script.id}/videos/generate`} method="post">
                                          <button type="submit" className="btn btn-sm">
                                            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-terminal"></use></svg>生成视频草稿
                                          </button>
                                        </form>
                                      ) : null}
                                    </div>
                                  </div>
                                  {generatedVideos(script.content).length > 0 ? (
                                    <div className="grid-2">
                                      {generatedVideos(script.content).map((video) => (
                                        <div key={video.url} className="asset">
                                          <div className="asset-fig">
                                            <video
                                              src={absoluteMediaUrl(video.url)}
                                              controls
                                              style={{ width: "100%", aspectRatio: "16 / 9", display: "block", background: "var(--surface-sunken)" }}
                                            />
                                          </div>
                                          <p className="mono-note">
                                            {video.model || "video model"} · {video.size || "video"} · {video.duration || "-"}s
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="empty" style={{ padding: "var(--sp-5)" }}>
                                      <svg className="ic ic-lg" aria-hidden="true"><use href="#i-copy"></use></svg>
                                      <h4>还没有视频草稿</h4>
                                      <p>确认脚本后可先生成 1 条测试视频，评估开头钩子与画面识别度后再批量出片。</p>
                                      <p className="empty-next">
                                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                        生成完成后，这里会出现结果视频、模型与时长
                                      </p>
                                    </div>
                                  )}
                                  <JobError job={latestJob(product.generation_jobs, script.id, "video_asset")} />
                                </div>

                                {canEdit ? (
                                  <details className="boxed">
                                    <summary>
                                      <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                      编辑脚本（钩子 / 分镜 / 口播 / 转化引导）
                                    </summary>
                                    <div className="stack-3" style={{ marginTop: "var(--sp-2)" }}>
                                      <VideoScriptEditForm productId={product.id} script={script} />
                                    </div>
                                  </details>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "main-images" ? (
                <section className="sec" id="creative" aria-labelledby="h-creative">
                  <div className="sec-hd">
                    <div className="stack-2">
                      <span className="eyebrow">SECTION 04 · TAB=MAIN-IMAGES · 主图方案</span>
                      <h2 id="h-creative">方案方向 → 生成任务三态 → 结果入库</h2>
                    </div>
                    <span className="mono-note">CreativePlan（方向）与 GenerationJob（生成）是两层：方向可编辑，任务可取消 / 重试</span>
                  </div>

                  <div className="stack-4">
                    <div className="panel">
                      <div className="panel-head">
                        <h3>主图方案</h3>
                        <div className="row">
                          <span className="badge">{mainImagePlans.length > 0 ? `最近 ${mainImagePlans.length} 个方案` : "待生成"}</span>
                          {canEdit ? (
                            <form action={`/products/${product.id}/creative-plans/main-images/generate`} method="post">
                              <button type="submit" className="btn btn-primary">
                                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-copy"></use></svg>生成主图
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <div className="panel-body stack-4">
                        {mainImagePlans.length === 0 ? (
                          <div className="empty">
                            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-copy"></use></svg>
                            <h4>还没有主图方案</h4>
                            <p>建议先生成诊断，再点击「生成主图」。方案方向是免费的，确认角度后再出图，避免把钱花在错的方向上。</p>
                            <p className="empty-next">
                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                              生成后这里出现：方案方向 · 主副文案 · 画面布局 · 图片草稿任务
                            </p>
                          </div>
                        ) : (
                          <div className="grid-2">
                            {mainImagePlans.map((plan) => (
                              <div key={plan.id} className="panel">
                                <div className="panel-head">
                                  <div className="stack-2">
                                    <h3>{plan.title}</h3>
                                    <p className="mono-note">main_image · {planText(plan.content, "angle")}</p>
                                  </div>
                                  <CreativePlanStatusActions productId={product.id} plan={plan} tab="main-images" canEdit={canEdit} />
                                </div>
                                <div className="panel-body stack-4">
                                  <PlanField label="主文案" value={planText(plan.content, "headline")} highlight />
                                  <PlanField label="副文案" value={planText(plan.content, "sub_headline")} />
                                  <PlanField label="画面布局" value={planText(plan.content, "layout")} />
                                  <PlanField label="视觉重点" value={planText(plan.content, "visual_focus")} />

                                  <div>
                                    <span className="eyebrow">证明点</span>
                                    <div className="chip-row" style={{ marginTop: ".5rem" }}>
                                      {planList(plan.content, "proof_points").map((point) => (
                                        <span key={point} className="tag">{point}</span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="stack-2">
                                    <div className="row row-between">
                                      <span className="eyebrow">图片草稿</span>
                                      <div className="row">
                                        <JobStatusBadge job={latestJob(product.generation_jobs, plan.id, "main_image_asset")} />
                                        {canEdit ? (
                                          <form action={`/products/${product.id}/creative-plans/${plan.id}/images/generate`} method="post">
                                            <button type="submit" className="btn btn-sm">
                                              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-copy"></use></svg>生成图片草稿
                                            </button>
                                          </form>
                                        ) : null}
                                      </div>
                                    </div>
                                    {generatedImages(plan.content).length > 0 ? (
                                      <div className="grid-2">
                                        {generatedImages(plan.content).map((image) => (
                                          <a
                                            key={image.url}
                                            href={absoluteImageUrl(image.url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="asset-fig"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={absoluteImageUrl(image.url)}
                                              alt={`${plan.title} 图片草稿`}
                                              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                                            />
                                            <p className="mono-note" style={{ padding: "var(--sp-2) var(--sp-3)" }}>
                                              {image.model || "image model"} · {image.size || "image"}
                                            </p>
                                          </a>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="empty" style={{ padding: "var(--sp-5)" }}>
                                        <svg className="ic ic-lg" aria-hidden="true"><use href="#i-copy"></use></svg>
                                        <h4>还没有图片草稿</h4>
                                        <p>方案方向已确认，但未生成图片。先生成 1 张测试图，评估构图与识别度后再批量出图。</p>
                                        <p className="empty-next">
                                          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                                          生成完成后，这里会出现结果缩略图、模型与尺寸
                                        </p>
                                      </div>
                                    )}
                                    <JobError job={latestJob(product.generation_jobs, plan.id, "main_image_asset")} />
                                  </div>

                                  {canEdit ? (
                                    <details className="boxed">
                                      <summary>
                                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>编辑方案
                                      </summary>
                                      <div className="stack-3" style={{ marginTop: "var(--sp-2)" }}>
                                        <MainImagePlanEditForm productId={product.id} plan={plan} />
                                      </div>
                                    </details>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** 渲染顶栏组件，集中展示品牌、主导航与主题切换入口。 */
function ProductTopBar() {
  return (
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
        <span className="sub">PRODUCTS</span>
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

/** 渲染库存流水行组件，展示 InventoryMovement 五类型（inbound / outbound / adjustment / lock / release）。 */
function InventoryMovementRow({ movement }: { movement: InventoryMovement }) {
  const typeLabels: Record<InventoryMovement["movement_type"], string> = {
    inbound: "入库",
    outbound: "出库",
    adjustment: "调整",
    lock: "锁定",
    release: "释放",
  };
  const typeTones: Record<InventoryMovement["movement_type"], string> = {
    inbound: "badge badge-online",
    outbound: "badge badge-info",
    adjustment: "badge badge-warn",
    lock: "badge",
    release: "badge",
  };
  return (
    <tr>
      <td className="key">{formatDateTime(movement.created_at)}</td>
      <td><span className={typeTones[movement.movement_type]}>{typeLabels[movement.movement_type]}</span></td>
      <td className="num">{movement.quantity_delta > 0 ? `+${movement.quantity_delta}` : movement.quantity_delta}（{movement.before_quantity} → {movement.after_quantity}）</td>
      <td className="num">{movement.locked_delta > 0 ? `+${movement.locked_delta}` : movement.locked_delta}（{movement.before_locked_quantity} → {movement.after_locked_quantity}）</td>
      <td>{movement.reason ?? <span className="mono-note">未填写</span>}</td>
      <td>{movement.operator_name ?? <span className="mono-note">系统</span>}</td>
    </tr>
  );
}

/** resolve商品页签，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function resolveProductTab(tab: string | undefined): ProductTabKey {
  return productTabs.some((item) => item.key === tab) ? (tab as ProductTabKey) : "overview";
}

/** 渲染 ProductTabNav 组件，集中展示商品页签nav所需的数据、状态和操作入口。 */
function ProductTabNav({
  productId,
  activeTab,
}: {
  productId: number;
  activeTab: ProductTabKey;
}) {
  return (
    <nav className="subnav" aria-label="商品运营工作区">
      <div className="tabs" role="tablist">
        {productTabs.map((tab) => (
          <Link
            key={tab.key}
            role="tab"
            href={`/products/${productId}?tab=${tab.key}`}
            className="tab"
            aria-selected={tab.key === activeTab ? "true" : "false"}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

type ProductWorkflowStep = {
  key: string;
  title: string;
  href: string;
  done: boolean;
  hint: string;
};

/** 渲染 ProductWorkflowPanel 组件，集中展示商品工作流面板所需的数据、状态和操作入口。 */
function ProductWorkflowPanel({
  steps,
}: {
  steps: ProductWorkflowStep[];
}) {
  const nextStep = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return (
    <section className="stack-3" aria-label="单品运营流程">
      <div className="row row-between">
        <h2 className="t-h2">单品运营流程</h2>
        <span className="mono-note">
          依数据判定 done；{nextStep.done ? "当前商品已跑通主要闭环" : `nextStep = ${nextStep.title}`}
        </span>
      </div>
      <ol className="flow flow-7" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {steps.map((step, index) => (
          <li key={step.key} className={`flow-step ${step.done ? "is-done" : step === nextStep ? "is-next" : "is-idle"}`}>
            <span className="flow-idx">STEP {String(index + 1).padStart(2, "0")}</span>
            <Link href={step.href}>
              <h3>{step.title}</h3>
              <p>{step.hint}</p>
              <span className="flow-mark">
                <svg className="ic ic-sm" aria-hidden="true"><use href={step.done ? "#i-check" : step === nextStep ? "#i-arrow-r" : "#i-chev"}></use></svg>
                {step.done ? "已完成" : step === nextStep ? "当前步骤" : "未开始"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 构建商品工作流steps，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function buildProductWorkflowSteps(product: ProductDetail): ProductWorkflowStep[] {
  const hasSku = product.skus.length > 0;
  const hasInventory = product.skus.some((sku) => sku.inventory_item && sku.inventory_item.quantity > 0);
  const hasMainImagePlan = product.creative_plans.some((plan) => plan.type === "main_image");
  const hasVideoScript = product.creative_plans.some((plan) => plan.type === "video_script");
  const hasAsset = product.generated_assets.length > 0 || hasMainImagePlan || hasVideoScript;
  const hasAdPlan = product.ad_recommendations.length > 0 || product.ad_experiments.length > 0;
  const hasPerformance = product.performance_records.length > 0;

  return [
    {
      key: "profile",
      title: "建档/SKU",
      href: `/products/${product.id}?tab=overview`,
      done: Boolean(product.name && product.store_id && hasSku && hasInventory),
      hint: hasSku ? "SKU 和库存已开始维护" : "补 SKU、库存和平台映射",
    },
    {
      key: "competitor",
      title: "竞品",
      href: `/products/${product.id}?tab=overview`,
      done: product.competitors.length > 0,
      hint: product.competitors.length > 0 ? `${product.competitors.length} 个竞品样本` : "添加竞品或创建链接解析任务",
    },
    {
      key: "diagnosis",
      title: "诊断",
      href: `/products/${product.id}?tab=diagnosis`,
      done: product.diagnoses.length > 0,
      hint: product.diagnoses.length > 0 ? "已有诊断结果" : "生成商品运营诊断",
    },
    {
      key: "content",
      title: "素材",
      href: `/products/${product.id}?tab=main-images`,
      done: hasAsset,
      hint: hasAsset ? "已有主图/视频素材草稿" : "生成主图方案和视频脚本",
    },
    {
      key: "ads",
      title: "投放",
      href: `/products/${product.id}?tab=ads`,
      done: hasAdPlan,
      hint: hasAdPlan ? "已有建议或实验计划" : "生成投放建议并人工确认实验",
    },
    {
      key: "performance",
      title: "数据",
      href: `/products/${product.id}?tab=review`,
      done: hasPerformance,
      hint: hasPerformance ? `${product.performance_records.length} 条经营数据` : "回填经营数据",
    },
    {
      key: "review",
      title: "复盘",
      href: `/products/${product.id}?tab=review`,
      done: product.review_reports.length > 0,
      hint: product.review_reports.length > 0 ? "已有复盘报告" : "生成周期复盘",
    },
  ];
}

/** 渲染 DiagnosisList 组件，集中展示商品诊断列表所需的数据、状态和操作入口。 */
function DiagnosisList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warn" | "accent";
}) {
  const toneClass = tone === "warn" ? "tint tint-warn" : tone === "accent" ? "tint tint-accent" : "tint";
  return (
    <div className={toneClass}>
      <span className="tint-lbl">{title}</span>
      <ul className="stack-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** 渲染 ReviewList 组件，集中展示复盘列表所需的数据、状态和操作入口。 */
function ReviewList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warn" | "accent";
}) {
  return <DiagnosisList title={title} items={items} tone={tone} />;
}

/** 渲染 AdTextList 组件，集中展示投放文本列表所需的数据、状态和操作入口。 */
function AdTextList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warn" | "accent";
}) {
  return <DiagnosisList title={title} items={items} tone={tone} />;
}

/** 渲染 AdObjectList 组件，集中展示投放对象列表所需的数据、状态和操作入口。 */
function AdObjectList({ title, items }: { title: string; items: Record<string, unknown>[] }) {
  return (
    <div className="panel">
      <div className="panel-head"><h3>{title}</h3><span className="badge">{items.length} 条</span></div>
      <div className="panel-body stack-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="tint">
            <span className="tint-lbl">{contentObjectText(item, "name") || `方案 ${index + 1}`}</span>
            <p>
              {contentObjectText(item, "rationale") ||
                contentObjectText(item, "hypothesis") ||
                contentObjectText(item, "asset_direction")}
            </p>
            <div className="chip-row" style={{ marginTop: ".5rem" }}>
              {[
                ...contentObjectList(item, "targeting"),
                contentObjectText(item, "success_metric"),
              ]
                .filter(Boolean)
                .map((value) => (
                  <span key={value} className="tag">{value}</span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 渲染 BudgetPlan 组件，集中展示预算方案所需的数据、状态和操作入口。 */
function BudgetPlan({ content }: { content: Record<string, unknown> }) {
  const value = content.budget_plan;
  const budget = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return (
    <div className="panel">
      <div className="panel-head"><h3>预算计划</h3><span className="badge badge-warn">止损线明确</span></div>
      <div className="panel-body stack-3">
        <div className="tint tint-ok">
          <span className="tint-lbl">日预算</span>
          <p>{contentObjectText(budget, "daily_budget") || "先用小预算测试。"}</p>
        </div>
        {contentObjectList(budget, "allocation").length > 0 ? (
          <div className="tint">
            <span className="tint-lbl">分配</span>
            <ul className="stack-2">
              {contentObjectList(budget, "allocation").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="tint tint-warn">
          <span className="tint-lbl">止损规则</span>
          <p>{contentObjectText(budget, "stop_loss_rule") || "到达止损线及时暂停。"}</p>
        </div>
      </div>
    </div>
  );
}

/** 渲染 PromotionLinkCreateForm 组件，集中展示推广链接创建表单所需的数据、状态和操作入口。 */
function PromotionLinkCreateForm({ canEdit, productId }: { canEdit: boolean; productId: number }) {
  if (!canEdit) {
    return (
      <div className="panel-body">
        <div className="alert alert-warn" style={{ gridTemplateColumns: "18px minmax(0,1fr)" }}>
          <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
          <span><b className="h">当前账号为只读权限</b> —— 不能添加推荐链接。</span>
        </div>
      </div>
    );
  }

  return (
    <form action={`/products/${productId}/promotion-links/create`} method="post" className="panel-body stack-4">
      <div className="field">
        <label htmlFor="pl-label">链接名称</label>
        <input className="input" id="pl-label" name="label" required placeholder="例如：6月短视频A组链接" />
      </div>
      <div className="field">
        <label htmlFor="pl-url">URL</label>
        <input className="input mono" id="pl-url" name="url" required type="url" placeholder="https://..." />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="pl-type">类型</label>
          <select className="input" id="pl-type" name="link_type" defaultValue="landing">
            <option value="landing">承接页</option>
            <option value="tracking">投放追踪</option>
            <option value="affiliate">达人/分销</option>
            <option value="activity">活动页</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pl-scene">场景</label>
          <input className="input" id="pl-scene" name="scenario" placeholder="短视频投放" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pl-note">备注</label>
        <textarea className="input" id="pl-note" name="note" rows={3} placeholder="记录链接来源、投放人群、素材版本或活动周期" />
      </div>
      <div className="row">
        <button type="submit" className="btn btn-primary">
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>保存链接
        </button>
      </div>
    </form>
  );
}

/** 渲染 AssetsSyncAlert 组件，集中展示素材sync提示所需的数据、状态和操作入口。 */
function AssetsSyncAlert({ status }: { status?: string }) {
  if (status === "synced") {
    return (
      <div className="alert alert-ok">
        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
        <span>已同步历史素材到独立资产表。</span>
        <span className="badge badge-online">synced</span>
      </div>
    );
  }

  if (status === "sync_failed") {
    return (
      <div className="alert alert-fail">
        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span>历史素材同步失败，请稍后重试。</span>
        <span className="badge badge-accent">failed</span>
      </div>
    );
  }

  return null;
}

/** 渲染 AssetAttributionPanel 组件，集中展示素材归因面板所需的数据、状态和操作入口。 */
function AssetAttributionPanel({
  assets,
  records,
}: {
  assets: GeneratedAsset[];
  records: PerformanceRecord[];
}) {
  const rows = buildAssetAttribution(assets, records);

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="stack-2">
          <h3>素材效果归因</h3>
          <p className="mono-note">按经营数据中关联的生成素材汇总点击、成交、CTR 和 ROI</p>
        </div>
        <span className="badge">{rows.filter((row) => row.recordCount > 0).length} 个有数据</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl tbl-x">
          <caption className="sr-only">素材效果归因，共 {rows.length} 条</caption>
          <thead>
            <tr>
              <th scope="col">素材</th>
              <th scope="col">类型 / 模型</th>
              <th scope="col" className="num">数据条数</th>
              <th scope="col" className="num">点击</th>
              <th scope="col" className="num">成交</th>
              <th scope="col" className="num">CTR</th>
              <th scope="col" className="num">花费</th>
              <th scope="col" className="num">ROI</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => (
              <tr key={row.asset.id}>
                <td><b>{row.asset.title || "生成素材"}</b></td>
                <td>{row.asset.asset_type === "video" ? "视频" : "图片"} · {row.asset.model || "model"}</td>
                <td className="num">{row.recordCount}</td>
                <td className="num">{formatInteger(row.clicks)}</td>
                <td className="num">{formatInteger(row.conversions)}</td>
                <td className="num">{formatNumberPercent(row.ctr)}</td>
                <td className="num">{formatNumberMoney(row.spend)}</td>
                <td className="num">{formatNumberDecimal(row.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tbl-note">
        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-doc"></use></svg>
        <span>归因只汇总用户回填的经营数据，不代表平台广告后台的实时花费。</span>
      </div>
    </div>
  );
}

/** 渲染 AssetScaleRecommendationPanel 组件，集中展示素材scale建议面板所需的数据、状态和操作入口。 */
function AssetScaleRecommendationPanel({
  assets,
  records,
}: {
  assets: GeneratedAsset[];
  records: PerformanceRecord[];
}) {
  const recommendation = bestAssetRecommendation(assets, records);

  if (!recommendation) {
    return null;
  }

  const action = assetScaleAction(recommendation);

  return (
    <div className="tint tint-warn">
      <span className="tint-lbl">素材放量建议</span>
      <div className="row row-between">
        <div className="stack-2 grow">
          <p><b>{recommendation.asset.title || "生成素材"}</b> — {action}</p>
          <div className="chip-row">
            <span className="tag">CTR {formatNumberPercent(recommendation.ctr)}</span>
            <span className="tag">ROI {formatNumberDecimal(recommendation.roi)}</span>
            <span className="tag">{recommendation.recordCount} 条数据</span>
          </div>
        </div>
        <a
          href={absoluteMediaUrl(recommendation.asset.url)}
          target="_blank"
          rel="noreferrer"
          className="btn"
        >
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>查看素材
        </a>
      </div>
    </div>
  );
}

/** 渲染 PromotionLinkAlert 组件，集中展示推广链接提示所需的数据、状态和操作入口。 */
function PromotionLinkAlert({ status }: { status?: string }) {
  if (status === "generated") {
    return (
      <div className="alert alert-ok">
        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
        <span>已生成推荐链接。</span>
        <span className="badge badge-online">generated</span>
      </div>
    );
  }

  if (status === "created") {
    return (
      <div className="alert alert-ok">
        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
        <span>已保存链接。</span>
        <span className="badge badge-online">created</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="alert alert-fail">
        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span><b className="h">链接保存失败</b> · 请检查 URL 和字段格式。短链点击只计数，不触发投放或库存动作。</span>
        <span className="badge badge-accent">failed</span>
      </div>
    );
  }

  return null;
}

/** 渲染 PromotionLinkCard 组件，集中展示推广链接卡片所需的数据、状态和操作入口。 */
function PromotionLinkCard({ link }: { link: PromotionLink }) {
  const shortUrl = shortPromotionLinkUrl(link.short_code);

  return (
    <article className="panel">
      <div className="panel-body stack-3">
        <div className="row row-between">
          <div className="row">
            <b>{link.label}</b>
            <span className="badge">{promotionLinkTypeLabel(link.link_type)}</span>
            <span className={link.status === "active" ? "badge badge-online" : "badge"}>
              {link.status === "active" ? "启用" : link.status === "archived" ? "已归档" : link.status === "paused" ? "已暂停" : link.status}
            </span>
            <span className="badge badge-info">短链点击 {formatInteger(link.click_count)}</span>
          </div>
          <div className="row">
            {shortUrl ? (
              <a href={shortUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开短链
              </a>
            ) : null}
            <a href={link.tracking_url || link.url} target="_blank" rel="noreferrer" className="btn btn-sm">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开原链
            </a>
          </div>
        </div>
        <p className="url">原链：{link.url}</p>
        {shortUrl ? <p className="url">短链：{shortUrl}</p> : null}
        <dl className="kv">
          {link.tracking_code ? (
            <>
              <dt>tracking_code</dt><dd className="mono">{link.tracking_code}</dd>
            </>
          ) : null}
          {link.scenario ? (
            <>
              <dt>场景</dt><dd>{link.scenario}</dd>
            </>
          ) : null}
          {link.note ? (
            <>
              <dt>备注</dt><dd>{link.note}</dd>
            </>
          ) : null}
        </dl>
      </div>
    </article>
  );
}

/** 渲染 PromotionLinkAttributionPanel 组件，集中展示推广链接归因面板所需的数据、状态和操作入口。 */
function PromotionLinkAttributionPanel({
  links,
  records,
}: {
  links: PromotionLink[];
  records: PerformanceRecord[];
}) {
  const rows = buildPromotionLinkAttribution(links, records);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="stack-2">
          <h3>链接效果归因</h3>
          <p className="mono-note">按经营数据中关联的推荐链接汇总点击、成交、花费和 ROI</p>
        </div>
        <span className="badge">{rows.filter((row) => row.recordCount > 0).length} 个有数据</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl tbl-l">
          <caption className="sr-only">链接效果归因，共 {rows.length} 条</caption>
          <thead>
            <tr>
              <th scope="col">链接</th>
              <th scope="col">类型</th>
              <th scope="col" className="num">点击</th>
              <th scope="col" className="num">成交</th>
              <th scope="col" className="num">CTR</th>
              <th scope="col" className="num">花费</th>
              <th scope="col" className="num">ROI</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => (
              <tr key={row.link.id}>
                <td><b>{row.link.label}</b><br /><span className="mono-note">{row.recordCount} 条数据</span></td>
                <td>{row.link.scenario || promotionLinkTypeLabel(row.link.link_type)}</td>
                <td className="num">{formatInteger(row.clicks)}</td>
                <td className="num">{formatInteger(row.conversions)}</td>
                <td className="num">{formatNumberPercent(row.ctr)}</td>
                <td className="num">{formatNumberMoney(row.spend)}</td>
                <td className="num">{formatNumberDecimal(row.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tbl-note">
        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span>归因只汇总已回填的经营记录和短链点击，不代表平台广告后台的实时花费。</span>
      </div>
    </div>
  );
}

/** 渲染 AdWorkflowPanel 组件，集中展示投放工作流面板所需的数据、状态和操作入口。 */
function AdWorkflowPanel({ product }: { product: ProductDetail }) {
  const steps = buildAdWorkflowSteps(product);
  const nextStep = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return (
    <div className="stack-3">
      <div className="row row-between">
        <h3 className="t-h3">投放工作流</h3>
        <span className="mono-note">素材 → 链接 → 实验 → 人工确认 → 数据复盘</span>
      </div>
      <ol className="flow flow-5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {steps.map((step, index) => (
          <li key={step.title} className={`flow-step ${step.done ? "is-done" : step === nextStep ? "is-next" : "is-idle"}`}>
            <span className="flow-idx">STEP {String(index + 1).padStart(2, "0")}</span>
            <Link href={step.href}>
              <h4>{step.title}</h4>
              <p>{step.hint}</p>
              <span className="flow-mark">
                <svg className="ic ic-sm" aria-hidden="true"><use href={step.done ? "#i-check" : step === nextStep ? "#i-arrow-r" : "#i-chev"}></use></svg>
                {step.done ? "已完成" : step === nextStep ? "当前步骤" : "未开始"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 构建投放工作流steps，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function buildAdWorkflowSteps(product: ProductDetail) {
  const hasAsset = product.generated_assets.length > 0 || product.creative_plans.length > 0;
  const hasLink = product.promotion_links.length > 0;
  const hasRecommendation = product.ad_recommendations.length > 0;
  const hasExperiment = product.ad_experiments.length > 0;
  const hasConfirmedExperiment = product.ad_experiments.some((experiment) => experiment.status !== "draft");
  const hasPerformance = product.performance_records.length > 0;
  const hasReview = product.review_reports.length > 0;

  return [
    {
      title: "素材建议",
      done: hasAsset,
      hint: hasAsset ? "已有素材或创意方案" : "先生成主图/视频素材",
      href: `/products/${product.id}?tab=assets`,
    },
    {
      title: "承接链接",
      done: hasLink,
      hint: hasLink ? `${product.promotion_links.length} 个链接可用` : "生成或添加推广链接",
      href: `/products/${product.id}?tab=links`,
    },
    {
      title: "实验计划",
      done: hasRecommendation || hasExperiment,
      hint: hasExperiment ? `${product.ad_experiments.length} 个实验` : "生成投放建议和实验",
      href: `/products/${product.id}?tab=ads`,
    },
    {
      title: "人工确认",
      done: hasConfirmedExperiment,
      hint: hasConfirmedExperiment ? "已有非草稿实验" : "投放前由人工确认",
      href: `/products/${product.id}?tab=ads`,
    },
    {
      title: "数据复盘",
      done: hasPerformance && hasReview,
      hint: hasPerformance ? "回填数据后生成复盘" : "回填曝光、点击和成交",
      href: `/products/${product.id}?tab=review`,
    },
  ];
}

/** 渲染 AdLinkRecommendationPanel 组件，集中展示投放链接建议面板所需的数据、状态和操作入口。 */
function AdLinkRecommendationPanel({
  links,
  records,
}: {
  links: PromotionLink[];
  records: PerformanceRecord[];
}) {
  const bestLink = buildPromotionLinkAttribution(links, records).find((row) => row.recordCount > 0);

  if (!bestLink) {
    return null;
  }

  return (
    <div className="tint tint-ok">
      <span className="tint-lbl">推荐投放链接 · 归因最优</span>
      <div className="row row-between">
        <div className="stack-2 grow">
          <p><b>{bestLink.link.label}</b></p>
          <p>
            已关联 {bestLink.recordCount} 条经营数据，ROI {formatNumberDecimal(bestLink.roi)}，
            CTR {formatNumberPercent(bestLink.ctr)}。下一轮投放可优先沿用该链接，并继续观察转化稳定性。
          </p>
        </div>
        <a href={bestLink.link.url} target="_blank" rel="noreferrer" className="btn">
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开链接
        </a>
      </div>
    </div>
  );
}

/** 渲染 AdAssetRecommendationPanel 组件，集中展示投放素材建议面板所需的数据、状态和操作入口。 */
function AdAssetRecommendationPanel({
  assets,
  records,
}: {
  assets: GeneratedAsset[];
  records: PerformanceRecord[];
}) {
  const recommendation = bestAssetRecommendation(assets, records);

  if (!recommendation) {
    return null;
  }

  return (
    <div className="tint tint-info">
      <span className="tint-lbl">推荐投放素材 · 归因最优</span>
      <div className="row row-between">
        <div className="stack-2 grow">
          <p><b>{recommendation.asset.title || "生成素材"}</b></p>
          <p>
            当前素材 ROI {formatNumberDecimal(recommendation.roi)}，CTR {formatNumberPercent(recommendation.ctr)}。
            下一轮建议继续小步放量，并复制 2-3 个同结构不同卖点版本。
          </p>
        </div>
        <a href={absoluteMediaUrl(recommendation.asset.url)} target="_blank" rel="noreferrer" className="btn">
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开素材
        </a>
      </div>
    </div>
  );
}

/** 渲染 AdExperimentDashboardPanel 组件，集中展示投放实验看板面板所需的数据、状态和操作入口。 */
function AdExperimentDashboardPanel({
  dashboard,
  assets,
  links,
}: {
  dashboard: AdExperimentDashboard | null;
  assets: GeneratedAsset[];
  links: PromotionLink[];
}) {
  if (!dashboard || dashboard.total_experiments === 0) {
    return null;
  }

  const rows = dashboard.rows.slice(0, 6);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="stack-2">
          <h3>实验看板</h3>
          <p className="mono-note">按投放实验汇总回填数据，快速判断继续、暂停、复制或放量</p>
        </div>
        <span className="badge">{dashboard.measured_experiments}/{dashboard.total_experiments} 已回填</span>
      </div>
      <div className="panel-body stack-4">
        <div className="metrics">
          <div className="metric"><span className="lbl">执行中</span><span className="val">{formatInteger(dashboard.active_experiments)}</span></div>
          <div className="metric"><span className="lbl">总花费</span><span className="val">{formatMoney(dashboard.total_spend)}</span></div>
          <div className="metric"><span className="lbl">总成交额</span><span className="val">{formatMoney(dashboard.total_revenue)}</span></div>
          <div className="metric"><span className="lbl">整体 ROI</span><span className={`val${dashboard.overall_roi !== null && Number(dashboard.overall_roi) >= 2 ? " is-ok" : ""}`}>{formatDecimal(dashboard.overall_roi)}</span></div>
        </div>

        {dashboard.best_experiment ? (
          <div className="tint tint-ok">
            <span className="tint-lbl">当前优胜实验</span>
            <div className="row row-between">
              <div className="stack-2 grow">
                <p><b>{dashboard.best_experiment.name}</b></p>
                <p>
                  ROI {formatDecimal(dashboard.best_experiment.roi)}，CTR {formatPercent(dashboard.best_experiment.ctr)}。
                  {dashboard.best_experiment.decision_reason}
                </p>
              </div>
              <span className="badge badge-online">{adExperimentDecisionLabel(dashboard.best_experiment.decision)}</span>
            </div>
          </div>
        ) : null}

        <div className="tbl-wrap">
          <table className="tbl tbl-x">
            <caption className="sr-only">实验看板，共 {rows.length} 条</caption>
            <thead>
              <tr>
                <th scope="col">实验</th>
                <th scope="col">状态</th>
                <th scope="col">周期</th>
                <th scope="col" className="num">日预算</th>
                <th scope="col" className="num">曝光</th>
                <th scope="col" className="num">点击</th>
                <th scope="col" className="num">成交</th>
                <th scope="col" className="num">CTR</th>
                <th scope="col" className="num">花费</th>
                <th scope="col" className="num">ROI</th>
                <th scope="col">决策</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ad_experiment_id}>
                  <td>
                    <div className="cell-goods">
                      <span>
                        <b>{row.name}</b>
                        <span>{generatedAssetTitle(assets, row.generated_asset_id)} · {promotionLinkTitle(links, row.promotion_link_id)}</span>
                      </span>
                    </div>
                  </td>
                  <td><span className={adExperimentStatusTone(row.status)}>{adExperimentStatusLabel(row.status)}</span></td>
                  <td className="key">{formatDateRange(row.period_start, row.period_end)}</td>
                  <td className="num">{formatMoney(row.daily_budget)}</td>
                  <td className="num">{formatInteger(row.impressions)}</td>
                  <td className="num">{formatInteger(row.clicks)}</td>
                  <td className="num">{formatInteger(row.conversions)}</td>
                  <td className="num">{formatPercent(row.ctr)}</td>
                  <td className="num">{formatMoney(row.spend)}</td>
                  <td className="num">{formatDecimal(row.roi)}</td>
                  <td><span className={adExperimentDecisionTone(row.decision)}>{adExperimentDecisionLabel(row.decision)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mono-note">{rows.map((row) => row.decision_reason).filter(Boolean).join("；")}</p>
      </div>
    </div>
  );
}

/** 渲染 AdExperimentPanel 组件，集中展示投放实验面板所需的数据、状态和操作入口。 */
function AdExperimentPanel({
  experiments,
  assets,
  links,
  productId,
  status,
  canEdit,
}: {
  experiments: AdExperiment[];
  assets: GeneratedAsset[];
  links: PromotionLink[];
  productId: number;
  status?: string;
  canEdit: boolean;
}) {
  return (
    <div className="panel">
      {status === "generated" ? (
        <div className="alert alert-ok" style={{ margin: "var(--sp-4) var(--sp-4) 0" }}>
          <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
          <span>已生成投放实验计划，实际投放前仍需人工确认。</span>
          <span className="badge badge-online">generated</span>
        </div>
      ) : null}
      {status === "failed" ? (
        <div className="alert alert-fail" style={{ margin: "var(--sp-4) var(--sp-4) 0" }}>
          <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
          <span>实验计划生成失败，请先确认素材、链接和经营数据是否已保存。</span>
          <span className="badge badge-accent">failed</span>
        </div>
      ) : null}
      {status === "updated" ? (
        <div className="alert alert-ok" style={{ margin: "var(--sp-4) var(--sp-4) 0" }}>
          <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
          <span>实验状态已更新。</span>
          <span className="badge badge-online">updated</span>
        </div>
      ) : null}

      <div className="panel-head">
        <div className="stack-2">
          <h3>投放实验计划</h3>
          <p className="mono-note">把推荐素材和推荐链接组合成可复盘的测试单，只做计划和记录，不自动执行资金操作</p>
        </div>
        {canEdit ? (
          <form action={`/products/${productId}/ad-experiments/generate`} method="post">
            <button type="submit" className="btn btn-primary">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>生成实验
            </button>
          </form>
        ) : null}
      </div>

      <div className="panel-body stack-3">
        {experiments.length === 0 ? (
          <div className="empty">
            <svg className="ic ic-lg" aria-hidden="true"><use href="#i-agent"></use></svg>
            <h4>还没有实验计划</h4>
            <p>可以先用现有素材和链接生成第一条小预算测试单。实验只做计划和记录，执行前必须人工确认。</p>
            <p className="empty-next">
              <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
              生成后这里出现：实验目标 · 关联素材 / 链接 · 人群 · 成功指标 · 状态操作
            </p>
          </div>
        ) : (
          experiments.map((experiment) => (
            <div key={experiment.id} className="panel">
              <div className="panel-head">
                <div className="stack-2">
                  <h3>{experiment.name}</h3>
                  <p className="mono-note">{experiment.objective}</p>
                </div>
                <div className="row">
                  <span className={adExperimentStatusTone(experiment.status)}>{adExperimentStatusLabel(experiment.status)}</span>
                  <span className="badge badge-warn">日预算 {formatMoney(experiment.daily_budget)}</span>
                </div>
              </div>
              <div className="panel-body stack-3">
                <dl className="kv">
                  <dt>关联素材</dt><dd>{generatedAssetTitle(assets, experiment.generated_asset_id)}</dd>
                  <dt>承接链接</dt><dd>{promotionLinkTitle(links, experiment.promotion_link_id)}</dd>
                  <dt>人群</dt><dd>{experiment.audience ?? "待补充"}</dd>
                  <dt>成功指标</dt><dd><b>{experiment.success_metric ?? "待补充"}</b></dd>
                </dl>
                {experiment.hypothesis ? (
                  <div className="tint tint-info">
                    <span className="tint-lbl">假设</span>
                    <p>{experiment.hypothesis}</p>
                  </div>
                ) : null}
                <AdExperimentStatusActions productId={productId} experiment={experiment} canEdit={canEdit} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** 渲染 AdExperimentStatusActions 组件，集中展示投放实验状态actions所需的数据、状态和操作入口。 */
function AdExperimentStatusActions({
  productId,
  experiment,
  canEdit,
}: {
  productId: number;
  experiment: AdExperiment;
  canEdit: boolean;
}) {
  const nextStatuses =
    experiment.status === "draft"
      ? [{ status: "active", label: "标记执行中", primary: true }]
      : experiment.status === "active"
        ? [
            { status: "paused", label: "标记暂停", primary: false },
            { status: "completed", label: "标记完成", primary: false },
          ]
        : experiment.status === "paused"
          ? [{ status: "active", label: "恢复执行", primary: true }]
          : [];

  if (!canEdit || nextStatuses.length === 0) {
    return null;
  }

  return (
    <div className="row">
      {nextStatuses.map((item) => (
        <form
          key={item.status}
          action={`/products/${productId}/ad-experiments/${experiment.id}/status`}
          method="post"
        >
          <input type="hidden" name="status" value={item.status} />
          <button type="submit" className={item.primary ? "btn btn-primary btn-sm" : "btn btn-sm"}>
            {item.label}
          </button>
        </form>
      ))}
    </div>
  );
}

/** 把投放实验状态状态映射为中文显示文本，保持页面口径一致。 */
function adExperimentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "执行中",
    archived: "已归档",
    completed: "已完成",
    draft: "待确认",
    paused: "已暂停",
  };
  return labels[status] ?? status;
}

/** 把投放实验状态映射为徽标样式，避免组件内散落条件分支。 */
function adExperimentStatusTone(status: string): string {
  const tones: Record<string, string> = {
    active: "badge badge-online",
    archived: "badge",
    completed: "badge badge-online",
    draft: "badge",
    paused: "badge badge-warn",
  };
  return tones[status] ?? "badge";
}

/** 把投放实验决策状态映射为中文显示文本，保持页面口径一致。 */
function adExperimentDecisionLabel(decision: string): string {
  const labels: Record<string, string> = {
    keep: "继续观察",
    needs_data: "待回填",
    observe: "观察",
    pause: "建议暂停",
    scale: "可放量",
  };
  return labels[decision] ?? decision;
}

/** 把投放实验决策状态映射为徽标样式，避免组件内散落条件分支。 */
function adExperimentDecisionTone(decision: string): string {
  const tones: Record<string, string> = {
    keep: "badge badge-info",
    needs_data: "badge badge-warn",
    observe: "badge badge-info",
    pause: "badge badge-warn",
    scale: "badge badge-online",
  };
  return tones[decision] ?? "badge";
}

/** 格式化日期range，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) {
    return "待回填周期";
  }
  if (start && end && start !== end) {
    return `${start} 至 ${end}`;
  }
  return start ?? end ?? "待回填周期";
}

/** 把推广链接type状态映射为中文显示文本，保持页面口径一致。 */
function promotionLinkTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    activity: "活动页",
    affiliate: "达人/分销",
    landing: "承接页",
    tracking: "投放追踪",
  };
  return labels[type] ?? type;
}

/** 渲染 CompetitorImportAlert 组件，集中展示竞品导入提示所需的数据、状态和操作入口。 */
function CompetitorImportAlert({
  competitorStatus,
  importStatus,
}: {
  competitorStatus?: string;
  importStatus?: string;
}) {
  if (importStatus === "queued") {
    return (
      <div className="alert alert-info">
        <svg className="ic" aria-hidden="true"><use href="#i-doc"></use></svg>
        <span>已创建竞品链接解析任务，可在任务页签查看后续处理结果。</span>
        <span className="badge badge-info">queued</span>
      </div>
    );
  }

  if (importStatus === "success") {
    return (
      <div className="alert alert-ok">
        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
        <span>已解析链接并添加为竞品。</span>
        <span className="badge badge-online">success</span>
      </div>
    );
  }

  if (importStatus === "failed") {
    return (
      <div className="alert alert-fail">
        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span><b className="h">竞品链接解析失败</b> · 可换一个公开商品页，或先用手动表单录入关键字段。</span>
        <span className="badge badge-accent">failed</span>
      </div>
    );
  }

  if (competitorStatus === "failed") {
    return (
      <div className="alert alert-fail">
        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span><b className="h">竞品保存失败</b> · 请检查名称、链接和价格格式。</span>
        <span className="badge badge-accent">failed</span>
      </div>
    );
  }

  return null;
}

type CompetitorInsights = {
  averagePrice: number | null;
  completeness: number;
  cheaperCount: number;
  competitorCount: number;
  higherCount: number;
  maxPrice: number | null;
  minPrice: number | null;
  priceSampleCount: number;
  topSellingPoints: Array<{ count: number; name: string }>;
};

/** 渲染 CompetitorInsightsPanel 组件，集中展示竞品洞察面板所需的数据、状态和操作入口。 */
function CompetitorInsightsPanel({ insights }: { insights: CompetitorInsights }) {
  if (insights.competitorCount === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="stack-2">
          <h3>竞品洞察</h3>
          <p className="mono-note">基于当前竞品记录汇总价格带、卖点频次和数据完整度；缺样本时不推断真实市场</p>
        </div>
        <span className="badge badge-info">完整度 {insights.completeness}%</span>
      </div>
      <div className="panel-body stack-4">
        <div className="metrics">
          <div className="metric"><span className="lbl">竞品数量</span><span className="val">{insights.competitorCount} 个</span></div>
          <div className="metric">
            <span className="lbl">价格带</span>
            <span className="val">
              {insights.priceSampleCount > 0
                ? `${formatNumberMoney(insights.minPrice ?? 0)} - ${formatNumberMoney(insights.maxPrice ?? 0)}`
                : "待补充"}
            </span>
          </div>
          <div className="metric">
            <span className="lbl">均价</span>
            <span className="val">{insights.averagePrice === null ? "待补充" : formatNumberMoney(insights.averagePrice)}</span>
          </div>
          <div className="metric"><span className="lbl">价格位置</span><span className="val">低于 {insights.higherCount} 个，高于 {insights.cheaperCount} 个</span></div>
        </div>

        <div>
          <span className="eyebrow">卖点频次（跨竞品）</span>
          <div className="chip-row" style={{ marginTop: ".5rem" }}>
            {insights.topSellingPoints.length > 0 ? (
              insights.topSellingPoints.map((point) => (
                <span key={point.name} className="tag">{point.name} ×{point.count}</span>
              ))
            ) : (
              <span className="tag">待补充竞品卖点</span>
            )}
          </div>
        </div>

        <div className="tint tint-info">
          <span className="tint-lbl">读法</span>
          <p>频次高的卖点已在同类竞品里普及，不再是差异化点；只被 1 个竞品提到的卖点才是本品主图方案可以抢占的认知空位。</p>
        </div>
      </div>
    </div>
  );
}

/** 渲染 CompetitorMonitorPanel 组件，集中展示竞品monitor面板所需的数据、状态和操作入口。 */
function CompetitorMonitorPanel({
  competitors,
  monitors,
  productId,
  canEdit,
}: {
  competitors: Competitor[];
  monitors: CompetitorMonitor[];
  productId: number;
  canEdit: boolean;
}) {
  const monitorByCompetitor = new Map(monitors.map((monitor) => [monitor.competitor_id, monitor]));

  if (competitors.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="stack-2">
          <h3>竞品监控</h3>
          <p className="mono-note">保存监控频率和快照，检查时只解析已录入的公开链接</p>
        </div>
        <span className="badge badge-online">已启用 {monitors.filter((monitor) => monitor.status === "active").length} 个</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl tbl-x">
          <caption className="sr-only">竞品监控，共 {competitors.length} 条</caption>
          <thead>
            <tr>
              <th scope="col">竞品</th>
              <th scope="col">监控节奏</th>
              <th scope="col">上次检查</th>
              <th scope="col">下次检查</th>
              <th scope="col" className="wrap-cell">最新快照变化</th>
              <th scope="col">动作</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor) => {
              const monitor = monitorByCompetitor.get(competitor.id);
              const latestSnapshot = monitor?.snapshots?.[0];

              return (
                <tr key={competitor.id}>
                  <td><b>{competitor.name}</b><br /><span className="mono-note">{platformLabels[competitor.platform]}</span></td>
                  <td className="key">{monitor ? `每 ${monitor.interval_days} 天` : competitor.url ? "可启用" : "缺少链接"}</td>
                  <td className="key">{monitor?.last_checked_at ? `${formatDateTime(monitor.last_checked_at)}${latestSnapshot?.error ? "（失败）" : ""}` : "—"}</td>
                  <td className="key">{monitor?.next_check_at ? formatDateTime(monitor.next_check_at) : "—"}</td>
                  <td>
                    <div className="chip-row">
                      {latestSnapshot?.error ? (
                        <span className="badge badge-accent">快照失败 · {latestSnapshot.error}</span>
                      ) : latestSnapshot?.changes?.length ? (
                        latestSnapshot.changes.slice(0, 3).map((change) => (
                          <span key={change} className="badge badge-info">{change}</span>
                        ))
                      ) : (
                        <span className="badge">{monitor ? "无变化" : "暂无快照"}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      {canEdit && monitor ? (
                        <form action={`/products/${productId}/competitor-monitors/${monitor.id}/run`} method="post">
                          <button type="submit" className="btn btn-sm">立即检查</button>
                        </form>
                      ) : canEdit ? (
                        <form action={`/products/${productId}/competitors/${competitor.id}/monitor`} method="post">
                          <input type="hidden" name="interval_days" value="1" />
                          <button type="submit" disabled={!competitor.url} className="btn btn-sm">启用监控</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 渲染 InsightMetric 组件，集中展示洞察指标所需的数据、状态和操作入口。 */
function InsightMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "warn" | "accent" | "idle" }) {
  const toneClass = tone === "ok" ? " is-ok" : tone === "warn" ? " is-warn" : tone === "accent" ? " is-accent" : tone === "idle" ? " is-idle" : "";
  return (
    <div className="metric">
      <span className="lbl">{label}</span>
      <span className={`val${toneClass}`}>{value}</span>
    </div>
  );
}

/** 渲染 PerformanceImportAlert 组件，集中展示经营数据导入提示所需的数据、状态和操作入口。 */
function PerformanceImportAlert({
  count,
  importStatus,
  performanceStatus,
}: {
  count?: string;
  importStatus?: string;
  performanceStatus?: string;
}) {
  if (importStatus === "success") {
    return (
      <div className="alert alert-ok">
        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
        <span>已导入 {count ?? "多"} 条经营数据。</span>
        <span className="badge badge-online">imported</span>
      </div>
    );
  }

  if (importStatus === "empty") {
    return (
      <div className="alert alert-warn">
        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span>CSV 中没有可导入的数据，请检查日期列和表头。</span>
        <span className="badge badge-warn">empty</span>
      </div>
    );
  }

  if (importStatus === "failed" || performanceStatus === "failed") {
    return (
      <div className="alert alert-fail">
        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
        <span><b className="h">数据保存失败</b> · 请检查日期、数字格式和素材 ID 是否属于当前商品。</span>
        <span className="badge badge-accent">failed</span>
      </div>
    );
  }

  return null;
}

type PerformanceSummary = {
  clicks: number;
  conversions: number;
  conversionRate: number | null;
  ctr: number | null;
  impressions: number;
  recordCount: number;
  revenue: number;
  roi: number | null;
  spend: number;
};

/** 渲染 PerformanceSummaryCards 组件，集中展示经营数据汇总cards所需的数据、状态和操作入口。 */
function PerformanceSummaryCards({ summary }: { summary: PerformanceSummary }) {
  if (summary.recordCount === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-head"><h3>经营数据汇总</h3><span className="badge">{summary.recordCount} 条记录</span></div>
      <div className="panel-body">
        <div className="metrics metrics-6">
          <InsightMetric label="数据周期" value={`${summary.recordCount} 条`} />
          <InsightMetric label="总曝光" value={formatInteger(summary.impressions)} />
          <InsightMetric label="整体 CTR" value={formatNumberPercent(summary.ctr)} />
          <InsightMetric label="总成交" value={formatInteger(summary.conversions)} />
          <InsightMetric label="总花费" value={formatNumberMoney(summary.spend)} />
          <InsightMetric label="整体 ROI" value={formatNumberDecimal(summary.roi)} tone={(summary.roi ?? 0) >= 2 ? "ok" : "default"} />
        </div>
      </div>
    </div>
  );
}

/** 渲染 PerformanceTrendPanel 组件，集中展示经营数据趋势面板所需的数据、状态和操作入口。 */
function PerformanceTrendPanel({ records }: { records: PerformanceRecord[] }) {
  const trendRecords = [...records]
    .sort((a, b) => a.period_end.localeCompare(b.period_end) || a.id - b.id)
    .slice(-5);

  if (trendRecords.length < 2) {
    return null;
  }

  const roiValues = trendRecords.map((record) => numberValue(record.roi));
  const maxRoi = Math.max(...roiValues, 1);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>经营趋势</h3>
        <div className="row">
          <span className="badge">最近 {trendRecords.length} 条</span>
          <span className="mono-note">CTR / 转化率按 8% 满格，ROI 按区间最大值满格</span>
        </div>
      </div>
      <div className="panel-body stack-4">
        {trendRecords.map((record) => {
          const ctr = numberValue(record.ctr);
          const conversionRate = numberValue(record.conversion_rate);
          const roi = numberValue(record.roi);

          return (
            <div key={record.id} className="stack-3">
              <div className="row row-between">
                <span className="mono-note">{record.period_start} 至 {record.period_end}</span>
                <span className="mono-note">{record.conversions ?? 0} 单</span>
              </div>
              <TrendBar label="CTR" value={formatNumberPercent(ctr)} percent={Math.min(ctr / 0.08, 1) * 100} tone="info" />
              <TrendBar
                label="转化"
                value={formatNumberPercent(conversionRate)}
                percent={Math.min(conversionRate / 0.08, 1) * 100}
                tone="info"
              />
              <TrendBar label="ROI" value={formatNumberDecimal(roi)} percent={(roi / maxRoi) * 100} tone="accent" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 渲染 TrendBar 组件，集中展示趋势bar所需的数据、状态和操作入口。 */
function TrendBar({
  tone = "info",
  label,
  percent,
  value,
}: {
  tone?: "info" | "accent" | "ok" | "run";
  label: string;
  percent: number;
  value: string;
}) {
  const toneClass = tone === "accent" ? " is-accent" : tone === "ok" ? " is-ok" : tone === "run" ? " is-run" : " is-info";
  return (
    <div className="trend">
      <span className="t-lbl">{label}</span>
      <div className="bar" role="img" aria-label={`${label} ${value}`}>
        <i className={toneClass.trim()} style={{ width: `${Math.max(4, Math.min(percent, 100))}%` }}></i>
      </div>
      <span className="t-val">{value}</span>
    </div>
  );
}

/** 渲染 StageCard 组件，集中展示阶段卡片所需的数据、状态和操作入口。 */
function StageCard({
  icon,
  title,
  detail,
  actionLabel,
  actionHref,
}: {
  icon: string;
  title: string;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="panel">
      <div className="panel-body stack-3">
        <div className="row row-between">
          <span className="wf-icon" aria-hidden="true"><svg className="ic" aria-hidden="true"><use href={icon}></use></svg></span>
        </div>
        <h3>{title}</h3>
        <p className="mono-note">{detail}</p>
        {actionLabel && actionHref ? (
          <Link className="btn btn-primary" href={actionHref}>{actionLabel}</Link>
        ) : null}
      </div>
    </div>
  );
}

/** 渲染 GenerationJobSummary 组件，集中展示生成任务任务汇总所需的数据、状态和操作入口。 */
function GenerationJobSummary({
  activeTab,
  canEdit,
  jobs,
  productId,
}: {
  activeTab: ProductTabKey;
  canEdit: boolean;
  jobs: GenerationJob[];
  productId: number;
}) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="stack-3" aria-label="生成任务摘要">
      <div className="row row-between">
        <span className="eyebrow">生成任务</span>
        <div className="row">
          {jobs.some((job) => ["pending", "running"].includes(job.status)) ? (
            <span className="badge badge-warn"><span className="status-led is-busy" aria-hidden="true"></span>自动刷新中</span>
          ) : null}
          <Link className="mono-note" href={`/products/${productId}?tab=jobs`} style={{ minHeight: "44px", display: "inline-flex", alignItems: "center" }}>查看任务中心</Link>
        </div>
      </div>
      <div className="grid-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={`job ${job.status === "running" || job.status === "pending" ? "is-run" : job.status === "succeeded" ? "is-ok" : job.status === "failed" ? "is-fail" : ""}`}
          >
            <div className="job-hd">
              <JobStatusBadge job={job} />
              <span className="job-id">{job.kind === "video_asset" ? "视频" : "图片"} #{job.id}</span>
            </div>
            <div className="stack-2">
              {job.status === "succeeded" && jobResultUrl(job) ? (
                <a className="lnk" href={absoluteMediaUrl(jobResultUrl(job) || "")} target="_blank" rel="noreferrer">
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-ext"></use></svg>打开生成结果
                </a>
              ) : job.error ? (
                <p className="mono-note" style={{ color: "var(--accent)" }}>{job.error}</p>
              ) : (
                <p className="mono-note">{job.started_at ? `开始于 ${formatDateTime(job.started_at)}` : "等待后台执行"}</p>
              )}
              <div className="row">
                <Link className="btn btn-sm" href={`/products/${productId}/generation-jobs/${job.id}`}>详情</Link>
                {canEdit && job.status === "failed" ? (
                  <form action={`/products/${productId}/generation-jobs/${job.id}/retry`} method="post">
                    <input type="hidden" name="tab" value={activeTab} />
                    <button type="submit" className="btn btn-sm btn-primary">重试</button>
                  </form>
                ) : canEdit && (job.status === "pending" || job.status === "running") ? (
                  <form action={`/products/${productId}/generation-jobs/${job.id}/cancel`} method="post">
                    <input type="hidden" name="tab" value={activeTab} />
                    <button type="submit" className="btn btn-sm">取消</button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 渲染 JobStatusBadge 组件，集中展示任务状态状态徽标所需的数据、状态和操作入口。 */
function JobStatusBadge({ job }: { job: GenerationJob | undefined }) {
  if (!job) {
    return null;
  }

  const statusLabels: Record<GenerationJob["status"], string> = {
    pending: "排队中",
    running: "生成中",
    succeeded: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  const tone: Record<GenerationJob["status"], string> = {
    pending: "badge",
    running: "badge badge-warn",
    succeeded: "badge badge-online",
    failed: "badge badge-accent",
    cancelled: "badge",
  };

  return (
    <span className={tone[job.status]}>
      {job.status === "pending" || job.status === "running" ? (
        <span className="status-led is-busy" aria-hidden="true"></span>
      ) : null}
      {statusLabels[job.status]}
    </span>
  );
}

/** 渲染 LinkParseTaskStatusBadge 组件，集中展示链接解析任务状态状态徽标所需的数据、状态和操作入口。 */
function LinkParseTaskStatusBadge({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    pending: "等待中",
    running: "执行中",
    succeeded: "成功",
    failed: "失败",
  };
  const tone: Record<string, string> = {
    pending: "badge badge-warn",
    running: "badge badge-info",
    succeeded: "badge badge-online",
    failed: "badge badge-accent",
  };

  return (
    <span className={tone[status] ?? "badge"}>
      {statusLabels[status] ?? status}
    </span>
  );
}

/** 渲染 JobError 组件，集中展示任务错误所需的数据、状态和操作入口。 */
function JobError({ job }: { job: GenerationJob | undefined }) {
  if (!job || job.status !== "failed" || !job.error) {
    return null;
  }

  return (
    <div className="alert alert-fail" style={{ gridTemplateColumns: "18px minmax(0,1fr)" }}>
      <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
      <span className="mono">{job.error}</span>
    </div>
  );
}

/** 最新任务，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function latestJob(
  jobs: GenerationJob[],
  creativePlanId: number,
  kind: GenerationJob["kind"],
): GenerationJob | undefined {
  return jobs.find((job) => job.creative_plan_id === creativePlanId && job.kind === kind);
}

/** 任务结果URL，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function jobResultUrl(job: GenerationJob): string | null {
  const value = job.result.url;
  return typeof value === "string" && value ? value : null;
}

type AssetLibraryItem = {
  assetVersion: number;
  kind: "image" | "video";
  planId: number;
  title: string;
  model?: string;
  size?: string;
  duration?: number;
  rating?: number;
  tags: string[];
  note: string;
  status: string;
  url: string;
  usageContexts: string[];
};

/** 收集素材素材库，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function collectAssetLibrary(
  generatedAssets: GeneratedAsset[],
  creativePlans: Array<{ id: number; title: string; content: Record<string, unknown> }>,
): AssetLibraryItem[] {
  // 优先使用统一素材库；没有迁移数据时再兼容读取旧版 creative_plan.content 内的生成结果。
  if (generatedAssets.length > 0) {
    return generatedAssets.map((asset) => ({
      assetVersion: asset.asset_version ?? 1,
      duration: asset.duration ?? undefined,
      kind: asset.asset_type === "video" ? "video" : "image",
      model: asset.model ?? undefined,
      note: asset.note ?? "",
      planId: asset.creative_plan_id,
      rating: asset.rating ?? undefined,
      size: asset.size ?? undefined,
      status: asset.status ?? "",
      tags: asset.tags,
      title: asset.title ?? creativePlans.find((plan) => plan.id === asset.creative_plan_id)?.title ?? "生成素材",
      url: asset.url,
      usageContexts: asset.usage_contexts ?? [],
    }));
  }

  return collectAssetsFromCreativePlans(creativePlans);
}

/** 收集素材from创意plans，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function collectAssetsFromCreativePlans(
  creativePlans: Array<{ id: number; title: string; content: Record<string, unknown> }>,
): AssetLibraryItem[] {
  return creativePlans.flatMap((plan) => [
    ...generatedImages(plan.content).map((image) => ({
      kind: "image" as const,
      planId: plan.id,
      title: plan.title,
      ...image,
    })),
    ...generatedVideos(plan.content).map((video) => ({
      kind: "video" as const,
      planId: plan.id,
      title: plan.title,
      ...video,
    })),
  ]);
}

/** 统计素材状态分布，输出「通过 x · 待评估 y」形态的摘要文本。 */
function countAssetStatuses(assets: AssetLibraryItem[]): string {
  if (assets.length === 0) {
    return "先生成方案再出图";
  }
  const counts = new Map<string, number>();
  for (const asset of assets) {
    const key = asset.status || "未标注";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => `${status} ${count}`).join(" · ");
}

/** 渲染 PlanField 组件，集中展示方案字段所需的数据、状态和操作入口。 */
function PlanField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "tint tint-ok" : "tint"}>
      <span className="tint-lbl">{label}</span>
      <p>{value || "-"}</p>
    </div>
  );
}

/** 方案文本，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function planText(content: Record<string, unknown>, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

/** 内容文本，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function contentText(content: Record<string, unknown>, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

/** 方案值，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function planValue(content: Record<string, unknown>, key: string): string {
  const value = content[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

/** 方案列表，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function planList(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** 内容objects，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function contentObjects(content: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = content[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

/** 内容列表，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function contentList(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** 内容对象文本，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function contentObjectText(content: Record<string, unknown>, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

/** 内容对象列表，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function contentObjectList(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** 处理生成images交互，维护必要状态并把副作用交给受控路由或后端 API。 */
function generatedImages(content: Record<string, unknown>): Array<{
  assetVersion: number;
  model?: string;
  size?: string;
  rating?: number;
  tags: string[];
  note: string;
  status: string;
  url: string;
  usageContexts: string[];
}> {
  // creative_plan.content 来自 AI/规则生成和人工编辑，读取时必须逐项收窄类型，避免坏数据打断页面。
  const value = content.generated_images;
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      assetVersion: typeof item.asset_version === "number" && item.asset_version > 0 ? item.asset_version : 1,
      model: typeof item.model === "string" ? item.model : undefined,
      size: typeof item.size === "string" ? item.size : undefined,
      rating: typeof item.rating === "number" ? item.rating : undefined,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      note: typeof item.note === "string" ? item.note : "",
      status: typeof item.status === "string" ? item.status : "",
      url: typeof item.url === "string" ? item.url : "",
      usageContexts: Array.isArray(item.usage_contexts)
        ? item.usage_contexts.filter((context): context is string => typeof context === "string")
        : [],
    }))
    .filter((item) => item.url);
}

/** 绝对地址图片URL，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function absoluteImageUrl(url: string): string {
  return absoluteMediaUrl(url);
}

/** 处理生成videos交互，维护必要状态并把副作用交给受控路由或后端 API。 */
function generatedVideos(content: Record<string, unknown>): Array<{
  assetVersion: number;
  model?: string;
  size?: string;
  duration?: number;
  rating?: number;
  tags: string[];
  note: string;
  status: string;
  url: string;
  usageContexts: string[];
}> {
  // 视频素材同样从结构化 content 中安全提取，缺失字段只影响展示，不影响页面整体渲染。
  const value = content.generated_videos;
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      assetVersion: typeof item.asset_version === "number" && item.asset_version > 0 ? item.asset_version : 1,
      model: typeof item.model === "string" ? item.model : undefined,
      size: typeof item.size === "string" ? item.size : undefined,
      duration: typeof item.duration === "number" ? item.duration : undefined,
      rating: typeof item.rating === "number" ? item.rating : undefined,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      note: typeof item.note === "string" ? item.note : "",
      status: typeof item.status === "string" ? item.status : "",
      url: typeof item.url === "string" ? item.url : "",
      usageContexts: Array.isArray(item.usage_contexts)
        ? item.usage_contexts.filter((context): context is string => typeof context === "string")
        : [],
    }))
    .filter((item) => item.url);
}

/** 把素材状态状态映射为徽标样式，避免组件内散落条件分支。 */
function assetStatusTone(status: string): string {
  const tones: Record<string, string> = {
    待评估: "badge badge-warn",
    通过: "badge badge-online",
    弃用: "badge badge-accent",
    复测: "badge badge-warn",
  };
  return tones[status] ?? "badge";
}

/** 把投放建议确认状态映射为中文显示文本，保持页面口径一致。 */
function adRecommendationConfirmationLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "待人工确认",
    confirmed: "已人工确认",
    rejected: "暂不采纳",
  };
  return labels[status] ?? "待人工确认";
}

/** 把投放建议确认状态映射为徽标样式，避免组件内散落条件分支。 */
function adRecommendationConfirmationTone(status: string): string {
  const tones: Record<string, string> = {
    pending: "badge-warn",
    confirmed: "badge-online",
    rejected: "",
  };
  return tones[status] ?? "badge-warn";
}

/** 绝对地址媒体URL，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function absoluteMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}${url}`;
}

/** 短链推广链接URL，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function shortPromotionLinkUrl(shortCode: string | null): string | null {
  if (!shortCode) {
    return null;
  }
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/v1/links/r/${shortCode}`;
}

/** 方案scenes，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function planScenes(content: Record<string, unknown>): Array<{
  shot: string;
  visual: string;
  voiceover: string;
}> {
  const scenes = content.scenes;
  if (!Array.isArray(scenes)) {
    return [];
  }

  return scenes
    .filter((scene): scene is Record<string, unknown> => Boolean(scene) && typeof scene === "object")
    .map((scene) => ({
      shot: typeof scene.shot === "string" ? scene.shot : "",
      visual: typeof scene.visual === "string" ? scene.visual : "",
      voiceover: typeof scene.voiceover === "string" ? scene.voiceover : "",
    }));
}

/** 把创意方案状态映射为中文显示文本，保持页面口径一致。 */
function creativePlanTitle(
  creativePlans: Array<{ id: number; title: string; type: string }>,
  creativePlanId: number | null,
): string {
  if (!creativePlanId) {
    return "未关联";
  }
  const plan = creativePlans.find((item) => item.id === creativePlanId);
  if (!plan) {
    return "未知素材";
  }
  return `${plan.type === "main_image" ? "主图" : "视频"} · ${plan.title}`;
}

/** 把推广链接状态映射为中文显示文本，保持页面口径一致。 */
function promotionLinkTitle(promotionLinks: PromotionLink[], promotionLinkId: number | null): string {
  if (!promotionLinkId) {
    return "未关联";
  }
  const link = promotionLinks.find((item) => item.id === promotionLinkId);
  return link?.label ?? "未知链接";
}

/** 把投放实验状态映射为中文显示文本，保持页面口径一致。 */
function adExperimentTitle(adExperiments: AdExperiment[], adExperimentId: number | null): string {
  if (!adExperimentId) {
    return "未关联";
  }
  const experiment = adExperiments.find((item) => item.id === adExperimentId);
  return experiment?.name ?? "未知实验";
}

/** 把生成素材状态映射为中文显示文本，保持页面口径一致。 */
function generatedAssetTitle(assets: GeneratedAsset[], generatedAssetId: number | null): string {
  if (!generatedAssetId) {
    return "未关联";
  }
  const asset = assets.find((item) => item.id === generatedAssetId);
  if (!asset) {
    return "未知素材";
  }
  return `${asset.asset_type === "video" ? "视频" : "图片"} · ${asset.title || "生成素材"}`;
}

/** 构建推广链接归因，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function buildPromotionLinkAttribution(
  links: PromotionLink[],
  records: PerformanceRecord[],
): Array<{
  clicks: number;
  conversions: number;
  ctr: number | null;
  impressions: number;
  link: PromotionLink;
  recordCount: number;
  revenue: number;
  roi: number | null;
  spend: number;
}> {
  // 链接归因只汇总用户回填的经营记录和短链点击，不代表平台广告后台实时花费。
  return links
    .map((link) => {
      const linkedRecords = records.filter((record) => record.promotion_link_id === link.id);
      const summary = summarizePerformance(linkedRecords);

      return {
        clicks: summary.clicks,
        conversions: summary.conversions,
        ctr: summary.ctr,
        impressions: summary.impressions,
        link,
        recordCount: summary.recordCount,
        revenue: summary.revenue,
        roi: summary.roi,
        spend: summary.spend,
      };
    })
    .sort((a, b) => b.recordCount - a.recordCount || (b.roi ?? -1) - (a.roi ?? -1));
}

/** 构建素材归因，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function buildAssetAttribution(
  assets: GeneratedAsset[],
  records: PerformanceRecord[],
): Array<{
  asset: GeneratedAsset;
  clicks: number;
  conversions: number;
  ctr: number | null;
  impressions: number;
  recordCount: number;
  revenue: number;
  roi: number | null;
  spend: number;
}> {
  // 素材归因以 generated_asset_id 关联经营记录，帮助运营判断复测或弃用，不自动改素材状态。
  return assets
    .map((asset) => {
      const linkedRecords = records.filter((record) => record.generated_asset_id === asset.id);
      const summary = summarizePerformance(linkedRecords);

      return {
        asset,
        clicks: summary.clicks,
        conversions: summary.conversions,
        ctr: summary.ctr,
        impressions: summary.impressions,
        recordCount: summary.recordCount,
        revenue: summary.revenue,
        roi: summary.roi,
        spend: summary.spend,
      };
    })
    .sort((a, b) => b.recordCount - a.recordCount || (b.roi ?? -1) - (a.roi ?? -1));
}

/** 最佳素材建议，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function bestAssetRecommendation(assets: GeneratedAsset[], records: PerformanceRecord[]) {
  return buildAssetAttribution(assets, records)
    .filter((row) => row.recordCount > 0)
    .sort((a, b) => {
      const roiDiff = (b.roi ?? -1) - (a.roi ?? -1);
      if (roiDiff !== 0) {
        return roiDiff;
      }
      return (b.ctr ?? -1) - (a.ctr ?? -1);
    })[0];
}

/** 素材scaleaction，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function assetScaleAction(row: NonNullable<ReturnType<typeof bestAssetRecommendation>>): string {
  const roi = row.roi ?? 0;
  const ctr = row.ctr ?? 0;

  if (roi >= 3 && ctr >= 0.05) {
    return "ROI 和 CTR 都表现较好，建议下一轮保留该素材结构，小幅提高预算，并复制同结构的不同卖点版本继续测试。";
  }
  if (roi >= 2) {
    return "ROI 有放量潜力，但还需要观察点击稳定性。建议先保持预算或小幅加预算，同时补 1-2 个相似素材做对照。";
  }
  if (ctr >= 0.05) {
    return "点击表现不错但 ROI 还不够稳，建议检查承接页、价格权益和人群匹配，再决定是否放量。";
  }
  return "当前样本还不足以直接放量，建议继续小预算测试，优先优化首屏卖点和画面识别度。";
}

/** 构建竞品洞察，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function buildCompetitorInsights(competitors: Competitor[], productPrice: string | null): CompetitorInsights {
  // 竞品洞察只基于已录入/解析字段做轻量提示，缺样本时不推断市场真实价格带。
  const prices = competitors
    .map((competitor) => Number(competitor.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const currentPrice = Number(productPrice);
  const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;
  const pointCounts = new Map<string, number>();
  let completenessScore = 0;

  competitors.forEach((competitor) => {
    if (competitor.url) {
      completenessScore += 1;
    }
    if (competitor.price) {
      completenessScore += 1;
    }
    if (competitor.title) {
      completenessScore += 1;
    }
    if (competitor.selling_points.length > 0) {
      completenessScore += 1;
    }

    competitor.selling_points.forEach((point) => {
      pointCounts.set(point, (pointCounts.get(point) ?? 0) + 1);
    });
  });

  return {
    averagePrice:
      prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null,
    cheaperCount: hasCurrentPrice ? prices.filter((price) => price < currentPrice).length : 0,
    competitorCount: competitors.length,
    completeness:
      competitors.length > 0 ? Math.round((completenessScore / (competitors.length * 4)) * 100) : 0,
    higherCount: hasCurrentPrice ? prices.filter((price) => price > currentPrice).length : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    priceSampleCount: prices.length,
    topSellingPoints: [...pointCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .slice(0, 8)
      .map(([name, count]) => ({ count, name })),
  };
}

/** summarize经营数据，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function summarizePerformance(records: PerformanceRecord[]): PerformanceSummary {
  // 前端汇总用于看板展示，权威入库计算仍在后端；这里不写回任何实验或复盘状态。
  const summary = records.reduce(
    (accumulator, record) => {
      const impressions = record.impressions ?? 0;
      const clicks = record.clicks ?? 0;
      const conversions = record.conversions ?? 0;
      const spend = numberValue(record.spend);
      const revenue = numberValue(record.revenue);

      return {
        clicks: accumulator.clicks + clicks,
        conversions: accumulator.conversions + conversions,
        impressions: accumulator.impressions + impressions,
        recordCount: accumulator.recordCount + 1,
        revenue: accumulator.revenue + revenue,
        spend: accumulator.spend + spend,
      };
    },
    {
      clicks: 0,
      conversions: 0,
      impressions: 0,
      recordCount: 0,
      revenue: 0,
      spend: 0,
    },
  );

  return {
    ...summary,
    conversionRate: summary.clicks > 0 ? summary.conversions / summary.clicks : null,
    ctr: summary.impressions > 0 ? summary.clicks / summary.impressions : null,
    roi: summary.spend > 0 ? summary.revenue / summary.spend : null,
  };
}

/** 数值值，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function numberValue(value: string | null): number {
  if (!value) {
    return 0;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** 格式化percent，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatPercent(value: string | null): string {
  if (!value) {
    return "-";
  }
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : "-";
}

/** 格式化小数，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatDecimal(value: string | null): string {
  if (!value) {
    return "-";
  }
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "-";
}

/** 格式化金额，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatMoney(value: string | null): string {
  if (!value) {
    return "-";
  }
  const number = Number(value);
  return Number.isFinite(number) ? `¥${number.toFixed(2)}` : "-";
}

/** 格式化整数，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatInteger(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

/** 格式化日期time，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** 格式化数值percent，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatNumberPercent(value: number | null): string {
  return value === null ? "-" : `${(value * 100).toFixed(2)}%`;
}

/** 格式化数值小数，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatNumberDecimal(value: number | null): string {
  return value === null ? "-" : value.toFixed(2);
}

/** 格式化数值金额，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatNumberMoney(value: number): string {
  return `¥${value.toFixed(2)}`;
}
