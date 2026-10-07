// Tipos correspondentes exatamente ao contrato JSON da API REST do
// backend (ver backend/EXEMPLOS_CURL.md e backend/src/http/controllers).
//
// Datas são sempre strings "YYYY-MM-DD" (nunca Date) e valores
// monetários são sempre strings decimais com 2 casas (ex.: "1633.33",
// nunca number) — o frontend NUNCA recalcula nem reinterpreta esses
// valores, apenas os exibe e os envia de volta como texto.
//
// Estes tipos são definidos de forma independente dos tipos internos
// do backend (CalendarDate, bigint) propositalmente: frontend e
// backend só se comunicam via HTTP/JSON, e o contrato abaixo é a
// única fonte de verdade do lado do cliente (ver PLAN.md, "Atualização
// do plano — decisões do frontend", item 3).

export interface Colaborador {
  readonly id: number
  readonly nome: string
  readonly dataAdmissao: string
  readonly salarioMensal: string
}

export interface Periodo {
  readonly periodoNumero: number
  readonly aquisitivoInicio: string
  readonly aquisitivoFim: string
  readonly concessivoInicio: string
  readonly concessivoFim: string
  readonly diasAdquiridos: number
  readonly diasAgendados: number
  readonly diasDisponiveis: number
}

export type StatusAgendamento = "ativo" | "cancelado"

export interface ValoresFerias {
  readonly remuneracao: string
  readonly tercoConstitucional: string
  readonly total: string
}

export interface Agendamento {
  readonly id: number
  readonly colaboradorId: number
  readonly periodoNumero: number
  readonly dataInicio: string
  readonly dataFim: string
  readonly quantidadeDias: number
  readonly status: StatusAgendamento
  readonly valores: ValoresFerias
}

export interface NovoAgendamentoEntrada {
  readonly periodoNumero: number
  readonly dataInicio: string
  readonly quantidadeDias: number
}

/** Formato de erro padrão de toda a API (ver erros-http.ts no backend). */
export interface ErroApi {
  readonly error: {
    readonly code: string
    readonly message: string
  }
}
