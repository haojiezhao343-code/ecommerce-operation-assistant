import Link from "next/link";

import { LoginForm } from "./login-form";

/* ==========================================================================
   页面样式（对照 designs/login.html 内联 <style> 移植）
   —— 只消费 design-system.css 的 token 与组件类，不新增视觉值
   ========================================================================== */
const loginCss = `
  .app { grid-template-rows: auto 1fr; }

  a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,
  summary:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .app-top-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

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

  .mark-slot { display: inline-flex; align-items: center; }
  .brand .mark-slot { font-size: 20px; }

  .prose { font-size: var(--fs-body); line-height: 1.75; color: var(--fg-secondary); }
  .hair { border: 0; border-top: 1px solid var(--border); margin: var(--sp-4) 0; }

  /* 表单：系统 .input 抬到 44px 命中区 */
  .input, .field .input, select.input { width: 100%; min-height: 44px; }
  .input:disabled { background: var(--surface-sunken); color: var(--faint); cursor: not-allowed; }
  .input.is-bad { border-color: var(--accent); }
  .input.is-bad:focus-visible { outline-color: var(--accent); }
  .field-msg { font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.7; color: var(--faint); }
  .field-msg.is-bad { color: var(--accent); }

  /* 登录主区 */
  .login-grid { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); gap: var(--sp-5); align-items: start; }
  .trust .panel-body { display: flex; flex-direction: column; gap: var(--sp-3); }
  .trust .hair { border-top-color: color-mix(in oklch, var(--bg) 22%, transparent); }
  .trust .prose { color: color-mix(in oklch, var(--bg) 78%, var(--fg)); }
  .trust-brand { display: flex; align-items: center; gap: var(--sp-3); margin-top: .25rem; }
  .trust-brand .mark-slot { font-size: 28px; color: var(--bg); }
  .trust-brand b { font-size: var(--fs-h3); }
  .trust-brand .mono { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: color-mix(in oklch, var(--bg) 64%, var(--fg)); }
  .trust-list { display: flex; flex-direction: column; gap: var(--sp-2); }
  .trust-list li {
    display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: .625rem; align-items: start;
    font-size: var(--fs-body); line-height: 1.7;
    color: color-mix(in oklch, var(--bg) 80%, var(--fg));
  }
  .trust-list .ic { color: var(--bg); margin-top: .35em; }
  .trust-flow { display: flex; flex-direction: column; gap: .5rem; counter-reset: fl; }
  .trust-flow li { position: relative; padding-left: 1.75rem; }
  .trust-flow li::before {
    counter-increment: fl; content: counter(fl, decimal-leading-zero);
    position: absolute; left: 0; top: .15em;
    font-family: var(--font-mono); font-size: var(--fs-mini);
    color: color-mix(in oklch, var(--bg) 58%, var(--fg));
  }
  .trust-flow .mono { display: block; font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--bg); }
  .trust-flow .desc { display: block; font-size: var(--fs-body); line-height: 1.7; color: color-mix(in oklch, var(--bg) 68%, var(--fg)); }

  .card-signin { max-width: 28rem; width: 100%; }
  .card-signin .panel-body { display: flex; flex-direction: column; }
  .card-signin .id-row { display: flex; align-items: center; gap: var(--sp-3); }
  .card-signin h1 { font-size: var(--fs-h2); }
  .card-signin .who { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--muted); }
  .brand-badge {
    width: 44px; height: 44px; flex: none; display: grid; place-items: center;
    border: 1px solid var(--fg); border-radius: var(--radius);
    background: var(--fg); color: var(--bg); font-size: 20px;
  }
  .signin-form { display: flex; flex-direction: column; gap: var(--sp-4); margin-top: var(--sp-5); }
  .demo-signin { margin-top: var(--sp-3); }
  .demo-signin .btn { min-height: 44px; }
  .input-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .375rem; }
  .btn-reveal {
    min-height: 44px; min-width: 58px; padding: 0 .75rem;
    border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
    color: var(--muted); font-family: var(--font-mono); font-size: var(--fs-mini);
    font-weight: 600; letter-spacing: .04em; white-space: nowrap;
  }
  .btn-reveal:hover { background: var(--surface-subtle); color: var(--fg); }
  .btn-block { width: 100%; }
  .back-link {
    display: inline-flex; align-items: center; gap: .375rem;
    min-height: 44px; margin-top: var(--sp-3);
    font-size: var(--fs-meta); color: var(--muted);
  }
  .back-link:hover { color: var(--fg); }
  .card-foot {
    min-width: 0; overflow-wrap: anywhere;
    margin-top: var(--sp-3); padding-top: var(--sp-3); border-top: 1px solid var(--border);
    font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--faint);
  }

  /* 提示块 */
  .alert {
    display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: var(--sp-3); align-items: start;
    border: 1px solid var(--border); border-left-width: 3px; border-left-color: var(--border-strong);
    border-radius: var(--radius); background: var(--surface-subtle);
    padding: var(--sp-3) var(--sp-4);
  }
  .alert b { display: block; font-size: var(--fs-body); }
  .alert p, .alert li { font-size: var(--fs-body); line-height: 1.7; color: var(--fg-secondary); }
  .alert ul { list-style: disc; padding-left: 1.15em; margin-top: .375rem; display: flex; flex-direction: column; gap: .25rem; }
  .alert + .signin-form, .alert + .cred-note { margin-top: var(--sp-4); }
  .alert.is-error { border-color: var(--accent); background: var(--accent-tint); }
  .alert.is-error .ic, .alert.is-error b { color: var(--accent); }
  .alert.is-warn { border-color: var(--warn); background: var(--warn-tint); }
  .alert.is-warn .ic, .alert.is-warn b { color: var(--warn); }
  .alert.is-info { border-color: var(--info); background: var(--info-tint); }
  .alert.is-info .ic, .alert.is-info b { color: var(--info); }

  /* 演示凭据说明：中性描边，不用绿色成功色 */
  .cred-note {
    display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: var(--sp-3); align-items: start;
    margin-top: var(--sp-4); padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--border); border-left: 3px solid var(--border-strong);
    border-radius: var(--radius); background: var(--surface-sunken);
  }
  .cred-note b { display: block; font-size: var(--fs-body); }
  .cred-note p { font-size: var(--fs-body); line-height: 1.7; color: var(--muted); }
  .cred-note .ic { color: var(--muted); }

  @media (max-width: 1023px) {
    .login-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767px) {
    .card-signin { max-width: 100%; }
    .input-row { grid-template-columns: minmax(0, 1fr); }
    .btn-reveal { width: 100%; }
  }
`;

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 渲染登录页面；服务端只区分凭据错误与会话过期两条分支，交互交给 login-form 客户端组件。 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const error = firstParam(params.error);
  const expired = firstParam(params.expired);
  const hasCredentialError = error === "1";

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: loginCss }} />

      {/* 登录页是唯一未鉴权入口，顶栏不暴露产品导航 */}
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
          <span className="sub">SIGN IN</span>
        </Link>
        <div className="app-top-actions">
          <span className="badge">公开入口 · 未鉴权</span>
          <button type="button" className="btn btn-ghost" id="themeBtn" aria-label="切换明暗主题">
            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
            <span>主题</span>
          </button>
        </div>
      </header>

      <main className="app-body">
        <div className="pane">
          <div className="wrap">

            <section className="sec" id="signin">
              <div className="sec-hd">
                <div>
                  <span className="eyebrow">SIGN IN · 正常态</span>
                  <h2>登录工作台</h2>
                </div>
                <span className="mono-note">字段：email / password · 提交目标：POST /login/submit</span>
              </div>

              <div className="login-grid">

                {/* 左：门面说明（登录页是唯一公开入口，必须自证可信） */}
                <aside className="panel panel-inverted trust">
                  <div className="panel-body">
                    <span className="eyebrow">Operator Access</span>
                    <div className="trust-brand">
                      <span className="mark-slot" aria-hidden="true">
                        <svg className="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                          <rect x="12" y="12" width="8" height="8" rx="2" />
                          <rect x="4" y="4" width="4" height="4" rx="1" />
                          <rect x="24" y="4" width="4" height="4" rx="1" />
                          <rect x="4" y="24" width="4" height="4" rx="1" />
                          <rect x="24" y="24" width="4" height="4" rx="1" />
                        </svg>
                      </span>
                      <span>
                        <b>运营智能体</b>
                        <span className="mono">ECOMMERCE OPERATIONS AGENT</span>
                      </span>
                    </div>
                    <p className="prose">
                      统一运营 Agent 中心的唯一公开入口。登录后由一个协调 Agent 从版本化工作流中路由，
                      R2 / R3 副作用必须经数据库审批放行，业务结果回到可编辑工作台。
                    </p>

                    <hr className="hair" />
                    <span className="eyebrow">本页安全边界</span>
                    <ul className="trust-list">
                      <li>
                        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
                        <span>页面不渲染任何账号、口令或口令片段；演示凭据一律向管理员线下获取。</span>
                      </li>
                      <li>
                        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
                        <span>密码字段 type=password，不回显、不进入前端状态、不写入日志。</span>
                      </li>
                      <li>
                        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
                        <span>失败提示不区分「邮箱不存在」与「密码错误」，避免账号枚举。</span>
                      </li>
                      <li>
                        <svg className="ic" aria-hidden="true"><use href="#i-check"></use></svg>
                        <span>令牌只落在 httpOnly + SameSite=Lax Cookie 上，前端脚本读不到。</span>
                      </li>
                    </ul>

                    <hr className="hair" />
                    <span className="eyebrow">认证链路</span>
                    <ol className="trust-flow">
                      <li><span className="mono">POST /login/submit</span><span className="desc">表单提交（Next.js route handler）</span></li>
                      <li><span className="mono">POST /api/v1/auth/login</span><span className="desc">转发给 FastAPI，返回 access_token</span></li>
                      <li><span className="mono">Set-Cookie · httpOnly</span><span className="desc">SameSite=Lax · Path=/ · 服务端统一附加 Authorization</span></li>
                      <li><span className="mono">302 → /</span><span className="desc">进入业务工作台</span></li>
                    </ol>
                  </div>
                </aside>

                {/* 右：登录卡（保留单卡形态与字段，无明文凭据） */}
                <div className="panel card-signin">
                  <div className="panel-body">
                    <div className="id-row">
                      <span className="brand-badge" aria-hidden="true">
                        <svg className="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                          <rect x="12" y="12" width="8" height="8" rx="2" />
                          <rect x="4" y="4" width="4" height="4" rx="1" />
                          <rect x="24" y="4" width="4" height="4" rx="1" />
                          <rect x="4" y="24" width="4" height="4" rx="1" />
                          <rect x="24" y="24" width="4" height="4" rx="1" />
                        </svg>
                      </span>
                      <div>
                        <p className="who">运营智能体</p>
                        <h1>登录工作台</h1>
                      </div>
                    </div>

                    <div className="cred-note">
                      <svg className="ic" aria-hidden="true"><use href="#i-doc"></use></svg>
                      <div>
                        <b>演示凭据</b>
                        <p>
                          测试账号 <span className="mono">demo@example.com</span>，密码{" "}
                          <span className="mono">Demo@123</span>，可直接登录体验。
                        </p>
                      </div>
                    </div>

                    <form action="/login/demo" method="post" className="demo-signin">
                      <button type="submit" className="btn btn-primary btn-block">
                        <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                        <span>一键登录测试账号</span>
                      </button>
                    </form>

                    {expired ? (
                      <div className="alert is-info" role="status">
                        <svg className="ic" aria-hidden="true"><use href="#i-server"></use></svg>
                        <div>
                          <b>登录状态已过期，请重新登录</b>
                          <p>原会话已被服务端判定失效，本次操作未提交，重新登录后可继续。</p>
                        </div>
                      </div>
                    ) : null}

                    {hasCredentialError ? (
                      <div className="alert is-error" role="alert">
                        <svg className="ic" aria-hidden="true"><use href="#i-warn"></use></svg>
                        <div>
                          <b>邮箱与密码组合不正确，或账号已停用</b>
                          <p>为避免账号枚举，这里不区分「邮箱不存在」与「密码错误」。按顺序自查：</p>
                          <ul>
                            <li>密码区分大小写：确认未开启大写锁定，输入法处于英文 / 半角状态。</li>
                            <li>浏览器密码管理器可能回填了旧密码：清空后手动输入一次。</li>
                            <li>仍失败请联系管理员核对账号状态（停用账号无法登录）。</li>
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    <LoginForm hasCredentialError={hasCredentialError} />

                    <Link className="back-link" href="/">
                      <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                      <span>返回业务工作台</span>
                    </Link>

                    <p className="card-foot">
                      失败时不区分具体字段 · 成功后 302 到 / · 会话写入 httpOnly Cookie
                    </p>
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
