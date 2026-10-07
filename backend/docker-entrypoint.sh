#!/bin/sh
# Entrypoint do container de runtime do backend.
#
# Ordem fixa, sem passo manual: aplica as migrations já versionadas
# (prisma/migrations/) contra o PostgreSQL definido em DATABASE_URL, e
# só então inicia a API já compilada. `prisma migrate deploy` (não
# `migrate dev`) é o comando correto para ambientes não interativos —
# ele nunca pergunta nada e nunca gera uma nova migration, apenas
# aplica as que já existem no repositório.
#
# Pressupõe que o PostgreSQL já está pronto para aceitar conexões —
# isso é garantido pelo docker-compose.yml via
# `depends_on: postgres: condition: service_healthy`, não por retry
# aqui dentro.
set -e

echo "Aplicando migrations do Prisma..."
npx prisma migrate deploy

echo "Iniciando a API..."
exec node dist/http/server.js
