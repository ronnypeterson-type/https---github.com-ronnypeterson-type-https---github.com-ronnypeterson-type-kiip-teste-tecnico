// Helper de testes HTTP: monta o app Express real (`createApp`, o
// mesmo usado em produção) com repositories FAKE (em memória), em vez
// dos repositories Prisma.
//
// Isto testa a camada HTTP real (rotas, controllers, middlewares,
// mapeamento de erros, serialização) através de requisições HTTP de
// verdade (via Supertest) — não chama controllers diretamente. A única
// coisa substituída é a implementação de persistência (fake em vez de
// Prisma), porque este ambiente não possui PostgreSQL disponível (ver
// relatório desta etapa). Isso NÃO é um mock que esconde a integração
// real do HTTP: o Express, o parsing de JSON, o roteamento, os
// controllers e os application services são exatamente os mesmos que
// rodam em produção — apenas a fonte de dados é trocada, da mesma forma
// que os testes de application service (etapas anteriores) já faziam.

import { createApp } from "../../../src/http/app.js"
import { ColaboradorRepositoryFake } from "../../../src/application/fakes/colaborador-repository-fake.js"
import { AgendamentoRepositoryFake } from "../../../src/application/fakes/agendamento-repository-fake.js"

export function criarAppDeTeste() {
  const colaboradorRepository = new ColaboradorRepositoryFake()
  const agendamentoRepository = new AgendamentoRepositoryFake()

  const app = createApp({ colaboradorRepository, agendamentoRepository })

  return { app, colaboradorRepository, agendamentoRepository }
}
