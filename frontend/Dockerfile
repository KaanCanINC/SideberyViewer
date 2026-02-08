FROM node:22-alpine as builder
WORKDIR /app
COPY package.json package-lock.json* vite.config.ts tsconfig.json index.html ./ 
COPY src ./src
RUN npm ci
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]