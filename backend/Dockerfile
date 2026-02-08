FROM node:18-alpine

WORKDIR /app

# install build deps
COPY package.json package-lock.json* tsconfig.json* ./
RUN apk add --no-cache python3 make g++ || true
RUN npm install

# copy source
COPY src ./src

# ensure data dir exists
RUN mkdir -p /app/data

# build
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]