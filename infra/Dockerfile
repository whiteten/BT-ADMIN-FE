# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all apps using nx
RUN pnpm exec nx run-many --target=build --projects=host,manager,fca --parallel=1

# Copy remote apps to host/remotes
RUN mkdir -p dist/apps/host/remotes && \
    cp -r dist/apps/manager dist/apps/host/remotes/ && \
    cp -r dist/apps/fca dist/apps/host/remotes/

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist/apps/host /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
