FROM node:22-slim AS builder

WORKDIR /app

# 国内构建默认走镜像源，显著缩短 npm 安装时间；如需切换：
#   docker build --build-arg NPM_REGISTRY=https://registry.npmjs.org -t ... ./web
ARG NPM_REGISTRY=https://registry.npmmirror.com

# NEXT_PUBLIC_API_BASE_URL 在构建期被烘焙进客户端 bundle，运行期改环境变量无效。
# 默认留空 → 页面拼出的分享/资源链接走相对路径，自动指向访客实际使用的域名或 IP。
ARG NEXT_PUBLIC_API_BASE_URL=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
# next.config.mjs 的同源反代目标在构建期求值，容器内固定用编排里的服务名 api。
ARG API_INTERNAL_BASE_URL=http://api:8000
ENV API_INTERNAL_BASE_URL=$API_INTERNAL_BASE_URL

COPY package*.json ./
RUN npm ci --registry=$NPM_REGISTRY --no-audit --no-fund

COPY . .
# 构建后立刻精简掉 devDependencies（typescript / tailwind 等只在构建期需要），
# 使运行镜像只保留生产依赖，减小传输体积。
RUN npm run build \
 && npm prune --omit=dev --registry=$NPM_REGISTRY --no-audit --no-fund

FROM node:22-slim AS runner

ENV NODE_ENV=production
# 留空表示页面拼出的分享/资源链接改用相对路径，自动指向访问者实际使用的域名或 IP。
# 需要绝对地址时由编排（docker compose）显式覆盖，不要在这里写死 127.0.0.1。
ENV NEXT_PUBLIC_API_BASE_URL=""
# 运行期若再次求值 next.config.mjs，同源反代目标也要指向编排内的 api 服务。
ENV API_INTERNAL_BASE_URL=http://api:8000
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]
