# Plano de Desenvolvimento

## 1. Objetivo

Este documento registra o plano original do sistema de controle de férias, elaborado **antes** de qualquer implementação. O sistema será construído para um teste técnico de Desenvolvedor Pleno e deverá permitir, ao final, que um avaliador suba a aplicação completa (frontend, backend e banco de dados) em uma máquina limpa executando somente `docker compose up --build`, sem qualquer dependência da plataforma Brixly ou de passos manuais adicionais.

O sistema deverá cobrir: cadastro de colaboradores, consulta de saldo por período aquisitivo, agendamento de férias, cancelamento de períodos, listagem de períodos com valores calculados, interface web mínima e API documentada, respeitando integralmente as regras R1 a R7 descritas no enunciado do teste.

## 2. Requisitos

**Funcionais**
- Cadastrar colaborador (nome, data de admissão, salário mensal).
- Consultar saldo de cada período aquisitivo de um colaborador (datas do aquisitivo, datas do concessivo, dias agendados, dias disponíveis).
- Agendar férias (colaborador, aquisitivo escolhido, data de início, quantidade de dias).
- Cancelar período de férias já agendado.
- Listar períodos agendados com os valores calculados (remuneração, terço, total).

**Não funcionais**
- API documentada.
- Testes automatizados cobrindo as regras R1 a R7.
- Execução completa via `docker compose up --build`, incluindo migrations automáticas do banco.
- README completo.
- Histórico de commits reais e incrementais.
- Registro de decisões de IA em AI-LOG.md.
- Arquitetura deliberadamente simples: sem autenticação, autorização, cache, filas, gateway ou microsserviços — esses itens não são critério de avaliação conforme o enunciado.

## 3. Arquitetura

```
┌─────────────┐      HTTP/JSON      ┌─────────────┐      SQL (Prisma)      ┌─────────────┐
│  frontend   │ ───────────────────▶│   backend   │──────────────────────▶│  postgres   │
│ React + TS  │   fetch()           │ Express+TS  │   pool de conexões     │  container  │
│ Vite+Tailwind│◀────────────────── │  porta 3001 │◀──────────────────── │  porta 5432 │
└─────────────┘      JSON           └─────────────┘                        └─────────────┘
```

- **Frontend**: React + TypeScript + Vite + Tailwind, servido como estático (build) dentro de um container próprio.
- **Backend**: Node + Express + TypeScript, API REST/JSON, porta 3001.
- **Banco**: PostgreSQL, como serviço dedicado do Docker Compose.
- **ORM**: Prisma — schema declarativo e `migrate deploy` automático na inicialização do backend.
- **Testes**: Vitest para unitários e testes de API; estratégia de integração com PostgreSQL real detalhada na seção 8.
- **Comunicação**: REST/JSON simples, sem GraphQL, sem WebSocket.

A arquitetura será mantida deliberadamente simples, sem microsserviços, filas, Redis, cache, gateway, autenticação ou autorização, conforme indicado no enunciado do teste.

## 4. Estrutura do projeto

```
2e22967b/
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middlewares/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   ├── api/
│   │   └── integration/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── README.md
├── PLAN.md
├── AI-LOG.md
├── CLAUDE.md
└── .gitignore
```

As regras R1 a R7 serão isoladas em `backend/src/services/`, como funções que recebem e retornam dados simples (sem acesso direto a `req`/`res` ou ao Prisma), sempre que tecnicamente apropriado, permitindo que sejam testadas unitariamente sem HTTP e sem banco de dados real.

## 5. Modelo de dados planejado

Entidades previstas (sujeitas a ajuste fino durante a modelagem no Prisma):

**Colaborador**
- id
- nome
- data de admissão (data de calendário, sem horário)
- salário mensal

**PeríodoAquisitivo**
- id
- colaborador (referência)
- data de início do aquisitivo
- data de fim do aquisitivo
- data de início do concessivo (derivada do fim do aquisitivo)
- data de fim do concessivo (derivada do fim do aquisitivo)
- dias totais (30, fixo por regra)

