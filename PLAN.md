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

---

## Atualização do plano — decisões de modelagem e domínio

Esta seção registra decisões tomadas após uma análise técnica aprofundada de modelagem de dados e estratégia de domínio, realizada após a elaboração do plano original acima. O conteúdo original deste `PLAN.md` foi mantido integralmente; esta seção apenas resolve pendências que haviam sido deixadas abertas na seção "19. Decisões ainda não definidas" e detalha decisões de modelagem que não estavam explícitas na versão original.

### 1. Períodos aquisitivos

Os períodos aquisitivos NÃO serão persistidos como tabela própria no banco de dados.

Eles serão calculados sob demanda a partir de:
- data de admissão do colaborador;
- número sequencial do período (`periodo_numero`).

A função de domínio responsável será determinística e pura:

```
calcularPeriodoAquisitivo(dataAdmissao, periodoNumero)
```

O período concessivo também será derivado do período aquisitivo (fim do aquisitivo + 1 dia até 12 meses depois), nunca persistido separadamente.

Justificativa:
- não existe estado próprio do período aquisitivo no escopo do teste;
- suas datas são completamente deriváveis a partir da data de admissão;
- evita duplicação de dados;
- evita problemas de sincronização entre o dado persistido e o dado real;
- simplifica o cancelamento e a consulta de saldo (saldo é sempre recomputado a partir dos agendamentos ativos, nunca armazenado);
- mantém as regras R1/R2 concentradas inteiramente no domínio, sem estado intermediário no banco.

### 2. Modelo do agendamento

O agendamento persistirá:

- `id`;
- `colaborador_id`;
- `periodo_numero`;
- `data_inicio`;
- `quantidade_dias`;
- `status`.

`periodo_numero` NÃO será uma `FOREIGN KEY` para uma tabela de períodos aquisitivos, pois essa tabela não existirá. O período aquisitivo real será reconstruído pelo domínio através da combinação `data_admissao` (do colaborador) + `periodo_numero` (do agendamento).

A data final do agendamento será derivada de:

```
data_inicio + quantidade_dias - 1
```

Não será persistida como coluna própria, salvo se uma necessidade concreta futura justificar essa mudança.

### 3. Datas de calendário

Datas de negócio serão tratadas como datas de calendário, nunca como timestamp:
- na API: strings `YYYY-MM-DD`;
- no banco: tipo `DATE`;
- no domínio: um value object próprio `CalendarDate` (ano/mês/dia);
- todas as operações de calendário (soma de dias, comparação, aniversário, último dia do mês) serão feitas por aritmética explícita de ano/mês/dia;
- sem dependência de timezone em nenhum cálculo de regra de negócio;
- sem utilizar o objeto `Date` do JavaScript para cálculos de regras de negócio (R1, R2, R4, R6).

Não será adicionada nenhuma biblioteca de datas de terceiros nesta etapa. O conjunto de operações necessárias foi avaliado como pequeno e suficientemente simples para ser implementado e testado como código próprio, com risco de bug menor do que o de introduzir uma dependência externa cujo comportamento de timezone precisaria ser auditado da mesma forma.

### 4. Valores monetários

- O PostgreSQL utilizará `NUMERIC(10,2)` para a coluna de salário.
- O Prisma utilizará seu tipo `Decimal` para mapear essa coluna.
- Os cálculos de R7 (remuneração e terço constitucional) utilizarão `Prisma.Decimal` diretamente, sem conversão para `number` em nenhum momento do cálculo.
- Multiplicação e divisão serão realizadas mantendo precisão decimal completa, sem arredondamento intermediário.
- Remuneração e terço serão arredondados individualmente para 2 casas decimais utilizando o modo `ROUND_HALF_UP` (meio centavo sobe).
- O total será a soma dos dois valores já arredondados, não o arredondamento da soma.

Não será adicionada a biblioteca `decimal.js` como dependência direta do projeto. Foi verificado que `Prisma.Decimal` é internamente a própria implementação de `decimal.js`, reexportada pelo runtime do Prisma com API equivalente (incluindo `times`, `dividedBy`, `toDecimalPlaces` com modo de arredondamento explícito e `plus`). Essa verificação incluiu a execução real do exemplo numérico do enunciado (salário R$ 3.500,00, 14 dias), confirmando os resultados esperados (remuneração R$ 1.633,33, terço R$ 544,44, total R$ 2.177,77). Adicionar `decimal.js` separadamente duplicaria uma dependência já disponível através do `@prisma/client`.

