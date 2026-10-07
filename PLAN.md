# Plano de Desenvolvimento

## 1. Objetivo

Este documento registra o plano original do sistema de controle de fÃ©rias, elaborado **antes** de qualquer implementaÃ§Ã£o. O sistema serÃ¡ construÃ­do para um teste tÃ©cnico de Desenvolvedor Pleno e deverÃ¡ permitir, ao final, que um avaliador suba a aplicaÃ§Ã£o completa (frontend, backend e banco de dados) em uma mÃ¡quina limpa executando somente `docker compose up --build`, sem qualquer dependÃªncia da plataforma Brixly ou de passos manuais adicionais.

O sistema deverÃ¡ cobrir: cadastro de colaboradores, consulta de saldo por perÃ­odo aquisitivo, agendamento de fÃ©rias, cancelamento de perÃ­odos, listagem de perÃ­odos com valores calculados, interface web mÃ­nima e API documentada, respeitando integralmente as regras R1 a R7 descritas no enunciado do teste.

## 2. Requisitos

**Funcionais**
- Cadastrar colaborador (nome, data de admissÃ£o, salÃ¡rio mensal).
- Consultar saldo de cada perÃ­odo aquisitivo de um colaborador (datas do aquisitivo, datas do concessivo, dias agendados, dias disponÃ­veis).
- Agendar fÃ©rias (colaborador, aquisitivo escolhido, data de inÃ­cio, quantidade de dias).
- Cancelar perÃ­odo de fÃ©rias jÃ¡ agendado.
- Listar perÃ­odos agendados com os valores calculados (remuneraÃ§Ã£o, terÃ§o, total).

**NÃ£o funcionais**
- API documentada.
- Testes automatizados cobrindo as regras R1 a R7.
- ExecuÃ§Ã£o completa via `docker compose up --build`, incluindo migrations automÃ¡ticas do banco.
- README completo.
- HistÃ³rico de commits reais e incrementais.
- Registro de decisÃµes de IA em AI-LOG.md.
- Arquitetura deliberadamente simples: sem autenticaÃ§Ã£o, autorizaÃ§Ã£o, cache, filas, gateway ou microsserviÃ§os â€” esses itens nÃ£o sÃ£o critÃ©rio de avaliaÃ§Ã£o conforme o enunciado.

## 3. Arquitetura

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      HTTP/JSON      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      SQL (Prisma)      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  frontend   â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚   backend   â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚  postgres   â”‚
â”‚ React + TS  â”‚   fetch()           â”‚ Express+TS  â”‚   pool de conexÃµes     â”‚  container  â”‚
â”‚ Vite+Tailwindâ”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚  porta 3001 â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚  porta 5432 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      JSON           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

- **Frontend**: React + TypeScript + Vite + Tailwind, servido como estÃ¡tico (build) dentro de um container prÃ³prio.
- **Backend**: Node + Express + TypeScript, API REST/JSON, porta 3001.
- **Banco**: PostgreSQL, como serviÃ§o dedicado do Docker Compose.
- **ORM**: Prisma â€” schema declarativo e `migrate deploy` automÃ¡tico na inicializaÃ§Ã£o do backend.
- **Testes**: Vitest para unitÃ¡rios e testes de API; estratÃ©gia de integraÃ§Ã£o com PostgreSQL real detalhada na seÃ§Ã£o 8.
- **ComunicaÃ§Ã£o**: REST/JSON simples, sem GraphQL, sem WebSocket.

A arquitetura serÃ¡ mantida deliberadamente simples, sem microsserviÃ§os, filas, Redis, cache, gateway, autenticaÃ§Ã£o ou autorizaÃ§Ã£o, conforme indicado no enunciado do teste.

## 4. Estrutura do projeto

```
2e22967b/
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ index.html
â”‚   â”œâ”€â”€ package.json
â”‚   â”œâ”€â”€ vite.config.ts
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ .env.example
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ repositories/
â”‚   â”‚   â”œâ”€â”€ middlewares/
â”‚   â”‚   â”œâ”€â”€ app.ts
â”‚   â”‚   â””â”€â”€ server.ts
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â”œâ”€â”€ schema.prisma
â”‚   â”‚   â””â”€â”€ migrations/
â”‚   â”œâ”€â”€ tests/
â”‚   â”‚   â”œâ”€â”€ unit/
â”‚   â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â””â”€â”€ integration/
â”‚   â”œâ”€â”€ package.json
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ .env.example
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ README.md
â”œâ”€â”€ PLAN.md
â”œâ”€â”€ AI-LOG.md
â”œâ”€â”€ CLAUDE.md
â””â”€â”€ .gitignore
```

As regras R1 a R7 serÃ£o isoladas em `backend/src/services/`, como funÃ§Ãµes que recebem e retornam dados simples (sem acesso direto a `req`/`res` ou ao Prisma), sempre que tecnicamente apropriado, permitindo que sejam testadas unitariamente sem HTTP e sem banco de dados real.

## 5. Modelo de dados planejado

Entidades previstas (sujeitas a ajuste fino durante a modelagem no Prisma):

**Colaborador**
- id
- nome
- data de admissÃ£o (data de calendÃ¡rio, sem horÃ¡rio)
- salÃ¡rio mensal

**PerÃ­odoAquisitivo**
- id
- colaborador (referÃªncia)
- data de inÃ­cio do aquisitivo
- data de fim do aquisitivo
- data de inÃ­cio do concessivo (derivada do fim do aquisitivo)
- data de fim do concessivo (derivada do fim do aquisitivo)
- dias totais (30, fixo por regra)

**Agendamento**
- id
- perÃ­odo aquisitivo (referÃªncia)
- data de inÃ­cio
- data de fim (derivada da data de inÃ­cio + quantidade de dias)
- quantidade de dias
- status (ativo / cancelado)

Os perÃ­odos aquisitivos poderÃ£o ser calculados sob demanda a partir da data de admissÃ£o (sem persistÃªncia prÃ³pria) ou persistidos conforme se mostrar mais simples durante a modelagem â€” essa escolha serÃ¡ decidida na etapa de modelagem do banco (seÃ§Ã£o 19).

## 6. Regras de negÃ³cio

As regras R1 a R7 do enunciado serÃ£o implementadas como funÃ§Ãµes puras e isoladas da camada HTTP/banco, cada uma testÃ¡vel independentemente:

- **R1 â€” PerÃ­odo aquisitivo**: cÃ¡lculo de cada perÃ­odo de 12 meses a partir da data de admissÃ£o, com tratamento explÃ­cito de datas-fim-de-mÃªs inexistentes (ex.: admissÃ£o em 29/02 cairÃ¡ em 28/02 nos anos nÃ£o bissextos).
- **R2 â€” PerÃ­odo concessivo**: janela de 12 meses apÃ³s o fim do aquisitivo; agendamento sÃ³ Ã© vÃ¡lido se todos os dias do perÃ­odo estiverem dentro do concessivo correspondente; dias nÃ£o utilizados apÃ³s o fim do concessivo sÃ£o considerados perdidos (nÃ£o haverÃ¡ "recuperaÃ§Ã£o" automÃ¡tica de saldo).
- **R3 â€” Fracionamento**: no mÃ¡ximo 3 perÃ­odos por aquisitivo; um perÃ­odo com no mÃ­nimo 14 dias; os demais com no mÃ­nimo 5 dias cada; validaÃ§Ã£o de que o saldo restante apÃ³s cada novo agendamento ainda permite completar os 30 dias respeitando essas regras (sem exigir que o saldo seja todo agendado de imediato).
- **R4 â€” Dia de inÃ­cio**: bloqueio de inÃ­cio em domingo, feriado, nos dois dias anteriores a domingo e nos dois dias anteriores a feriado; lista fixa de feriados por ano (2026, 2027, 2028) definida no cÃ³digo; o tÃ©rmino do perÃ­odo nÃ£o possui essa restriÃ§Ã£o.
- **R5 â€” Sem sobreposiÃ§Ã£o**: nenhum dia pode ser compartilhado entre dois perÃ­odos agendados do mesmo colaborador, mesmo pertencendo a aquisitivos diferentes.
- **R6 â€” Hoje**: agendamento e cancelamento sÃ³ sÃ£o permitidos para perÃ­odos com inÃ­cio estritamente posterior Ã  data atual; cancelamento devolve os dias ao saldo do aquisitivo correspondente.
- **R7 â€” Valores**: remuneraÃ§Ã£o = salÃ¡rio Ã— dias Ã· 30; terÃ§o = salÃ¡rio Ã— dias Ã· 90; cÃ¡lculo com precisÃ£o total atÃ© o fim, arredondamento para centavos apenas no resultado final, meio centavo arredondando para cima; o total serÃ¡ a soma dos valores jÃ¡ arredondados (nÃ£o o arredondamento da soma).

## 7. EstratÃ©gia de datas

O enunciado define todas as datas como datas de calendÃ¡rio (ano-mÃªs-dia), sem horÃ¡rio, no fuso America/Sao_Paulo. O uso direto do objeto `Date` do JavaScript serÃ¡ evitado como estrutura de armazenamento e comparaÃ§Ã£o de regras de negÃ³cio, pelo risco conhecido de deslocamento de um dia causado por conversÃµes de fuso horÃ¡rio e por horÃ¡rio de verÃ£o histÃ³rico.