**Agendamento**
- id
- período aquisitivo (referência)
- data de início
- data de fim (derivada da data de início + quantidade de dias)
- quantidade de dias
- status (ativo / cancelado)

Os períodos aquisitivos poderão ser calculados sob demanda a partir da data de admissão (sem persistência própria) ou persistidos conforme se mostrar mais simples durante a modelagem — essa escolha será decidida na etapa de modelagem do banco (seção 19).

## 6. Regras de negócio

As regras R1 a R7 do enunciado serão implementadas como funções puras e isoladas da camada HTTP/banco, cada uma testável independentemente:

- **R1 — Período aquisitivo**: cálculo de cada período de 12 meses a partir da data de admissão, com tratamento explícito de datas-fim-de-mês inexistentes (ex.: admissão em 29/02 cairá em 28/02 nos anos não bissextos).
- **R2 — Período concessivo**: janela de 12 meses após o fim do aquisitivo; agendamento só é válido se todos os dias do período estiverem dentro do concessivo correspondente; dias não utilizados após o fim do concessivo são considerados perdidos (não haverá "recuperação" automática de saldo).
- **R3 — Fracionamento**: no máximo 3 períodos por aquisitivo; um período com no mínimo 14 dias; os demais com no mínimo 5 dias cada; validação de que o saldo restante após cada novo agendamento ainda permite completar os 30 dias respeitando essas regras (sem exigir que o saldo seja todo agendado de imediato).
- **R4 — Dia de início**: bloqueio de início em domingo, feriado, nos dois dias anteriores a domingo e nos dois dias anteriores a feriado; lista fixa de feriados por ano (2026, 2027, 2028) definida no código; o término do período não possui essa restrição.
- **R5 — Sem sobreposição**: nenhum dia pode ser compartilhado entre dois períodos agendados do mesmo colaborador, mesmo pertencendo a aquisitivos diferentes.
- **R6 — Hoje**: agendamento e cancelamento só são permitidos para períodos com início estritamente posterior à data atual; cancelamento devolve os dias ao saldo do aquisitivo correspondente.
- **R7 — Valores**: remuneração = salário × dias ÷ 30; terço = salário × dias ÷ 90; cálculo com precisão total até o fim, arredondamento para centavos apenas no resultado final, meio centavo arredondando para cima; o total será a soma dos valores já arredondados (não o arredondamento da soma).

## 7. Estratégia de datas

O enunciado define todas as datas como datas de calendário (ano-mês-dia), sem horário, no fuso America/Sao_Paulo. O uso direto do objeto `Date` do JavaScript será evitado como estrutura de armazenamento e comparação de regras de negócio, pelo risco conhecido de deslocamento de um dia causado por conversões de fuso horário e por horário de verão histórico.

Estratégia planejada:
- Datas de calendário serão representadas internamente como uma tripla (ano, mês, dia) ou como string no formato `YYYY-MM-DD`, nunca com componente de hora.
- Toda soma/subtração de dias, comparação de "antes/depois/igual" e cálculo de diferença entre datas será feita por uma camada própria de utilitários de data de calendário (a ser definida na etapa de camada de domínio), sem depender de aritmética de milissegundos do `Date`.
- Operações sensíveis — como "aniversário correspondente da admissão" e "último dia existente do mês" (regra do 29/02) — serão implementadas com lógica de calendário explícita (ano/mês/dia), não com `setMonth`/`setDate` do `Date` nativo, cujo comportamento de overflow é conhecido por gerar resultados incorretos nesse tipo de cálculo.
- No banco de dados, as colunas de data serão do tipo `DATE` (sem componente de hora), evitando qualquer interpretação de fuso horário pelo driver ou pelo Prisma.
- No frontend, as datas serão exibidas e enviadas como strings `YYYY-MM-DD`, sem conversão para objetos `Date` locais do navegador antes do envio à API.
- A biblioteca específica (nativa com utilitários próprios, ou uma biblioteca de terceiros madura para datas de calendário) ainda não foi decidida — ver seção 19.

