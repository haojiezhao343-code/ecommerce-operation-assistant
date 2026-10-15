import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  title: "多智能体运营平台 · 运营智能体",
  description: "AI 单品运营工作台",
};

/** 渲染 RootLayout 组件，集中展示根布局所需的数据、状态和操作入口。 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* class="js"：.reveal 进场动画依赖它（AGENTS.md §2.1） */
    <html lang="zh-CN" className="js">
      <head>
        {/* icons.js：IIFE 图标注入器 + 主题切换 + reveal，需客户端加载（AGENTS.md §2.1） */}
        <Script src="/icons.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