EstratÃ©gia planejada:
- Datas de calendÃ¡rio serÃ£o representadas internamente como uma tripla (ano, mÃªs, dia) ou como string no formato `YYYY-MM-DD`, nunca com componente de hora.
- Toda soma/subtraÃ§Ã£o de dias, comparaÃ§Ã£o de "antes/depois/igual" e cÃ¡lculo de diferenÃ§a entre datas serÃ¡ feita por uma camada prÃ³pria de utilitÃ¡rios de data de calendÃ¡rio (a ser definida na etapa de camada de domÃ­nio), sem depender de aritmÃ©tica de milissegundos do `Date`.
- OperaÃ§Ãµes sensÃ­veis â€” como "aniversÃ¡rio correspondente da admissÃ£o" e "Ãºltimo dia existente do mÃªs" (regra do 29/02) â€” serÃ£o implementadas com lÃ³gica de calendÃ¡rio explÃ­cita (ano/mÃªs/dia), nÃ£o com `setMonth`/`setDate` do `Date` nativo, cujo comportamento de overflow Ã© conhecido por gerar resultados incorretos nesse tipo de cÃ¡lculo.
- No banco de dados, as colunas de data serÃ£o do tipo `DATE` (sem componente de hora), evitando qualquer interpretaÃ§Ã£o de fuso horÃ¡rio pelo driver ou pelo Prisma.
- No frontend, as datas serÃ£o exibidas e enviadas como strings `YYYY-MM-DD`, sem conversÃ£o para objetos `Date` locais do navegador antes do envio Ã  API.
- A biblioteca especÃ­fica (nativa com utilitÃ¡rios prÃ³prios, ou uma biblioteca de terceiros madura para datas de calendÃ¡rio) ainda nÃ£o foi decidida â€” ver seÃ§Ã£o 19.

## 8. EstratÃ©gia de testes

Os testes serÃ£o escritos para comprovar comportamento e regras especÃ­ficas, nÃ£o para maximizar nÃºmero de casos ou cobertura percentual.

**1. Testes unitÃ¡rios (R1 a R7)** â€” Vitest, sem banco de dados, cobrindo:
- Casos normais de cada regra.
- Casos de borda (ex.: admissÃ£o em 29/02 e seus prÃ³ximos aniversÃ¡rios; limites exatos do concessivo; inÃ­cio de perÃ­odo em feriado versus dia comum).
- Os casos explicitamente fornecidos pelo enunciado, incluindo todos os exemplos de R3 (14+16 aceita; 5+25 aceita; 14+6+10 aceita; 10+10 segundo recusado; 26 recusado; 14+6+6 terceiro recusado) e o exemplo numÃ©rico completo de R7 (salÃ¡rio R$ 3.500,00, 14 dias â†’ remuneraÃ§Ã£o R$ 1.633,33, terÃ§o R$ 544,44, total R$ 2.177,77).

**2. Testes de API** â€” Vitest + supertest (ou equivalente), exercitando as rotas HTTP com um banco de teste, cobrindo os fluxos principais (cadastrar colaborador, consultar saldo, agendar, cancelar, listar) e as respostas de erro esperadas (ex.: tentativa de agendamento que viola R3, R4, R5 ou R6).

**3. Testes de integraÃ§Ã£o com PostgreSQL real** â€” exercitando a camada de repositÃ³rio e as migrations contra uma instÃ¢ncia real de PostgreSQL, validando que o schema e as consultas funcionam como esperado fora de qualquer mock.

A execuÃ§Ã£o de cada camada de teste dentro da Brixly versus em ambiente Docker real estÃ¡ detalhada nas seÃ§Ãµes 12 e 16.

## 9. API planejada

Endpoints previstos (nomes e verbos sujeitos a refinamento na etapa de implementaÃ§Ã£o da API):

- `POST /colaboradores` â€” cadastrar colaborador.
- `GET /colaboradores` â€” listar colaboradores.
- `GET /colaboradores/:id/periodos` â€” consultar perÃ­odos aquisitivos e saldo de um colaborador.
- `POST /agendamentos` â€” agendar fÃ©rias (colaborador, perÃ­odo aquisitivo, data de inÃ­cio, quantidade de dias).
- `DELETE /agendamentos/:id` â€” cancelar um agendamento.
- `GET /agendamentos` â€” listar perÃ­odos agendados com valores calculados (remuneraÃ§Ã£o, terÃ§o, total).

A documentaÃ§Ã£o da API serÃ¡ produzida junto da implementaÃ§Ã£o das rotas (especificaÃ§Ã£o do formato de entrada/saÃ­da de cada endpoint, cÃ³digos de erro e exemplos), e detalhada no README.

## 10. Frontend planejado

Interface web mÃ­nima e funcional, sem preocupaÃ§Ã£o com sofisticaÃ§Ã£o visual, cobrindo:
- FormulÃ¡rio de cadastro de colaborador.
- Tela de consulta de saldo por perÃ­odo aquisitivo (datas do aquisitivo, datas do concessivo, dias agendados, dias disponÃ­veis).
- FormulÃ¡rio de agendamento de fÃ©rias.
- AÃ§Ã£o de cancelamento de um perÃ­odo agendado.
- Listagem de perÃ­odos com os valores calculados.

ComunicaÃ§Ã£o com o backend via `fetch`, usando uma variÃ¡vel de ambiente de build (`VITE_API_URL`) para o endereÃ§o da API, sem acoplamento a qualquer recurso especÃ­fico da Brixly.

## 11. Docker

O `docker-compose.yml` final deverÃ¡ conter trÃªs serviÃ§os: `frontend`, `backend` e `postgres`.

- O serviÃ§o `postgres` usarÃ¡ uma imagem oficial com versÃ£o fixada (nÃ£o `latest`), com `healthcheck` configurado.
- O serviÃ§o `backend` dependerÃ¡ do `postgres` com a condiÃ§Ã£o de saÃºde (`service_healthy`), e executarÃ¡ as migrations do Prisma automaticamente na inicializaÃ§Ã£o do container, sem exigir qualquer comando manual adicional apÃ³s `docker compose up --build`.
- O serviÃ§o `frontend` serÃ¡ construÃ­do em mÃºltiplos estÃ¡gios (build Vite seguido de servidor estÃ¡tico leve) e dependerÃ¡ do `backend`.
- Nenhuma variÃ¡vel sensÃ­vel serÃ¡ fixada no repositÃ³rio; valores de exemplo ficarÃ£o em arquivos `.env.example`.
- O sistema completo nÃ£o deverÃ¡ depender, em nenhum momento, de qualquer recurso especÃ­fico da infraestrutura da Brixly (nem do backend `/_api`, nem de variÃ¡veis de ambiente da plataforma).

## 12. EstratÃ©gia de desenvolvimento na Brixly

A Brixly serÃ¡ usada apenas como ambiente de ediÃ§Ã£o e execuÃ§Ã£o parcial, jÃ¡ que o ambiente atual nÃ£o possui Docker nem PostgreSQL instalados, e esses componentes nÃ£o serÃ£o instalados no host da Brixly.

SerÃ¡ desenvolvido e validado dentro da Brixly:
- Toda a camada de domÃ­nio (regras R1 a R7), com testes unitÃ¡rios executados de fato via Vitest/Node, sem necessidade de banco de dados.
- As rotas HTTP do backend, com validaÃ§Ã£o estÃ¡tica de tipos (`tsc`) e testes manuais pontuais usando um repositÃ³rio em memÃ³ria, quando necessÃ¡rio para verificar o comportamento das rotas sem um banco real.
- O schema do Prisma, validado estaticamente (`prisma validate`/`prisma generate`), sem execuÃ§Ã£o contra uma instÃ¢ncia real de banco.
- O frontend completo, executado via Vite normalmente.
- A escrita de todos os Dockerfiles e do `docker-compose.yml`, validados por revisÃ£o manual de sintaxe e consistÃªncia (nomes de serviÃ§o, variÃ¡veis, portas), sem execuÃ§Ã£o real do Docker.
- A inicializaÃ§Ã£o do Git e a construÃ§Ã£o do histÃ³rico de commits.

NÃ£o serÃ¡ possÃ­vel, dentro da Brixly, executar `docker compose up --build` de ponta a ponta, nem os testes de integraÃ§Ã£o que dependem de PostgreSQL real. Essa limitaÃ§Ã£o Ã© assumida deliberadamente e compensada pela validaÃ§Ã£o externa descrita na seÃ§Ã£o 16.

## 13. Git e commits

O repositÃ³rio Git serÃ¡ inicializado neste diretÃ³rio do projeto, de forma independente da infraestrutura da Brixly. O histÃ³rico serÃ¡ composto por commits pequenos e coerentes, representando etapas reais do desenvolvimento, sem uso de squash ao final e sem fabricaÃ§Ã£o retroativa de histÃ³rico.

ConvenÃ§Ã£o de commits planejada (mensagens curtas, descrevendo o que foi feito e, quando pertinente, por quÃª):
- PreparaÃ§Ã£o do repositÃ³rio e configuraÃ§Ã£o inicial.
- CriaÃ§Ã£o do `CLAUDE.md`.
- Estrutura do monorepo (frontend/backend).
- Modelagem do banco (schema Prisma).
- ImplementaÃ§Ã£o da camada de domÃ­nio, com commits possivelmente separados por regra (R1, R2, R3, R4, R5, R6, R7) Ã  medida que cada uma for implementada e testada.
- ImplementaÃ§Ã£o da API.
- ImplementaÃ§Ã£o do frontend.
- Dockerfiles e docker-compose.
- Ajustes decorrentes da validaÃ§Ã£o externa.
- README.
- AI-LOG.
- RevisÃ£o final.

A granularidade exata de cada commit serÃ¡ definida durante o desenvolvimento, respeitando o princÃ­pio de que cada commit deve representar uma etapa coerente e verdadeira do trabalho.

## 14. Uso do Claude Code

