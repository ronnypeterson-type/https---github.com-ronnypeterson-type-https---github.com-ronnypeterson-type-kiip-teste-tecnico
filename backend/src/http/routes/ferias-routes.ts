// Rotas de férias (agendar/cancelar/listar). Nenhuma regra de negócio
// aqui — apenas mapeamento de método/caminho HTTP para o controller
// correspondente.

import { Router } from "express"
import type { FeriasControllerDependencias } from "../controllers/ferias-controller.js"
import { criarFeriasController } from "../controllers/ferias-controller.js"

export function criarFeriasRouter(deps: FeriasControllerDependencias): Router {
  const router = Router()
  const controller = criarFeriasController(deps)

  router.post("/colaboradores/:id/ferias", controller.agendar)
  router.delete("/colaboradores/:id/ferias/:agendamentoId", controller.cancelar)
  router.get("/colaboradores/:id/ferias", controller.listar)

  return router
}
