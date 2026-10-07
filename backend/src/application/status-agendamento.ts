// Status de um agendamento, na representação da camada de aplicação.
//
// Este tipo é independente do enum `StatusAgendamento` gerado pelo
// Prisma Client (`prisma/schema.prisma`) — a camada de aplicação não
// importa `@prisma/client`. A futura implementação Prisma do
// `AgendamentoRepository` é responsável por converter entre este tipo e
// o enum gerado pelo Prisma.

export type StatusAgendamento = "ativo" | "cancelado"
