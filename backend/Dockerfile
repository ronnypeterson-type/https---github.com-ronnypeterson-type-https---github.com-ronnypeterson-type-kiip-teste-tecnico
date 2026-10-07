# Backend — build multi-stage reproduzível (sem depender de node_modules
# do host) + imagem de runtime mínima.
#
# Fluxo de inicialização do container de runtime (ver docker-entrypoint.sh):
#   1. `prisma migrate deploy` — aplica as migrations já versionadas em
#      prisma/migrations/ contra o PostgreSQL apontado por DATABASE_URL
#      (fornecido pelo docker-compose.yml, nunca `prisma migrate dev`,
#      que é interativo/de desenvolvimento).
#   2. `node dist/http/server.js` — inicia a API já compilada.
#
# Nenhuma regra de negócio (R1-R7) nem a arquitetura de domínio foram
# alteradas por este Dockerfile — ele só empacota o que já existe.

# ---- Stage 1: build -------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copia primeiro só os manifestos para aproveitar o cache de camadas do
# Docker: `npm ci` só reexecuta quando package.json/package-lock.json
# mudam, não a cada alteração de código-fonte.
COPY package.json package-lock.json ./
RUN npm ci

# Prisma precisa do schema para gerar o client, mesmo antes de copiar o
# restante do código — mantém o cache de `npm ci` intacto se só o
# código de domínio mudar.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: runtime ------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Reinstala só as dependências de produção (sem devDependencies como
# typescript/vitest/tsx) — imagem de runtime menor, reproduzível a
# partir do mesmo lockfile usado no build.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma Client gerado no stage de build (depende do schema + do
# binário do motor Prisma, específico da plataforma — copiado inteiro
# do stage anterior para garantir compatibilidade).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=build /app/dist ./dist
COPY prisma ./prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
