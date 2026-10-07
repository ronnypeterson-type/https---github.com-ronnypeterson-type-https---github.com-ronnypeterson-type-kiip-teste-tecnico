// Implementação real (Prisma/PostgreSQL) de `ColaboradorRepository`.
//
// Esta é a ÚNICA camada que conhece tanto Prisma quanto os tipos de
// domínio/aplicação — a interface `ColaboradorRepository` (camada de
// aplicação) não importa Prisma; o domínio (R1-R7) não importa nem
// Prisma nem a camada de aplicação. Nenhuma regra de negócio é
// implementada aqui — apenas tradução de dados entre o banco e os tipos
// de aplicação.

import type { PrismaClient } from "@prisma/client"
import type { Colaborador, ColaboradorRepository, NovoColaborador } from "../../application/repositories.js"
import {
  calendarDateParaDate,
  centavosParaDecimal,
  dateParaCalendarDate,
  decimalParaCentavos,
} from "./conversoes.js"

export class ColaboradorRepositoryPrisma implements ColaboradorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(dados: NovoColaborador): Promise<Colaborador> {
    const registro = await this.prisma.colaborador.create({
      data: {
        nome: dados.nome,
        dataAdmissao: calendarDateParaDate(dados.dataAdmissao),
        salarioMensal: centavosParaDecimal(dados.salarioCentavos),
      },
    })

    return paraColaborador(registro)
  }

  async buscarPorId(id: number): Promise<Colaborador | null> {
    const registro = await this.prisma.colaborador.findUnique({ where: { id } })
    return registro ? paraColaborador(registro) : null
  }

  async listar(): Promise<Colaborador[]> {
    const registros = await this.prisma.colaborador.findMany()
    return registros.map(paraColaborador)
  }
}

function paraColaborador(registro: {
  id: number
  nome: string
  dataAdmissao: Date
  salarioMensal: Parameters<typeof decimalParaCentavos>[0]
}): Colaborador {
  return {
    id: registro.id,
    nome: registro.nome,
    dataAdmissao: dateParaCalendarDate(registro.dataAdmissao),
    salarioCentavos: decimalParaCentavos(registro.salarioMensal),
  }
}
