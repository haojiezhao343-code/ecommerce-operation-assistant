import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerationJobAutoRefresh } from "@/components/generation-job-auto-refresh";
import { getProduct } from "@/lib/api";
import type { GenerationJob } from "@/types";

const generationJobCss = `
  /* ======================================================================
     页面级布局（generation-job）—— 只消费 design-system.css 的 token 与组件类
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
  .mono-note { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }
  .mono-faint { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .cap { font-size: var(--fs-body); color: var(--muted); line-height: 1.75; min-width: 0; }
  .cap-2 { font-size: var(--fs-body); color: var(--fg-secondary); line-height: 1.75; min-width: 0; }
  .app-top nav a { min-height: 44px; display: inline-flex; align-items: center; white-space: nowrap; flex: 0 0 auto; }
  [id] { scroll-margin-top: 130px; }

  .back {
    display: inline-flex; align-items: center; gap: .5rem; min-height: 44px;
    font-size: var(--fs-body); color: var(--muted);
    transition: color var(--t-2) var(--ease-state);
  }
  .back:hover { color: var(--fg); }
  .back .ic { transform: rotate(90deg); }

  .sec { display: flex; flex-direction: column; gap: var(--sp-4); }
  .sec-hd {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp-3) var(--sp-4); flex-wrap: wrap;
    margin-bottom: var(--sp-1); padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .sec-hd h2 { font-size: var(--fs-h2); }
  .sec-hd .right { display: flex; flex-direction: column; align-items: flex-end; gap: .375rem; min-width: 0; }
  .sec-hd .right .cap { max-width: 44em; text-align: right; }
  .sec-hd .right .mono-note { max-width: 62ch; text-align: right; }

  /* ---- 页头 ---- */
  .job-hd { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-4) var(--sp-5); align-items: start; }
  .job-title { display: flex; flex-direction: column; gap: .5rem; min-width: 0; }
  .job-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }

  /* ---- 状态徽标（五态：形制 + 色彩双通道，色觉障碍下依然可分） ---- */
  .st {
    display: inline-flex; align-items: center; gap: .45em;
    min-height: 32px; padding: .2em .625em;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .04em; white-space: nowrap;
  }
  .st-pending   { color: var(--muted);          background: var(--surface-subtle); border-color: var(--border); }
  .st-running   { color: var(--warn);           background: var(--warn-tint);      border-color: var(--border-warn); }
  .st-succeeded { color: var(--success);        background: var(--success-tint);   border-color: var(--border-success); }
  .st-failed    { color: var(--accent);         background: var(--accent-tint);    border-color: var(--border-accent); }
  .st-cancelled { color: var(--faint);          background: var(--surface-sunken); border-color: var(--border); border-style: dashed; }
  .st .sq { width: 8px; height: 8px; background: currentColor; flex: none; }
  .st .sq-hollow { width: 8px; height: 8px; border: 1px solid currentColor; flex: none; }

  /* ---- 任务摘要 ---- */
  .m-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--sp-3); }
  .m-card {
    min-width: 0; padding: var(--sp-4); border: 1px solid var(--border);
    border-radius: var(--radius); background: var(--surface);
    display: flex; flex-direction: column; gap: .375rem;
  }
  .m-card.is-lead { border-top-width: 2px; border-top-color: var(--accent); }
  .m-card.is-idle { background: var(--surface-sunken); }
  .m-lbl {
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--faint);
  }
  .m-val { font-size: var(--fs-h3); font-weight: 700; color: var(--fg); overflow-wrap: anywhere; }
  .m-val.mono { font-family: var(--font-mono); font-size: 1rem; font-weight: 600; }
  .m-val.is-idle { color: var(--muted); }
  .m-sub { font-size: var(--fs-mini); color: var(--muted); font-family: var(--font-mono); min-width: 0; }

  /* ---- 状态语义图例 ---- */
  .legend-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--sp-3); }
  .legend .panel-head { align-items: center; justify-content: space-between; gap: .5rem; }
  .legend .panel-head h3 { font-size: var(--fs-body); }
  .legend-pre { display: flex; flex-direction: column; gap: .5rem; }
  .legend dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .375rem .625rem; margin: 0; }
  .legend dt {
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 600;
    letter-spacing: .06em; color: var(--faint); white-space: nowrap;
  }
  .legend dd { font-size: var(--fs-body); color: var(--fg-secondary); line-height: 1.65; margin: 0; }
  .legend-foot { border-top: 1px solid var(--border); padding: var(--sp-3) var(--sp-4); font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }

  /* ---- 进度：轨道（唯一允许的 5 态进度载体） ---- */
  .track { position: relative; height: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-sunken); }
  .track-fill { height: 100%; background: var(--warn); }
  .track.is-done .track-fill { background: var(--success); }
  .track.is-failed .track-fill { background: var(--accent); }
  .track.is-cancelled { border-style: dashed; }
  .track.is-cancelled .track-fill { background: var(--faint); }
  .track.is-queued { border-style: dashed; }
  .track.is-queued .track-fill { display: none; }
  .track-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border); }
  .track-stop { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--fg); }
  .track-scale {
    display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap;
    margin-top: .375rem; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint);
  }
  .track-wrap { min-width: 0; }

  /* 迷你轨道（图例用） */
  .mini-track { height: 8px; }

  /* ---- 面板状态：3px 左侧色条是唯一的强优先级表达 ---- */
  .panel.is-running { border-left: 3px solid var(--warn); }
  .panel.is-failed { border-left: 3px solid var(--accent); }
  .panel.is-succeeded { border-left: 3px solid var(--success); }
  .panel.is-cancelled { border-left: 3px dashed var(--border-strong); }
  .panel.is-pending { border-left: 3px solid var(--muted); }

  /* ---- 事实表 ---- */
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: var(--sp-3) var(--sp-4); margin: 0; }
  .fact { min-width: 0; border-left: 1px solid var(--border); padding-left: var(--sp-3); }
  .fact dt {
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase; color: var(--faint);
  }
  .fact dd { font-size: var(--fs-body); color: var(--fg-secondary); line-height: 1.7; margin: .125rem 0 0; overflow-wrap: anywhere; }
  .fact dd.mono { font-family: var(--font-mono); }

  /* ---- 失败 / 取消 原因块 ---- */
  .reason { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-sunken); padding: var(--sp-4); min-width: 0; }
  .reason.is-failed { border-left: 3px solid var(--accent); background: var(--accent-tint); }
  .reason.is-cancelled { border-left: 3px dashed var(--border-strong); }
  .reason h4 { font-size: var(--fs-h3); }
  .reason p { font-size: var(--fs-body); line-height: 1.8; color: var(--fg-secondary); }
  .reason .raw {
    margin-top: var(--sp-3); padding: var(--sp-3);
    border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--fg-secondary);
    overflow-wrap: anywhere;
  }

  /* ---- 媒体产物：1px 发丝线框 + 占位符（不使用彩色渐变块） ---- */
  .media-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: var(--sp-4); }
  .media { display: flex; flex-direction: column; gap: .5rem; min-width: 0; margin: 0; }
  .media-frame {
    position: relative; aspect-ratio: 1 / 1;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken);
    display: grid; place-items: center; gap: .25rem;
    color: var(--faint); font-family: var(--font-mono); font-size: var(--fs-mini);
    transition: background-color var(--t-2) var(--ease-state), border-color var(--t-2) var(--ease-state);
  }
  .media-frame:hover { background: var(--surface-subtle); border-color: var(--border-strong); }
  .media-frame.is-ok { border-color: var(--success); }
  .media-frame.is-run { border-color: var(--warn); }
  .media-frame.is-fail { border-color: var(--border-accent); }
  .media-frame.is-queue { border-style: dashed; }
  .media-frame .tagline { position: absolute; left: .5rem; bottom: .5rem; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .media-frame .st { position: absolute; left: .5rem; top: .5rem; background: var(--surface); }
  .media-frame .ph { display: flex; flex-direction: column; align-items: center; gap: .375rem; }
  .media-frame img, .media-frame video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .media-meta { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }

  /* 视频播放器 */
  .player {
    position: relative; aspect-ratio: 16 / 9; width: 100%;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken);
    display: grid; place-items: center;
  }
  .player video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius); }
  .player-top { position: absolute; right: var(--sp-3); top: var(--sp-3); display: flex; gap: .375rem; flex-wrap: wrap; z-index: 1; }
  .player-hud {
    position: absolute; left: var(--sp-3); bottom: var(--sp-3); right: var(--sp-3);
    display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap;
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
    pointer-events: none;
  }

  /* ---- 代码块 ---- */
  .code {
    margin: 0; padding: var(--sp-3);
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface-sunken); color: var(--fg-secondary);
    font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.75;
    max-height: 420px; overflow: auto; white-space: pre; tab-size: 2;
  }

  /* ---- 表格 ---- */
  .tbl td { vertical-align: middle; }
  .cell-actions { display: flex; gap: .375rem; flex-wrap: wrap; }
  .ta-r { text-align: right; }
  .txt-ok { color: var(--success); }
  .txt-warn { color: var(--warn); }
  .txt-accent { color: var(--accent); }
  .tbl-note {
    display: flex; align-items: flex-start; gap: .5rem; flex-wrap: wrap;
    padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--border);
    background: var(--surface-subtle);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); line-height: 1.7;
  }
  .tbl-scroll { min-width: 860px; }

  /* ---- 阶段轨迹 ---- */
  .trace { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); margin-bottom: 0; }
  .trace-hd {
    display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap;
    padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: var(--faint);
  }
  .stage-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .trace-step {
    display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .75rem; align-items: center;
    padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--border);
    font-size: var(--fs-body); color: var(--fg-secondary);
  }
  .trace-step:last-child { border-bottom: 0; }
  .trace-time { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }
  /* .trace-dot 本体与 done / run / skip 均由 design-system.css 提供，这里只补失败态 */
  .trace-dot.fail { background: var(--accent); }

  /* ---- 空态 ---- */
  .empty { text-align: left; }
  .empty h4, .empty h3 { margin-top: var(--sp-3); }
  .empty h3 { font-size: var(--fs-h3); margin-bottom: .375rem; }
  .empty p { margin: 0; max-width: none; font-size: var(--fs-body); }
  .empty-actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
  .empty-next {
    margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted);
    display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  }

  /* ---- 响应式 ---- */
  @media (max-width: 1199px) {
    .legend-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 1023px) {
    .m-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .job-hd { grid-template-columns: minmax(0, 1fr); }
    .sec-hd .right { align-items: flex-start; }
    .sec-hd .right .cap, .sec-hd .right .mono-note { text-align: left; }
    .legend-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 767px) {
    .m-grid, .legend-grid { grid-template-columns: minmax(0, 1fr); }
    .media-grid { grid-template-columns: minmax(0, 1fr); }
    /* 窄屏：头部一行放不下时允许换行，徽标不再 nowrap，避免被裁掉 */
    .panel-head, .trace-hd, .row-between { flex-wrap: wrap; }
    .panel-head .badge, .sec-hd .badge, .legend .badge { white-space: normal; }
  }
`;