SerÃ¡ criado um `CLAUDE.md` prÃ³prio deste projeto (distinto de qualquer configuraÃ§Ã£o interna da infraestrutura da Brixly, que nÃ£o serÃ¡ copiada nem modificada), contendo:
- Objetivo do projeto.
- Stack utilizada.
- Arquitetura e estrutura de diretÃ³rios.
- Comandos de instalaÃ§Ã£o, execuÃ§Ã£o, build e teste.
- Regras de negÃ³cio importantes (R1 a R7), como referÃªncia rÃ¡pida.
- ConvenÃ§Ãµes de cÃ³digo e de commits.
- RestriÃ§Ãµes (ex.: nÃ£o instalar Docker/PostgreSQL no host da Brixly, nÃ£o depender de recursos proprietÃ¡rios da plataforma).
- InstruÃ§Ãµes especÃ­ficas para o Claude Code sobre como continuar o desenvolvimento de forma consistente com este plano.

O `CLAUDE.md` serÃ¡ criado apÃ³s a estrutura inicial do monorepo, conforme a ordem de desenvolvimento (seÃ§Ã£o 17/21), e nÃ£o nesta etapa de planejamento.

## 15. AI-LOG

SerÃ¡ mantido um arquivo `AI-LOG.md` com o registro de decisÃµes reais tomadas durante o desenvolvimento envolvendo a IA, contendo entre 3 e 5 momentos genuÃ­nos, relacionados a commits reais, como por exemplo (a confirmar conforme o desenvolvimento realmente ocorrer):
- Uma sugestÃ£o inicial da IA que foi recusada e substituÃ­da por outra abordagem.
- Uma implementaÃ§Ã£o gerada que precisou ser corrigida apÃ³s revisÃ£o.
- Uma decisÃ£o tomada deliberadamente contra a sugestÃ£o inicial da IA, com justificativa.
- Uma abordagem alterada apÃ³s a execuÃ§Ã£o de testes revelar um problema.
- Um problema identificado durante revisÃ£o manual de cÃ³digo gerado.

Esses registros serÃ£o feitos Ã  medida que ocorrerem de fato durante a implementaÃ§Ã£o, nÃ£o inventados retroativamente ao final do projeto.

## 16. ValidaÃ§Ã£o externa

Como a Brixly nÃ£o possui Docker nem PostgreSQL reais, a validaÃ§Ã£o final do requisito `docker compose up --build` em uma mÃ¡quina limpa serÃ¡ obrigatoriamente uma etapa externa a este ambiente, antes da entrega considerada concluÃ­da.

Essa validaÃ§Ã£o externa deverÃ¡ confirmar, no mÃ­nimo:
- Que `docker compose up --build` builda e inicia os trÃªs serviÃ§os sem comandos manuais adicionais.
- Que as migrations do Prisma sÃ£o executadas automaticamente e o schema Ã© criado corretamente.
- Que o frontend consegue se comunicar com o backend atravÃ©s das portas publicadas pelo Compose.
- Que os testes de integraÃ§Ã£o com PostgreSQL real passam.
- Que os fluxos principais (cadastro, consulta de saldo, agendamento, cancelamento, listagem) funcionam de ponta a ponta.

O ambiente exato em que essa validaÃ§Ã£o externa ocorrerÃ¡ (mÃ¡quina local, outra VPS, ou outro ambiente com Docker disponÃ­vel) ainda nÃ£o foi definido â€” ver seÃ§Ã£o 19.

## 17. CritÃ©rios de conclusÃ£o

O projeto serÃ¡ considerado concluÃ­do quando:
- Todas as regras R1 a R7 estiverem implementadas e cobertas por testes unitÃ¡rios que comprovem, no mÃ­nimo, os casos explicitamente fornecidos pelo enunciado.
- A API cobrir todos os fluxos funcionais exigidos (cadastro, saldo, agendamento, cancelamento, listagem com valores).
- O frontend permitir executar esses fluxos de forma funcional, ainda que visualmente simples.
- `docker compose up --build` tiver sido validado externamente, subindo os trÃªs serviÃ§os sem passos manuais adicionais.
- Os testes de integraÃ§Ã£o com PostgreSQL real tiverem sido executados com sucesso no ambiente de validaÃ§Ã£o externa.
- O README, o PLAN.md, o AI-LOG.md e o CLAUDE.md estiverem completos e coerentes com o que foi efetivamente construÃ­do.
- O histÃ³rico de commits refletir de forma verdadeira as etapas reais do desenvolvimento.

## 18. Riscos conhecidos

- LÃ³gica de datas de calendÃ¡rio (R1, R2, R4) Ã© a parte historicamente mais sujeita a bugs sutis de off-by-one ou de interpretaÃ§Ã£o incorreta de fuso horÃ¡rio, caso qualquer ponto do cÃ³digo recorra a `Date` nativo sem a camada de utilitÃ¡rios planejada.
- A regra R3 (fracionamento com viabilidade do saldo restante) exige validaÃ§Ã£o cuidadosa de todos os casos obrigatÃ³rios do enunciado, incluindo os casos de recusa.
- A ausÃªncia de Docker/PostgreSQL reais na Brixly impede a validaÃ§Ã£o de ponta a ponta durante o desenvolvimento, criando dependÃªncia de uma etapa de validaÃ§Ã£o externa antes da entrega final.
- DivergÃªncia de comportamento entre o schema validado estaticamente e o schema de fato aplicado contra um PostgreSQL real sÃ³ serÃ¡ conhecida na validaÃ§Ã£o externa.
- Risco de a ordem de inicializaÃ§Ã£o dos containers (backend antes do banco estar pronto) causar falha na primeira subida, caso o `healthcheck`/`depends_on` nÃ£o seja configurado corretamente.
- Risco de commits nÃ£o refletirem fielmente a ordem real de desenvolvimento, caso o ritmo de implementaÃ§Ã£o nÃ£o siga a sequÃªncia planejada.

## 19. DecisÃµes ainda nÃ£o definidas

- RepresentaÃ§Ã£o exata das datas de calendÃ¡rio no cÃ³digo: estrutura prÃ³pria (ano/mÃªs/dia) implementada manualmente, ou uso de uma biblioteca de terceiros madura para datas de calendÃ¡rio sem componente de horÃ¡rio â€” ainda nÃ£o decidido.
- Se os perÃ­odos aquisitivos serÃ£o persistidos como registros prÃ³prios no banco ou calculados sob demanda a partir da data de admissÃ£o do colaborador.
- Ambiente exato onde ocorrerÃ¡ a validaÃ§Ã£o externa do `docker compose up --build` (mÃ¡quina local do usuÃ¡rio, outra VPS, ou outro ambiente com Docker disponÃ­vel).
- Ferramenta exata de testes de API (supertest ou alternativa equivalente) â€” a ser confirmada na etapa de implementaÃ§Ã£o da API.
- Granularidade final dos commits por regra de negÃ³cio (um commit por regra versus mÃºltiplos commits por regra, conforme a complexidade real de cada uma durante a implementaÃ§Ã£o).
- Formato exato da documentaÃ§Ã£o da API (arquivo Markdown prÃ³prio, OpenAPI/Swagger, ou documentaÃ§Ã£o embutida no README) â€” ainda nÃ£o escolhido.

---

## AtualizaÃ§Ã£o do plano â€” decisÃµes de modelagem e domÃ­nio

Esta seÃ§Ã£o registra decisÃµes tomadas apÃ³s uma anÃ¡lise tÃ©cnica aprofundada de modelagem de dados e estratÃ©gia de domÃ­nio, realizada apÃ³s a elaboraÃ§Ã£o do plano original acima. O conteÃºdo original deste `PLAN.md` foi mantido integralmente; esta seÃ§Ã£o apenas resolve pendÃªncias que haviam sido deixadas abertas na seÃ§Ã£o "19. DecisÃµes ainda nÃ£o definidas" e detalha decisÃµes de modelagem que nÃ£o estavam explÃ­citas na versÃ£o original.

### 1. PerÃ­odos aquisitivos

Os perÃ­odos aquisitivos NÃƒO serÃ£o persistidos como tabela prÃ³pria no banco de dados.

Eles serÃ£o calculados sob demanda a partir de:
- data de admissÃ£o do colaborador;
- nÃºmero sequencial do perÃ­odo (`periodo_numero`).

A funÃ§Ã£o de domÃ­nio responsÃ¡vel serÃ¡ determinÃ­stica e pura:

```
calcularPeriodoAquisitivo(dataAdmissao, periodoNumero)
```

O perÃ­odo concessivo tambÃ©m serÃ¡ derivado do perÃ­odo aquisitivo (fim do aquisitivo + 1 dia atÃ© 12 meses depois), nunca persistido separadamente.

Justificativa:
- nÃ£o existe estado prÃ³prio do perÃ­odo aquisitivo no escopo do teste;
- suas datas sÃ£o completamente derivÃ¡veis a partir da data de admissÃ£o;
- evita duplicaÃ§Ã£o de dados;
- evita problemas de sincronizaÃ§Ã£o entre o dado persistido e o dado real;
- simplifica o cancelamento e a consulta de saldo (saldo Ã© sempre recomputado a partir dos agendamentos ativos, nunca armazenado);
- mantÃ©m as regras R1/R2 concentradas inteiramente no domÃ­nio, sem estado intermediÃ¡rio no banco.

### 2. Modelo do agendamento

O agendamento persistirÃ¡:

- `id`;
- `colaborador_id`;
- `periodo_numero`;
- `data_inicio`;
- `quantidade_dias`;
- `status`.

`periodo_numero` NÃƒO serÃ¡ uma `FOREIGN KEY` para uma tabela de perÃ­odos aquisitivos, pois essa tabela nÃ£o existirÃ¡. O perÃ­odo aquisitivo real serÃ¡ reconstruÃ­do pelo domÃ­nio atravÃ©s da combinaÃ§Ã£o `data_admissao` (do colaborador) + `periodo_numero` (do agendamento).

