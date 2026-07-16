# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm (버전 고정 — pnpm 메이저가 다르면 lock 포맷·ag-grid 패치 해시가 어긋남)
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate

# Copy source code
# (pnpm workspace는 apps/*/package.json이 있어야 링크를 구성하므로 install 전에 전체 복사)
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build + assemble deploy tree (dist/deploy = host 루트 + remotes/<name>/)
RUN node scripts/build-deploy.js host,manager,fca

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist/deploy /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