## 8. Estratégia de testes

Os testes serão escritos para comprovar comportamento e regras específicas, não para maximizar número de casos ou cobertura percentual.

**1. Testes unitários (R1 a R7)** — Vitest, sem banco de dados, cobrindo:
- Casos normais de cada regra.
- Casos de borda (ex.: admissão em 29/02 e seus próximos aniversários; limites exatos do concessivo; início de período em feriado versus dia comum).
- Os casos explicitamente fornecidos pelo enunciado, incluindo todos os exemplos de R3 (14+16 aceita; 5+25 aceita; 14+6+10 aceita; 10+10 segundo recusado; 26 recusado; 14+6+6 terceiro recusado) e o exemplo numérico completo de R7 (salário R$ 3.500,00, 14 dias → remuneração R$ 1.633,33, terço R$ 544,44, total R$ 2.177,77).

**2. Testes de API** — Vitest + supertest (ou equivalente), exercitando as rotas HTTP com um banco de teste, cobrindo os fluxos principais (cadastrar colaborador, consultar saldo, agendar, cancelar, listar) e as respostas de erro esperadas (ex.: tentativa de agendamento que viola R3, R4, R5 ou R6).

**3. Testes de integração com PostgreSQL real** — exercitando a camada de repositório e as migrations contra uma instância real de PostgreSQL, validando que o schema e as consultas funcionam como esperado fora de qualquer mock.

A execução de cada camada de teste dentro da Brixly versus em ambiente Docker real está detalhada nas seções 12 e 16.

## 9. API planejada

Endpoints previstos (nomes e verbos sujeitos a refinamento na etapa de implementação da API):

- `POST /colaboradores` — cadastrar colaborador.
- `GET /colaboradores` — listar colaboradores.
- `GET /colaboradores/:id/periodos` — consultar períodos aquisitivos e saldo de um colaborador.
- `POST /agendamentos` — agendar férias (colaborador, período aquisitivo, data de início, quantidade de dias).
- `DELETE /agendamentos/:id` — cancelar um agendamento.
- `GET /agendamentos` — listar períodos agendados com valores calculados (remuneração, terço, total).

A documentação da API será produzida junto da implementação das rotas (especificação do formato de entrada/saída de cada endpoint, códigos de erro e exemplos), e detalhada no README.

## 10. Frontend planejado

Interface web mínima e funcional, sem preocupação com sofisticação visual, cobrindo:
- Formulário de cadastro de colaborador.
- Tela de consulta de saldo por período aquisitivo (datas do aquisitivo, datas do concessivo, dias agendados, dias disponíveis).
- Formulário de agendamento de férias.
- Ação de cancelamento de um período agendado.
- Listagem de períodos com os valores calculados.

Comunicação com o backend via `fetch`, usando uma variável de ambiente de build (`VITE_API_URL`) para o endereço da API, sem acoplamento a qualquer recurso específico da Brixly.

## 11. Docker

O `docker-compose.yml` final deverá conter três serviços: `frontend`, `backend` e `postgres`.

- O serviço `postgres` usará uma imagem oficial com versão fixada (não `latest`), com `healthcheck` configurado.
- O serviço `backend` dependerá do `postgres` com a condição de saúde (`service_healthy`), e executará as migrations do Prisma automaticamente na inicialização do container, sem exigir qualquer comando manual adicional após `docker compose up --build`.
- O serviço `frontend` será construído em múltiplos estágios (build Vite seguido de servidor estático leve) e dependerá do `backend`.
- Nenhuma variável sensível será fixada no repositório; valores de exemplo ficarão em arquivos `.env.example`.
- O sistema completo não deverá depender, em nenhum momento, de qualquer recurso específico da infraestrutura da Brixly (nem do backend `/_api`, nem de variáveis de ambiente da plataforma).

## 12. Estratégia de desenvolvimento na Brixly

