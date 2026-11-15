# ---------- Stage 1: the workshop (build the app) ----------
FROM public.ecr.aws/docker/library/node:22-alpine AS build
WORKDIR /app

# Copy the dependency lists first so Docker can cache "npm ci"
COPY package.json package-lock.json ./
RUN npm ci

# Now copy the source code and build the static site into /app/dist
COPY . .
ARG BUILD_ID=local
ENV VITE_BUILD_ID=$BUILD_ID
RUN npm run build

# ---------- Stage 2: the sleigh (serve the app) ----------
FROM public.ecr.aws/nginx/nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-elf.sh /docker-entrypoint.d/40-elf.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
