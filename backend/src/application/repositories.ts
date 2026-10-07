// Interfaces de repository da camada de aplicação.
//
// Estas interfaces definem o contrato que a camada de aplicação (use
// cases) depende — nunca uma implementação concreta. A implementação
// real (Prisma) e a implementação fake (em memória, usada nos testes
// desta etapa) implementam a mesma interface, permitindo testar a
// orquestração das regras sem PostgreSQL (ver CLAUDE.md, seção "9.
// Separação de responsabilidades": "repositories devem cuidar
// exclusivamente do acesso aos dados").
//
// Os tipos de entidade abaixo (`Colaborador`, `Agendamento`) já usam os
// tipos de domínio (`CalendarDate` para datas, `bigint` de centavos para
// o salário) — a conversão de/para `Prisma.Decimal`/`Date` do banco é
// responsabilidade exclusiva da futura implementação Prisma do
// repository, nunca desta interface nem dos use cases.
//
// Nenhuma regra R1-R7 é implementada aqui — apenas os métodos de
// persistência estritamente necessários para os 5 casos de uso desta
// etapa (nenhum método especulativo).

import type { CalendarDate } from "../utils/calendar-date.js"
import type { StatusAgendamento } from "./status-agendamento.js"

export interface Colaborador {
  readonly id: number
  readonly nome: string
  readonly dataAdmissao: CalendarDate
  readonly salarioCentavos: bigint
}

export type NovoColaborador = Omit<Colaborador, "id">

export interface Agendamento {
  readonly id: number
  readonly colaboradorId: number
  readonly periodoNumero: number
  readonly dataInicio: CalendarDate
  readonly quantidadeDias: number
  readonly status: StatusAgendamento
}

export type NovoAgendamento = Omit<Agendamento, "id" | "status">

export interface ColaboradorRepository {
  criar(dados: NovoColaborador): Promise<Colaborador>
  buscarPorId(id: number): Promise<Colaborador | null>
  listar(): Promise<Colaborador[]>
}

export interface AgendamentoRepository {
  criar(dados: NovoAgendamento): Promise<Agendamento>
  buscarPorId(id: number): Promise<Agendamento | null>
  listarAtivosPorColaborador(colaboradorId: number): Promise<Agendamento[]>
  listarAtivosPorColaboradorEPeriodo(
    colaboradorId: number,
    periodoNumero: number,
  ): Promise<Agendamento[]>
  listarTodosPorColaborador(colaboradorId: number): Promise<Agendamento[]>
  cancelar(id: number): Promise<Agendamento>
}
