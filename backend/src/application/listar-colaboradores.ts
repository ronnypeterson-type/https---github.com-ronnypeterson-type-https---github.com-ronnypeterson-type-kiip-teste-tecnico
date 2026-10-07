// Caso de uso: listar todos os colaboradores cadastrados.
//
// Decisão registrada em PLAN.md ("Atualização do plano — decisões do
// frontend"): este caso de uso foi adicionado para permitir que a UI
// possa oferecer a seleção de um colaborador já existente, sem a
// camada HTTP precisar acessar o repository diretamente. Não é uma
// regra de negócio (R1-R7) — é apenas leitura de dados já persistidos,
// reaproveitando o método `listar()` que já existia na interface
// `ColaboradorRepository` (usado internamente desde a etapa de
// domínio/persistência, mas que não possuía, até agora, nenhuma rota
// HTTP que o expusesse).
//
// A criação de colaborador continua exclusivamente via `POST
// /colaboradores` — este caso de uso não cria, não altera e não
// remove nenhum colaborador.

import type { Colaborador, ColaboradorRepository } from "./repositories.js"

export interface ListarColaboradoresDependencias {
  readonly colaboradorRepository: ColaboradorRepository
}

export async function listarColaboradores(
  { colaboradorRepository }: ListarColaboradoresDependencias,
): Promise<Colaborador[]> {
  return colaboradorRepository.listar()
}