A Brixly será usada apenas como ambiente de edição e execução parcial, já que o ambiente atual não possui Docker nem PostgreSQL instalados, e esses componentes não serão instalados no host da Brixly.

Será desenvolvido e validado dentro da Brixly:
- Toda a camada de domínio (regras R1 a R7), com testes unitários executados de fato via Vitest/Node, sem necessidade de banco de dados.
- As rotas HTTP do backend, com validação estática de tipos (`tsc`) e testes manuais pontuais usando um repositório em memória, quando necessário para verificar o comportamento das rotas sem um banco real.
- O schema do Prisma, validado estaticamente (`prisma validate`/`prisma generate`), sem execução contra uma instância real de banco.
- O frontend completo, executado via Vite normalmente.
- A escrita de todos os Dockerfiles e do `docker-compose.yml`, validados por revisão manual de sintaxe e consistência (nomes de serviço, variáveis, portas), sem execução real do Docker.
- A inicialização do Git e a construção do histórico de commits.

Não será possível, dentro da Brixly, executar `docker compose up --build` de ponta a ponta, nem os testes de integração que dependem de PostgreSQL real. Essa limitação é assumida deliberadamente e compensada pela validação externa descrita na seção 16.

## 13. Git e commits

O repositório Git será inicializado neste diretório do projeto, de forma independente da infraestrutura da Brixly. O histórico será composto por commits pequenos e coerentes, representando etapas reais do desenvolvimento, sem uso de squash ao final e sem fabricação retroativa de histórico.

Convenção de commits planejada (mensagens curtas, descrevendo o que foi feito e, quando pertinente, por quê):
- Preparação do repositório e configuração inicial.
- Criação do `CLAUDE.md`.
- Estrutura do monorepo (frontend/backend).
- Modelagem do banco (schema Prisma).
- Implementação da camada de domínio, com commits possivelmente separados por regra (R1, R2, R3, R4, R5, R6, R7) à medida que cada uma for implementada e testada.
- Implementação da API.
- Implementação do frontend.
- Dockerfiles e docker-compose.
- Ajustes decorrentes da validação externa.
- README.
- AI-LOG.
- Revisão final.

A granularidade exata de cada commit será definida durante o desenvolvimento, respeitando o princípio de que cada commit deve representar uma etapa coerente e verdadeira do trabalho.

## 14. Uso do Claude Code

Será criado um `CLAUDE.md` próprio deste projeto (distinto de qualquer configuração interna da infraestrutura da Brixly, que não será copiada nem modificada), contendo:
- Objetivo do projeto.
- Stack utilizada.
- Arquitetura e estrutura de diretórios.
- Comandos de instalação, execução, build e teste.
- Regras de negócio importantes (R1 a R7), como referência rápida.
- Convenções de código e de commits.
- Restrições (ex.: não instalar Docker/PostgreSQL no host da Brixly, não depender de recursos proprietários da plataforma).
- Instruções específicas para o Claude Code sobre como continuar o desenvolvimento de forma consistente com este plano.

O `CLAUDE.md` será criado após a estrutura inicial do monorepo, conforme a ordem de desenvolvimento (seção 17/21), e não nesta etapa de planejamento.

## 15. AI-LOG

Será mantido um arquivo `AI-LOG.md` com o registro de decisões reais tomadas durante o desenvolvimento envolvendo a IA, contendo entre 3 e 5 momentos genuínos, relacionados a commits reais, como por exemplo (a confirmar conforme o desenvolvimento realmente ocorrer):
- Uma sugestão inicial da IA que foi recusada e substituída por outra abordagem.
- Uma implementação gerada que precisou ser corrigida após revisão.
- Uma decisão tomada deliberadamente contra a sugestão inicial da IA, com justificativa.
- Uma abordagem alterada após a execução de testes revelar um problema.
- Um problema identificado durante revisão manual de código gerado.

Esses registros serão feitos à medida que ocorrerem de fato durante a implementação, não inventados retroativamente ao final do projeto.

