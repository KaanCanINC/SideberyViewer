FROM node:22-alpine AS builder
WORKDIR /app

# Install build deps and build the Vite app
COPY package.json package-lock.json* vite.config.ts tsconfig.json index.html ./
COPY src ./src
RUN npm ci
RUN npm run build

# Serve built files with lightweight nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]