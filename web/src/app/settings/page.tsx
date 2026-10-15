import Link from "next/link";

import { getCurrentUser, getModelSettings, getUsers } from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type { UserAccount } from "@/types";

/* ==========================================================================
   页面样式（对照 designs/model-config.html 内联 <style> 移植）
   —— 只消费 design-system.css 的 token 与组件类，不新增视觉值
   ========================================================================== */
const settingsCss = `
  .wrap { width: 100%; max-width: var(--max-w); margin-inline: auto; }
  .stack-4 { display: flex; flex-direction: column; gap: var(--sp-4); }
  .sec { margin-bottom: var(--sp-7); }
  .sec:last-child { margin-bottom: 0; }
  .sec-hd {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp-3) var(--sp-4); flex-wrap: wrap;
    margin-bottom: var(--sp-4); padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border);
  }
  .sec-hd h2 { font-size: var(--fs-h2); }
  /* 页面主标题「模型配置」用 h1（补齐文档大纲），字号/字体沿用原 h2 */
  .sec-hd h1 { font-size: var(--fs-h2); font-family: inherit; }
  .sec-hd .mono-note { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .app-top-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

  a:focus-visible, button:focus-visible, summary:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  /* --- 状态说明行 --------------------------------------------------- */
  .state-lede {
    display: flex; align-items: flex-start; gap: var(--sp-3);
    border: 1px solid var(--border); border-left: 3px solid var(--fg);
    border-radius: var(--radius); background: var(--surface-subtle);
    padding: var(--sp-3) var(--sp-4); margin-bottom: var(--sp-5);
  }
  .state-lede.is-warn { border-left-color: var(--warn); background: var(--warn-tint); border-color: var(--warn); }
  .state-lede.is-accent { border-left-color: var(--accent); }
  .state-lede.is-ok { border-left-color: var(--success); background: var(--success-tint); border-color: var(--success); }
  .state-lede b { display: block; font-size: var(--fs-meta); }
  .state-lede span { font-size: var(--fs-mini); color: var(--muted); }
  .state-lede .ic { flex: none; margin-top: .2em; }
  .state-lede.is-warn .ic { color: var(--warn); }
  .state-lede.is-accent .ic { color: var(--accent); }
  .state-lede.is-ok .ic { color: var(--success); }

  .cell-model b { font-weight: 700; }
  .cell-model span { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }
  .cell-num { font-family: var(--font-mono); white-space: nowrap; }

  /* --- 表单 --------------------------------------------------------- */
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); }
  .field.is-wide { grid-column: 1 / -1; }
  .field .hint { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); line-height: 1.7; }
  .field .hint code { font-family: var(--font-mono); color: var(--accent); }
  .input[readonly] { background: var(--surface-sunken); color: var(--muted); }
  .input:disabled { background: var(--surface-sunken); color: var(--faint); cursor: not-allowed; }
  .form-actions {
    display: flex; gap: var(--sp-3); flex-wrap: wrap;
    padding-top: var(--sp-4); margin-top: var(--sp-4); border-top: 1px solid var(--border);
  }

  /* --- 连接测试结果 ------------------------------------------------- */
  .test-verdict {
    display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap;
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--success); border-left: 3px solid var(--success);
    border-radius: var(--radius); background: var(--success-tint);
    margin-bottom: var(--sp-4);
  }
  .test-verdict b { font-size: var(--fs-meta); }
  .test-verdict .num { font-family: var(--font-mono); font-size: var(--fs-meta); color: var(--fg); }

  /* --- 降级态 ------------------------------------------------------- */
  .err-box {
    border: 1px solid var(--warn); border-left: 3px solid var(--warn);
    border-radius: var(--radius); background: var(--warn-tint);
    padding: var(--sp-4); margin-bottom: var(--sp-4);
  }
  .err-box h3 { font-size: var(--fs-h3); margin-bottom: .375rem; }
  .err-box p { font-size: var(--fs-meta); color: var(--fg-secondary); }
  .err-actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
  .guide-hint { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint); }

  /* --- 用户表格 ----------------------------------------------------- */
  .user-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); }
  .user-form .is-submit { align-self: end; }

  @media (max-width: 899px) {
    .form-grid, .user-form { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767px) {
    /* 窄屏表格：按最大内容宽度铺开，横向滚动交给 .tbl-wrap */
    .tbl-wrap .tbl { width: max-content; max-width: 880px; min-width: 100%; }
  }
`;

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** 渲染模型设置页面；在服务端加载业务数据，并把交互交给对应表单或客户端组件。 */
export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const token = await getAuthToken();
  const currentUser = token ? await getCurrentUser(token) : null;
  const canEdit = Boolean(currentUser?.permissions.can_edit);
  const canManageUsers = Boolean(currentUser?.permissions.can_manage_users);
  // 用户列表只有具备管理权限时才请求，避免只读/普通运营账号看到成员管理数据。
  const [settings, users] = await Promise.all([getModelSettings(), canManageUsers ? getUsers() : Promise.resolve([])]);
  const params = (await searchParams) ?? {};
  const saveStatus = scalar(params.save);
  const testStatus = scalar(params.status);
  const testTarget = scalar(params.test);
  const testMessage = scalar(params.message);
  const userStatus = scalar(params.user);

  const notices: Array<{ tone: string; icon: string; text: string }> = [];
  if (saveStatus) {
    notices.push({
      tone: saveStatus === "ok" ? "is-ok" : "is-warn",
      icon: saveStatus === "ok" ? "#i-check" : "#i-warn",
      text: saveStatus === "ok" ? "配置已保存，下一次调用会使用新模型。" : "配置保存失败。",
    });
  }
  if (testStatus) {
    notices.push({
      tone: testStatus === "ok" ? "is-ok" : "is-warn",
      icon: testStatus === "ok" ? "#i-check" : "#i-warn",
      text: `${testTargetLabel(testTarget)}测试${testStatus === "ok" ? "通过" : "失败"}：${testMessage || "-"}`,
    });
  }
  if (userStatus) {
    notices.push({
      tone: userStatus === "created" ? "is-ok" : "is-warn",
      icon: userStatus === "created" ? "#i-check" : "#i-warn",
      text: userStatus === "created" ? "用户已创建。" : "用户创建失败，请检查邮箱是否重复。",
    });
  }

  if (!settings) {
    /* 降级态：服务不可达时给出错误细节、重试入口与排查指引，而不是一句干巴巴的报错。 */
    return (
      <div className="app">
        <style dangerouslySetInnerHTML={{ __html: settingsCss }} />
        <SettingsTopBar />
        <main className="app-body">
          <div className="pane">
            <div className="wrap" id="top">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">MODEL SETTINGS · SERVICE UNAVAILABLE</span>
                  <h1>模型配置</h1>
                </div>
                <span className="mono-note">读取失败 · 已降级</span>
              </div>

              <div className="state-lede is-warn">
                <svg className="ic ic-lg" aria-hidden="true"><use href="#i-warn"></use></svg>
                <div>
                  <b>模型配置服务当前不可达 · 已自动降级</b>
                  <span>页面不会只甩一句报错。下面给出错误细节、重试入口与逐步排查指引；服务恢复后刷新本页即可回到正常配置态。</span>
                </div>
              </div>

              <section className="sec" aria-labelledby="h-err">
                <div className="sec-hd">
                  <div>
                    <span className="eyebrow">ERROR DETAIL</span>
                    <h2 id="h-err">读取失败</h2>
                  </div>
                  <span className="mono-note">接口 GET /api/v1/model-settings</span>
                </div>

                <div className="err-box">
                  <h3>GET /api/v1/model-settings 读取失败</h3>
                  <p>后端未返回有效的模型配置（服务未启动、端口不通或鉴权失效都会落到这一态）。这不是页面问题，先按下方排查指引确认服务状态，再点「重试读取」。</p>

                  <div className="trace" style={{ marginTop: "var(--sp-4)", marginBottom: 0 }}>
                    <div className="trace-hd"><span>错误链路</span><span>CHECKLIST</span></div>
                    <div className="trace-step"><span className="trace-dot skip"></span><span>浏览器发起请求 <span className="mono">GET /api/v1/model-settings</span></span><span className="trace-time">STEP 0</span></div>
                    <div className="trace-step"><span className="trace-dot run"></span><span>连接后端 API 失败或返回非 2xx</span><span className="trace-time">FAILED</span></div>
                    <div className="trace-step"><span className="trace-dot skip"></span><span>无缓存快照可兜底，编辑与保存整体禁用</span><span className="trace-time">BLOCKED</span></div>
                  </div>

                  <div className="err-actions">
                    <Link className="btn btn-primary" href="/settings">
                      <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>重试读取
                    </Link>
                  </div>
                  <p className="guide-hint" style={{ marginTop: "var(--sp-3)" }}>「重试读取」即重新加载本页；服务恢复后无需其他操作，配置会自动读出来。</p>
                </div>
              </section>

              <section className="sec" aria-labelledby="h-ts">
                <div className="sec-hd">
                  <div>
                    <span className="eyebrow">TROUBLESHOOTING</span>
                    <h2 id="h-ts">排查指引</h2>
                  </div>
                  <span className="mono-note">按顺序执行，多数问题在前两步就能定位</span>
                </div>

                <div className="panel">
                  <div className="panel-body">
                    <div className="trace" style={{ marginBottom: 0 }}>
                      <div className="trace-hd"><span>4 步定位</span><span>CHECKLIST</span></div>
                      <div className="trace-step">
                        <span className="trace-dot run"></span>
                        <span>确认 API 服务进程 / 容器存活：<span className="mono">docker compose ps</span> · 期望 api 为 running</span>
                        <span className="trace-time">STEP 1</span>
                      </div>
                      <div className="trace-step">
                        <span className="trace-dot skip"></span>
                        <span>确认端口监听：<span className="mono">curl 127.0.0.1:8000/health</span> · 期望返回正常响应</span>
                        <span className="trace-time">STEP 2</span>
                      </div>
                      <div className="trace-step">
                        <span className="trace-dot skip"></span>
                        <span>确认前端指向的 API 基址：<span className="mono">NEXT_PUBLIC_API_BASE_URL</span> 与 API 实际地址一致</span>
                        <span className="trace-time">STEP 3</span>
                      </div>
                      <div className="trace-step">
                        <span className="trace-dot skip"></span>
                        <span>确认登录态未失效：退出后重新登录，再打开本页</span>
                        <span className="trace-time">STEP 4</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const configuredCount = [settings.text, settings.image, settings.video].filter(
    (item) => item.has_api_key && Boolean(item.model),
  ).length;

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: settingsCss }} />
      <SettingsTopBar />

      <main className="app-body">
        <div className="pane">
          <div className="wrap" id="top">

            <div className="sec-hd">
              <div>
                <span className="eyebrow">MODEL SETTINGS · /api/v1/model-settings</span>
                <h1>模型配置</h1>
              </div>
              <span className="mono-note">已配置 {configuredCount} / 3 · 保存后下一次调用生效</span>
            </div>

            {notices.map((item) => (
              <div className={`state-lede ${item.tone}`} key={item.text}>
                <svg className="ic ic-lg" aria-hidden="true"><use href={item.icon}></use></svg>
                <div>
                  <b>{item.text}</b>
                  <span>该提示来自上一次操作的结果参数，刷新后消失。</span>
                </div>
              </div>
            ))}

            {/* ============ 模型列表 ============ */}
            <section className="sec" aria-labelledby="h-registry">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">MODEL REGISTRY</span>
                  <h2 id="h-registry">模型列表</h2>
                </div>
                <span className="badge mono">3 MODELS · {configuredCount} CONFIGURED</span>
              </div>

              <div className="panel">
                <div className="tbl-wrap">
                  <table className="tbl">
                    <caption className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                      已配置模型列表，共 3 个模型，已配置 {configuredCount} 个
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">模型名</th>
                        <th scope="col">供应商 / 地址</th>
                        <th scope="col">用途</th>
                        <th scope="col">密钥</th>
                        <th scope="col">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ModelRow
                        model={settings.text.model}
                        endpoint={settings.text.base_url}
                        purpose="诊断、主图方案、视频脚本和复盘"
                        hasKey={settings.text.has_api_key}
                      />
                      <ModelRow
                        model={settings.image.model}
                        endpoint={settings.image.provider ? `${settings.image.provider} · ${settings.image.base_url}` : settings.image.base_url}
                        purpose="主图方案的一键出图"
                        hasKey={settings.image.has_api_key}
                      />
                      <ModelRow
                        model={settings.video.model}
                        endpoint={settings.video.provider ? `${settings.video.provider} · ${settings.video.base_url}` : settings.video.base_url}
                        purpose="短视频脚本的一键成片"
                        hasKey={settings.video.has_api_key}
                      />
                    </tbody>
                  </table>
                </div>
                <div className="tbl-note" style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", padding: "var(--sp-3) var(--sp-4)", borderTop: "1px solid var(--border)", background: "var(--surface-subtle)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-mini)", color: "var(--muted)" }}>
                  <svg className="ic ic-sm" aria-hidden="true"><use href="#i-server"></use></svg>
                  <span>密钥从环境变量注入，不落库、不在页面上回显明文；接口只返回脱敏值。</span>
                </div>
              </div>
            </section>

            {/* ============ 编辑区 ============ */}
            <section className="sec" aria-labelledby="h-edit">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">EDIT · 三个模型的调用参数</span>
                  <h2 id="h-edit">编辑区</h2>
                </div>
                <span className="mono-note">改动即时校验，保存后对新调用生效</span>
              </div>

              <form id="model-settings-form" action="/settings/update" method="post" className="stack-4">
                <div className="panel">
                  <div className="panel-head">
                    <h3>文本模型</h3>
                    <span className={`badge${settings.text.has_api_key && settings.text.model ? " badge-online" : " badge-warn"}`}>
                      {settings.text.has_api_key && settings.text.model ? "已配置" : "未配置"}
                    </span>
                  </div>
                  <div className="panel-body">
                    <div className="form-grid">
                      <TextField label="Base URL" name="text_base_url" defaultValue={settings.text.base_url} placeholder="https://api.deepseek.com" />
                      <TextField label="Model" name="text_model" defaultValue={settings.text.model} placeholder="deepseek-v4-pro" />
                      <SecretField label="API Key" name="text_api_key" masked={settings.text.api_key_masked} isWide />
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>图片模型</h3>
                    <span className={`badge${settings.image.has_api_key && settings.image.model ? " badge-online" : " badge-warn"}`}>
                      {settings.image.has_api_key && settings.image.model ? "已配置" : "未配置"}
                    </span>
                  </div>
                  <div className="panel-body">
                    <div className="form-grid">
                      <ProviderSelect label="Provider" name="image_provider" defaultValue={settings.image.provider} />
                      <TextField label="Model" name="image_model" defaultValue={settings.image.model} placeholder="wan2.6-t2i" />
                      <TextField label="Base URL" name="image_base_url" defaultValue={settings.image.base_url} placeholder="https://dashscope.aliyuncs.com/api/v1" />
                      <TextField label="Size" name="image_size" defaultValue={settings.image.size} placeholder="1280*1280" />
                      <TextField label="业务空间 ID" name="image_workspace_id" defaultValue={settings.image.workspace_id} placeholder="llm-..." />
                      <NumberField label="轮询间隔秒" name="image_poll_interval_seconds" defaultValue={settings.image.poll_interval_seconds} />
                      <NumberField label="最大轮询次数" name="image_poll_max_attempts" defaultValue={settings.image.poll_max_attempts} />
                      <SecretField label="API Key" name="image_api_key" masked={settings.image.api_key_masked} isWide />
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>视频模型</h3>
                    <span className={`badge${settings.video.has_api_key && settings.video.model ? " badge-online" : " badge-warn"}`}>
                      {settings.video.has_api_key && settings.video.model ? "已配置" : "未配置"}
                    </span>
                  </div>
                  <div className="panel-body">
                    <div className="form-grid">
                      <ProviderSelect label="Provider" name="video_provider" defaultValue={settings.video.provider} />
                      <TextField label="Model" name="video_model" defaultValue={settings.video.model} placeholder="wan2.6-t2v" />
                      <TextField label="Base URL" name="video_base_url" defaultValue={settings.video.base_url} placeholder="https://dashscope.aliyuncs.com/api/v1" />
                      <TextField label="Size" name="video_size" defaultValue={settings.video.size} placeholder="1280*720" />
                      <NumberField label="时长秒" name="video_duration" defaultValue={settings.video.duration} />
                      <TextField label="业务空间 ID" name="video_workspace_id" defaultValue={settings.video.workspace_id} placeholder="llm-..." />
                      <NumberField label="轮询间隔秒" name="video_poll_interval_seconds" defaultValue={settings.video.poll_interval_seconds} />
                      <NumberField label="最大轮询次数" name="video_poll_max_attempts" defaultValue={settings.video.poll_max_attempts} />
                      <SecretField label="API Key" name="video_api_key" masked={settings.video.api_key_masked} isWide />
                    </div>
                  </div>
                </div>

                {canEdit ? (
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">保存配置</button>
                  </div>
                ) : (
                  <p className="t-mini">当前账号为只读权限，保存按钮已隐藏。</p>
                )}
              </form>
            </section>

            {/* ============ 连接测试 ============ */}
            <section className="sec" aria-labelledby="h-test">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">CONNECTION TEST</span>
                  <h2 id="h-test">连接测试</h2>
                </div>
                <span className="mono-note">只发 1 个最简请求，不消耗业务额度</span>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>最近一次测试</h3>
                  {testStatus ? (
                    <span className={`badge${testStatus === "ok" ? " badge-online" : " badge-warn"}`}>
                      {testStatus === "ok" ? "通过" : "失败"}
                    </span>
                  ) : (
                    <span className="badge">未测试</span>
                  )}
                </div>
                <div className="panel-body">
                  {testStatus ? (
                    <div className={testStatus === "ok" ? "test-verdict" : "err-box"}>
                      <svg className="ic ic-lg" aria-hidden="true" style={{ color: testStatus === "ok" ? "var(--success)" : "var(--warn)", flex: "none" }}>
                        <use href={testStatus === "ok" ? "#i-check" : "#i-warn"}></use>
                      </svg>
                      <div>
                        <b>{testTargetLabel(testTarget)}测试{testStatus === "ok" ? "通过" : "失败"}</b>
                        <p className="t-mini mono">{testMessage || "-"}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="t-meta">还没有测试记录。点下面任意一个按钮，向后端发起一次最简调用；结果会显示在这里。</p>
                  )}

                  {canEdit ? (
                    <div className="row" style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
                      <TestButton target="text" label="测试文本模型" />
                      <TestButton target="image" label="测试图片模型" />
                      <TestButton target="video" label="测试视频模型" />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* ============ 用户与权限 ============ */}
            <section className="sec" aria-labelledby="h-users">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">USERS &amp; PERMISSIONS</span>
                  <h2 id="h-users">用户与权限</h2>
                </div>
                <span className="mono-note">按角色控制编辑、成员管理和投放确认权限</span>
              </div>

              {canManageUsers ? (
                <div className="panel">
                  <div className="panel-head">
                    <h3>成员管理</h3>
                    <span className="badge mono">{users.length} USERS</span>
                  </div>
                  <div className="panel-body stack-4">
                    <form action="/settings/users/create" method="post" className="user-form">
                      <TextField label="邮箱" name="email" defaultValue="" placeholder="ops@example.com" />
                      <TextField label="姓名" name="display_name" defaultValue="" placeholder="运营同学" />
                      <div className="field">
                        <label htmlFor="new-user-role">角色</label>
                        <select className="input" id="new-user-role" name="role" defaultValue="operator">
                          <option value="owner">Owner</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="new-user-password">初始密码</label>
                        {/* 密码可留空：留空时由后端按默认规则生成，不在页面上预置任何凭据。 */}
                        <input className="input" id="new-user-password" name="password" type="password" minLength={8} placeholder="可留空" />
                      </div>
                      <div className="field is-submit">
                        <button type="submit" className="btn btn-primary">添加用户</button>
                      </div>
                    </form>

                    <div className="tbl-wrap">
                      <table className="tbl">
                        <caption className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>用户列表，共 {users.length} 人</caption>
                        <thead>
                          <tr>
                            <th scope="col">用户</th>
                            <th scope="col">角色</th>
                            <th scope="col">状态</th>
                            <th scope="col">权限</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={4}>
                                <div className="empty">
                                  <svg className="ic ic-lg" aria-hidden="true" style={{ color: "var(--faint)" }}><use href="#i-agent"></use></svg>
                                  <h4 style={{ marginTop: "var(--sp-3)" }}>暂无用户</h4>
                                  <p>先添加 owner 或 operator，再逐步接入登录鉴权。</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id}>
                                <td className="cell-model">
                                  <b>{user.display_name}</b>
                                  <span>{user.email}</span>
                                </td>
                                <td>{roleLabel(user.role)}</td>
                                <td>
                                  <span className={`badge${user.status === "active" ? " badge-online" : ""}`}>
                                    {user.status === "active" ? "启用" : "停用"}
                                  </span>
                                </td>
                                <td>
                                  <div className="tag-row">
                                    {permissionBadges(user).map((badge) => (
                                      <span key={badge} className="tag">{badge}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="t-meta">当前账号没有用户管理权限，只能查看模型配置状态。</p>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

/** 渲染顶栏组件，集中展示品牌、主导航与主题切换入口。 */
function SettingsTopBar() {
  return (
    <header className="app-top">
      <Link className="brand" href="/">
        <svg className="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <rect x="12" y="12" width="8" height="8" rx="2" />
          <rect x="4" y="4" width="4" height="4" rx="1" />
          <rect x="24" y="4" width="4" height="4" rx="1" />
          <rect x="4" y="24" width="4" height="4" rx="1" />
          <rect x="24" y="24" width="4" height="4" rx="1" />
        </svg>
        <span>运营智能体</span>
        <span className="sub">MODEL CONFIGURATION</span>
      </Link>
      <nav aria-label="主导航">
        <Link href="/">工作台</Link>
        <Link href="/imports">导入中心</Link>
        <Link href="/settings" aria-current="page">模型配置</Link>
        <Link href="/agent">Agent 中心</Link>
      </nav>
      <div className="app-top-actions">
        <span className="badge badge-online"><span className="status-led" aria-hidden="true"></span>服务在线</span>
        <Link className="btn btn-sm" href="/">
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>
          <span>返回工作台</span>
        </Link>
        <button type="button" className="btn btn-ghost btn-sm" id="themeBtn" aria-label="切换明暗主题">
          <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>主题
        </button>
      </div>
    </header>
  );
}

/** 渲染模型列表行组件，集中展示单个模型的配置状态。 */
function ModelRow({ model, endpoint, purpose, hasKey }: { model: string; endpoint: string; purpose: string; hasKey: boolean }) {
  const configured = Boolean(model) && hasKey;
  return (
    <tr>
      <td className="cell-model">
        <b>{model || "未配置"}</b>
        <span>{model || "—"}</span>
      </td>
      <td>{endpoint || "-"}</td>
      <td>{purpose}</td>
      <td>
        <span className={`badge${hasKey ? " badge-online" : " badge-warn"}`}>{hasKey ? "已注入" : "缺失"}</span>
      </td>
      <td>
        <span className={`badge${configured ? " badge-online" : " badge-warn"}`}>{configured ? "已配置" : "未配置"}</span>
      </td>
    </tr>
  );
}

/** 渲染 TestButton 组件，集中展示模型测试按钮与提交目标。 */
function TestButton({ target, label }: { target: "text" | "image" | "video"; label: string }) {
  return (
    <form action="/settings/test" method="post">
      <input type="hidden" name="target" value={target} />
      <button type="submit" className="btn">{label}</button>
    </form>
  );
}

/** 渲染 TextField 组件，集中展示文本输入框的标签、名称与回填值。 */
function TextField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}

/** 渲染 NumberField 组件，集中展示数值输入框的标签、名称与回填值。 */
function NumberField({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type="number" min="1" defaultValue={defaultValue} />
    </div>
  );
}

/** 渲染 SecretField 组件，密钥输入框不回填明文，只显示脱敏占位。 */
function SecretField({ label, name, masked, isWide }: { label: string; name: string; masked: string; isWide?: boolean }) {
  return (
    <div className={`field${isWide ? " is-wide" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {/* 密钥输入框不回填明文，只显示脱敏占位；留空时后端保留原 key。 */}
      <input className="input" id={name} name={name} type="password" placeholder={masked ? `当前：${masked}，留空则保持不变` : "粘贴 API Key"} />
      <span className="hint">密钥只从服务端环境变量注入，留空表示保持不变。</span>
    </div>
  );
}

/** 渲染 ProviderSelect 组件，集中展示供应商下拉选项。 */
function ProviderSelect({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select className="input" id={name} name={name} defaultValue={defaultValue || "dashscope"}>
        <option value="dashscope">DashScope / 通义万相</option>
        <option value="jimeng">Jimeng / 即梦</option>
        <option value="custom">Custom</option>
      </select>
    </div>
  );
}

/** 标量，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** 把testtarget状态映射为中文显示文本，保持页面口径一致。 */
function testTargetLabel(target: string | undefined) {
  if (target === "image") {
    return "图片模型";
  }
  if (target === "video") {
    return "视频模型";
  }
  return "文本模型";
}

/** 把角色状态映射为中文显示文本，保持页面口径一致。 */
function roleLabel(role: UserAccount["role"]): string {
  if (role === "owner") {
    return "Owner";
  }
  if (role === "viewer") {
    return "Viewer";
  }
  return "Operator";
}

/** 权限badges，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
function permissionBadges(user: UserAccount): string[] {
  const badges = ["可查看"];
  if (user.permissions.can_edit) {
    badges.push("可编辑");
  }
  if (user.permissions.can_manage_users) {
    badges.push("管理用户");
  }
  if (user.permissions.can_confirm_ad_actions) {
    badges.push("确认投放");
  }
  return badges;
}