type GenerationJobDetailPageProps = {
  params: Promise<{ id: string; jobId: string }>;
};

/** 调度器对 running 任务的兜底超时预算（分钟）——与后端 DEFAULT_RUNNING_TIMEOUT_MINUTES 口径一致，用于耗时轨道标尺。 */
const RUNNING_TIMEOUT_MINUTES = 30;

/** 渲染商品/生成任务jobs页面；在服务端加载业务数据，并把交互交给对应表单或客户端组件。 */
export default async function GenerationJobDetailPage({ params }: GenerationJobDetailPageProps) {
  const { id, jobId } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const job = product.generation_jobs.find((item) => item.id === Number(jobId));
  if (!job) {
    notFound();
  }

  const creativePlan = product.creative_plans.find((plan) => plan.id === job.creative_plan_id);
  const resultUrl = jobResultUrl(job);
  const kindLabel = job.kind === "video_asset" ? "视频生成" : "图片生成";
  const autoRefresh = job.status === "pending" || job.status === "running";

  // 已耗时：running = 当前时间 − started_at（worker 持锁起点，不含排队）；完成态 = finished_at − started_at
  const elapsedSeconds = computeElapsedSeconds(job);
  const timeoutBudgetSeconds = RUNNING_TIMEOUT_MINUTES * 60;
  const fillPercent = elapsedSeconds === null ? 0 : Math.min(100, Math.round((elapsedSeconds / timeoutBudgetSeconds) * 1000) / 10);

  // 历史参考：同商品同类型 succeeded 任务的耗时 P50 / P90（真实数据推导，不给承诺性措辞）
  const historyStats = buildDurationStats(product.generation_jobs.filter((item) => item.id !== job.id), job.kind);

  // 供应商 / 模型 / 尺寸：一律来自任务结果写入值，不靠页面推断
  const provider = readString(job.result.provider);
  const model = readString(job.result.model);
  const size = readString(job.result.size);
  const taskId = readString(job.result.task_id);
  const videoDuration = readString(job.result.duration);

  const stageTrace = buildStageTrace(job, elapsedSeconds);
  const eventsDesc = [...job.events].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
  const isFailed = job.status === "failed";
  const isCancelled = job.status === "cancelled";
  const remainingAttempts = Math.max(0, job.max_attempts - job.attempts);

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: generationJobCss }} />

      <GenerationJobTopBar />
      <GenerationJobAutoRefresh active={autoRefresh} />
      <main className="app-body">
        <div className="pane">
          <div className="wrap stack" id="top">

            {/* ==================== 页头 ==================== */}
            <div className="stack-4">
              <Link className="back" href={`/products/${product.id}?tab=jobs`}>
                <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                返回任务中心
              </Link>

              <section className="panel" aria-labelledby="h-job">
                <div className="panel-body job-hd">
                  <div className="job-title">
                    <div className="row">
                      <span className="badge badge-accent">{product.name}</span>
                      <span className="badge mono">任务 #{job.id}</span>
                      <span className="badge mono">PRODUCT {product.id}</span>
                    </div>
                    <h1 className="t-h1" id="h-job">生成任务 #{job.id}</h1>
                    <p className="cap">
                      {kindLabel} · 关联方案「{creativePlan?.title ?? "未知方案"}」
                      {provider || model ? (
                        <> · 供应商 {provider ? <b>{provider}</b> : "未记录"}{model ? <> / <b>{model}</b></> : null}</>
                      ) : null}
                      {size ? <> · {size.replace("*", " × ")}</> : null}
                      {elapsedSeconds !== null ? <> · 已执行 {formatDuration(elapsedSeconds)}</> : null}
                    </p>
                    <div className="row">
                      <StatusBadge status={job.status} />
                      <span className="badge">第 {job.attempts} / {job.max_attempts} 次尝试</span>
                      {autoRefresh ? <span className="badge">自动刷新 · 5 秒</span> : null}
                    </div>
                  </div>
                  <div className="job-actions">
                    {resultUrl ? (
                      <a className="btn btn-primary" href={absoluteMediaUrl(resultUrl)} target="_blank" rel="noreferrer">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-ext"></use></svg>
                        打开结果
                      </a>
                    ) : null}
                    <Link className="btn" href={`/products/${product.id}?tab=jobs`}>
                      <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-arrow-r"></use></svg>
                      全部任务
                    </Link>
                  </div>
                </div>
              </section>
            </div>

            {/* ==================== 任务摘要 ==================== */}
            <section aria-labelledby="h-sum" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">TASK SUMMARY · 供应商与耗时是一等公民</span>
                  <h2 className="t-h2" id="h-sum">任务摘要</h2>
                </div>
                <div className="right">
                  <p className="cap">同一张卡里给出「谁在生成、用哪个模型、已经跑了多久、还能重试几次」，避免为了确认耗时去翻时间线。</p>
                </div>
              </div>

              <div className="m-grid">
                <article className="m-card">
                  <span className="m-lbl">任务类型</span>
                  <span className="m-val">{kindLabel}</span>
                  <span className="m-sub">kind = {job.kind}</span>
                </article>
                <article className="m-card">
                  <span className="m-lbl">关联方案</span>
                  <span className="m-val">{creativePlan?.title ?? "未知方案"}</span>
                  <span className="m-sub">creative_plan_id = {job.creative_plan_id}{creativePlan ? ` · 状态 ${creativePlan.status}` : ""}</span>
                </article>
                <article className={`m-card${provider || model ? " is-lead" : ""}`}>
                  <span className="m-lbl">供应商 / 模型</span>
                  <span className="m-val">{provider ?? "未记录"}</span>
                  <span className="m-sub">{[model, size].filter(Boolean).join(" · ") || "结果未写入 provider / model"}</span>
                </article>
                <article className="m-card">
                  <span className="m-lbl">已耗时</span>
                  <span className="m-val">{elapsedSeconds === null ? "未开始" : formatDuration(elapsedSeconds)}</span>
                  <span className="m-sub">{elapsedSummary(job)}</span>
                </article>
                <article className="m-card">
                  <span className="m-lbl">开始时间</span>
                  <span className="m-val mono">{job.started_at ?? "未开始"}</span>
                  <span className="m-sub">job.started_at</span>
                </article>
                <article className={`m-card${job.finished_at ? "" : " is-idle"}`}>
                  <span className="m-lbl">完成时间</span>
                  <span className={`m-val${job.finished_at ? "" : " is-idle"}`}>{job.finished_at ?? "未完成"}</span>
                  <span className="m-sub">job.finished_at = {job.finished_at ? "时间戳" : "null"}</span>
                </article>
                <article className="m-card">
                  <span className="m-lbl">尝试次数</span>
                  <span className="m-val">{job.attempts} / {job.max_attempts}</span>
                  <span className="m-sub">attempts / max_attempts{isFailed ? ` · 剩余 ${remainingAttempts} 次` : ""}</span>
                </article>
                <article className="m-card">
                  <span className="m-lbl">运行锁</span>
                  <span className="m-val mono">{job.locked_by ?? "未持锁"}</span>
                  <span className="m-sub">{job.locked_at ? `locked_at ${formatShortTime(job.locked_at)}` : "locked_at = null"} · 超时阈值 {RUNNING_TIMEOUT_MINUTES} 分</span>
                </article>
              </div>
            </section>

            {/* ==================== 状态语义图例 ==================== */}
            <section aria-labelledby="h-legend" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">STATE SEMANTICS · 五种状态，五种视觉</span>
                  <h2 className="t-h2" id="h-legend">状态语义</h2>
                </div>
                <div className="right">
                  <span className="mono-note">status 枚举：pending / running / succeeded / failed / cancelled</span>
                  <p className="cap">每一种状态都同时改变四件事：左侧色条、徽标形制、进度轨道、主操作。不做「换个文字颜色」的伪区分。</p>
                </div>
              </div>

              <div className="legend-grid">
                <article className="panel legend">
                  <div className="panel-head">
                    <h3>排队中</h3>
                    <StatusBadge status="pending" />
                  </div>
                  <div className="panel-body stack-3">
                    <div className="legend-pre">
                      <div className="track mini-track is-queued"><span className="track-fill"></span></div>
                      <span className="mono-faint">虚线轨道 · 无填充 = 尚未开始</span>
                    </div>
                    <dl>
                      <dt>进度表达</dt><dd>next_run_at 预计开始（不给百分比，因为还没消耗算力）</dd>
                      <dt>主操作</dt><dd>取消任务</dd>
                      <dt>出现时机</dt><dd>创建后、worker 领取前，或失败自动重排队</dd>
                    </dl>
                  </div>
                  <div className="legend-foot">左条：--muted 实线</div>
                </article>

                <article className="panel legend">
                  <div className="panel-head">
                    <h3>生成中</h3>
                    <StatusBadge status="running" />
                  </div>
                  <div className="panel-body stack-3">
                    <div className="legend-pre">
                      <div className="track mini-track"><span className="track-fill" style={{ width: "14%" }}></span><span className="track-stop" style={{ left: "14%" }}></span></div>
                      <span className="mono-faint">实心琥珀轨道 + 当前进度游标</span>
                    </div>
                    <dl>
                      <dt>进度表达</dt><dd>阶段轨迹 + 已耗时 / 超时预算 + 轮询节奏</dd>
                      <dt>主操作</dt><dd>取消任务</dd>
                      <dt>出现时机</dt><dd>worker 持锁执行中（locked_by 非空）</dd>
                    </dl>
                  </div>
                  <div className="legend-foot">左条：--warn 实线</div>
                </article>

                <article className="panel legend">
                  <div className="panel-head">
                    <h3>已完成</h3>
                    <StatusBadge status="succeeded" />
                  </div>
                  <div className="panel-body stack-3">
                    <div className="legend-pre">
                      <div className="track mini-track is-done"><span className="track-fill" style={{ width: "100%" }}></span></div>
                      <span className="mono-faint">满轨 · 翠绿 = 结果已落盘</span>
                    </div>
                    <dl>
                      <dt>进度表达</dt><dd>不显示进度，改为显示耗时终值与产物</dd>
                      <dt>主操作</dt><dd>打开结果 / 查看资产</dd>
                      <dt>出现时机</dt><dd>结果 URL 与 GeneratedAsset 均已写入</dd>
                    </dl>
                  </div>
                  <div className="legend-foot">左条：--success 实线</div>
                </article>

                <article className="panel legend">
                  <div className="panel-head">
                    <h3>失败</h3>
                    <StatusBadge status="failed" />
                  </div>
                  <div className="panel-body stack-3">
                    <div className="legend-pre">
                      <div className="track mini-track is-failed"><span className="track-fill" style={{ width: "14%" }}></span><span className="track-stop" style={{ left: "14%" }}></span></div>
                      <span className="mono-faint">轨道冻结在中断点 · 转为朱红</span>
                    </div>
                    <dl>
                      <dt>进度表达</dt><dd>冻结游标 + 具体原因 + 可重试次数</dd>
                      <dt>主操作</dt><dd>重试任务（唯一高亮按钮）</dd>
                      <dt>出现时机</dt><dd>异常或供应商失败，且 attempts 已用尽前</dd>
                    </dl>
                  </div>
                  <div className="legend-foot">左条：--accent 实线</div>
                </article>

                <article className="panel legend">
                  <div className="panel-head">
                    <h3>已取消</h3>
                    <StatusBadge status="cancelled" />
                  </div>
                  <div className="panel-body stack-3">
                    <div className="legend-pre">
                      <div className="track mini-track is-cancelled"><span className="track-fill" style={{ width: "22%" }}></span></div>
                      <span className="mono-faint">整体虚线降级 · 无人为终止游标</span>
                    </div>
                    <dl>
                      <dt>进度表达</dt><dd>中断点 + 取消原因（人工停止，不是故障）</dd>
                      <dt>主操作</dt><dd>回方案页调整（次要入口，不抢注意力）</dd>
                      <dt>出现时机</dt><dd>用户取消 pending / running 任务</dd>
                    </dl>
                  </div>
                  <div className="legend-foot">左条：虚线（border-strong）</div>
                </article>
              </div>
            </section>

            {/* ==================== 主实例：执行进度 ==================== */}
            <section aria-labelledby="h-running" id="running" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">PRIMARY INSTANCE · {job.status.toUpperCase()}</span>
                  <h2 className="t-h2" id="h-running">{statusHeadline(job.status)}</h2>
                </div>
                <div className="right">
                  <p className="cap">供应商接口不返回百分比，所以这里不编造进度条——用「阶段 + 已耗时 / 预算 + 历史参考值」三件事表达「还要等多久」。</p>
                </div>
              </div>

              <div className={`panel is-${job.status}`}>
                <div className="panel-head">
                  <h3>执行进度</h3>
                  <div className="row">
                    <StatusBadge status={job.status} />
                    {autoRefresh ? <span className="badge mono">AUTO REFRESH 5s</span> : null}
                  </div>
                </div>
                <div className="panel-body stack-5">

                  {/* 阶段轨迹（由 job.events 事件链推导，不编造事件） */}
                  <div className="trace">
                    <div className="trace-hd">
                      <span>阶段轨迹 · 5 STAGES</span>
                      <span className="mono-faint">数据来源：job.events 事件链</span>
                    </div>
                    <ol className="stage-list">
                      {stageTrace.map((stage) => (
                        <li key={stage.label} className="trace-step">
                          <span className={`trace-dot ${stage.dot}`} aria-hidden="true"></span>
                          <span>{stage.label}</span>
                          <span className="trace-time mono">{stage.time}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* 耗时轨道：只表达「已耗时间占超时预算的比例」，标尺写明口径 */}
                  <div className="track-wrap stack-3">
                    <div className={`track ${trackStateClass(job.status)}`}>
                      {job.status !== "pending" && fillPercent > 0 ? (
                        <span className="track-fill" style={{ width: `${fillPercent}%` }}></span>
                      ) : null}
                      <span className="track-tick" style={{ left: "25%" }}></span>
                      <span className="track-tick" style={{ left: "50%" }}></span>
                      <span className="track-tick" style={{ left: "75%" }}></span>
                      {job.status === "running" && fillPercent > 0 ? (
                        <span className="track-stop" style={{ left: `${fillPercent}%` }}></span>
                      ) : null}
                    </div>
                    <div className="track-scale">
                      <span>0 分</span>
                      <span>{formatDuration(timeoutBudgetSeconds / 4)}</span>
                      <span>{formatDuration(timeoutBudgetSeconds / 2)}</span>
                      <span>{formatDuration((timeoutBudgetSeconds * 3) / 4)}</span>
                      <span>超时阈值 {RUNNING_TIMEOUT_MINUTES} 分</span>
                    </div>
                  </div>

                  <dl className="facts">
                    <div className="fact">
                      <dt>已耗时</dt>
                      <dd className="mono">{elapsedSeconds === null ? "未开始" : `${formatDuration(elapsedSeconds)} / ${formatDuration(timeoutBudgetSeconds)}`}</dd>
                    </div>
                    <div className="fact">
                      <dt>耗时口径</dt>
                      <dd>已耗时 = 当前时间 − job.started_at（worker 持锁起点），不是创建时间，也不含排队时间。</dd>
                    </div>
                    <div className="fact">
                      <dt>轮询节奏</dt>
                      <dd>每 5 秒一次自动刷新；存在 pending / running 任务时启用，任务结束即停止。</dd>
                    </div>
                    <div className="fact">
                      <dt>超时口径</dt>
                      <dd>调度器 {RUNNING_TIMEOUT_MINUTES} 分未完成即判超时，释放锁并按重试策略重新排队——这是兜底时间，不是预计完成时间。</dd>
                    </div>
                    <div className="fact">
                      <dt>预估参考</dt>
                      <dd className="mono">
                        {historyStats
                          ? `同类任务 P50 ${formatDuration(historyStats.p50)} · P90 ${formatDuration(historyStats.p90)} · 样本 ${historyStats.count} 条`
                          : "暂无同类型历史成功样本"}
                      </dd>
                    </div>
                    <div className="fact">
                      <dt>预估性质</dt>
                      <dd>参考值，非承诺。供应商不提供 SLA，因此页面不使用「预计剩余 X 分钟」这类确定性措辞。</dd>
                    </div>
                  </dl>

                  {/* 诚实性说明 */}
                  <div className="mono-note">
                    为什么不画百分比：即梦与 DashScope 都只在轮询响应里返回 done / failed / unknown 这类离散状态，没有 0–100 的进度字段。
                    可用百分比将是无依据的装饰——本页改用「阶段 + 耗时预算 + 历史分位数」三件可验证的事。进度轨道只表达「已耗时间占超时预算的比例」，并在标尺上写明。
                  </div>

                  {/* 任务控制（pending / running 专属） */}
                  {autoRefresh ? (
                    <div className="reason">
                      <h4>任务控制</h4>
                      <p style={{ marginTop: ".375rem" }}>
                        取消后任务会停止排队或释放运行锁，不会继续生成素材。已产生的中间请求由供应商侧自然结束，不会写入资产库。
                      </p>
                      <div className="row" style={{ marginTop: "var(--sp-3)" }}>
                        <form action={`/products/${product.id}/generation-jobs/${job.id}/cancel`} method="post">
                          <input type="hidden" name="tab" value="jobs" />
                          <button type="submit" className="btn">取消任务</button>
                        </form>
                        <span className="mono-faint">取消入口只在 pending / running 状态出现</span>
                      </div>
                    </div>
                  ) : null}

                  {/* 失败：原因 + 供应商原文 + 剩余重试 + 处置建议 + 重试表单 */}
                  {isFailed ? (
                    <div className="reason is-failed">
                      <div className="row row-between">
                        <h4>失败原因</h4>
                        <span className="badge badge-accent">attempts {job.attempts} / {job.max_attempts}</span>
                      </div>
                      <p style={{ marginTop: ".5rem" }}>
                        任务在执行中失败。自动重试只覆盖超时与网络异常；若下方原文显示供应商终态失败（如内容审核拦截），需要人工调整后重试。
                      </p>
                      <dl className="facts" style={{ marginTop: "var(--sp-3)" }}>
                        <div className="fact"><dt>失败阶段</dt><dd>{failedStageLabel(stageTrace)}</dd></div>
                        <div className="fact"><dt>供应商 / 模型</dt><dd>{[provider, model].filter(Boolean).join(" · ") || "结果未写入"}</dd></div>
                        <div className="fact"><dt>剩余重试</dt><dd>{remainingAttempts} 次（attempts {job.attempts} / max_attempts {job.max_attempts}）</dd></div>
                        <div className="fact"><dt>下次执行</dt><dd className="mono">{job.next_run_at ?? "未安排（需人工重试）"}</dd></div>
                      </dl>
                      {job.error ? <div className="raw">供应商原始错误：{job.error}</div> : null}
                      <p className="mono-faint" style={{ marginTop: ".5rem" }}>
                        建议处置：① 根据上方原文修改方案提示词后重试；② 或在模型配置里切换图像 / 视频供应商再重试——重试保留同一任务 ID，事件链不断裂。
                      </p>
                      <div className="row" style={{ marginTop: "var(--sp-3)" }}>
                        <form action={`/products/${product.id}/generation-jobs/${job.id}/retry`} method="post">
                          <input type="hidden" name="tab" value="jobs" />
                          <button type="submit" className="btn btn-primary">
                            <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-arrow-r"></use></svg>
                            重试任务
                          </button>
                        </form>
                        <Link className="btn" href={`/products/${product.id}?tab=creative`}>编辑方案提示词</Link>
                        <Link className="btn btn-ghost" href="/settings">切换供应商</Link>
                      </div>
                    </div>
                  ) : null}

                  {/* 已取消：中性灰原因块，不诱导重跑 */}
                  {isCancelled ? (
                    <div className="reason is-cancelled">
                      <h4>取消原因</h4>
                      <p style={{ marginTop: ".5rem" }}>{job.error ?? "任务已取消。"}</p>
                      <dl className="facts" style={{ marginTop: "var(--sp-3)" }}>
                        <div className="fact"><dt>锁状态</dt><dd>已释放 · locked_at / locked_by 置空</dd></div>
                        <div className="fact"><dt>素材影响</dt><dd>无残留写库资产</dd></div>
                        <div className="fact"><dt>尝试计数</dt><dd>attempts 保持 {job.attempts} / {job.max_attempts}，未产生失败计数</dd></div>
                      </dl>
                      <p className="cap" style={{ marginTop: "var(--sp-3)" }}>
                        已取消是<strong>人为决定</strong>而不是故障，所以整块降级为中性灰 + 虚线；重试入口只保留在失败态，避免误操作重跑一个已经被否掉的方案。
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* ==================== 生成结果（多模态产物） ==================== */}
            {resultUrl ? (
              <section aria-labelledby="h-media" id="media" className="sec">
                <div className="sec-hd">
                  <div className="stack-2">
                    <span className="eyebrow">OUTPUTS · 多模态产物</span>
                    <h2 className="t-h2" id="h-media">生成结果</h2>
                  </div>
                  <div className="right">
                    <p className="cap">结果区块显示可断行的完整 URL；kind = video_asset 渲染播放器，否则渲染图片。</p>
                  </div>
                </div>

                <div className="panel is-succeeded">
                  <div className="panel-head">
                    <h3>{job.kind === "video_asset" ? "视频产物" : "图片产物"}</h3>
                    <div className="row">
                      {size ? <span className="badge mono">{size.replace("*", " × ")}{videoDuration ? ` · ${videoDuration}s` : ""}</span> : null}
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                  <div className="panel-body stack-4">
                    {job.kind === "video_asset" ? (
                      <div className="player">
                        <span className="player-top">
                          <StatusBadge status={job.status} />
                        </span>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video src={absoluteMediaUrl(resultUrl)} controls preload="metadata" />
                        <span className="player-hud">
                          <span>VIDEO {size ? size.replace("*", "×") : ""}{videoDuration ? ` · ${videoDuration}s` : ""}{model ? ` · ${model}` : ""}</span>
                          <span className="mono">{resultUrl}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="media-grid">
                        <figure className="media">
                          <a className="media-frame is-ok" href={absoluteMediaUrl(resultUrl)} target="_blank" rel="noreferrer">
                            <span className="st st-succeeded"><svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>{generationJobStatusLabel(job.status)}</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={absoluteMediaUrl(resultUrl)} alt="生成结果" />
                            <span className="tagline">{resultUrl}</span>
                          </a>
                          <figcaption className="media-meta">
                            <span className="mono-faint">{elapsedSeconds !== null ? `耗时 ${formatDuration(elapsedSeconds)}` : "任务已完成"}</span>
                            <span className="mono-faint">attempts {job.attempts} / {job.max_attempts}</span>
                          </figcaption>
                        </figure>
                      </div>
                    )}

                    <dl className="facts">
                      <div className="fact"><dt>供应商 / 模型</dt><dd>{[provider, model].filter(Boolean).join(" · ") || "结果未写入"}</dd></div>
                      <div className="fact"><dt>输出尺寸</dt><dd className="mono">{size ? size.replace("*", " × ") : "未记录"}</dd></div>
                      {job.kind === "video_asset" ? <div className="fact"><dt>时长</dt><dd className="mono">{videoDuration ? `${videoDuration} 秒` : "未记录"}</dd></div> : null}
                      <div className="fact"><dt>结果路径</dt><dd className="mono">{resultUrl}</dd></div>
                    </dl>

                    <div className="row">
                      <a className="btn btn-primary" href={absoluteMediaUrl(resultUrl)} target="_blank" rel="noreferrer">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-ext"></use></svg>
                        在新窗口打开
                      </a>
                      <Link className="btn" href={`/products/${product.id}?tab=assets`}>去素材库查看</Link>
                      <Link className="btn btn-ghost" href={`/products/${product.id}?tab=creative`}>回到方案页</Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ==================== 任务事件 ==================== */}
            <section aria-labelledby="h-events" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">JOB EVENTS · 生命周期可追溯</span>
                  <h2 className="t-h2" id="h-events">任务事件</h2>
                </div>
                <div className="right">
                  <span className="mono-note">记录入队、开始、失败、重试和完成等生命周期节点 · 共 {job.events.length} 条</span>
                  <p className="cap">事件是这张页面上唯一「不可被编辑的历史」：状态会被改写，事件不会。</p>
                </div>
              </div>

              <div className="panel">
                {eventsDesc.length > 0 ? (
                  <>
                    <div className="panel-head">
                      <h3>事件时间线（倒序 · 与源码一致）</h3>
                      <div className="row">
                        <span className="badge mono">{eventsDesc.length} EVENTS</span>
                        {autoRefresh ? <span className="badge">每 5 秒自动刷新</span> : null}
                      </div>
                    </div>
                    <div className="tbl-wrap">
                      <table className="tbl tbl-scroll">
                        <caption className="sr-only">生成任务事件时间线，共 {eventsDesc.length} 条</caption>
                        <thead>
                          <tr>
                            <th scope="col">事件</th>
                            <th scope="col">时间</th>
                            <th scope="col">事件时的状态</th>
                            <th scope="col">说明</th>
                            <th scope="col">worker</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventsDesc.map((event) => (
                            <tr key={event.id}>
                              <td>{generationJobEventLabel(event.event_type)}</td>
                              <td className="mono">{formatDateTime(event.created_at)}</td>
                              <td>{event.status ? <StatusBadge status={event.status} /> : <span className="txt-faint">—</span>}</td>
                              <td>{event.message ?? "—"}</td>
                              <td className="mono">{event.worker_id ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="panel-body stack-3">
                      <span className="eyebrow">事件类型全集 · 8 种</span>
                      <div className="row">
                        <span className="badge mono">queued 任务入队</span>
                        <span className="badge mono">started 开始执行</span>
                        <span className="badge mono">succeeded 执行成功</span>
                        <span className="badge mono">failed 执行失败</span>
                        <span className="badge mono">retry_requested 请求重试</span>
                        <span className="badge mono">retry_scheduled 安排重试</span>
                        <span className="badge mono">cancelled 任务取消</span>
                        <span className="badge mono">timeout_checked 超时检查</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="panel-body">
                    <div className="empty">
                      <svg className="ic ic-lg" aria-hidden="true" focusable="false"><use href="#i-terminal"></use></svg>
                      <h3>暂无任务事件</h3>
                      <p>新任务会在入队、执行和重试时写入事件。看到这个空态通常说明任务刚创建、事件还没落库，或该任务的执行链路在写入事件前就中断了。</p>
                      <div className="empty-actions">
                        <Link className="btn btn-primary" href={`/products/${product.id}?tab=jobs`}>回任务中心刷新</Link>
                        <Link className="btn" href="#running">查看执行进度</Link>
                      </div>
                      <p className="empty-next">
                        <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-chev"></use></svg>
                        正常情况下 5 秒内会看到第一条「任务入队」事件；超过 1 分钟仍为空，请检查 worker 是否在线
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ==================== 原始数据（排障用） ==================== */}
            <section aria-labelledby="h-json" className="sec">
              <div className="sec-hd">
                <div className="stack-2">
                  <span className="eyebrow">RAW PAYLOAD · 排障用</span>
                  <h2 className="t-h2" id="h-json">原始数据</h2>
                </div>
                <div className="right">
                  <p className="cap">两块 JSON 铺在页面底部：面向工程排障而非日常阅读。</p>
                </div>
              </div>

              <div className="media-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
                <div className="panel">
                  <div className="panel-head">
                    <h3>任务结果 JSON</h3>
                    <span className="badge mono">{Object.keys(job.result).length} keys</span>
                  </div>
                  <div className="panel-body">
                    <pre className="code">{JSON.stringify(job.result, null, 2)}</pre>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>关联方案 JSON</h3>
                    <span className="badge mono">{creativePlan ? `plan #${creativePlan.id}` : "未关联"}</span>
                  </div>
                  <div className="panel-body">
                    <pre className="code">{JSON.stringify(creativePlan?.content ?? {}, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== 口径脚注 ==================== */}
            <section className="panel" aria-labelledby="h-notes">
              <div className="panel-head"><h3 id="h-notes">本页口径约定</h3><span className="badge mono">READING NOTES</span></div>
              <div className="panel-body stack-3">
                <dl className="facts">
                  <div className="fact">
                    <dt>耗时</dt>
                    <dd>「已耗时」= 当前时间 − started_at，只统计 worker 执行段，不含排队与重试间隔；完成态显示 finished_at − started_at。</dd>
                  </div>
                  <div className="fact">
                    <dt>进度</dt>
                    <dd>供应商不返回百分比，进度只由「阶段 + 已耗时 / 超时预算」表达；轨道标尺上的 30 分兜底阈值是调度器判超时用，不是预计完成时间。</dd>
                  </div>
                  <div className="fact">
                    <dt>预估</dt>
                    <dd>历史分位数（P50 / P90）来自本商品同类任务的真实耗时样本，标注样本量，并明确为参考值。</dd>
                  </div>
                  <div className="fact">
                    <dt>供应商</dt>
                    <dd>供应商与模型一律来自任务结果写入值（job.result.provider / model），不靠页面推断。</dd>
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

function GenerationJobTopBar() {
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
        <span className="sub">GENERATION JOBS / :jobId</span>
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

type JobStatus = GenerationJob["status"];

/** 渲染五态状态徽标：形制 + 色彩双通道（实心点 / 呼吸灯 / 勾 / 警告 / 空心方块）。 */
function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`st st-${status}`}>
      {status === "pending" ? <span className="sq-hollow" aria-hidden="true"></span> : null}
      {status === "running" ? <span className="status-led is-busy" aria-hidden="true"></span> : null}
      {status === "succeeded" ? <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg> : null}
      {status === "failed" ? <svg className="ic ic-sm" aria-hidden="true" focusable="false"><use href="#i-warn"></use></svg> : null}
      {status === "cancelled" ? <span className="sq" aria-hidden="true"></span> : null}
      {generationJobStatusLabel(status)}
    </span>
  );
}

/** 五态状态中文文案（与源码映射一致）。 */
function generationJobStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    failed: "失败",
    pending: "排队中",
    running: "生成中",
    succeeded: "已完成",
    cancelled: "已取消",
  };
  return labels[status];
}

/** 主实例区块标题按状态切换。 */
function statusHeadline(status: JobStatus): string {
  const headlines: Record<JobStatus, string> = {
    pending: "排队中：队列位置与预计开始",
    running: "生成中：进度与预估",
    succeeded: "已完成：耗时终值与产物",
    failed: "失败：原因与重试",
    cancelled: "已取消：中断点与原因",
  };
  return headlines[status];
}

/** 耗时轨道状态类。 */
function trackStateClass(status: JobStatus): string {
  if (status === "succeeded") {
    return "is-done";
  }
  if (status === "failed") {
    return "is-failed";
  }
  if (status === "cancelled") {
    return "is-cancelled";
  }
  if (status === "pending") {
    return "is-queued";
  }
  return "";
}

type StageTraceStep = {
  label: string;
  dot: "done" | "run" | "skip" | "fail";
  time: string;
};

/**
 * 从 job.events 事件链推导 5 阶段轨迹；每一步都必须有真实事件或结果字段支撑，
 * 没有数据支撑的阶段显示「尚未开始」，绝不编造供应商侧事件。
 */
function buildStageTrace(job: GenerationJob, elapsedSeconds: number | null): StageTraceStep[] {
  const events = job.events;
  const queued = events.find((event) => event.event_type === "queued");
  const started = events.find((event) => event.event_type === "started");
  const succeededEvent = events.find((event) => event.event_type === "succeeded");
  const failedEvent = events.find((event) => event.event_type === "failed" || event.event_type === "timeout_checked");
  const cancelledEvent = events.find((event) => event.event_type === "cancelled");
  const taskId = readString(job.result.task_id);
  const isRunning = job.status === "running";

  const interruptDot: StageTraceStep["dot"] = isRunning ? "run" : failedEvent || cancelledEvent ? "fail" : "skip";

  return [
    {
      label: "任务入队 · queued",
      dot: queued ? "done" : "skip",
      time: queued ? formatShortTime(queued.created_at) : "尚无事件",
    },
    {
      label: `worker 领取并持锁 · started${started?.worker_id ? `（${started.worker_id}）` : ""}`,
      dot: started ? "done" : "skip",
      time: started ? formatShortTime(started.created_at) : job.status === "pending" ? "等待领取" : "尚未开始",
    },
    {
      label: "供应商受理，返回 task_id",
      dot: taskId ? "done" : isRunning ? "run" : "skip",
      time: taskId ?? (isRunning ? "等待受理" : "尚未开始"),
    },
    {
      label: "轮询等待生成结果（当前阶段）",
      dot: isRunning ? "run" : succeededEvent ? "done" : failedEvent || cancelledEvent ? interruptDot : "skip",
      time: isRunning
        ? elapsedSeconds !== null
          ? `已持续 ${formatDuration(elapsedSeconds)}`
          : "进行中"
        : succeededEvent
          ? "已返回结果"
          : failedEvent
            ? "中断"
            : "尚未开始",
    },
    {
      label: "下载落盘并写入资产",
      dot: succeededEvent || job.status === "succeeded" ? "done" : "skip",
      time: succeededEvent || job.status === "succeeded" ? `完成于 ${job.finished_at ? formatShortTime(job.finished_at) : "—"}` : "尚未开始",
    },
  ];
}

/** 失败中断发生在哪个阶段（用于失败原因块）。 */
function failedStageLabel(stageTrace: StageTraceStep[]): string {
  const failed = [...stageTrace].reverse().find((stage) => stage.dot === "fail" || stage.dot === "run");
  return failed ? failed.label : "未知阶段";
}

/** 同商品同类型 succeeded 任务耗时统计（P50 / P90 / 样本量）。 */
function buildDurationStats(jobs: GenerationJob[], kind: GenerationJob["kind"]): { p50: number; p90: number; count: number } | null {
  const durations = jobs
    .filter((item) => item.kind === kind && item.status === "succeeded" && item.started_at && item.finished_at)
    .map((item) => (new Date(item.finished_at as string).getTime() - new Date(item.started_at as string).getTime()) / 1000)
    .filter((seconds) => Number.isFinite(seconds) && seconds >= 0)
    .sort((a, b) => a - b);

  if (durations.length === 0) {
    return null;
  }

  const pick = (p: number) => durations[Math.min(durations.length - 1, Math.floor(p * (durations.length - 1)))];
  return { p50: pick(0.5), p90: pick(0.9), count: durations.length };
}

/** 已耗时（秒）：running = 当前时间 − started_at；完成态 = finished_at − started_at；pending 为 null。 */
function computeElapsedSeconds(job: GenerationJob): number | null {
  if (!job.started_at) {
    return null;
  }
  const start = new Date(job.started_at).getTime();
  if (!Number.isFinite(start)) {
    return null;
  }
  const end = job.status === "succeeded" || job.status === "failed" || job.status === "cancelled"
    ? job.finished_at
      ? new Date(job.finished_at).getTime()
      : Date.now()
    : Date.now();
  if (!Number.isFinite(end)) {
    return null;
  }
  return Math.max(0, Math.round((end - start) / 1000));
}

/** 摘要卡「已耗时」副行。 */
function elapsedSummary(job: GenerationJob): string {
  if (!job.started_at) {
    return "started_at = null · 未开始执行";
  }
  if (job.status === "running") {
    return "started_at 起 · 仍在运行";
  }
  if (job.finished_at) {
    return `${formatShortTime(job.started_at)} → ${formatShortTime(job.finished_at)}`;
  }
  return "started_at 起 · 已结束";
}

/** 事件类型中文映射（8 种，与源码 generationJobEventLabel 一致）。 */
function generationJobEventLabel(type: string): string {
  const labels: Record<string, string> = {
    failed: "执行失败",
    queued: "任务入队",
    retry_requested: "请求重试",
    retry_scheduled: "安排重试",
    started: "开始执行",
    succeeded: "执行成功",
    cancelled: "任务取消",
    timeout_checked: "超时检查",
  };
  return labels[type] ?? type;
}

/** 任务结果 URL：只认可 job.result.url 为字符串时才算「有结果」。 */
function jobResultUrl(job: GenerationJob): string | null {
  const value = job.result.url;
  return typeof value === "string" && value ? value : null;
}

/** 从 Record 中安全读取字符串值。 */
function readString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** 绝对地址媒体 URL：worker 可返回完整 URL 或后端媒体相对路径；展示层统一补齐 API 域名。 */
function absoluteMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}${url}`;
}

/** 时间（MM-DD HH:mm）。 */
function formatShortTime(iso: string): string {
  if (iso.length < 16) {
    return iso;
  }
  return iso.slice(5, 16);
}

/** 时间（YYYY-MM-DD HH:mm）。 */
function formatDateTime(iso: string): string {
  if (iso.length < 16) {
    return iso;
  }
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** 时长（X 分 Y 秒 / X 小时 Y 分 Z 秒）。 */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h} 小时 ${m} 分 ${s} 秒`;
  }
  if (m > 0) {
    return `${m} 分 ${s} 秒`;
  }
  return `${s} 秒`;
}
