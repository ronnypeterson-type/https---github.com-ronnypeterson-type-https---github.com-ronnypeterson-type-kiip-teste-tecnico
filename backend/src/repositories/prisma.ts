import { PrismaClient } from "@prisma/client"

// Instância única do Prisma Client, usada pelos repositories.
// Configuração mínima necessária para esta etapa — repositories completos
// (consultas específicas de colaborador/agendamento) serão criados nas
// próximas etapas, junto com a camada de domínio.
export const prisma = new PrismaClient()