### 5. Integridade

Constraints planejadas para o banco de dados:
- `colaborador.nome`: obrigatório;
- `colaborador.data_admissao`: obrigatória;
- `colaborador.salario_mensal`: obrigatório e positivo;
- `agendamento.colaborador_id`: obrigatório (referência ao colaborador);
- `agendamento.periodo_numero`: obrigatório, maior ou igual a 1;
- `agendamento.quantidade_dias`: obrigatório, entre 1 e 30;
- `agendamento.status`: limitado aos valores `ativo` ou `cancelado`.

R3 (fracionamento) e R5 (sobreposição) permanecem regras de domínio/aplicação e não serão reduzidas a simples `CHECK` de banco, por dependerem de comparação entre múltiplas linhas existentes, não de validação de uma linha isolada.

### 6. Índices

Considerando o escopo do teste e a ausência de requisitos de performance ou escala, será utilizado somente o índice necessário para consultas de agendamentos por colaborador (`agendamento.colaborador_id`). Nenhum índice especulativo será adicionado.

### 7. Decisões substituídas

Esta atualização resolve as seguintes pendências que estavam registradas na seção "19. Decisões ainda não definidas" do plano original:

- **Períodos aquisitivos**: estavam em aberto entre "persistidos" ou "calculados sob demanda" — decidido: calculados sob demanda, sem tabela própria.
- **Estratégia de datas**: estava em aberto entre "estrutura própria" ou "biblioteca de terceiros" — decidido: value object `CalendarDate` próprio, sem biblioteca.
- **Estratégia monetária**: não havia decisão registrada ainda — decidido: `Prisma.Decimal`, sem `decimal.js`.
- **Modelo do agendamento**: não havia detalhamento registrado ainda sobre como o agendamento referenciaria o período aquisitivo — decidido: campo `periodo_numero` (inteiro), não uma `FOREIGN KEY`.

O texto original da seção 19 não foi removido nem alterado; esta seção apenas registra que as pendências correspondentes foram resolvidas.

---

## Atualização do plano — decisões da camada de aplicação

Esta seção registra decisões tomadas na etapa de planejamento da camada de aplicação (services/use cases que orquestram as regras R1-R7), realizada após a conclusão e commit de todo o domínio puro. O conteúdo original deste `PLAN.md` e as atualizações anteriores foram mantidos integralmente.

### 1. Quantos períodos aquisitivos exibir na consulta de saldo/períodos

O enunciado exige a consulta de saldo/períodos aquisitivos, mas não define explicitamente quantos períodos calculados devem ser exibidos — um colaborador antigo poderia, em tese, ter dezenas de períodos aquisitivos desde a admissão.

**Decisão**: o endpoint de consulta de períodos exibirá os períodos aquisitivos do período 1 até o período aquisitivo vigente na data de hoje, inclusive.

**Motivo**: essa interpretação mantém a consulta finita e coerente com a situação atual do colaborador, sem exigir um parâmetro adicional de "quantos períodos exibir" que o enunciado não pede.

### 2. Forma do cancelamento na API

**Decisão**: a API usará `DELETE /agendamentos/:id` para solicitar o cancelamento, mas a operação será um cancelamento lógico — altera o campo `status` para `cancelado`, preservando o registro no banco.

**Motivo**: R6 exige que o cancelamento devolva os dias ao saldo disponível; preservar o registro (em vez de excluí-lo fisicamente) mantém o histórico do colaborador e permite demonstrar o estado anterior do agendamento, além de ser consistente com a decisão já registrada de que o saldo é sempre recomputado a partir dos agendamentos ativos, nunca armazenado.

---

## Atualização do plano — decisões de persistência e concorrência

Esta seção registra decisões tomadas na etapa de implementação da persistência real (Prisma/PostgreSQL) e da proteção contra concorrência no agendamento, realizada após a implementação e commit dos application services com repositories fake. O conteúdo original deste `PLAN.md` e as atualizações anteriores foram mantidos integralmente.