A data final do agendamento serÃ¡ derivada de:

```
data_inicio + quantidade_dias - 1
```

NÃ£o serÃ¡ persistida como coluna prÃ³pria, salvo se uma necessidade concreta futura justificar essa mudanÃ§a.

### 3. Datas de calendÃ¡rio

Datas de negÃ³cio serÃ£o tratadas como datas de calendÃ¡rio, nunca como timestamp:
- na API: strings `YYYY-MM-DD`;
- no banco: tipo `DATE`;
- no domÃ­nio: um value object prÃ³prio `CalendarDate` (ano/mÃªs/dia);
- todas as operaÃ§Ãµes de calendÃ¡rio (soma de dias, comparaÃ§Ã£o, aniversÃ¡rio, Ãºltimo dia do mÃªs) serÃ£o feitas por aritmÃ©tica explÃ­cita de ano/mÃªs/dia;
- sem dependÃªncia de timezone em nenhum cÃ¡lculo de regra de negÃ³cio;
- sem utilizar o objeto `Date` do JavaScript para cÃ¡lculos de regras de negÃ³cio (R1, R2, R4, R6).

NÃ£o serÃ¡ adicionada nenhuma biblioteca de datas de terceiros nesta etapa. O conjunto de operaÃ§Ãµes necessÃ¡rias foi avaliado como pequeno e suficientemente simples para ser implementado e testado como cÃ³digo prÃ³prio, com risco de bug menor do que o de introduzir uma dependÃªncia externa cujo comportamento de timezone precisaria ser auditado da mesma forma.

### 4. Valores monetÃ¡rios

- O PostgreSQL utilizarÃ¡ `NUMERIC(10,2)` para a coluna de salÃ¡rio.
- O Prisma utilizarÃ¡ seu tipo `Decimal` para mapear essa coluna.
- Os cÃ¡lculos de R7 (remuneraÃ§Ã£o e terÃ§o constitucional) utilizarÃ£o `Prisma.Decimal` diretamente, sem conversÃ£o para `number` em nenhum momento do cÃ¡lculo.
- MultiplicaÃ§Ã£o e divisÃ£o serÃ£o realizadas mantendo precisÃ£o decimal completa, sem arredondamento intermediÃ¡rio.
- RemuneraÃ§Ã£o e terÃ§o serÃ£o arredondados individualmente para 2 casas decimais utilizando o modo `ROUND_HALF_UP` (meio centavo sobe).
- O total serÃ¡ a soma dos dois valores jÃ¡ arredondados, nÃ£o o arredondamento da soma.

NÃ£o serÃ¡ adicionada a biblioteca `decimal.js` como dependÃªncia direta do projeto. Foi verificado que `Prisma.Decimal` Ã© internamente a prÃ³pria implementaÃ§Ã£o de `decimal.js`, reexportada pelo runtime do Prisma com API equivalente (incluindo `times`, `dividedBy`, `toDecimalPlaces` com modo de arredondamento explÃ­cito e `plus`). Essa verificaÃ§Ã£o incluiu a execuÃ§Ã£o real do exemplo numÃ©rico do enunciado (salÃ¡rio R$ 3.500,00, 14 dias), confirmando os resultados esperados (remuneraÃ§Ã£o R$ 1.633,33, terÃ§o R$ 544,44, total R$ 2.177,77). Adicionar `decimal.js` separadamente duplicaria uma dependÃªncia jÃ¡ disponÃ­vel atravÃ©s do `@prisma/client`.

### 5. Integridade

Constraints planejadas para o banco de dados:
- `colaborador.nome`: obrigatÃ³rio;
- `colaborador.data_admissao`: obrigatÃ³ria;
- `colaborador.salario_mensal`: obrigatÃ³rio e positivo;
- `agendamento.colaborador_id`: obrigatÃ³rio (referÃªncia ao colaborador);
- `agendamento.periodo_numero`: obrigatÃ³rio, maior ou igual a 1;
- `agendamento.quantidade_dias`: obrigatÃ³rio, entre 1 e 30;
- `agendamento.status`: limitado aos valores `ativo` ou `cancelado`.

R3 (fracionamento) e R5 (sobreposiÃ§Ã£o) permanecem regras de domÃ­nio/aplicaÃ§Ã£o e nÃ£o serÃ£o reduzidas a simples `CHECK` de banco, por dependerem de comparaÃ§Ã£o entre mÃºltiplas linhas existentes, nÃ£o de validaÃ§Ã£o de uma linha isolada.

### 6. Ãndices

Considerando o escopo do teste e a ausÃªncia de requisitos de performance ou escala, serÃ¡ utilizado somente o Ã­ndice necessÃ¡rio para consultas de agendamentos por colaborador (`agendamento.colaborador_id`). Nenhum Ã­ndice especulativo serÃ¡ adicionado.

### 7. DecisÃµes substituÃ­das

Esta atualizaÃ§Ã£o resolve as seguintes pendÃªncias que estavam registradas na seÃ§Ã£o "19. DecisÃµes ainda nÃ£o definidas" do plano original:

- **PerÃ­odos aquisitivos**: estavam em aberto entre "persistidos" ou "calculados sob demanda" â€” decidido: calculados sob demanda, sem tabela prÃ³pria.
- **EstratÃ©gia de datas**: estava em aberto entre "estrutura prÃ³pria" ou "biblioteca de terceiros" â€” decidido: value object `CalendarDate` prÃ³prio, sem biblioteca.
- **EstratÃ©gia monetÃ¡ria**: nÃ£o havia decisÃ£o registrada ainda â€” decidido: `Prisma.Decimal`, sem `decimal.js`.
- **Modelo do agendamento**: nÃ£o havia detalhamento registrado ainda sobre como o agendamento referenciaria o perÃ­odo aquisitivo â€” decidido: campo `periodo_numero` (inteiro), nÃ£o uma `FOREIGN KEY`.

O texto original da seÃ§Ã£o 19 nÃ£o foi removido nem alterado; esta seÃ§Ã£o apenas registra que as pendÃªncias correspondentes foram resolvidas.

---

## AtualizaÃ§Ã£o do plano â€” decisÃµes da camada de aplicaÃ§Ã£o

Esta seÃ§Ã£o registra decisÃµes tomadas na etapa de planejamento da camada de aplicaÃ§Ã£o (services/use cases que orquestram as regras R1-R7), realizada apÃ³s a conclusÃ£o e commit de todo o domÃ­nio puro. O conteÃºdo original deste `PLAN.md` e as atualizaÃ§Ãµes anteriores foram mantidos integralmente.

### 1. Quantos perÃ­odos aquisitivos exibir na consulta de saldo/perÃ­odos

O enunciado exige a consulta de saldo/perÃ­odos aquisitivos, mas nÃ£o define explicitamente quantos perÃ­odos calculados devem ser exibidos â€” um colaborador antigo poderia, em tese, ter dezenas de perÃ­odos aquisitivos desde a admissÃ£o.

**DecisÃ£o**: o endpoint de consulta de perÃ­odos exibirÃ¡ os perÃ­odos aquisitivos do perÃ­odo 1 atÃ© o perÃ­odo aquisitivo vigente na data de hoje, inclusive.

**Motivo**: essa interpretaÃ§Ã£o mantÃ©m a consulta finita e coerente com a situaÃ§Ã£o atual do colaborador, sem exigir um parÃ¢metro adicional de "quantos perÃ­odos exibir" que o enunciado nÃ£o pede.

### 2. Forma do cancelamento na API

**DecisÃ£o**: a API usarÃ¡ `DELETE /agendamentos/:id` para solicitar o cancelamento, mas a operaÃ§Ã£o serÃ¡ um cancelamento lÃ³gico â€” altera o campo `status` para `cancelado`, preservando o registro no banco.

**Motivo**: R6 exige que o cancelamento devolva os dias ao saldo disponÃ­vel; preservar o registro (em vez de excluÃ­-lo fisicamente) mantÃ©m o histÃ³rico do colaborador e permite demonstrar o estado anterior do agendamento, alÃ©m de ser consistente com a decisÃ£o jÃ¡ registrada de que o saldo Ã© sempre recomputado a partir dos agendamentos ativos, nunca armazenado.

---

## AtualizaÃ§Ã£o do plano â€” decisÃµes de persistÃªncia e concorrÃªncia

Esta seÃ§Ã£o registra decisÃµes tomadas na etapa de implementaÃ§Ã£o da persistÃªncia real (Prisma/PostgreSQL) e da proteÃ§Ã£o contra concorrÃªncia no agendamento, realizada apÃ³s a implementaÃ§Ã£o e commit dos application services com repositories fake. O conteÃºdo original deste `PLAN.md` e as atualizaÃ§Ãµes anteriores foram mantidos integralmente.

### 1. Ajuste mÃ­nimo na interface `AgendamentoRepository`

A interface `AgendamentoRepository`, definida na etapa anterior (camada de aplicaÃ§Ã£o), nÃ£o previa nenhum mecanismo de transaÃ§Ã£o â€” cada mÃ©todo (`buscarPorId`, `listarAtivosPorColaborador`, `criar`, etc.) era uma operaÃ§Ã£o independente. Isso deixava uma lacuna real: o fluxo de agendamento (ler agendamentos ativos para validar R3/R5 â†’ inserir o novo agendamento) nÃ£o tinha nenhuma garantia de atomicidade entre a leitura e a escrita, criando risco de corrida entre duas requisiÃ§Ãµes concorrentes para o mesmo colaborador (risco jÃ¡ identificado na anÃ¡lise arquitetural anterior).

