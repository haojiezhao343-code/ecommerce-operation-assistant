import Link from "next/link";
import { redirect } from "next/navigation";

import { AgentTaskAutoRefresh } from "@/components/agent-task-auto-refresh";
import {
  AgentApiError,
  getAgentApprovals,
  getAgentCatalog,
  getAgentMemories,
  getAgentTasks,
  getCurrentUser,
  getWorkspaces,
  getWorkspaceProducts,
  getWorkspaceStores,
} from "@/lib/api";
import { getActiveWorkspaceId, getAuthToken } from "@/lib/session";
import type {
  AgentApproval,
  AgentMemory,
  AgentRiskLevel,
  AgentTask,
  AgentTaskStatus,
  WorkflowDefinition,
} from "@/types";

import { SectionAnchorNav } from "./section-anchor-nav";

/* ==========================================================================
   页面样式（对照 designs/agent.html 内联 <style> 移植）
   —— 只消费 design-system.css 的 token 与组件类，不新增视觉值
   ========================================================================== */
const agentCss = `
  a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,
  textarea:focus-visible, summary:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  .app-top nav a { display: inline-flex; align-items: center; min-height: 44px; }

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .wrap { width: 100%; max-width: var(--max-w); margin-inline: auto; }
  .sec { margin-bottom: var(--sp-7); scroll-margin-top: 76px; }
  .sec:last-child { margin-bottom: 0; }
  .sec-hd {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp-3) var(--sp-4); flex-wrap: wrap;
    margin-bottom: var(--sp-4); padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .sec-hd h2 { font-size: var(--fs-h2); }
  .sec-hd .mono-note { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .sec-hd-end { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }

  .mark-slot { display: inline-flex; align-items: center; }
  .mark-slot .mark { width: 1em; height: 1em; }
  .brand .mark-slot { font-size: 20px; }

  .prose { font-size: var(--fs-body); line-height: 1.75; color: var(--fg-secondary); }
  .hint { font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.7; color: var(--faint); }
  .hint code, .hint .k { color: var(--accent); }
  .hint { min-width: 0; overflow-wrap: anywhere; }

  /* --- 表单 ---------------------------------------------------------- */
  .input, select.input, textarea.input { width: 100%; min-height: 44px; }
  textarea.input { min-height: 7rem; }
  textarea.input.is-code { font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.7; min-height: 11rem; }
  .input:disabled { background: var(--surface-sunken); color: var(--faint); cursor: not-allowed; }
  .form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-3); }
  .form-stack { display: flex; flex-direction: column; gap: var(--sp-4); }
  .form-actions { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }

  /* --- 页头 ---------------------------------------------------------- */
  .page-head {
    display: grid; grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--sp-4) var(--sp-5); align-items: start;
    padding-bottom: var(--sp-4); border-bottom: 1px solid var(--border); margin-bottom: var(--sp-5);
  }
  .page-head .eyebrow { display: inline-flex; align-items: center; gap: .4em; color: var(--accent); }
  .page-head h1 { font-size: var(--fs-h1); margin-top: .5rem; }
  .page-head .t-lead { margin-top: var(--sp-2); }
  .ph-ctl { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; flex-wrap: wrap; }
  .ws-switch { display: flex; align-items: center; gap: .5rem; }
  .ws-switch .input { width: auto; max-width: 15rem; }
  .whoami {
    display: flex; flex-direction: column; justify-content: center;
    min-height: 44px; padding: .3rem var(--sp-3);
    border: 1px solid var(--border-strong); border-radius: var(--radius);
  }
  .whoami b { font-size: var(--fs-meta); line-height: 1.5; }
  .whoami .mono { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }

  /* --- 指标 ---------------------------------------------------------- */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--sp-4); }
  .kpi {
    min-width: 0; padding: var(--sp-4);
    border: 1px solid var(--border); border-top-width: 2px; border-radius: var(--radius);
    background: var(--surface); display: flex; flex-direction: column; gap: .5rem;
  }
  .kpi.is-lead { border-top-color: var(--accent); }
  .kpi-lbl {
    display: flex; align-items: center; gap: .5rem;
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--faint);
  }
  .kpi-val { font-family: var(--font-display); font-size: var(--fs-h1); font-weight: 700; line-height: 1.12; }
  .kpi-desc { font-size: var(--fs-body); color: var(--muted); line-height: 1.7; flex: 1; }
  .kpi-foot {
    display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap;
    padding-top: var(--sp-3); border-top: 1px solid var(--border);
  }
  .kpi-foot .hint { display: inline-flex; align-items: center; min-height: 44px; }

  /* --- 锚点导航 ------------------------------------------------------ */
  .anchors {
    display: flex; flex-wrap: wrap; gap: .25rem;
    border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
    padding: .25rem; margin-bottom: var(--sp-5);
  }
  .anchors a {
    display: inline-flex; align-items: center; gap: .375rem; min-height: 44px;
    padding: .4rem .7rem; border-radius: var(--radius);
    font-size: var(--fs-meta); font-weight: 600; color: var(--muted);
    transition: color var(--t-2) var(--ease-state), background-color var(--t-2) var(--ease-state);
  }
  .anchors a:hover { background: var(--surface-subtle); color: var(--fg); }
  .anchors a[aria-current="true"] { background: var(--surface-subtle); color: var(--fg); }
  .anchors .n { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .anchors a[aria-current="true"] .n { color: var(--accent); }

  /* --- Agent 入口 + Harness ------------------------------------------ */
  .entry-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: var(--sp-5); align-items: start; }
  .panel-head-lead { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); }
  .panel-head-lead h2 { font-size: var(--fs-h3); }
  .panel-head-lead p { font-size: var(--fs-body); color: var(--muted); line-height: 1.7; margin-top: .25rem; }
  .harness .panel-body { display: flex; flex-direction: column; gap: var(--sp-4); }
  .harness .eyebrow { color: color-mix(in oklch, var(--bg) 66%, var(--fg)); }
  .harness h3 { font-size: var(--fs-h3); }
  .harness .lede { font-size: var(--fs-body); line-height: 1.75; color: color-mix(in oklch, var(--bg) 78%, var(--fg)); }
  .harness-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-3); }
  .hg { border: 1px solid color-mix(in oklch, var(--bg) 22%, transparent); border-radius: var(--radius); padding: var(--sp-3); }
  .hg b { display: block; font-size: var(--fs-meta); color: var(--bg); }
  .hg span {
    display: block; margin-top: .25rem;
    font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.6;
    color: color-mix(in oklch, var(--bg) 62%, var(--fg));
  }

  /* --- 工作流模板 ---------------------------------------------------- */
  .wf-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-4); }
  .wf { display: flex; flex-direction: column; gap: var(--sp-3); padding: var(--sp-4); }
  .wf-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); }
  .wf-icon {
    width: 36px; height: 36px; flex: none; display: grid; place-items: center;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken); color: var(--fg-secondary); font-size: 18px;
  }
  .wf h3 { font-size: var(--fs-h3); }
  .wf-key { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .wf-desc { font-size: var(--fs-body); line-height: 1.7; color: var(--muted); flex: 1; }
  .wf-block { display: flex; flex-direction: column; gap: .375rem; }
  .wf-block > span { font-family: var(--font-mono); font-size: var(--fs-mini); letter-spacing: .06em; text-transform: uppercase; color: var(--faint); }

  /* --- 任务中心 ------------------------------------------------------ */
  .task-list { display: flex; flex-direction: column; gap: var(--sp-2); }
  .task { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  .task[open] { border-color: var(--border-strong); }
  .task > summary { display: block; min-height: 44px; padding: var(--sp-3) var(--sp-4); cursor: pointer; list-style: none; }
  .task > summary::-webkit-details-marker { display: none; }
  .task-row { display: grid; grid-template-columns: minmax(0, 1fr) 10rem 12rem; gap: var(--sp-3); align-items: center; }
  .task-title { display: flex; align-items: center; gap: .625rem; font-size: var(--fs-body); font-weight: 600; }
  .task-id { font-family: var(--font-mono); font-weight: 400; color: var(--faint); }
  .task-sub { display: block; margin-top: .25rem; padding-left: 1.4rem; font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.6; color: var(--faint); }
  .task-elapsed { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--fg-secondary); text-align: right; }
  .task-elapsed em { display: block; font-style: normal; color: var(--faint); }
  .task-badges { display: flex; justify-content: flex-end; gap: .375rem; flex-wrap: wrap; }
  .task-body {
    display: flex; flex-direction: column; gap: var(--sp-4);
    padding: var(--sp-4); margin-top: var(--sp-2); border-top: 1px solid var(--border);
  }
  .json-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-3); }
  .json-box { min-width: 0; padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-sunken); }
  .json-box h3, .json-box h4 { font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--faint); }
  .json-box pre {
    margin-top: .5rem; max-height: 14rem; overflow: auto; white-space: pre-wrap;
    font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.7; color: var(--fg-secondary);
  }
  .trace-dot.fail { background: var(--accent); }

  /* --- 审批收件箱 ---------------------------------------------------- */
  .approval-wrap { display: flex; flex-direction: column; gap: var(--sp-4); }
  .approval {
    display: flex; flex-direction: column; gap: var(--sp-4);
    padding: var(--sp-4);
    border: 1px solid var(--warn); border-left: 3px solid var(--warn);
    border-radius: var(--radius); background: var(--warn-tint);
  }
  .approval-hd { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-wrap: wrap; }
  .approval-hd h3 { font-size: var(--fs-h3); }
  .approval-sub { margin-top: .25rem; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }
  .approval-meta { display: flex; align-items: center; gap: .375rem; flex-wrap: wrap; justify-content: flex-end; }
  .approval-note { display: flex; flex-direction: column; gap: .25rem; }
  .decide { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border); }
  .decide-card { display: flex; flex-direction: column; gap: var(--sp-3); padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  .decide-card h4 { font-size: var(--fs-meta); }
  .decide-card .lead { font-size: var(--fs-body); line-height: 1.7; color: var(--muted); }

  /* --- 结构化记忆 ---------------------------------------------------- */
  .mem-grid { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: var(--sp-5); align-items: start; }
  .mem-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-3); }
  .mem { display: flex; flex-direction: column; gap: var(--sp-2); padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--radius); }
  .mem.is-off { background: var(--surface-sunken); border-style: dashed; }
  .mem-hd { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); flex-wrap: wrap; }
  .mem-key { font-family: var(--font-mono); font-weight: 700; font-size: var(--fs-meta); }
  .mem-scope { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .mem pre {
    padding: var(--sp-3); border-radius: var(--radius); background: var(--surface-subtle);
    white-space: pre-wrap; overflow: auto; max-height: 10rem;
    font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.7; color: var(--fg-secondary);
  }
  .mem-side-hd { margin-bottom: var(--sp-3); }
  .mem-side-hd h2 { font-size: var(--fs-h3); }

  /* --- Agent 目录 ---------------------------------------------------- */
  .cat-coord { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-4); align-items: center; }
  .cat-coord h3 { font-size: var(--fs-h2); }
  .cat-coord .lede { font-size: var(--fs-body); line-height: 1.75; color: color-mix(in oklch, var(--bg) 78%, var(--fg)); margin-top: .375rem; }
  .cat-coord .eyebrow { color: color-mix(in oklch, var(--bg) 66%, var(--fg)); }
  .cat-coord .k { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: color-mix(in oklch, var(--bg) 66%, var(--fg)); }
  .cat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--sp-3); }
  .cat { display: flex; flex-direction: column; gap: .375rem; padding: var(--sp-4); border: 1px solid var(--border); border-radius: var(--radius); }
  .cat .key { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .cat b { font-size: var(--fs-meta); }
  .cat .ver { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--accent); }
  .cat p { font-size: var(--fs-body); line-height: 1.7; color: var(--muted); flex: 1; }
  .cat .tools { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .coord-badge { color: var(--bg); border-color: color-mix(in oklch, var(--bg) 30%, transparent); }

  /* --- 空态 ---------------------------------------------------------- */
  .empty .ic { color: var(--faint); }
  .empty h3, .empty h4 { margin-top: var(--sp-3); color: var(--fg); }
  .empty h3 { font-size: var(--fs-h3); margin-bottom: .375rem; }
  .empty p { color: var(--muted); }
  .empty-actions { display: flex; justify-content: center; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
  .empty-next {
    display: flex; align-items: center; justify-content: center; gap: .5rem; flex-wrap: wrap;
    margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); text-align: left;
  }

  /* --- 提示块 -------------------------------------------------------- */
  .alert {
    display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: var(--sp-3); align-items: start;
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--border); border-left-width: 3px; border-left-color: var(--border-strong);
    border-radius: var(--radius); background: var(--surface-subtle);
  }
  .alert b { display: block; font-size: var(--fs-body); }
  .alert p { font-size: var(--fs-body); line-height: 1.7; color: var(--fg-secondary); }
  .alert.is-ok { border-color: var(--success); background: var(--success-tint); }
  .alert.is-ok .ic, .alert.is-ok b { color: var(--success); }
  .alert.is-bad { border-color: var(--accent); background: var(--accent-tint); }
  .alert.is-bad .ic, .alert.is-bad b { color: var(--accent); }
  .alert.is-lock { border-color: var(--border-strong); background: var(--surface-sunken); }

  /* --- 边界态整页 ---------------------------------------------------- */
  .boundary { min-height: 100vh; display: grid; align-content: center; justify-items: center; padding: var(--sp-6) var(--pad-x); }
  .boundary .panel { max-width: 36rem; }

  /* --- 响应式 -------------------------------------------------------- */
  @media (max-width: 1199px) {
    .cat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 1023px) {
    .page-head { grid-template-columns: minmax(0, 1fr); }
    .ph-ctl { justify-content: flex-start; }
    .entry-grid, .mem-grid, .decide, .json-2, .harness-grid { grid-template-columns: minmax(0, 1fr); }
    .wf-grid { grid-template-columns: minmax(0, 1fr); }
    .mem-list { grid-template-columns: minmax(0, 1fr); }
    .task-row { grid-template-columns: minmax(0, 1fr); }
    .task-badges { justify-content: flex-start; }
    .task-elapsed { text-align: left; }
    .cat-coord { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767px) {
    .kpi-grid, .cat-grid { grid-template-columns: minmax(0, 1fr); }
    .anchors { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; }
    .anchors::-webkit-scrollbar { display: none; }
    .anchors a { flex: 0 0 auto; }
    .task > summary { padding: var(--sp-3); }
    .task-body { padding: var(--sp-3); }
  }
`;