### 1. Ajuste mínimo na interface `AgendamentoRepository`

A interface `AgendamentoRepository`, definida na etapa anterior (camada de aplicação), não previa nenhum mecanismo de transação — cada método (`buscarPorId`, `listarAtivosPorColaborador`, `criar`, etc.) era uma operação independente. Isso deixava uma lacuna real: o fluxo de agendamento (ler agendamentos ativos para validar R3/R5 → inserir o novo agendamento) não tinha nenhuma garantia de atomicidade entre a leitura e a escrita, criando risco de corrida entre duas requisições concorrentes para o mesmo colaborador (risco já identificado na análise arquitetural anterior).

**Decisão**: foi adicionado um único método à interface, `executarComLockDoColaborador<T>(colaboradorId: number, operacao: (agendamentoRepositoryTransacional: AgendamentoRepository) => Promise<T>): Promise<T>`, que executa `operacao` (fornecida pelo application service, contendo a orquestração de R3/R5 e a chamada de criação) dentro de uma transação que bloqueia a linha do colaborador correspondente. `operacao` recebe como argumento um `AgendamentoRepository` com escopo da própria transação — todas as chamadas que precisam ocorrer dentro do lock usam esse repository recebido, nunca uma referência externa a outra instância.

**Motivo**: essa é a menor mudança de interface capaz de resolver o problema de concorrência corretamente, sem transformar a camada de aplicação em um framework de Unit of Work. O repository continua sem conhecer nenhuma regra de negócio — ele apenas inicia a transação/lock e delega toda a lógica para o callback, que é escrito e controlado inteiramente pelo application service (`agendarFerias`). A implementação fake (em memória) apenas chama o callback diretamente (passando a própria instância), pois não há concorrência real a serializar numa estrutura em memória de processo único usada em testes sequenciais.

Ponto de atenção corrigido durante a implementação: a primeira versão desta interface usava um campo mutável (`clienteAtivo`) na implementação Prisma, temporariamente reatribuído durante a transação — um bug real sob concorrência, pois duas chamadas simultâneas na mesma instância de repository (o padrão normal de uma aplicação, que reaproveita uma única instância entre requisições) poderiam sobrescrever esse campo uma da outra. A correção, refletida na assinatura final acima, elimina qualquer estado mutável: cada chamada de `executarComLockDoColaborador` cria uma nova instância local do repository, vinculada ao cliente de transação daquela chamada específica, e a passa como argumento ao callback — nunca reaproveitando nem compartilhando esse objeto entre chamadas concorrentes.

### 2. Mecanismo de lock escolhido: `SELECT ... FOR UPDATE`

**Decisão**: a proteção de concorrência usa `SELECT id FROM colaboradores WHERE id = :id FOR UPDATE` (via `Prisma.sql`/`$queryRaw`, dentro de `prisma.$transaction`), bloqueando a linha do colaborador até o fim da transação — não foi usado `SERIALIZABLE` nem lock distribuído/Redis/fila.

**Motivo**: `FOR UPDATE` na linha do colaborador é suficiente para serializar, na prática, apenas as operações de agendamento do MESMO colaborador (outros colaboradores continuam sendo atendidos em paralelo, sem bloqueio), com o menor custo e complexidade possível — exatamente o escopo do teste, que não exige otimização de concorrência global nem infraestrutura adicional. `SERIALIZABLE` mudaria o nível de isolamento de toda a transação (com necessidade de lógica de retry em caso de falha de serialização), uma complexidade desnecessária quando o lock direcionado já resolve o problema.

### 3. Validação da proteção de concorrência

Esta decisão foi implementada e validada estaticamente (type-check, build, revisão de código), mas a prova de que o lock efetivamente serializa duas transações concorrentes só pode ser obtida executando o teste de concorrência (`tests/integration/concorrencia-agendamento.test.ts`) contra um PostgreSQL real — o que não foi possível nesta etapa, pois este ambiente de desenvolvimento não possui PostgreSQL disponível. Essa validação externa permanece pendente, como já registrado na seção "16. Validação externa" do plano original.