**DecisÃ£o**: foi adicionado um Ãºnico mÃ©todo Ã  interface, `executarComLockDoColaborador<T>(colaboradorId: number, operacao: (agendamentoRepositoryTransacional: AgendamentoRepository) => Promise<T>): Promise<T>`, que executa `operacao` (fornecida pelo application service, contendo a orquestraÃ§Ã£o de R3/R5 e a chamada de criaÃ§Ã£o) dentro de uma transaÃ§Ã£o que bloqueia a linha do colaborador correspondente. `operacao` recebe como argumento um `AgendamentoRepository` com escopo da prÃ³pria transaÃ§Ã£o â€” todas as chamadas que precisam ocorrer dentro do lock usam esse repository recebido, nunca uma referÃªncia externa a outra instÃ¢ncia.

**Motivo**: essa Ã© a menor mudanÃ§a de interface capaz de resolver o problema de concorrÃªncia corretamente, sem transformar a camada de aplicaÃ§Ã£o em um framework de Unit of Work. O repository continua sem conhecer nenhuma regra de negÃ³cio â€” ele apenas inicia a transaÃ§Ã£o/lock e delega toda a lÃ³gica para o callback, que Ã© escrito e controlado inteiramente pelo application service (`agendarFerias`). A implementaÃ§Ã£o fake (em memÃ³ria) apenas chama o callback diretamente (passando a prÃ³pria instÃ¢ncia), pois nÃ£o hÃ¡ concorrÃªncia real a serializar numa estrutura em memÃ³ria de processo Ãºnico usada em testes sequenciais.

Ponto de atenÃ§Ã£o corrigido durante a implementaÃ§Ã£o: a primeira versÃ£o desta interface usava um campo mutÃ¡vel (`clienteAtivo`) na implementaÃ§Ã£o Prisma, temporariamente reatribuÃ­do durante a transaÃ§Ã£o â€” um bug real sob concorrÃªncia, pois duas chamadas simultÃ¢neas na mesma instÃ¢ncia de repository (o padrÃ£o normal de uma aplicaÃ§Ã£o, que reaproveita uma Ãºnica instÃ¢ncia entre requisiÃ§Ãµes) poderiam sobrescrever esse campo uma da outra. A correÃ§Ã£o, refletida na assinatura final acima, elimina qualquer estado mutÃ¡vel: cada chamada de `executarComLockDoColaborador` cria uma nova instÃ¢ncia local do repository, vinculada ao cliente de transaÃ§Ã£o daquela chamada especÃ­fica, e a passa como argumento ao callback â€” nunca reaproveitando nem compartilhando esse objeto entre chamadas concorrentes.

### 2. Mecanismo de lock escolhido: `SELECT ... FOR UPDATE`

**DecisÃ£o**: a proteÃ§Ã£o de concorrÃªncia usa `SELECT id FROM colaboradores WHERE id = :id FOR UPDATE` (via `Prisma.sql`/`$queryRaw`, dentro de `prisma.$transaction`), bloqueando a linha do colaborador atÃ© o fim da transaÃ§Ã£o â€” nÃ£o foi usado `SERIALIZABLE` nem lock distribuÃ­do/Redis/fila.

**Motivo**: `FOR UPDATE` na linha do colaborador Ã© suficiente para serializar, na prÃ¡tica, apenas as operaÃ§Ãµes de agendamento do MESMO colaborador (outros colaboradores continuam sendo atendidos em paralelo, sem bloqueio), com o menor custo e complexidade possÃ­vel â€” exatamente o escopo do teste, que nÃ£o exige otimizaÃ§Ã£o de concorrÃªncia global nem infraestrutura adicional. `SERIALIZABLE` mudaria o nÃ­vel de isolamento de toda a transaÃ§Ã£o (com necessidade de lÃ³gica de retry em caso de falha de serializaÃ§Ã£o), uma complexidade desnecessÃ¡ria quando o lock direcionado jÃ¡ resolve o problema.

### 3. ValidaÃ§Ã£o da proteÃ§Ã£o de concorrÃªncia

Esta decisÃ£o foi implementada e validada estaticamente (type-check, build, revisÃ£o de cÃ³digo), mas a prova de que o lock efetivamente serializa duas transaÃ§Ãµes concorrentes sÃ³ pode ser obtida executando o teste de concorrÃªncia (`tests/integration/concorrencia-agendamento.test.ts`) contra um PostgreSQL real â€” o que nÃ£o foi possÃ­vel nesta etapa, pois este ambiente de desenvolvimento nÃ£o possui PostgreSQL disponÃ­vel. Essa validaÃ§Ã£o externa permanece pendente, como jÃ¡ registrado na seÃ§Ã£o "16. ValidaÃ§Ã£o externa" do plano original.

---

## AtualizaÃ§Ã£o do plano â€” decisÃµes da API REST (HTTP)

Esta seÃ§Ã£o registra decisÃµes tomadas na etapa de implementaÃ§Ã£o da camada HTTP (Express), realizada apÃ³s a implementaÃ§Ã£o e commit da persistÃªncia real e do mecanismo de lock/transaÃ§Ã£o. O conteÃºdo original deste `PLAN.md` e as atualizaÃ§Ãµes anteriores foram mantidos integralmente.

### 1. Rota de cancelamento: ajuste em relaÃ§Ã£o Ã  decisÃ£o anterior

A seÃ§Ã£o "AtualizaÃ§Ã£o do plano â€” decisÃµes da camada de aplicaÃ§Ã£o", item 2, havia registrado `DELETE /agendamentos/:id` como a rota de cancelamento. Na implementaÃ§Ã£o da API HTTP, a rota final ficou aninhada sob o colaborador: `DELETE /colaboradores/:id/ferias/:agendamentoId`.

**DecisÃ£o**: manter o cancelamento aninhado sob `/colaboradores/:id/ferias/:agendamentoId`, em vez de uma rota de nÃ­vel superior `/agendamentos/:id`.

**Motivo**: todos os demais endpoints de fÃ©rias jÃ¡ sÃ£o aninhados sob `/colaboradores/:id` (`POST .../ferias`, `GET .../ferias`, `GET .../periodos`); manter o cancelamento no mesmo padrÃ£o evita misturar dois estilos de rota (aninhado vs. nÃ­vel superior) para o mesmo recurso. O `:id` do colaborador na rota Ã© validado apenas quanto ao formato (inteiro positivo), mas nÃ£o Ã© usado para localizar o agendamento â€” o `agendamentoId` jÃ¡ identifica o registro de forma Ãºnica; a decisÃ£o de cancelamento lÃ³gico (alterar `status` para `cancelado`, preservando o registro) permanece exatamente como jÃ¡ decidido anteriormente, sem alteraÃ§Ã£o.

### 2. SerializaÃ§Ã£o monetÃ¡ria na resposta HTTP: string decimal, nunca `number`

**DecisÃ£o**: todo valor monetÃ¡rio (`salarioMensal`, `valores.remuneracao`, `valores.tercoConstitucional`, `valores.total`) Ã© serializado como **string decimal** com 2 casas (ex.: `"1633.33"`), nunca como `number` JSON.

**Motivo**: o domÃ­nio representa dinheiro como `bigint` de centavos; `bigint` nÃ£o pode ser serializado diretamente por `JSON.stringify` (lanÃ§a `TypeError`), e convertÃª-lo para `number` reintroduziria o prÃ³prio problema de ponto flutuante que a escolha de `bigint` no domÃ­nio evitou desde a etapa de domÃ­nio puro. A conversÃ£o `bigint â†’ string` usa apenas divisÃ£o/resto inteiros de `bigint` (nunca `Number`), e o caminho inverso (`parseSalarioDoRequest`, na entrada) usa apenas regex + `BigInt`, preservando centavos exatos em ambas as direÃ§Ãµes (validado com o caso de borda `5n â†’ "0.05"` e com o exemplo numÃ©rico do prÃ³prio enunciado).

### 3. Mapeamento de erro de domÃ­nio/aplicaÃ§Ã£o para status HTTP

**DecisÃ£o**:
- `RegraNegocioError` (violaÃ§Ã£o de R1-R7) â†’ **422 Unprocessable Entity**, corpo `{"error":{"code":"R1".."R7","message":"..."}}`.
- `RecursoNaoEncontradoError` (colaborador/agendamento inexistente) â†’ **404 Not Found**, `code: "NAO_ENCONTRADO"`.
- `ConflitoDeEstadoError` (ex.: cancelar agendamento jÃ¡ cancelado) â†’ **409 Conflict**, `code: "CONFLITO"`.
- `EntradaInvalidaError`/`EntradaHttpInvalidaError` (formato/tipo/campo ausente) â†’ **400 Bad Request**, `code: "ENTRADA_INVALIDA"`.
- Qualquer outro erro (nÃ£o mapeado, incluindo falha de parsing do body JSON) â†’ **500 Internal Server Error**, mensagem genÃ©rica fixa, nunca a mensagem/stack original.

**Motivo**: 422 (nÃ£o 400) para regra de negÃ³cio porque a entrada Ã© estruturalmente vÃ¡lida (tipos e formato corretos) â€” o que a rejeita Ã© uma regra do domÃ­nio, nÃ£o o formato da requisiÃ§Ã£o; essa distinÃ§Ã£o mantÃ©m 400 reservado exclusivamente para problemas de formato/estrutura, nunca de regra de negÃ³cio, evitando ambiguidade para quem consome a API. A traduÃ§Ã£o erroâ†’status Ã© centralizada em uma Ãºnica funÃ§Ã£o (`responderComErro`), nunca decidida individualmente por cada controller, para impedir inconsistÃªncia entre endpoints.

### 4. Testes HTTP sem PostgreSQL real: app Express real + repositories fake

