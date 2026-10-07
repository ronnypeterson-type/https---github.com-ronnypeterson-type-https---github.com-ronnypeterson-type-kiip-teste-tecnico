# Frontend — build multi-stage: Vite build (stage 1) + Nginx estático (stage 2).
#
# VITE_API_URL é embutido no bundle JS em TEMPO DE BUILD (o Vite resolve
# `import.meta.env.VITE_API_URL` estaticamente — não é lido em runtime
# pelo navegador). Por isso é passado como build ARG, nunca como
# `environment:` do serviço no docker-compose.yml (isso não teria
# nenhum efeito, já que não há mais nenhum processo Node rodando no
# container de runtime, só arquivos estáticos servidos pelo Nginx).
#
# O valor usado é sempre "/api" (caminho relativo à própria origem que
# serve a página) — nunca um host:porta absoluto como "http://backend:3001",
# que o navegador do usuário jamais conseguiria resolver (ver
# nginx.conf: é o Nginx, não o navegador, que repassa "/api/*" para o
# backend, dentro da rede interna do Docker).

# ---- Stage 1: build ---------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tailwind.config.js postcss.config.js vite.config.ts index.html ./
COPY src ./src

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---- Stage 2: runtime (estático via Nginx) -----------------------------
FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
