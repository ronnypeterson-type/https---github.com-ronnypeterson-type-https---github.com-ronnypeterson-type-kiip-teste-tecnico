// Erro de domínio para rejeições de regras de negócio (R1-R7).
//
// Conforme CLAUDE.md, seção "7. Tratamento de erros": toda operação
// rejeitada por regra de negócio deve informar o código da regra
// responsável (R1-R7) e uma mensagem clara, compreensível para uma
// pessoa de RH, sem jargão técnico nem detalhes internos.
//
// Este tipo é compartilhado por todas as regras (R1-R7) que podem
// rejeitar uma operação — evita duplicar o formato do erro em cada
// arquivo de regra.

export type CodigoRegraNegocio = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7"

export class RegraNegocioError extends Error {
  readonly codigo: CodigoRegraNegocio

  constructor(codigo: CodigoRegraNegocio, mensagem: string) {
    super(mensagem)
    this.name = "RegraNegocioError"
    this.codigo = codigo
  }
}