**DecisÃ£o**: os testes HTTP (Supertest) usam o mesmo `createApp` de produÃ§Ã£o, mas com `ColaboradorRepositoryFake`/`AgendamentoRepositoryFake` (os mesmos fakes em memÃ³ria jÃ¡ usados nos testes de application service) injetados em vez dos repositories Prisma.

**Motivo**: este ambiente de desenvolvimento nÃ£o possui PostgreSQL disponÃ­vel (restriÃ§Ã£o jÃ¡ registrada em etapas anteriores). Trocar apenas a fonte de persistÃªncia, mantendo o Express real, o roteamento real, os controllers reais e os application services reais, permite testar de fato a integraÃ§Ã£o HTTPâ†”applicationâ†”domÃ­nio via requisiÃ§Ãµes HTTP reais (nÃ£o chamando controllers diretamente), sem depender de banco â€” ao custo de nÃ£o validar a integraÃ§Ã£o real com Prisma/PostgreSQL nesta etapa, o que permanece pendente como validaÃ§Ã£o externa (mesma pendÃªncia jÃ¡ registrada para o teste de concorrÃªncia).

---

## AtualizaÃ§Ã£o do plano â€” correÃ§Ãµes pÃ³s-revisÃ£o da API REST

Esta seÃ§Ã£o registra duas correÃ§Ãµes pontuais feitas apÃ³s a revisÃ£o crÃ­tica da etapa anterior (API REST), antes do commit daquela etapa. O conteÃºdo original deste `PLAN.md` e as atualizaÃ§Ãµes anteriores foram mantidos integralmente; esta seÃ§Ã£o apenas corrige/complementa pontos especÃ­ficos.

### 1. SemÃ¢ntica de "hoje" para R6: data civil de America/Sao_Paulo, nÃ£o UTC

A implementaÃ§Ã£o original de `hojeComoCalendarDate()` (entÃ£o em `serializacao.ts`) calculava "hoje" usando `new Date()` + `getUTCFullYear/getUTCMonth/getUTCDate` â€” ou seja, a data civil em UTC. Isso Ã© problemÃ¡tico porque R6 depende diretamente de "hoje", e o projeto trabalha com semÃ¢ntica de calendÃ¡rio civil de America/Sao_Paulo (UTC-3): entre 21h00 e 23h59 no horÃ¡rio de BrasÃ­lia, a data jÃ¡ virou em UTC mas ainda nÃ£o virou em SÃ£o Paulo, fazendo a API considerar erroneamente "hoje" como o dia seguinte ao dia civil real do projeto.

**DecisÃ£o**: `hojeComoCalendarDate()` foi movida para um novo arquivo dedicado, `src/http/relogio.ts`, e passou a derivar a data civil via `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` fixo (funÃ§Ã£o pura `dataCivilEmSaoPaulo(instante: Date): CalendarDate`), em vez dos componentes UTC do `Date`. A obtenÃ§Ã£o do instante (`new Date()`) permanece isolada na borda HTTP â€” nenhuma funÃ§Ã£o de domÃ­nio passou a usar `Date`, nenhuma regra R1-R7 foi alterada, e nenhum cÃ¡lculo de duraÃ§Ã£o (soma/diferenÃ§a de dias) usa timezone; apenas a leitura de "agora" ganhou o fuso horÃ¡rio correto.

**Motivo da abstraÃ§Ã£o mÃ­nima**: separar `dataCivilEmSaoPaulo(instante)` (pura, recebe o instante) de `hojeComoCalendarDate()` (sem argumento, usa `new Date()` real) permite testar deterministicamente o cenÃ¡rio de risco (virada de dia por timezone) com instantes fixos, sem depender do relÃ³gio real da mÃ¡quina nem introduzir fake timers â€” sem criar um framework de "clock" genÃ©rico, que nÃ£o era necessÃ¡rio para este caso pontual.

### 2. JSON malformado no corpo da requisiÃ§Ã£o: 400, nÃ£o 500

Erro de parsing do `express.json()` (corpo da requisiÃ§Ã£o nÃ£o Ã© um JSON vÃ¡lido) estava caindo no tratamento genÃ©rico de "erro inesperado" (500), por nÃ£o ser nenhum dos tipos de erro de domÃ­nio/aplicaÃ§Ã£o reconhecidos.

**DecisÃ£o**: `responderComErro` passou a identificar especificamente esse erro (um `SyntaxError` do `body-parser`, com a propriedade `type === "entity.parse.failed"`, confirmado por execuÃ§Ã£o real contra a versÃ£o do Express usada neste projeto) e mapeÃ¡-lo para **400 Bad Request**, `code: "ENTRADA_INVALIDA"`, com uma mensagem fixa e segura ("O corpo da requisiÃ§Ã£o nÃ£o Ã© um JSON vÃ¡lido."), nunca a mensagem original do parser (que pode incluir um trecho do body enviado pelo cliente).

**Motivo**: um corpo de requisiÃ§Ã£o sintaticamente invÃ¡lido Ã©, por natureza, um erro de formato da entrada do cliente â€” a mesma categoria de `EntradaHttpInvalidaError` (400) jÃ¡ usada para os demais problemas de formato â€”, nÃ£o um erro inesperado do servidor (500). Detectar o erro pela propriedade `type` (em vez de `instanceof SyntaxError` genÃ©rico) evita capturar por engano um `SyntaxError` de outra origem (um bug real de cÃ³digo) como se fosse entrada invÃ¡lida do cliente.

---

## AtualizaÃ§Ã£o do plano â€” decisÃµes do frontend

Esta seÃ§Ã£o registra decisÃµes tomadas na etapa de implementaÃ§Ã£o do frontend (React + Vite + TypeScript + Tailwind, consumindo a API REST jÃ¡ existente). O conteÃºdo original deste `PLAN.md` e as atualizaÃ§Ãµes anteriores foram mantidos integralmente â€” em particular, a seÃ§Ã£o "10. Frontend planejado" do plano original mencionava um "formulÃ¡rio de cadastro de colaborador" na UI; essa intenÃ§Ã£o inicial foi **revista** nesta etapa (ver item 2 abaixo) e substituÃ­da pela decisÃ£o de manter a criaÃ§Ã£o de colaborador exclusivamente via API.

### 1. Novo endpoint `GET /colaboradores` (somente leitura)

O contrato de API definido no enunciado do teste e jÃ¡ implementado no Bloco 4 nÃ£o incluÃ­a nenhuma rota para **listar** colaboradores â€” apenas `POST /colaboradores` (criar) e rotas que operam sobre um `:id` jÃ¡ conhecido (`GET .../periodos`, `POST .../ferias`, etc.). Sem alguma forma de descobrir quais colaboradores existem, a UI nÃ£o tem como oferecer a seleÃ§Ã£o de colaborador exigida pelo teste (requisito funcional mÃ­nimo do frontend).

**DecisÃ£o**: foi adicionado `GET /colaboradores`, que retorna a lista de colaboradores cadastrados (`{ "colaboradores": [{ id, nome, dataAdmissao, salarioMensal }] }`), reaproveitando o mÃ©todo `listar(): Promise<Colaborador[]>` que **jÃ¡ existia** na interface `ColaboradorRepository` (e em ambas as implementaÃ§Ãµes, Prisma e fake) desde etapas anteriores, mas que nÃ£o possuÃ­a nenhuma rota HTTP associada. Foi criado um caso de uso dedicado, `listarColaboradores`, para que o controller continuasse sem acessar o repository diretamente (mesmo padrÃ£o dos demais endpoints).

**Por que isso nÃ£o viola "criaÃ§Ã£o de colaborador Ã© API-only"**: o requisito de "API-only" refere-se especificamente Ã  **criaÃ§Ã£o** de colaboradores â€” isto Ã©, nÃ£o existir um formulÃ¡rio de cadastro na UI, para que a criaÃ§Ã£o sÃ³ ocorra por uma chamada HTTP explÃ­cita (POST), controlada por quem estÃ¡ operando a API diretamente (ex.: o avaliador do teste, via curl/Postman). `GET /colaboradores` Ã© estritamente **leitura**: nÃ£o cria, nÃ£o altera e nÃ£o remove nenhum colaborador; `POST /colaboradores` continua sendo o Ãºnico meio de criar um colaborador, e o frontend desta etapa nÃ£o o invoca em nenhum fluxo. Portanto, a UI pode listar colaboradores jÃ¡ criados por outro meio (API) sem comprometer o requisito.

**Alternativas consideradas e descartadas**:
- Pedir ao usuÃ¡rio da UI que digite o `id` do colaborador manualmente, sem nenhuma listagem: foi descartada por ser uma experiÃªncia pior sem nenhum ganho real de conformidade com o requisito (o requisito Ã© sobre criaÃ§Ã£o, nÃ£o sobre listagem), e por nÃ£o atender bem ao pedido explÃ­cito do bloco ("selecionar colaborador").
- Hardcodear um colaborador fixo de demonstraÃ§Ã£o no frontend: foi descartada por ser uma gambiarra que mascararia a ausÃªncia de integraÃ§Ã£o real com mÃºltiplos colaboradores.

### 2. CriaÃ§Ã£o de colaborador: confirmaÃ§Ã£o da decisÃ£o de nÃ£o ter formulÃ¡rio na UI

O plano original (seÃ§Ã£o "10. Frontend planejado") previa um "formulÃ¡rio de cadastro de colaborador" como parte do frontend. Essa intenÃ§Ã£o foi substituÃ­da nesta etapa.

**DecisÃ£o**: o frontend nÃ£o possui, em nenhuma tela, um formulÃ¡rio para criar colaborador. A criaÃ§Ã£o permanece possÃ­vel apenas via `POST /colaboradores` (API), conforme instruÃ§Ã£o explÃ­cita recebida para este bloco.

