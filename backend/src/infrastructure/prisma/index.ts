// Ponto único de composição dos repositories Prisma — usado pela
// futura camada de rotas HTTP (ainda não implementada) para construir
// as dependências dos application services com as implementações
// reais, em vez dos fakes usados nos testes.

import { PrismaClient } from "@prisma/client"
import { ColaboradorRepositoryPrisma } from "./colaborador-repository-prisma.js"
import { AgendamentoRepositoryPrisma } from "./agendamento-repository-prisma.js"

export function criarRepositoriesPrisma(prisma: PrismaClient) {
  return {
    colaboradorRepository: new ColaboradorRepositoryPrisma(prisma),
    agendamentoRepository: new AgendamentoRepositoryPrisma(prisma),
  }
}

export { ColaboradorRepositoryPrisma } from "./colaborador-repository-prisma.js"
export { AgendamentoRepositoryPrisma } from "./agendamento-repository-prisma.js"
