FROM node:18 AS builder
WORKDIR /app

# Copy package manifest and install dependencies (including dev deps needed for build)
COPY package*.json ./
RUN npm install --include=dev

# Copy rest of the sources and build
COPY . ./
ENV PATH=/app/node_modules/.bin:$PATH
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
