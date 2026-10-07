// Caso de uso: criar colaborador.
//
// Não envolve nenhuma regra R1-R7 diretamente — a data de admissão só é
// validada estruturalmente (é responsabilidade de quem constrói o
// `CalendarDate` de entrada, ex. `fromISODateString`, já ter rejeitado
// datas inválidas antes de chegar aqui) e o salário só precisa ser
// positivo (mesma validação que já existe como `CHECK` de banco,
// replicada aqui para devolver um erro mais amigável antes de tentar a
// persistência).

import type { Colaborador, ColaboradorRepository, NovoColaborador } from "./repositories.js"

export class EntradaInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = "EntradaInvalidaError"
  }
}

export interface CriarColaboradorDependencias {
  readonly colaboradorRepository: ColaboradorRepository
}

export async function criarColaborador(
  { colaboradorRepository }: CriarColaboradorDependencias,
  dados: NovoColaborador,
): Promise<Colaborador> {
  if (!dados.nome || dados.nome.trim().length === 0) {
    throw new EntradaInvalidaError("O nome do colaborador é obrigatório.")
  }

  if (dados.salarioCentavos <= 0n) {
    throw new EntradaInvalidaError("O salário mensal deve ser um valor positivo.")
  }

  return colaboradorRepository.criar(dados)
}
