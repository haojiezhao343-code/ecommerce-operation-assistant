/**
 * 部署形态：浏览器只访问 web 的对外端口（生产环境为 80），
 * 同源路径 /api/v1/* 由 Next.js 服务端转发给后端容器，后端因此不必对公网暴露。
 *
 * 这里刻意使用 .mjs 而非 .ts：next.config.ts 在 `next start` 时需要 typescript 包参与转译，
 * 而生产镜像会精简掉 devDependencies（typescript 属于此项），用 .mjs 可彻底避免运行期缺依赖。
 *
 * 该映射在构建期求值：容器镜像由 Dockerfile 传入 http://api:8000，
 * 本地开发沿用 web/.env.local 的 http://127.0.0.1:8000。
 */

/** @type {import('next').NextConfig} */
const apiInternalBaseUrl = process.env.API_INTERNAL_BASE_URL ?? "http://127.0.0.1:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiInternalBaseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
