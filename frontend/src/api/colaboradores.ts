// Chamadas HTTP relacionadas a colaboradores.
//
// Não existe aqui (nem em nenhum outro lugar do frontend) uma função
// para CRIAR colaborador — a criação é exclusivamente via API (ver
// PLAN.md, "Atualização do plano — decisões do frontend").

import { requisitar } from "./cliente.js"
import type { Colaborador, Periodo } from "../types/api.js"

export function listarColaboradores(): Promise<{ colaboradores: Colaborador[] }> {
  return requisitar("/colaboradores")
}

export function consultarPeriodos(colaboradorId: number): Promise<{ periodos: Periodo[] }> {
  return requisitar(`/colaboradores/${colaboradorId}/periodos`)
}
