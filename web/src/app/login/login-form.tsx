"use client";

import { useRef, useState } from "react";

type LoginFormProps = {
  /** 服务端凭据错误（?error=1）：两个字段级标注 + 表单横幅由页面渲染 */
  hasCredentialError?: boolean;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

/** 渲染登录表单；本地字段校验、提交中态与密码显隐都在客户端完成，提交仍走原生 POST /login/submit。 */
export function LoginForm({ hasCredentialError = false }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submitting) {
      event.preventDefault();
      return;
    }
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const errors: FieldErrors = {};
    if (!email) {
      errors.email = "请输入邮箱地址";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "请输入完整邮箱地址，例如 owner@example.com";
    }
    if (!password) {
      errors.password = "请输入密码";
    }
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setFieldErrors(errors);
      if (errors.email) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }
    // 校验通过：进入提交中态，放行原生表单提交（不拦截、不改提交目标）
    setFieldErrors({});
    setSubmitting(true);
  }

  const emailInvalid = Boolean(fieldErrors.email) || hasCredentialError;
  const passwordInvalid = Boolean(fieldErrors.password) || hasCredentialError;

  return (
    <form
      className="signin-form"
      action="/login/submit"
      method="post"
      noValidate
      aria-busy={submitting || undefined}
      onSubmit={handleSubmit}
    >
      <div className="field">
        <label htmlFor="email">邮箱</label>
        <input
          ref={emailRef}
          id="email"
          className={`input${emailInvalid ? " is-bad" : ""}`}
          type="email"
          name="email"
          required
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          placeholder="owner@example.com"
          disabled={submitting}
          aria-invalid={emailInvalid || undefined}
          aria-describedby={emailInvalid ? "email-msg" : undefined}
        />
        {fieldErrors.email ? (
          <span className="field-msg is-bad" id="email-msg">
            {fieldErrors.email}
          </span>
        ) : hasCredentialError ? (
          <span className="field-msg is-bad" id="email-msg">
            格式已通过校验 · 未匹配到可用凭据组合
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="password">密码</label>
        <div className="input-row">
          <input
            ref={passwordRef}
            id="password"
            className={`input${passwordInvalid ? " is-bad" : ""}`}
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="输入密码"
            disabled={submitting}
            aria-invalid={passwordInvalid || undefined}
            aria-describedby={passwordInvalid ? "password-msg" : undefined}
          />
          <button
            type="button"
            className="btn-reveal"
            aria-pressed={showPassword}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "隐藏" : "显示"}
          </button>
        </div>
        {fieldErrors.password ? (
          <span className="field-msg is-bad" id="password-msg">
            {fieldErrors.password}
          </span>
        ) : hasCredentialError ? (
          <span className="field-msg is-bad" id="password-msg">
            请确认大小写、输入法与是否残留自动填充后重试
          </span>
        ) : null}
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={submitting}
        aria-busy={submitting || undefined}
      >
        {submitting ? (
          <>
            <span className="status-led is-busy" aria-hidden="true"></span>
            <span>正在验证凭据</span>
          </>
        ) : (
          <span>登录</span>
        )}
      </button>
    </form>
  );
}
