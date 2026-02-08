FROM node:20-bullseye AS builder
WORKDIR /app

# Copy package manifest and install dependencies (including dev deps needed for build)
COPY package*.json ./

# Install dependencies (including dev deps needed for build)
RUN npm install --include=dev

# Copy rest of the sources and build
COPY . ./
ENV PATH=/app/node_modules/.bin:$PATH
# Ensure node_modules binaries (vite, esbuild) are executable in build environment
RUN chmod -R a+rx node_modules || true
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
