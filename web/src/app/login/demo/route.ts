import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { AUTH_COOKIE_NAME } from "@/lib/session";

/** 处理一键登录测试账号请求：读环境变量凭据，直接调后端登录并写 httpOnly cookie 后进首页。
 *  这是公开登录页的便捷入口，凭据来自部署环境变量（DEMO_EMAIL / DEMO_PASSWORD），
 *  不落前端状态、不写日志，与 /login/submit 走同一套后端登录链路。 */
export async function POST() {
  // 凭据只来自部署环境变量，代码内不落任何明文兜底值；未配置时回到登录页给出凭据错误提示
  const email = (process.env.DEMO_EMAIL ?? "").trim();
  const password = process.env.DEMO_PASSWORD ?? "";
  if (!email || !password) {
    redirect("/login?error=1");
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    redirect("/login?error=1");
  }

  const payload = (await response.json()) as { access_token: string };
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}