## 16. Validação externa

Como a Brixly não possui Docker nem PostgreSQL reais, a validação final do requisito `docker compose up --build` em uma máquina limpa será obrigatoriamente uma etapa externa a este ambiente, antes da entrega considerada concluída.

Essa validação externa deverá confirmar, no mínimo:
- Que `docker compose up --build` builda e inicia os três serviços sem comandos manuais adicionais.
- Que as migrations do Prisma são executadas automaticamente e o schema é criado corretamente.
- Que o frontend consegue se comunicar com o backend através das portas publicadas pelo Compose.
- Que os testes de integração com PostgreSQL real passam.
- Que os fluxos principais (cadastro, consulta de saldo, agendamento, cancelamento, listagem) funcionam de ponta a ponta.

O ambiente exato em que essa validação externa ocorrerá (máquina local, outra VPS, ou outro ambiente com Docker disponível) ainda não foi definido — ver seção 19.

## 17. Critérios de conclusão

O projeto será considerado concluído quando:
- Todas as regras R1 a R7 estiverem implementadas e cobertas por testes unitários que comprovem, no mínimo, os casos explicitamente fornecidos pelo enunciado.
- A API cobrir todos os fluxos funcionais exigidos (cadastro, saldo, agendamento, cancelamento, listagem com valores).
- O frontend permitir executar esses fluxos de forma funcional, ainda que visualmente simples.
- `docker compose up --build` tiver sido validado externamente, subindo os três serviços sem passos manuais adicionais.
- Os testes de integração com PostgreSQL real tiverem sido executados com sucesso no ambiente de validação externa.
- O README, o PLAN.md, o AI-LOG.md e o CLAUDE.md estiverem completos e coerentes com o que foi efetivamente construído.
- O histórico de commits refletir de forma verdadeira as etapas reais do desenvolvimento.

## 18. Riscos conhecidos

- Lógica de datas de calendário (R1, R2, R4) é a parte historicamente mais sujeita a bugs sutis de off-by-one ou de interpretação incorreta de fuso horário, caso qualquer ponto do código recorra a `Date` nativo sem a camada de utilitários planejada.
- A regra R3 (fracionamento com viabilidade do saldo restante) exige validação cuidadosa de todos os casos obrigatórios do enunciado, incluindo os casos de recusa.
- A ausência de Docker/PostgreSQL reais na Brixly impede a validação de ponta a ponta durante o desenvolvimento, criando dependência de uma etapa de validação externa antes da entrega final.
- Divergência de comportamento entre o schema validado estaticamente e o schema de fato aplicado contra um PostgreSQL real só será conhecida na validação externa.
- Risco de a ordem de inicialização dos containers (backend antes do banco estar pronto) causar falha na primeira subida, caso o `healthcheck`/`depends_on` não seja configurado corretamente.
- Risco de commits não refletirem fielmente a ordem real de desenvolvimento, caso o ritmo de implementação não siga a sequência planejada.

## 19. Decisões ainda não definidas

- Representação exata das datas de calendário no código: estrutura própria (ano/mês/dia) implementada manualmente, ou uso de uma biblioteca de terceiros madura para datas de calendário sem componente de horário — ainda não decidido.
- Se os períodos aquisitivos serão persistidos como registros próprios no banco ou calculados sob demanda a partir da data de admissão do colaborador.
- Ambiente exato onde ocorrerá a validação externa do `docker compose up --build` (máquina local do usuário, outra VPS, ou outro ambiente com Docker disponível).
- Ferramenta exata de testes de API (supertest ou alternativa equivalente) — a ser confirmada na etapa de implementação da API.
- Granularidade final dos commits por regra de negócio (um commit por regra versus múltiplos commits por regra, conforme a complexidade real de cada uma durante a implementação).
- Formato exato da documentação da API (arquivo Markdown próprio, OpenAPI/Swagger, ou documentação embutida no README) — ainda não escolhido.
