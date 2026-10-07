// Caso de uso: agendar férias.
//
// Orquestra R1, R2, R3, R4, R5 e R6 (nenhuma delas é reimplementada
// aqui — todas as funções chamadas abaixo já existem no domínio). R7 não
// participa da validação: é um cálculo de exibição, usado só para
// montar a resposta deste caso de uso depois que o agendamento já foi
// aceito e persistido (ver PLAN.md, seção "Atualização do plano —
// decisões da camada de aplicação").
//
// Ordem de validação (ver análise arquitetural registrada na conversa
// de desenvolvimento — a ordem é uma escolha de "falhar rápido e
// barato", não uma exigência matemática entre as regras):
//   1. buscar colaborador (recurso);
//   2. R1 — calcular o período aquisitivo escolhido;
//   3. R2 — calcular o concessivo e validar que o intervalo está contido
//      nele;
//   4. R4 — validar a data de início (não depende de dados do banco);
//   5. R6 — validar que a data de início é futura (não depende de dados
//      do banco);
//   6. R3 — buscar agendamentos ativos DO MESMO periodoNumero e validar
//      fracionamento;
//   7. R5 — buscar agendamentos ativos de TODOS os períodos do
//      colaborador e validar sobreposição;
//   8. persistir o agendamento;
//   9. R7 — calcular os valores financeiros para a resposta.
//
// R3 usa somente os agendamentos ativos do período aquisitivo
// escolhido (`listarAtivosPorColaboradorEPeriodo`) — nunca de outros
// períodos. R5 usa todos os agendamentos ativos do colaborador
// (`listarAtivosPorColaborador`), independentemente do período
// aquisitivo — exatamente como o texto da regra exige ("inclusive
// quando pertencem a períodos aquisitivos diferentes"). Agendamentos
// cancelados nunca entram em nenhuma das duas listas, porque os
// métodos de repository usados aqui já filtram por "ativos" — a
// responsabilidade de excluir cancelados é do repository, não desta
// orquestração nem do domínio.
//
// Esta função NÃO implementa nenhuma transação de banco — a interface
// de repository está preparada para que a futura implementação Prisma
// execute toda a sequência de leitura+escrita dentro de uma transação
// (ver PLAN.md/análise de concorrência); isso será resolvido junto do
// repository Prisma, não nesta etapa.

import { addDays, type CalendarDate } from "../utils/calendar-date.js"
import { calcularPeriodoAquisitivo } from "../domain/periodo-aquisitivo.js"
import { calcularPeriodoConcessivo, estaDentroDoConcessivo } from "../domain/periodo-concessivo.js"
import { derivarEstadoFracionamento, validarNovoPeriodo } from "../domain/fracionamento.js"
import { validarDiaInicio } from "../domain/dia-inicio.js"
import { validarSemSobreposicao, type IntervaloFerias } from "../domain/sobreposicao.js"
import { validarAgendamentoFuturo } from "../domain/data-atual.js"
import { calcularValoresFerias, type ValoresFerias } from "../domain/valores-ferias.js"
import { RegraNegocioError } from "../domain/regra-negocio-error.js"
import { RecursoNaoEncontradoError } from "./erros.js"
import type { Agendamento, AgendamentoRepository, ColaboradorRepository } from "./repositories.js"

export interface AgendarFeriasDependencias {
  readonly colaboradorRepository: ColaboradorRepository
  readonly agendamentoRepository: AgendamentoRepository
}

export interface AgendarFeriasEntrada {
  readonly colaboradorId: number
  readonly periodoNumero: number
  readonly dataInicio: CalendarDate
  readonly quantidadeDias: number
}

export interface AgendarFeriasResultado {
  readonly agendamento: Agendamento
  readonly dataFim: CalendarDate
  readonly valores: ValoresFerias
}

export async function agendarFerias(
  { colaboradorRepository, agendamentoRepository }: AgendarFeriasDependencias,
  entrada: AgendarFeriasEntrada,
  hoje: CalendarDate,
): Promise<AgendarFeriasResultado> {
  const colaborador = await colaboradorRepository.buscarPorId(entrada.colaboradorId)

  if (!colaborador) {
    throw new RecursoNaoEncontradoError(
      `Colaborador com id ${entrada.colaboradorId} não encontrado.`,
    )
  }

  // R1 — período aquisitivo escolhido.
  calcularPeriodoAquisitivo(colaborador.dataAdmissao, entrada.periodoNumero)

  // R2 — período concessivo e contenção do intervalo completo.
  const concessivo = calcularPeriodoConcessivo(colaborador.dataAdmissao, entrada.periodoNumero)
  const dataFim = addDays(entrada.dataInicio, entrada.quantidadeDias - 1)

  if (!estaDentroDoConcessivo(entrada.dataInicio, dataFim, concessivo)) {
    throw new RegraNegocioError(
      "R2",
      "Este período de férias precisa estar totalmente dentro do período concessivo do aquisitivo escolhido.",
    )
  }

  // R4 — data de início válida (não depende de dados do banco).
  validarDiaInicio(entrada.dataInicio)

  // R6 — data de início futura (não depende de dados do banco).
  validarAgendamentoFuturo(entrada.dataInicio, hoje)

  // R3 — fracionamento, considerando somente os agendamentos ativos do
  // MESMO período aquisitivo escolhido.
  const agendamentosAtivosDoPeriodo = await agendamentoRepository.listarAtivosPorColaboradorEPeriodo(
    entrada.colaboradorId,
    entrada.periodoNumero,
  )
  const estadoFracionamento = derivarEstadoFracionamento(
    agendamentosAtivosDoPeriodo.map((agendamento) => agendamento.quantidadeDias),
  )
  validarNovoPeriodo(estadoFracionamento, entrada.quantidadeDias)

  // R5 — sobreposição, considerando TODOS os agendamentos ativos do
  // colaborador, independentemente do período aquisitivo.
  const agendamentosAtivosDoColaborador =
    await agendamentoRepository.listarAtivosPorColaborador(entrada.colaboradorId)
  const intervalosExistentes: IntervaloFerias[] = agendamentosAtivosDoColaborador.map(
    (agendamento) => ({
      dataInicio: agendamento.dataInicio,
      dataFim: addDays(agendamento.dataInicio, agendamento.quantidadeDias - 1),
    }),
  )
  validarSemSobreposicao(intervalosExistentes, { dataInicio: entrada.dataInicio, dataFim })

  // Todas as regras passaram — persiste o agendamento.
  const agendamento = await agendamentoRepository.criar({
    colaboradorId: entrada.colaboradorId,
    periodoNumero: entrada.periodoNumero,
    dataInicio: entrada.dataInicio,
    quantidadeDias: entrada.quantidadeDias,
  })

  // R7 — valores financeiros, apenas para a resposta (não é validação).
  const valores = calcularValoresFerias(colaborador.salarioCentavos, entrada.quantidadeDias)

  return { agendamento, dataFim, valores }
}