**Motivo**: o teste tÃ©cnico determina explicitamente que a criaÃ§Ã£o de colaborador deve ser feita apenas via API, nÃ£o pela interface. Mantida a decisÃ£o conforme instruÃ§Ã£o, atualizando o plano original que ainda nÃ£o refletia essa restriÃ§Ã£o.

### 3. Tipos TypeScript do frontend: derivados do contrato HTTP, nÃ£o duplicando os tipos do backend

**DecisÃ£o**: o frontend define seus prÃ³prios tipos (`src/types/`), descrevendo exatamente o formato JSON trocado com a API (ex.: `Periodo { periodoNumero: number; aquisitivoInicio: string; ...; diasDisponiveis: number }`, com datas e dinheiro como `string`) â€” nÃ£o importa nem reexporta nenhum tipo do backend (`CalendarDate`, `bigint`, etc.), jÃ¡ que frontend e backend sÃ£o processos/times de build independentes, comunicando-se apenas por HTTP/JSON.

**Motivo**: evita qualquer tentaÃ§Ã£o de reintroduzir `bigint`/`CalendarDate` no lado do cliente (impossÃ­vel de qualquer forma, pois `bigint` nÃ£o atravessa JSON) e mantÃ©m a fronteira HTTP como Ãºnica fonte de verdade do contrato â€” qualquer mudanÃ§a de contrato precisa ser refletida explicitamente nos tipos do frontend, nunca "herdada" silenciosamente de um tipo do backend.

---

## AtualizaÃ§Ã£o do plano â€” adaptaÃ§Ã£o de preview da Brixly

Esta seÃ§Ã£o registra uma adaptaÃ§Ã£o pontual feita exclusivamente para contornar uma limitaÃ§Ã£o do mecanismo de preview/publicaÃ§Ã£o do AMBIENTE de desenvolvimento (Brixly), sem nenhuma relaÃ§Ã£o com as regras de negÃ³cio, a API ou a arquitetura final exigida pelo teste. O conteÃºdo original deste `PLAN.md` e as atualizaÃ§Ãµes anteriores foram mantidos integralmente.

### Contexto

A estrutura final deste projeto Ã©, e continua sendo, um monorepo com `backend/` e `frontend/` separados, comunicando-se via HTTP, conforme planejado desde a seÃ§Ã£o inicial deste documento. Essa estrutura Ã© exigida pelo teste tÃ©cnico e nÃ£o foi alterada por esta adaptaÃ§Ã£o.

O ambiente de desenvolvimento (Brixly) tenta automaticamente identificar, buildar e servir um "app" para exibir no preview visual e permitir a publicaÃ§Ã£o. O mecanismo de detecÃ§Ã£o usado pela Brixly procura, na raiz do projeto, um `package.json` ou `index.html`; se nÃ£o encontrar, procura exatamente **uma** subpasta que tenha um desses arquivos. Como este projeto tem **duas** subpastas candidatas (`backend/package.json` e `frontend/package.json`), essa heurÃ­stica nÃ£o consegue decidir qual delas Ã© o frontend, cai de volta para a raiz (que nÃ£o tem nenhum app) e nunca builda nada â€” o preview continuava mostrando um placeholder antigo, prÃ©-existente, e o botÃ£o de publicaÃ§Ã£o indicava "nÃ£o hÃ¡ nada para publicar".

### DecisÃ£o

Foi criado um `package.json` mÃ­nimo na **raiz** do projeto (fora de `backend/` e `frontend/`), contendo apenas:
- `"private": true` (nunca serÃ¡ publicado em nenhum registro npm);
- nenhum campo `dependencies`/`devDependencies` prÃ³prio;
- um Ãºnico script `build`, que instala as dependÃªncias de `frontend/` (via `npm --prefix frontend ci`), builda o frontend com seu prÃ³prio `npm run build` (via `npm --prefix frontend run build`), e copia o resultado (`frontend/dist`) para `./dist` na raiz â€” que Ã© o diretÃ³rio que o mecanismo de preview da Brixly efetivamente lÃª e serve.

Essa adaptaÃ§Ã£o:
- nÃ£o move `backend/` nem `frontend/`;
- nÃ£o copia nenhum cÃ³digo-fonte do frontend para a raiz (sÃ³ o artefato de build final, `dist/`, que jÃ¡ era gitignored e nunca fez parte do cÃ³digo-fonte versionado);
- nÃ£o cria uma segunda implementaÃ§Ã£o do frontend â€” o build real continua ocorrendo inteiramente dentro de `frontend/`, com as mesmas ferramentas (Vite, TypeScript) jÃ¡ em uso;
- nÃ£o depende do `backend/` para buildar o frontend (o script nunca referencia `backend/`);
- nÃ£o altera nenhum endpoint, nenhuma regra R1-R7, nenhum componente do frontend jÃ¡ implementado.

### ValidaÃ§Ã£o realizada

Esta adaptaÃ§Ã£o foi validada chamando diretamente as funÃ§Ãµes reais do mÃ³dulo de preview da Brixly (`lovable.preview`, nÃ£o uma reimplementaÃ§Ã£o prÃ³pria) contra este projeto:
- `_app_root(project_dir)` passou a retornar a prÃ³pria raiz do projeto (antes retornava a raiz por ambiguidade/falha; agora retorna a raiz porque ela tem um `package.json` vÃ¡lido, satisfazendo a heurÃ­stica de forma inequÃ­voca).
- `_build(project_dir, pid)` (a mesma funÃ§Ã£o usada internamente por `start_preview`/`check_build`/`build_public`) executou com sucesso (retornou `None`, sem erro), gerando `./dist/index.html` com `<base href="/preview/2e22967b/">` injetado e os assets do bundle novo.
- Uma requisiÃ§Ã£o HTTP real contra o servidor do preview em execuÃ§Ã£o (`/preview/2e22967b/`) confirmou que o HTML e o JavaScript servidos correspondem Ã  interface funcional implementada no Bloco 5 (`PaginaControleFerias`), sem nenhum traÃ§o do placeholder antigo.

### Esta adaptaÃ§Ã£o NÃƒO faz parte da arquitetura de execuÃ§Ã£o final

O `docker-compose.yml` final nÃ£o lerÃ¡ nem dependerÃ¡, em nenhum momento, deste `package.json` da raiz â€” cada serviÃ§o (`backend`, `frontend`) terÃ¡ seu prÃ³prio `Dockerfile`/contexto de build isolado, exatamente como jÃ¡ planejado nas seÃ§Ãµes "7" e "11" deste documento. Este arquivo existe exclusivamente para o mecanismo de preview/publicaÃ§Ã£o do ambiente Brixly e **deverÃ¡ ser removido antes da entrega final** do teste, caso se confirme que nÃ£o Ã© necessÃ¡rio no ambiente de execuÃ§Ã£o real (Docker) â€” o que Ã© a expectativa, jÃ¡ que o Compose builda `frontend/` e `backend/` isoladamente, sem depender de nenhum orquestrador na raiz do repositÃ³rio.

---

## AtualizaÃ§Ã£o do plano â€” implementaÃ§Ã£o do Docker Compose

Esta seÃ§Ã£o registra a implementaÃ§Ã£o real do `docker-compose.yml` e dos `Dockerfile`s de `backend/` e `frontend/`, confirmando e detalhando a arquitetura jÃ¡ aprovada na etapa de planejamento anterior. O conteÃºdo original deste `PLAN.md` e todas as atualizaÃ§Ãµes anteriores foram mantidos integralmente. Nenhuma regra R1-R7, nenhum caso de uso e nenhuma estrutura de domÃ­nio foram alterados por esta etapa â€” apenas arquivos de infraestrutura de execuÃ§Ã£o (`Dockerfile`, `docker-compose.yml`, `nginx.conf`, `docker-entrypoint.sh`) foram criados.

### 1. Arquitetura dos containers

TrÃªs serviÃ§os: `postgres` (`postgres:16-alpine`), `backend` (build multi-stage de `backend/Dockerfile`, Node 22 Alpine) e `frontend` (build multi-stage de `frontend/Dockerfile`: Node 22 Alpine para o `vite build`, servido por `nginx:alpine` na camada final). Apenas o `frontend` publica uma porta ao host (`8080:80`); `postgres` e `backend` sÃ³ existem na rede interna do Compose, nunca expostos diretamente.

### 2. Fluxo de inicializaÃ§Ã£o (`docker compose up --build`)

1. `postgres` sobe; seu `healthcheck` (`pg_isready -U postgres -d controle_ferias`) precisa passar antes de qualquer outro serviÃ§o depender dele.
2. `backend` sÃ³ inicia depois que `postgres` estÃ¡ `service_healthy` (`depends_on: postgres: condition: service_healthy`). Ao iniciar, `docker-entrypoint.sh` roda `npx prisma migrate deploy` (aplica as migrations jÃ¡ versionadas em `prisma/migrations/`, sem interaÃ§Ã£o, sem gerar migration nova) e sÃ³ entÃ£o executa `node dist/http/server.js`.
3. `frontend` builda com `VITE_API_URL=/api` como build `ARG` (ver item 4), gerando um bundle estÃ¡tico jÃ¡ com essa URL embutida; o container de runtime Ã© sÃ³ `nginx:alpine` servindo esses arquivos â€” nenhum processo Node roda no container final do frontend.
4. Nenhum passo manual (instalaÃ§Ã£o de dependÃªncias, geraÃ§Ã£o do Prisma Client, aplicaÃ§Ã£o de migration, criaÃ§Ã£o de banco/tabelas) Ã© necessÃ¡rio fora do que os prÃ³prios `Dockerfile`s e o `docker-entrypoint.sh` jÃ¡ executam.

### 3. DecisÃ£o Nginx + `/api`

