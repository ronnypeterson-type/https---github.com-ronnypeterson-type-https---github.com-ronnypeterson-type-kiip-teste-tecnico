// Repository fake (em memória) de Colaborador — infraestrutura de
// TESTE apenas, implementa a interface `ColaboradorRepository` da
// camada de aplicação, sem nenhuma dependência de Prisma/banco.
//
// Usado pelos testes unitários dos application services, para testar a
// orquestração das regras (R1-R7) sem precisar de PostgreSQL.

import type { Colaborador, ColaboradorRepository, NovoColaborador } from "../repositories.js"

export class ColaboradorRepositoryFake implements ColaboradorRepository {
  private readonly colaboradores = new Map<number, Colaborador>()
  private proximoId = 1

  async criar(dados: NovoColaborador): Promise<Colaborador> {
    const colaborador: Colaborador = { id: this.proximoId, ...dados }
    this.colaboradores.set(colaborador.id, colaborador)
    this.proximoId += 1
    return colaborador
  }

  async buscarPorId(id: number): Promise<Colaborador | null> {
    return this.colaboradores.get(id) ?? null
  }

  async listar(): Promise<Colaborador[]> {
    return Array.from(this.colaboradores.values())
  }
}
