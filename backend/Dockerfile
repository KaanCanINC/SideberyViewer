FROM node:18-bullseye AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm install
RUN npm run build

FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
EXPOSE 4000
VOLUME ["/app/data"]
CMD ["node","dist/server.js"]
