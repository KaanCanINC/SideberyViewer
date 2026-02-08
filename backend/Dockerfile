FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json* ./
RUN apk add --no-cache python3 make g++ || true
RUN npm ci

COPY src ./src

RUN npm run build

EXPOSE 4000
CMD ["node", "dist/server.js"]