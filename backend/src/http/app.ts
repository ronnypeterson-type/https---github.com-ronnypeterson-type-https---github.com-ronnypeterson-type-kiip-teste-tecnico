// Composição do app Express — rotas, middlewares e tratamento de
// erros HTTP transversais (ex.: body JSON malformado).
//
// `createApp` recebe as dependências (repositories) como parâmetro, em
// vez de importá-las diretamente — isso permite que os testes HTTP
// injetem repositories fake, e que `server.ts` (execução real) injete
// os repositories Prisma (`dependencias.ts`), sem duas implementações
// paralelas dos casos de uso: ambos os caminhos chamam exatamente os
// mesmos application services.

import express, { type ErrorRequestHandler } from "express"
import cors from "cors"
import { healthRouter } from "./routes/health.js"
import { criarColaboradoresRouter } from "./routes/colaboradores-routes.js"
import { criarFeriasRouter } from "./routes/ferias-routes.js"
import { responderComErro } from "./erros-http.js"
import type { AgendamentoRepository, ColaboradorRepository } from "../application/repositories.js"

export interface AppDependencias {
  readonly colaboradorRepository: ColaboradorRepository
  readonly agendamentoRepository: AgendamentoRepository
}

export function createApp(deps: AppDependencias) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use(healthRouter)
  app.use(criarColaboradoresRouter(deps))
  app.use(criarFeriasRouter(deps))

  // Middleware de erro do Express: captura, entre outros casos, falhas
  // de parsing do `express.json()` (body JSON malformado) — que
  // acontecem antes de qualquer controller ser executado, logo não
  // seriam capturadas pelo try/catch interno dos controllers.
  const tratadorDeErroFinal: ErrorRequestHandler = (erro, _req, res, _next) => {
    responderComErro(res, erro)
  }
  app.use(tratadorDeErroFinal)

  return app
}
