// Rotas de colaboradores. Nenhuma regra de negócio aqui — apenas
// mapeamento de método/caminho HTTP para o controller correspondente.

import { Router } from "express"
import type { ColaboradoresControllerDependencias } from "../controllers/colaboradores-controller.js"
import { criarColaboradoresController } from "../controllers/colaboradores-controller.js"

export function criarColaboradoresRouter(deps: ColaboradoresControllerDependencias): Router {
  const router = Router()
  const controller = criarColaboradoresController(deps)

  router.post("/colaboradores", controller.criar)
  router.get("/colaboradores/:id/periodos", controller.consultarPeriodos)

  return router
}
