// Composição das dependências reais (Prisma) usadas pela camada HTTP em
// produção/execução real — ÚNICA fonte de verdade para os casos de uso.
//
// Reutiliza a instância singleton do Prisma Client já existente
// (`repositories/prisma.ts`) e o ponto único de composição de
// repositories Prisma já existente (`infrastructure/prisma/index.ts`)
// — não cria uma segunda implementação paralela de nada.
//
// Os testes HTTP desta etapa usam repositories FAKE (não esta
// composição), montados separadamente em cada arquivo de teste — ver
// `tests/http/`.

import { prisma } from "../repositories/prisma.js"
import { criarRepositoriesPrisma } from "../infrastructure/prisma/index.js"

export const dependenciasHttp = criarRepositoriesPrisma(prisma)