type AgentCenterProps = {
  searchParams?: Promise<{ workspace?: string; result?: string; section?: string }>;
};

const statusLabels: Record<AgentTaskStatus, string> = {
  queued: "排队中",
  running: "执行中",
  awaiting_approval: "待审批",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

const statusBadgeTones: Record<AgentTaskStatus, string> = {
  queued: "badge",
  running: "badge badge-info",
  awaiting_approval: "badge badge-warn",
  completed: "badge badge-online",
  failed: "badge badge-accent",
  cancelled: "badge",
};

const statusDotTones: Record<AgentTaskStatus, string> = {
  queued: "skip",
  running: "run",
  awaiting_approval: "run",
  completed: "done",
  failed: "fail",
  cancelled: "skip",
};

const riskBadgeTones: Record<AgentRiskLevel, string> = {
  R0: "badge badge-info",
  R1: "badge badge-online",
  R2: "badge badge-warn",
  R3: "badge badge-accent",
};

/** 渲染 AgentCenter 组件，集中展示Agent中心所需的数据、状态和操作入口。 */
export default async function AgentCenter({ searchParams }: AgentCenterProps) {
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }
  const query = searchParams ? await searchParams : {};
  const activeWorkspaceId = await getActiveWorkspaceId();
  let workspaces: Awaited<ReturnType<typeof getWorkspaces>>;
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    [workspaces, currentUser] = await Promise.all([getWorkspaces(), getCurrentUser(token)]);
  } catch (error) {
    if (error instanceof AgentApiError && error.status === 401) redirect("/login?expired=1");
    return <AgentServiceError />;
  }
  if (!currentUser) redirect("/login?expired=1");
  const workspace = selectWorkspace(
    workspaces,
    query.workspace ?? activeWorkspaceId?.toString(),
  );
  if (!workspace) {
    return <EmptyWorkspace />;
  }
  const workspaceId = workspace.workspace.id;
  let resources;
  try {
    resources = await Promise.all([
      getAgentCatalog(workspaceId),
      getAgentTasks(workspaceId),
      getAgentApprovals(workspaceId),
      getAgentMemories(workspaceId),
      getWorkspaceProducts(workspaceId),
      getWorkspaceStores(workspaceId),
    ]);
  } catch (error) {
    if (error instanceof AgentApiError && error.status === 401) redirect("/login?expired=1");
    return <AgentServiceError />;
  }
  const [catalog, tasks, approvals, memories, products, stores] = resources;
  const canEdit = workspace.membership.role !== "viewer";
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const activeCount = tasks.filter((task) => ["queued", "running"].includes(task.status)).length;
  const failedCount = tasks.filter((task) => task.status === "failed").length;
  const cancelledCount = tasks.filter((task) => task.status === "cancelled").length;
  const queuedCount = tasks.filter((task) => task.status === "queued").length;
  const now = Date.now();

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: agentCss }} />

      <AgentTopBar />
      <main className="app-body">
        <div className="pane">
          <div className="wrap" id="top">
            <AgentTaskAutoRefresh active={activeCount > 0} />

            {/* 页头：标题 + Workspace 切换 + 当前用户 */}
            <header className="page-head">
              <div>
                <span className="eyebrow">
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-agent"></use></svg>
                  Ecommerce Operations Agent
                </span>
                <h1>统一运营 Agent 中心</h1>
                <p className="t-lead">
                  由一个协调 Agent 选择受控工作流，八个专业 Agent 在 Harness 约束下协作；业务结果仍回到可编辑工作台。
                </p>
              </div>
              <div className="ph-ctl">
                {workspaces.length > 1 ? (
                  <form className="ws-switch" action="/agent/workspaces/select" method="post">
                    <label className="sr-only" htmlFor="ws">切换 Workspace</label>
                    <select className="input" id="ws" name="workspace_id" defaultValue={workspaceId} aria-label="切换 Workspace">
                      {workspaces.map((item) => (
                        <option key={item.workspace.id} value={item.workspace.id}>
                          {item.workspace.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn">切换</button>
                  </form>
                ) : null}
                <Link className="btn" href="/">
                  <svg className="ic" aria-hidden="true"><use href="#i-arrow-r"></use></svg>业务工作台
                </Link>
                <span className="whoami">
                  <b>{currentUser.display_name}</b>
                  <span className="mono">{currentUser.email} · {workspace.workspace.name}</span>
                </span>
              </div>
            </header>

            {query.result ? <ResultBanner result={query.result} /> : null}

            {/* 指标：4 项，2px 顶边分层 */}
            <section className="sec" id="metrics" aria-label="指标">
              <div className="kpi-grid">
                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-repo"></use></svg>版本化工作流</span>
                  <span className="kpi-val">{catalog?.workflows.length ?? 0}</span>
                  <p className="kpi-desc">catalog.workflows.length。每个工作流都带版本号与默认风险等级，可评测、可回退。</p>
                  <div className="kpi-foot">
                    <span className="badge">CATALOG</span>
                    <span className="hint">{catalog?.workflows.map((wf) => `v${wf.version}`).join(" / ") || "—"}</span>
                  </div>
                </article>

                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-terminal"></use></svg>进行中任务</span>
                  <span className="kpi-val">{activeCount}</span>
                  <p className="kpi-desc">status 为 queued 或 running 的任务数。大于 0 时任务中心每 2 秒自动刷新。</p>
                  <div className="kpi-foot">
                    {activeCount > 0 ? (
                      <span className="badge badge-warn"><span className="status-led is-busy" aria-hidden="true"></span>LIVE</span>
                    ) : (
                      <span className="badge">空闲</span>
                    )}
                    <span className="hint">队列 {queuedCount} · 执行中 {activeCount - queuedCount}</span>
                  </div>
                </article>

                <article className="kpi">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-check"></use></svg>已完成任务</span>
                  <span className="kpi-val">{completedCount}</span>
                  <p className="kpi-desc">status 为 completed 的任务数。失败 / 取消不计入，各自在任务中心按状态标注。</p>
                  <div className="kpi-foot">
                    <span className="badge badge-online">已完成</span>
                    <span className="hint">失败 {failedCount} · 取消 {cancelledCount}</span>
                  </div>
                </article>

                <article className="kpi is-lead">
                  <span className="kpi-lbl"><svg className="ic ic-sm" aria-hidden="true"><use href="#i-warn"></use></svg>待处理审批</span>
                  <span className="kpi-val">{approvals.length}</span>
                  <p className="kpi-desc">approvals.length。R2 / R3 副作用必须由策略层与数据库审批共同放行，这是唯一需要人动手的指标。</p>
                  <div className="kpi-foot">
                    <span className="badge badge-accent">需要人工放行</span>
                    <a className="hint" href="#approval-inbox">去审批收件箱</a>
                  </div>
                </article>
              </div>
            </section>

            {/* 锚点导航：?section= 参数驱动落点，当前区块高亮 */}
            <SectionAnchorNav
              initialSection={query.section}
              items={[
                { id: "agent-entry", label: "Agent 入口" },
                { id: "task-center", label: "任务中心", count: tasks.length },
                { id: "approval-inbox", label: "审批收件箱", count: approvals.length },
                { id: "memory", label: "结构化记忆", count: memories.length },
                { id: "catalog", label: "Agent 目录", count: catalog?.agents.length ?? 0 },
                { id: "templates", label: "任务模板" },
              ]}
            />

            {/* Agent 入口 + Harness 边界 */}
            <section className="sec" id="agent-entry">
              <div className="entry-grid">
                <div className="panel">
                  <div className="panel-head">
                    <div className="panel-head-lead">
                      <div>
                        <span className="eyebrow">Coordinator Entry</span>
                        <h2>告诉协调 Agent 你的目标</h2>
                        <p>协调 Agent 只从已注册工作流中路由，不会自由拼装高风险动作。</p>
                      </div>
                      <svg className="ic ic-lg" aria-hidden="true" style={{ color: "var(--accent)" }}><use href="#i-agent"></use></svg>
                    </div>
                  </div>
                  <div className="panel-body">
                    <form className="form-stack" action="/agent/tasks/create" method="post">
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <div className="field">
                        <label htmlFor="intent">目标意图 · INTENT</label>
                        <textarea
                          className="input"
                          id="intent"
                          name="intent"
                          required
                          disabled={!canEdit}
                          placeholder="例如：检查这款商品近期的库存和经营风险，并给出下一步建议"
                        />
                        <span className="hint">必填。意图由协调 Agent 映射到工作流，而不是直接执行动作。</span>
                      </div>
                      <div className="form-row">
                        <ContextSelect idPrefix="entry-product" name="product_id" label="商品上下文 · PRODUCT_ID" options={products.map((item) => ({ value: String(item.id), label: item.name }))} disabled={!canEdit} />
                        <ContextSelect idPrefix="entry-store" name="store_id" label="店铺上下文 · STORE_ID" options={stores.map((item) => ({ value: String(item.id), label: item.name }))} disabled={!canEdit} />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={!canEdit}>
                          <svg className="ic" aria-hidden="true"><use href="#i-arrow-r"></use></svg>创建受控任务
                        </button>
                        <span className="hint">POST /agent/tasks/create → 302 回本页并带 ?result=</span>
                      </div>
                    </form>
                  </div>
                </div>

                <section className="panel panel-inverted harness">
                  <div className="panel-body">
                    <span className="eyebrow">
                      <svg className="ic ic-sm" aria-hidden="true"><use href="#i-server"></use></svg>Harness 边界
                    </span>
                    <h3>不是把多个 Prompt 串在一起</h3>
                    <p className="lede">边界写在基础设施里：身份、工具、幂等、状态恢复、人工协作与质量闭环各自有独立机制，不靠提示词约束。</p>
                    <div className="harness-grid">
                      {[
                        ["身份与租户", "Workspace 强隔离"],
                        ["工具策略", "Agent allowlist + 风险分级"],
                        ["可靠执行", "Celery + Outbox + 幂等"],
                        ["状态恢复", "PostgreSQL Checkpoint"],
                        ["人工协作", "R2/R3 数据库审批"],
                        ["质量闭环", "事件、评测和版本追踪"],
                      ].map(([title, detail]) => (
                        <div key={title} className="hg">
                          <b>{title}</b>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </section>

            {/* 任务模板：补渲染 workflow.agents（专家链）与 required_context_any（必需上下文） */}
            <section className="sec" id="templates">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">Workflow Templates</span>
                  <h2>任务模板</h2>
                </div>
                <span className="mono-note">每个模板对应一个可版本化、可评测、可回退的 LangGraph 工作流 · {catalog?.workflows.length ?? 0} 个已启用</span>
              </div>

              <div className="wf-grid">
                {(catalog?.workflows ?? []).map((workflow) => (
                  <TemplateCard key={workflow.key} workflow={workflow} workspaceId={workspaceId} products={products} stores={stores} canEdit={canEdit} />
                ))}
              </div>

              <p className="hint" style={{ marginTop: "var(--sp-3)" }}>
                模板卡上的「专家链」与「必需上下文」来自 <span className="k">WorkflowDefinition.agents</span> 与{" "}
                <span className="k">WorkflowDefinition.required_context_any</span> —— 用户按提示选择上下文，避免盲选。
              </p>
            </section>

            {/* 任务中心：耗时口径 finished_at − created_at；进行中任务 >0 时显示自动刷新指示 */}
            <section className="sec" id="task-center">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">Task Center</span>
                  <h2>任务中心</h2>
                </div>
                <div className="sec-hd-end">
                  {activeCount > 0 ? (
                    <span className="badge badge-warn"><span className="status-led is-busy" aria-hidden="true"></span>自动刷新 · 2s</span>
                  ) : null}
                  <span className="mono-note">Task = 业务目标 · Run = 实际执行与重试</span>
                </div>
              </div>

              <p className="hint" style={{ marginBottom: "var(--sp-3)" }}>
                耗时口径：<span className="k">finished_at − created_at</span>（AgentTask 无 started_at 字段，包含排队时间）；
                未结束任务显示「已运行至今」。
              </p>

              <div className="task-list">
                {tasks.length === 0 ? (
                  <EmptyState
                    icon="#i-agent"
                    title="还没有 Agent Task"
                    description="任务中心只在真正创建过任务后有内容。先在上方入口描述一次目标，或直接启动一个任务模板 —— 只读浏览不会产生任务。"
                    actions={
                      <>
                        <a className="btn btn-primary" href="#agent-entry">去描述目标</a>
                        <a className="btn" href="#templates">看任务模板</a>
                      </>
                    }
                    next="创建后这里显示：状态 · 风险等级 · 耗时 · 上下文与结果摘要"
                  />
                ) : (
                  tasks.map((task) => (
                    <TaskCard key={task.id} task={task} workspaceId={workspaceId} canEdit={canEdit} now={now} />
                  ))
                )}
              </div>

              <p className="hint" style={{ marginTop: "var(--sp-3)" }}>
                状态口径（AgentTaskStatus）：排队中 queued · 执行中 running · 待审批 awaiting_approval · 已完成 completed ·
                失败 failed · 已取消 cancelled。风险等级 R0–R3 取自 <span className="k">AgentRiskLevel</span>。
              </p>
            </section>

            {/* 审批收件箱：补渲染 note（决策理由，reject 必填）与 expires_at */}
            <section className="sec" id="approval-inbox">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">Approval Inbox</span>
                  <h2>审批收件箱</h2>
                </div>
                <span className="mono-note">R2/R3 副作用必须由策略层和数据库审批共同放行 · 一条审批 = 一次动作放行</span>
              </div>

              <div className="approval-wrap">
                {approvals.length === 0 ? (
                  <EmptyState
                    icon="#i-check"
                    title="当前没有待审批动作"
                    description="审批只在工作流触发 R2 / R3 副作用（对外发布、预算调整等）时产生。没有审批说明没有任何需要放行的动作，不代表任务失败。"
                    actions={<a className="btn" href="#task-center">查看进行中任务</a>}
                    next="有审批时这里显示：action_key · request_payload · 批准 / 驳回与理由"
                  />
                ) : (
                  approvals.map((approval) => (
                    <ApprovalCard key={approval.id} approval={approval} workspaceId={workspaceId} canEdit={canEdit} />
                  ))
                )}
              </div>

              <p className="hint" style={{ marginTop: "var(--sp-3)" }}>
                审批身份口径：<span className="k">AgentApproval</span> 提供 status（pending / approved / rejected / expired / cancelled）、
                expires_at、decision_payload、decided_by_user_id、note；批准与驳回的理由都写入 note，过期时间在卡片上可见。
              </p>
            </section>

            {/* 结构化记忆：非 active 项降级显示（虚线边框 + 灰底 + 状态徽标） */}
            <section className="sec" id="memory">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">Structured Memory</span>
                  <h2>结构化记忆</h2>
                </div>
                <span className="mono-note">只保存用户明确确认的结构化事实，不自动吸收全部聊天</span>
              </div>

              <div className="mem-grid">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">Create Memory</span>
                      <h3 style={{ marginTop: ".25rem", fontSize: "var(--fs-h3)" }}>确认一条长期记忆</h3>
                    </div>
                    <svg className="ic ic-lg" aria-hidden="true" style={{ color: "var(--info)" }}><use href="#i-db"></use></svg>
                  </div>
                  <div className="panel-body">
                    <form className="form-stack" action="/agent/memories/create" method="post">
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <div className="field">
                        <label htmlFor="scope-type">范围类型 · SCOPE_TYPE</label>
                        <select className="input" id="scope-type" name="scope_type" defaultValue="workspace">
                          <option value="workspace">工作区</option>
                          <option value="store">店铺</option>
                          <option value="product">商品</option>
                          <option value="user">用户偏好</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="scope-id">范围 ID · SCOPE_ID</label>
                        <input className="input" id="scope-id" name="scope_id" type="text" placeholder="范围 ID（工作区可留空）" />
                        <span className="hint">scope_type 为 workspace 时留空，落库为 null</span>
                      </div>
                      <div className="field">
                        <label htmlFor="mem-key">键 · MEMORY_KEY</label>
                        <input className="input" id="mem-key" name="memory_key" type="text" required placeholder="键，例如 brand_tone" />
                      </div>
                      <div className="field">
                        <label htmlFor="mem-val">值 · MEMORY_VALUE</label>
                        <textarea className="input" id="mem-val" name="memory_value" required placeholder="已确认的事实或偏好" />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={!canEdit}>
                          <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>保存记忆
                        </button>
                        <span className="hint">角色为 viewer 时按钮禁用</span>
                      </div>
                    </form>
                  </div>
                </div>

                <div>
                  <div className="sec-hd mem-side-hd">
                    <div>
                      <span className="eyebrow">Effective Memory</span>
                      <h2>有效记忆</h2>
                    </div>
                    <span className="mono-note">按 status 标注：active / revoked / expired</span>
                  </div>

                  <div className="mem-list">
                    {memories.length === 0 ? (
                      <EmptyState
                        icon="#i-db"
                        title="暂无已确认记忆"
                        description="记忆只保存用户明确确认的结构化事实，不自动吸收全部对话。第一条记忆请用左侧表单保存，键名建议可复用（如 brand_tone）。"
                        actions={<a className="btn" href="#memory">去确认一条记忆</a>}
                        next="保存后这里显示：scope · 状态 · 来源 · 结构化内容"
                      />
                    ) : (
                      memories.map((memory) => <MemoryCard key={memory.id} memory={memory} workspaceId={workspaceId} />)
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Agent 目录：补渲染 catalog.coordinator（协调 Agent 主卡） */}
            <section className="sec" id="catalog">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">Agent Catalog</span>
                  <h2>内部专业 Agent 目录</h2>
                </div>
                <span className="mono-note">用户只与顶层 Agent 交互；专业 Agent 的版本和工具白名单可审计</span>
              </div>

              {catalog ? (
                <>
                  <section className="panel panel-inverted" style={{ marginBottom: "var(--sp-4)" }}>
                    <div className="panel-body">
                      <div className="cat-coord">
                        <div>
                          <span className="eyebrow">Catalog Coordinator · 主智能体</span>
                          <h3>{humanizeAgent(catalog.coordinator.key)}</h3>
                          <p className="lede">{catalog.coordinator.description}</p>
                          <span className="k">
                            version {catalog.coordinator.version} · {catalog.coordinator.tools.length} 个允许工具 · {catalog.agents.length} 个已注册专业 Agent
                          </span>
                        </div>
                        <span className="badge coord-badge">TOP-LEVEL</span>
                      </div>
                    </div>
                  </section>

                  <div className="cat-grid">
                    {catalog.agents.map((agent) => (
                      <article key={agent.key} className="cat">
                        <span className="key">{agent.key}</span>
                        <span className="ver">v{agent.version} · {agent.tools.length} 个允许工具</span>
                        <b>{humanizeAgent(agent.key)}</b>
                        <p>{agent.description}</p>
                        <span className="tools">{agent.tools.join(" · ") || "—"}</span>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className="t-meta">Agent 目录暂不可用。</p>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

/** 渲染顶栏组件，集中展示品牌、主导航与主题切换入口。 */
function AgentTopBar() {
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
        <span className="sub">AGENT CENTER</span>
      </Link>
      <nav aria-label="主导航">
        <Link href="/">工作台</Link>
        <Link href="/imports">导入中心</Link>
        <Link href="/settings">模型配置</Link>
        <Link href="/agent" aria-current="page">Agent 中心</Link>
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

/** 渲染结果横幅组件，集中展示一次 POST 跳转后的操作结果。 */
function ResultBanner({ result }: { result: string }) {
  const failed = result === "failed";
  return (
    <div className={`alert ${failed ? "is-bad" : "is-ok"}`} style={{ marginBottom: "var(--sp-5)" }} role="status">
      <svg className="ic" aria-hidden="true"><use href={failed ? "#i-warn" : "#i-check"}></use></svg>
      <div>
        <b>{failed ? "操作失败，请检查输入和权限" : "操作已提交，任务状态会持续更新"}</b>
        <p>只在 <span className="mono">?result=</span> 存在时渲染；任务进度见下方任务中心。</p>
      </div>
    </div>
  );
}

/** 渲染工作流模板卡组件，展示专家链与必需上下文（WorkflowDefinition.agents / required_context_any）。 */
function TemplateCard({
  workflow,
  workspaceId,
  products,
  stores,
  canEdit,
}: {
  workflow: WorkflowDefinition;
  workspaceId: number;
  products: Array<{ id: number; name: string }>;
  stores: Array<{ id: number; name: string }>;
  canEdit: boolean;
}) {
  const icon = workflow.default_risk_level === "R0" ? "#i-search" : workflow.default_risk_level === "R1" ? "#i-db" : "#i-doc";
  return (
    <article className="panel wf">
      <div className="wf-top">
        <span className="wf-icon" aria-hidden="true"><svg className="ic" aria-hidden="true"><use href={icon}></use></svg></span>
        <span className={riskBadgeTones[workflow.default_risk_level]}>{workflow.default_risk_level}</span>
      </div>
      <div>
        <h3>{workflow.title}</h3>
        <p className="wf-key">{workflow.key} · v{workflow.version}</p>
      </div>
      <p className="wf-desc">{workflow.description}</p>
      <div className="wf-block">
        <span>专家链 · AGENTS</span>
        <div className="tag-row">
          {workflow.agents.map((agent) => (
            <span key={agent} className="tag">{humanizeAgent(agent)}</span>
          ))}
        </div>
      </div>
      <div className="wf-block">
        <span>必需上下文 · REQUIRED_CONTEXT_ANY</span>
        <div className="tag-row">
          {workflow.required_context_any.map((key) => (
            <span key={key} className="tag">{key}</span>
          ))}
        </div>
      </div>
      <form className="form-stack" action="/agent/tasks/create" method="post">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        <input type="hidden" name="workflow_key" value={workflow.key} />
        <div className="form-row">
          <ContextSelect idPrefix={`wf-${workflow.key}-product`} name="product_id" label="商品上下文" hideLabel options={products.map((item) => ({ value: String(item.id), label: item.name }))} disabled={!canEdit} />
          <ContextSelect idPrefix={`wf-${workflow.key}-store`} name="store_id" label="店铺上下文" hideLabel options={stores.map((item) => ({ value: String(item.id), label: item.name }))} disabled={!canEdit} />
        </div>
        <button type="submit" className="btn" disabled={!canEdit}>
          启动工作流 <svg className="ic" aria-hidden="true"><use href="#i-arrow-r"></use></svg>
        </button>
      </form>
    </article>
  );
}

/** 渲染任务卡组件，展示耗时（finished_at − created_at）、状态与上下文 / 结果摘要。 */
function TaskCard({
  task,
  workspaceId,
  canEdit,
  now,
}: {
  task: AgentTask;
  workspaceId: number;
  canEdit: boolean;
  now: number;
}) {
  const endAt = task.finished_at ?? task.cancelled_at;
  const endLabel = task.finished_at ? "完成于" : "取消于";
  const elapsedText = endAt
    ? formatDuration(new Date(endAt).getTime() - new Date(task.created_at).getTime())
    : formatDuration(now - new Date(task.created_at).getTime());
  const statusLabel = statusLabels[task.status];
  const elapsedNote = endAt
    ? `${endLabel} ${formatDate(endAt)}`
    : task.status === "queued"
      ? "排队中 · 至今"
      : "未结束 · 至今";
  const cancelable = ["queued", "running", "awaiting_approval"].includes(task.status);
  return (
    <details className="task">
      <summary>
        <div className="task-row">
          <div>
            <p className="task-title">
              <span className={`trace-dot ${statusDotTones[task.status]}`} aria-hidden="true"></span>
              <span className="task-id">#{task.id}</span>
              {task.title}
            </p>
            <span className="task-sub">{task.workflow_key} · v{task.workflow_version} · 创建于 {formatDate(task.created_at)}</span>
          </div>
          <div className="task-elapsed">
            {task.status === "running" ? `已运行 ${elapsedText}` : elapsedText}
            <em>{elapsedNote}</em>
          </div>
          <div className="task-badges">
            <span className={riskBadgeTones[task.risk_level]}>{task.risk_level}</span>
            <span className={statusBadgeTones[task.status]}>{statusLabel}</span>
          </div>
        </div>
      </summary>
      <div className="task-body">
        {task.intent ? (
          <div>
            <span className="eyebrow">目标原文 · INTENT</span>
            <p className="prose" style={{ marginTop: ".375rem" }}>{task.intent}</p>
          </div>
        ) : null}

        <div className="json-2">
          <JsonBox title="上下文 · CONTEXT_SCOPE" value={task.context_scope} />
          <JsonBox title="结果摘要 · RESULT_SUMMARY" value={task.result_summary} />
        </div>

        {task.error ? (
          <div className="alert is-bad" role="alert">
            <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
            <div>
              <b>任务失败 · task.error</b>
              <p className="mono">{task.error}</p>
            </div>
          </div>
        ) : null}

        {cancelable && canEdit ? (
          <div className="form-actions">
            <form action={`/agent/tasks/${task.id}/cancel`} method="post">
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <button type="submit" className="btn btn-ghost">
                <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>取消任务
              </button>
            </form>
            <span className="hint">取消仅在 queued / running / awaiting_approval 且角色可写时出现</span>
          </div>
        ) : null}
      </div>
    </details>
  );
}

/** 渲染审批卡组件，展示 expires_at、已有 note，并给出批准 / 驳回双表单（理由写入 AgentApproval.note）。 */
function ApprovalCard({
  approval,
  workspaceId,
  canEdit,
}: {
  approval: AgentApproval;
  workspaceId: number;
  canEdit: boolean;
}) {
  const draftOutput = approval.request_payload.draft_output;
  const hasDraft = Boolean(draftOutput) && typeof draftOutput === "object";
  return (
    <article className="approval">
      <div className="approval-hd">
        <div>
          <h3>任务 #{approval.task_id} · {approval.action_key}</h3>
          <p className="approval-sub">Run #{approval.run_id} · 创建于 {formatDate(approval.created_at)} · 审批 #{approval.id} · 请求人 UID {approval.requested_by_user_id}</p>
        </div>
        <div className="approval-meta">
          <span className={riskBadgeTones[approval.risk_level]}>{approval.risk_level}</span>
          <span className="badge badge-warn">待审批</span>
          {approval.expires_at ? (
            <span className="badge">将在 {formatDate(approval.expires_at)} 过期</span>
          ) : null}
        </div>
      </div>

      {approval.note ? (
        <div className="approval-note">
          <span className="eyebrow">已有决策理由 · NOTE</span>
          <p className="prose">{approval.note}</p>
        </div>
      ) : null}

      <JsonBox title="审批上下文 · REQUEST_PAYLOAD" value={approval.request_payload} level={4} />

      {canEdit ? (
        <div className="decide">
          <form className="decide-card" action={`/agent/approvals/${approval.id}/decision`} method="post">
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <input type="hidden" name="decision" value="approve" />
            <h4>批准 · decision=approve</h4>
            <p className="lead">
              {hasDraft
                ? "可直接提交草稿，也可先修改结构化输出再放行；修改内容与草稿一同留档。"
                : "该 action_key 的 payload 不含 draft_output，批准将直接放行原请求。"}
            </p>
            {hasDraft ? (
              <div className="field">
                <label htmlFor={`appr-out-${approval.id}`}>可编辑结构化输出 · EDITED_OUTPUT</label>
                <textarea
                  className="input is-code"
                  id={`appr-out-${approval.id}`}
                  name="edited_output"
                  spellCheck={false}
                  defaultValue={JSON.stringify(draftOutput, null, 2)}
                />
                <span className="hint">预填 request_payload.draft_output；approve 决策必须携带 edited_output</span>
              </div>
            ) : (
              <div className="alert is-lock">
                <svg className="ic" aria-hidden="true"><use href="#i-doc"></use></svg>
                <div>
                  <b>无可编辑草稿</b>
                  <p>编辑区收起，只保留批准与理由；不再渲染一个只有空对象的编辑框。</p>
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor={`appr-note-${approval.id}`}>决策理由 · NOTE（可选，落库）</label>
              <input className="input" id={`appr-note-${approval.id}`} name="note" type="text" placeholder="例如：卖点已核对，价格未改动，同意放行" />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
                {hasDraft ? "编辑后批准并恢复" : "批准并恢复"}
              </button>
              <span className="hint">POST /agent/approvals/{approval.id}/decision</span>
            </div>
          </form>

          <form className="decide-card" action={`/agent/approvals/${approval.id}/decision`} method="post">
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <input type="hidden" name="decision" value="reject" />
            <h4>驳回 · decision=reject</h4>
            <p className="lead">驳回不产生副作用，工作流不恢复；理由会写入 AgentApproval.note 供后续追溯。</p>
            <div className="field">
              <label htmlFor={`rej-note-${approval.id}`}>驳回理由 · NOTE（必填）</label>
              <textarea
                className="input"
                id={`rej-note-${approval.id}`}
                name="note"
                required
                placeholder="例如：角度与已投放素材重复，请换切入场景后重新生成"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-ghost">
                <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>驳回并终止本次动作
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="alert is-lock">
          <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
          <div>
            <b>只读角色 · 决策表单不渲染</b>
            <p>canEdit = membership.role !== &quot;viewer&quot;。只读角色可以查看任务、审批与记忆，但所有写操作整体禁用。</p>
          </div>
        </div>
      )}
    </article>
  );
}

/** 渲染记忆卡组件，按 status 标注（active / revoked / expired），非 active 项降级显示。 */
function MemoryCard({ memory, workspaceId }: { memory: AgentMemory; workspaceId: number }) {
  const statusBadge =
    memory.status === "active"
      ? "badge badge-online"
      : memory.status === "expired"
        ? "badge badge-warn"
        : "badge";
  const statusLabel =
    memory.status === "active" ? "生效中" : memory.status === "expired" ? "已过期" : "已撤销";
  const lifeLine =
    memory.status === "revoked" && memory.revoked_at
      ? `撤销于 ${formatDate(memory.revoked_at)}`
      : memory.status === "expired" && memory.expires_at
        ? `过期于 ${formatDate(memory.expires_at)}`
        : memory.expires_at
          ? `有效期至 ${formatDate(memory.expires_at)}`
          : `生效于 ${formatDate(memory.effective_at ?? memory.created_at)}`;
  return (
    <article className={`mem${memory.status === "active" ? "" : " is-off"}`}>
      <div className="mem-hd">
        <span className="mem-key">{memory.memory_key}</span>
        <span className={statusBadge}>{statusLabel}</span>
      </div>
      <span className="mem-scope">
        {memory.scope_type}:{memory.scope_id ?? workspaceId} · 来源 {memory.source_type} · schema v{memory.schema_version} · {lifeLine}
      </span>
      <pre>{JSON.stringify(memory.content, null, 2)}</pre>
    </article>
  );
}

/** 渲染上下文选择组件，集中展示商品 / 店铺下拉。 */
function ContextSelect({
  idPrefix,
  name,
  label,
  options,
  disabled,
  hideLabel = false,
}: {
  idPrefix: string;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={`${idPrefix}-${name}`} className={hideLabel ? "sr-only" : undefined}>{label}</label>
      <select className="input" id={`${idPrefix}-${name}`} name={name} disabled={disabled} aria-label={label}>
        <option value="">选择{label.split(" · ")[0]}上下文</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

/** 渲染 JSON 展示盒组件，空对象显示「暂无」。 */
function JsonBox({ title, value, level = 3 }: { title: string; value: Record<string, unknown>; level?: 3 | 4 }) {
  const Heading = level === 3 ? "h3" : "h4";
  return (
    <div className="json-box">
      <Heading>{title}</Heading>
      <pre>{Object.keys(value).length ? JSON.stringify(value, null, 2) : "暂无"}</pre>
    </div>
  );
}

/** 渲染空态组件，空态带下一步引导与「之后会显示什么」。 */
function EmptyState({
  icon,
  title,
  description,
  actions,
  next,
}: {
  icon: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  next: string;
}) {
  return (
    <div className="empty">
      <svg className="ic ic-lg" aria-hidden="true"><use href={icon}></use></svg>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="empty-actions">{actions}</div>
      <p className="empty-next">
        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
        {next}
      </p>
    </div>
  );
}

/** 渲染空Workspace边界页组件，集中展示无可用Workspace时的整页提示。 */
function EmptyWorkspace() {
  return (
    <main className="app-body boundary">
      <div className="panel">
        <div className="panel-body empty">
          <svg className="ic ic-lg" aria-hidden="true"><use href="#i-agent"></use></svg>
          <h1 style={{ fontSize: "var(--fs-h2)", marginTop: "var(--sp-3)" }}>暂无可用 Workspace</h1>
          <p>当前账号没有任何 WorkspaceMembership。请先运行数据库迁移并为当前用户创建成员关系，之后才能进入 Agent 中心。</p>
          <p className="hint">uv run alembic upgrade head · scripts/bootstrap_user.py</p>
        </div>
      </div>
    </main>
  );
}

/** 渲染Agent服务错误边界页组件，集中展示服务不可用与重试引导。 */
function AgentServiceError() {
  return (
    <main className="app-body boundary">
      <div className="panel">
        <div className="panel-body empty">
          <svg className="ic ic-lg" aria-hidden="true" style={{ color: "var(--accent)" }}><use href="#i-warn"></use></svg>
          <h1 style={{ fontSize: "var(--fs-h2)", marginTop: "var(--sp-3)" }}>Agent 服务暂不可用</h1>
          <p>请求未被伪装为空数据，请检查 API、权限或基础设施状态后重试。指标与列表保持上一次成功读取的状态。</p>
          <p className="hint">AgentApiError · status 401 时跳 /login?expired=1</p>
          <div className="empty-actions">
            <a className="btn" href="/agent">重试读取</a>
            <a className="btn" href="/">返回工作台</a>
          </div>
        </div>
      </div>
    </main>
  );
}

/** 处理选择Workspace交互，维护必要状态并把副作用交给受控路由或后端 API。 */
function selectWorkspace(workspaces: Awaited<ReturnType<typeof getWorkspaces>>, requested?: string) {
  const requestedId = Number(requested);
  return workspaces.find((item) => item.workspace.id === requestedId) ?? workspaces[0] ?? null;
}

/** 格式化日期，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/** 格式化耗时区间为 mm:ss（≥1h 用 h:mm:ss），供任务卡与耗时口径展示。 */
function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** 转换显示名Agent，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function humanizeAgent(key: string) {
  return key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
