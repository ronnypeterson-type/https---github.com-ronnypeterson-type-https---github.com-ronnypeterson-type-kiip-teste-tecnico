// Erros da camada de aplicação, distintos de `RegraNegocioError` (ver
// CLAUDE.md, seção "7. Tratamento de erros"):
//
// `RegraNegocioError` (já existente no domínio) representa a violação de
// uma regra de negócio R1-R7 — uma operação estruturalmente válida que o
// enunciado do teste proíbe (ex.: data de início inválida, sobreposição,
// fracionamento inviável).
//
// Os erros abaixo são de natureza diferente: não são regras R1-R7, são
// situações sobre a EXISTÊNCIA ou o ESTADO de um recurso, levantadas pela
// camada de aplicação (use cases), não pelo domínio. Essa distinção foi
// identificada e decidida explicitamente na etapa de planejamento da
// camada de aplicação (ver PLAN.md, seção "Atualização do plano —
// decisões da camada de aplicação"):
//   - "colaborador/agendamento não encontrado" não é uma regra de
//     negócio, é um erro de recurso inexistente (futuramente mapeado
//     para HTTP 404);
//   - "cancelar um agendamento já cancelado" não é uma violação de R6
//     (R6 fala sobre a DATA, não sobre o ESTADO do registro) — é um
//     conflito de estado (futuramente mapeado para HTTP 409).
//
// Não é um framework genérico de erros: apenas as duas abstrações
// mínimas necessárias para os casos de uso desta etapa.

export class RecursoNaoEncontradoError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = "RecursoNaoEncontradoError"
  }
}

export class ConflitoDeEstadoError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = "ConflitoDeEstadoError"
  }
}