O navegador do usuÃ¡rio nunca recebe o hostname `backend` em nenhuma resposta â€” ele sÃ³ conhece a origem publicada pelo Compose (`http://localhost:8080`, ou o host:porta real no ambiente de validaÃ§Ã£o). O `nginx.conf` do frontend serve os arquivos estÃ¡ticos do build e faz proxy reverso de `location /api/` para `proxy_pass http://backend:3001/` (barra final em ambos â€” Ã© o que faz o Nginx reescrever o caminho removendo o prefixo `/api`, jÃ¡ que nenhuma rota do backend tem esse prefixo). O hostname `backend` sÃ³ Ã© resolvido pelo Nginx, via o DNS interno da rede do Compose â€” nunca pelo navegador. SPA fallback (`try_files $uri $uri/ /index.html`) garante que recarregar uma rota de cliente nÃ£o retorne 404.

Esta decisÃ£o foi validada localmente (sem Docker, que nÃ£o estÃ¡ disponÃ­vel neste ambiente Brixly â€” ver item 7): o `nginx.conf` real foi testado com `nginx -t` (sintaxe), e depois rodando um `nginx` real nesta mÃ¡quina, com o hostname `backend` substituÃ­do por `localhost` apenas para o teste (jÃ¡ que nÃ£o existe rede Docker aqui), fazendo requisiÃ§Ãµes HTTP reais (`GET`, `POST` com body JSON, `DELETE` com mÃºltiplos segmentos de path, e uma rota inexistente para o SPA fallback) contra o backend real deste projeto rodando localmente. Todas as requisiÃ§Ãµes chegaram corretamente ao backend com o caminho, mÃ©todo e corpo esperados (confirmado pelos cÃ³digos de erro retornados: 500 por falta de PostgreSQL, nunca 404 de rota incorreta ou 400 de corpo corrompido); o SPA fallback serviu `index.html` corretamente para uma rota desconhecida.

### 4. EstratÃ©gia Prisma

`prisma generate` roda explicitamente no stage de build do `backend/Dockerfile`, depois de copiar `prisma/schema.prisma` e antes do `tsc` (que depende dos tipos gerados). O Prisma Client gerado (`node_modules/.prisma` e `node_modules/@prisma`) Ã© copiado do stage de build para o stage de runtime, evitando gerar novamente numa imagem sem as devDependencies. `prisma migrate deploy` (nunca `migrate dev`, que Ã© interativo) roda no `docker-entrypoint.sh`, a cada inÃ­cio do container, aplicando as migrations jÃ¡ versionadas contra o `DATABASE_URL` fornecido pelo `docker-compose.yml` (nunca `localhost` dentro do container â€” Ã© o nome do serviÃ§o `postgres`).

### 5. EstratÃ©gia PostgreSQL

`postgres:16-alpine` (versÃ£o fixada, nunca `latest`), com `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` de desenvolvimento/local (nunca credenciais reais), volume nomeado (`pgdata`) para persistir dados entre reinicializaÃ§Ãµes do Compose, e `healthcheck` via `pg_isready`. Nenhuma porta publicada ao host â€” sÃ³ acessÃ­vel pela rede interna do Compose, pelo serviÃ§o `backend`.

### 6. EstratÃ©gia de testes

Os testes unitÃ¡rios (domÃ­nio R1-R7), de application (com repositories fake) e HTTP (com repositories fake, via Supertest) continuam rodando exatamente como antes, sem nenhuma dependÃªncia de Docker/PostgreSQL â€” nenhum desses arquivos foi alterado nesta etapa. Os testes de integraÃ§Ã£o (`tests/integration/`, que exigem PostgreSQL real) permanecem com `describe.skip`, exatamente como jÃ¡ estavam â€” **decisÃ£o explÃ­cita de nÃ£o automatizar a remoÃ§Ã£o do skip nesta etapa**, para nÃ£o mascarar a diferenÃ§a entre "testado" e "nÃ£o testado contra banco real". Foi adicionado um script `npm run test:integration` (`vitest run tests/integration`) que roda especificamente esses arquivos â€” enquanto permanecerem com `.skip`, o resultado seguirÃ¡ sendo reportado como "skipped", nunca "passed". Para validar de fato contra PostgreSQL real (ambiente externo com Docker), os passos continuam sendo os jÃ¡ documentados no cabeÃ§alho de cada arquivo de teste de integraÃ§Ã£o: subir o Postgres, apontar `DATABASE_URL`, rodar `prisma migrate deploy`, remover manualmente o `.skip`, e entÃ£o `npm run test:integration`.

### 7. LimitaÃ§Ãµes de validaÃ§Ã£o no ambiente Brixly

Docker nÃ£o estÃ¡ disponÃ­vel neste ambiente de desenvolvimento (Brixly) â€” confirmado novamente antes desta etapa. Por isso, `docker compose up --build` **nÃ£o foi executado** nesta sessÃ£o, e nÃ£o deve ser considerado validado atÃ© que isso ocorra em um ambiente externo com Docker real. O que foi validado nesta etapa, de forma real (nÃ£o apenas por leitura de cÃ³digo):
- Sintaxe do `nginx.conf` (via `nginx -t` com o binÃ¡rio Nginx real instalado neste host).
- Comportamento funcional do proxy `/api/*` e do SPA fallback, rodando um Nginx real localmente (com o hostname `backend` substituÃ­do por `localhost` apenas para possibilitar o teste fora de uma rede Docker) contra o backend real deste projeto.
- Mecanismo de `VITE_API_URL` em tempo de build: confirmado por execuÃ§Ã£o real (`VITE_API_URL=/api npm run build`) que o bundle gerado contÃ©m `"/api"` embutido e nÃ£o contÃ©m mais `localhost:3001`.
- Type-check e build do backend e do frontend, e a suÃ­te completa de testes (337 passando no backend, 21 no frontend, 24 skipped de integraÃ§Ã£o) â€” sem regressÃ£o em relaÃ§Ã£o Ã  etapa anterior.

O que permanece como validaÃ§Ã£o externa pendente (idÃªntico ao jÃ¡ registrado nas seÃ§Ãµes "16" do plano original e nas atualizaÃ§Ãµes de blocos anteriores): a execuÃ§Ã£o real de `docker compose up --build` de ponta a ponta numa mÃ¡quina limpa, incluindo a confirmaÃ§Ã£o de que a migration Ã© aplicada automaticamente, que os trÃªs serviÃ§os se comunicam corretamente dentro da rede real do Docker, e que os testes de integraÃ§Ã£o passam de fato contra um PostgreSQL real.

---

## Atualização do plano — correções e validação externa final

Esta seção registra decisões e resultados confirmados após a implementação e validação externa do sistema. O conteúdo anterior deste PLAN.md foi mantido integralmente.

### 1. Estratégia monetária final

A decisão registrada anteriormente sobre o uso direto de Prisma.Decimal no domínio foi substituída pela implementação efetivamente adotada.

O domínio de valores de férias (R7) utiliza exclusivamente igint, representando valores monetários em centavos.

A regra final é:

- salário recebido pelo domínio em centavos (igint);
- remuneração e terço calculados com aritmética inteira;
- arredondamento HALF_UP realizado somente no resultado individual de cada valor;
- total calculado pela soma dos dois valores individuais já arredondados;
- nenhuma operação monetária do domínio utiliza `number`;
- nenhuma regra de negócio importa Prisma ou depende da camada de persistência.

O Prisma Decimal permanece somente na fronteira de persistência, para representar a coluna NUMERIC(10,2) do PostgreSQL. A conversão entre persistência e domínio ocorre no repository.

Essa separação mantém o domínio independente do ORM e evita que detalhes de persistência contaminem a lógica de R7.

### 2. Validação externa do Docker Compose

A validação externa prevista anteriormente foi realizada em uma máquina Windows com Docker Desktop e Docker Compose disponíveis.

Foi executado:

docker compose up --build

O processo confirmou:

- build dos containers postgres, ackend e rontend;
- inicialização do PostgreSQL com healthcheck;
- execução automática da migration Prisma;
- inicialização do backend;
- inicialização do frontend com Nginx;
- comunicação do frontend com o backend através de /api;
- funcionamento da aplicação em http://localhost:8080.

Durante a primeira execução, o backend apresentou o erro:

exec ./docker-entrypoint.sh: no such file or directory

A investigação identificou que o script estava sendo executado com quebra de linha incompatível com o ambiente Linux do container. O arquivo foi normalizado para LF, o backend foi reconstruído e uma nova execução do Compose iniciou corretamente.

### 3. Validação funcional ponta a ponta

Após a inicialização correta dos containers, foram realizados fluxos reais através da API publicada pelo frontend:

- criação de colaborador;
- consulta de períodos aquisitivos e concessivos;
- agendamento de 14 dias;
- agendamento complementar de 16 dias;
- rejeição de agendamento adicional por R3;
- rejeição de início em data bloqueada por R4;
- agendamento em data válida;
- rejeição de sobreposição por R5;
- cancelamento lógico de agendamento;
- retorno dos dias cancelados ao saldo;
- validação dos valores de R7;
- validação de caso de borda de R3 com tentativa de deixar saldo impossível de completar.

Os valores do exemplo de R7 do enunciado foram confirmados na execução real: para salário de R$ 3.500,00 e 14 dias, remuneração de R$ 1.633,33, terço de R$ 544,44 e total de R$ 2.177,77.

### 4. Limite da validação

A validação externa confirmou o funcionamento real do Compose, das migrations, da comunicação entre containers e dos principais fluxos funcionais.

Os testes localizados em ackend/tests/integration/ continuam explicitamente marcados como skip quando dependem de PostgreSQL real. Eles não serão apresentados como testes aprovados.

Essa distinção é mantida deliberadamente para que o histórico do projeto registre exatamente o que foi executado e o que permaneceu não executado.
