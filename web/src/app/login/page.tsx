import Link from "next/link";

import { LoginForm } from "./login-form";

/* ==========================================================================
   登录页 · 轻量版
   —— 相比设计稿全量移植版：去掉工程说明类区块（认证链路 / 安全边界清单 /
      接口注释），收敛为单卡聚焦布局；视觉全部沿用设计系统既有 token 与组件类
   ========================================================================== */
const loginCss = `
  .app { grid-template-rows: auto 1fr; }

  a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .app-top-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

  /* ---- 居中单卡布局 ---- */
  .login-wrap {
    width: 100%; max-width: 28rem; margin-inline: auto;
    padding: clamp(var(--sp-5), 6vh, var(--sp-8)) var(--sp-4);
    display: grid; align-content: center; min-height: 100%;
  }
  .card-signin .panel-body { display: flex; flex-direction: column; gap: var(--sp-4); }

  .id-row { display: flex; align-items: center; gap: var(--sp-3); }
  .brand-badge {
    width: 44px; height: 44px; flex: none; display: grid; place-items: center;
    border: 1px solid var(--fg); border-radius: var(--radius);
    background: var(--fg); color: var(--bg); font-size: var(--fs-h3);
  }
  .id-row .eyebrow { display: block; }
  .id-row h1 { font-size: var(--fs-h2); line-height: 1.3; }
  .tagline { font-size: var(--fs-meta); color: var(--muted); }

  /* ---- 演示账号一键登录：首选路径，弱化为一张横条 ---- */
  .demo-box {
    display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-wrap: wrap;
    border: 1px solid var(--border-accent); border-radius: var(--radius);
    background: var(--accent-tint); padding: var(--sp-3) var(--sp-4);
  }
  .demo-box .demo-info { display: flex; flex-direction: column; gap: .125rem; min-width: 0; }
  .demo-box b { font-size: var(--fs-meta); }
  .demo-box .demo-cred { font-family: var(--font-mono); font-size: var(--fs-mini); color: var(--fg-secondary); overflow-wrap: anywhere; }
  .demo-box form { flex: none; }

  /* ---- 分隔线「或使用邮箱登录」 ---- */
  .divider { display: flex; align-items: center; gap: var(--sp-3); font-size: var(--fs-mini); color: var(--faint); }
  .divider::before, .divider::after { content: ''; flex: 1; border-top: 1px solid var(--border); }

  /* ---- 提示块（会话过期 / 凭据错误） ---- */
  .alert {
    display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: var(--sp-3); align-items: start;
    border: 1px solid var(--border); border-left-width: 3px; border-left-color: var(--border-strong);
    border-radius: var(--radius); background: var(--surface-subtle);
    padding: var(--sp-3) var(--sp-4);
  }
  .alert b { display: block; font-size: var(--fs-body); }
  .alert p, .alert li { font-size: var(--fs-body); line-height: 1.7; color: var(--fg-secondary); }
  .alert ul { list-style: disc; padding-left: 1.15em; margin-top: .375rem; display: flex; flex-direction: column; gap: .25rem; }
  .alert.is-error { border-color: var(--accent); background: var(--accent-tint); }
  .alert.is-error .ic, .alert.is-error b { color: var(--accent); }
  .alert.is-info { border-color: var(--info); background: var(--info-tint); }
  .alert.is-info .ic, .alert.is-info b { color: var(--info); }

  /* ---- 表单（LoginForm 组件消费） ---- */
  .signin-form { display: flex; flex-direction: column; gap: var(--sp-4); }
  .input, .field .input { width: 100%; min-height: 44px; }
  .input:disabled { background: var(--surface-sunken); color: var(--faint); cursor: not-allowed; }
  .input.is-bad { border-color: var(--accent); }
  .field-msg { font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.7; color: var(--faint); }
  .field-msg.is-bad { color: var(--accent); }
  .input-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .375rem; }
  .btn-reveal {
    min-height: 44px; min-width: 58px; padding: 0 .75rem;
    border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
    color: var(--muted); font-family: var(--font-mono); font-size: var(--fs-mini);
    font-weight: 600; letter-spacing: .04em; white-space: nowrap;
  }
  .btn-reveal:hover { background: var(--surface-subtle); color: var(--fg); }

  .back-link {
    display: inline-flex; align-items: center; gap: .375rem;
    min-height: 44px; align-self: center;
    font-size: var(--fs-meta); color: var(--muted);
  }
  .back-link:hover { color: var(--fg); }

  @media (max-width: 767px) {
    .demo-box form { width: 100%; }
    .demo-box form .btn { width: 100%; }
  }
`;

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 渲染登录页面：单卡聚焦布局，演示账号一键登录为首选路径，服务端只区分凭据错误与会话过期。 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const error = firstParam(params.error);
  const expired = firstParam(params.expired);
  const hasCredentialError = error === "1";

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: loginCss }} />

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
        </Link>
        <div className="app-top-actions">
          <button type="button" className="btn btn-ghost" id="themeBtn" aria-label="切换明暗主题">
            <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
            <span>主题</span>
          </button>
        </div>
      </header>

      <main className="app-body">
        <div className="login-wrap">
          <section className="panel card-signin">
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
                  <span className="eyebrow">Operator Access</span>
                  <h1>登录工作台</h1>
                </div>
              </div>
              <p className="tagline">登录后进入单品运营工作台：商品、店铺、库存与 Agent 任务集中管理。</p>

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
                    <p>为避免账号枚举，这里不区分「邮箱不存在」与「密码错误」。请确认大小写与输入法状态后重试，仍失败请联系管理员。</p>
                  </div>
                </div>
              ) : null}

              {/* 首选路径：演示账号一键登录 */}
              <div className="demo-box">
                <div className="demo-info">
                  <b>先体验？一键进入演示模式</b>
                  <span className="demo-cred">demo@example.com · Demo@123</span>
                </div>
                <form action="/login/demo" method="post">
                  <button type="submit" className="btn btn-primary">
                    <span>一键登录</span>
                    <svg className="ic ic-sm" aria-hidden="true"><use href="#i-arrow-r"></use></svg>
                  </button>
                </form>
              </div>

              <div className="divider"><span>或使用邮箱登录</span></div>

              <LoginForm hasCredentialError={hasCredentialError} />

              <Link className="back-link" href="/">
                <svg className="ic ic-sm" aria-hidden="true"><use href="#i-chev"></use></svg>
                <span>返回业务工作台</span>
              </Link>

            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
