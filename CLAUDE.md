# CLAUDE.md

Instruções oficiais para o Claude Code durante o desenvolvimento deste projeto. Estas regras são específicas deste repositório e têm precedência sobre qualquer configuração genérica de IA que não esteja aqui. Não copiar nem modificar configurações internas da infraestrutura da Brixly.

## 1. Objetivo do projeto

Este projeto é um sistema de controle de férias para RH, desenvolvido como teste técnico da Kiip, baseado nas regras de negócio R1 a R7 especificadas no enunciado do teste. O sistema é composto por backend, frontend e banco de dados PostgreSQL, e deve ser capaz de funcionar de forma completamente independente da plataforma Brixly, sendo executável em qualquer máquina limpa através de `docker compose up --build`.

## 2. Stack

- TypeScript
- Node.js
- Express
- React
- Vite
- PostgreSQL
- Prisma
- Vitest
- Supertest
- Docker
- Docker Compose
- Tailwind CSS

Não adicionar nenhuma tecnologia fora desta lista sem necessidade comprovada pelo escopo do teste.

## 3. Arquitetura

- Frontend separado do backend, comunicando-se via HTTP.
- Backend expõe API REST/JSON.
- Regras de negócio (R1-R7) concentradas em `services`/domínio, isoladas da camada HTTP e do acesso a dados.
- `routes`/controllers responsáveis apenas por tradução HTTP (request/response), sem lógica de negócio.
- `repositories` responsáveis exclusivamente pelo acesso a dados (Prisma/PostgreSQL).
- PostgreSQL como banco de dados relacional.
- Prisma como ORM, incluindo migrations.
- Frontend consome a API exclusivamente via HTTP, sem acesso direto ao banco.
- Docker Compose orquestra três serviços: frontend, backend e PostgreSQL.

Não criar microsserviços, filas, cache, autenticação, autorização ou qualquer outra complexidade que não seja exigida pelo teste técnico.

## 4. Ambiente Brixly

- O desenvolvimento está acontecendo dentro do ambiente Brixly.
- O Brixly é um ambiente de desenvolvimento compartilhado, usado por múltiplos projetos simultaneamente.
- NÃO instalar Docker no host.
- NÃO instalar PostgreSQL no host.
- NÃO alterar configurações ou infraestrutura global do Brixly.
- NÃO depender das APIs proprietárias `/_api` do Brixly.
- NÃO depender de variáveis ou serviços internos do Brixly para o funcionamento final do sistema.
- O sistema final deve funcionar de forma independente, em uma máquina limpa, através de `docker compose up --build`.
- Docker não está disponível neste ambiente. A validação real do Docker Compose será feita posteriormente em ambiente externo apropriado — nunca afirmar que essa validação ocorreu dentro da Brixly.

## 5. Regras de datas

As datas de férias são **datas de calendário** (ano-mês-dia), não timestamps.

- Não utilizar `Date` do JavaScript para cálculos de dias, aniversários ou regras de calendário quando isso puder introduzir problemas de timezone ou deslocamento de dia.
- Preferir representação explícita de data no formato `YYYY-MM-DD` ou um tipo/value object equivalente, construído e comparado por aritmética de calendário (ano/mês/dia), não por milissegundos.
- O banco deve utilizar o tipo `DATE` para todas as colunas de data de negócio.
- Não utilizar conversões implícitas para UTC para representar datas de negócio.
- Os cálculos de aniversário, último dia do mês, período aquisitivo, período concessivo, início e fim das férias devem respeitar exatamente as regras do teste técnico, incluindo os casos de borda (ex.: admissão em 29/02).

## 6. Regras de negócio R1-R7

**R1 — Período aquisitivo**
A cada 12 meses o colaborador adquire 30 dias. O período aquisitivo começa no aniversário correspondente à data de admissão e termina no dia anterior ao próximo aniversário. Quando a data de aniversário não existir no mês, utilizar o último dia daquele mês.

**R2 — Período concessivo**
As férias de um período aquisitivo só podem ser gozadas dentro do respectivo período concessivo, que corresponde aos 12 meses seguintes ao fim do período aquisitivo. Antes do início do período concessivo, NÃO é permitido agendar férias. Todos os dias do agendamento devem estar dentro do período concessivo. Após o fim do período concessivo, os dias não utilizados são perdidos.

**R3 — Fracionamento**
Os 30 dias podem ser divididos em no máximo 3 períodos. Um período deve possuir pelo menos 14 dias. Os demais devem possuir pelo menos 5 dias. Toda nova programação deve verificar se o saldo restante ainda pode ser distribuído respeitando essas regras. **NÃO implementar esta regra através de condições específicas para os exemplos do teste.** A implementação deve ser geral, cobrindo qualquer combinação válida ou inválida, não apenas os exemplos citados no enunciado.

**R4 — Dia de início**
O início das férias não pode ocorrer:
- no domingo;
- em feriado;
- nos dois dias anteriores a um domingo;
- nos dois dias anteriores a um feriado.

Feriados fornecidos pelo teste técnico (devem ser tratados exatamente conforme especificados, sem cálculo automático de feriados móveis):

2026: 01/01, 03/04, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12
2027: 01/01, 26/03, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12
2028: 01/01, 14/04, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12

**NÃO simplificar esta regra para "segunda a quinta"**, porque os feriados alteram os dias permitidos em cada semana específica.

**R5 — Sem sobreposição**
Períodos de férias do mesmo colaborador não podem se sobrepor, inclusive quando pertencem a períodos aquisitivos diferentes.

**R6 — Hoje**
Só é permitido agendar férias quando o início for posterior à data atual. Só é permitido cancelar um agendamento quando seu início for posterior à data atual. Ao cancelar, os dias retornam ao saldo disponível do período aquisitivo.

**R7 — Valores**
Os valores financeiros devem ser calculados utilizando precisão completa durante os cálculos. A remuneração das férias e o terço constitucional devem ser arredondados individualmente ao final de cada cálculo para centavos, utilizando arredondamento em que meio centavo sobe. Depois disso, o total deve ser a soma dos dois valores já arredondados. **NÃO arredondar apenas o total final** — o arredondamento é por valor individual, antes da soma.

## 7. Tratamento de erros

Toda operação rejeitada por regra de negócio deve informar:
- código da regra responsável pela rejeição (R1, R2, R3, R4, R5, R6 ou R7);
- mensagem clara e compreensível para uma pessoa de RH, sem jargão técnico;
- detalhes suficientes para entender por que a operação foi recusada.

As mensagens não devem expor detalhes técnicos desnecessários (stack traces, nomes de tabelas, erros de driver, etc.).

## 8. Testes

- Toda regra R1-R7 deve possuir testes automatizados.
- Os exemplos fornecidos pelo teste técnico devem ser testados explicitamente (incluindo os casos de R3 e o exemplo numérico de R7).
- Devem existir casos normais e casos de borda.
- Datas de fim de mês e ano bissexto devem ser cobertas (ex.: admissão em 29/02).
- R3 deve possuir testes que comprovem a lógica geral de viabilidade do saldo restante, não apenas os exemplos citados.
- R4 deve possuir testes com domingos, feriados e dias anteriores a domingos/feriados.
- R5 deve testar sobreposição entre períodos, inclusive entre aquisitivos diferentes.
- R6 deve testar a restrição de data atual para agendamento e cancelamento, e a devolução de saldo ao cancelar.
- R7 deve testar precisão de cálculo e arredondamento (meio centavo para cima, arredondamento individual antes da soma).

**Nunca afirmar que um teste passou sem realmente executá-lo. Nunca inventar resultados de testes.**

## 9. Separação de responsabilidades

- `routes`/controllers não devem conter regras complexas de negócio.
- `services`/domínio devem concentrar as regras R1-R7.
- `repositories` devem cuidar exclusivamente do acesso ao banco.
- Utilitários de calendário devem ser independentes e testáveis, sem acoplamento a HTTP ou banco.
- Cálculos financeiros devem ser isolados e testáveis.
- Evitar lógica duplicada entre camadas.

## 10. Plano do projeto

`PLAN.md` representa o plano original do projeto, escrito antes da implementação.

- NÃO reescrever ou substituir o conteúdo original do `PLAN.md`.
- Se alguma decisão realmente mudar o plano durante o desenvolvimento: manter o plano original intacto; adicionar uma nova seção ao final de `PLAN.md`; explicar o que mudou; explicar por que mudou.
- Nunca apagar silenciosamente uma decisão anterior.

## 11. Uso de IA

O teste técnico autoriza explicitamente o uso de IA no desenvolvimento. O Claude Code deve:
- analisar o contexto existente antes de implementar;
- propor um plano para tarefas relevantes antes de executá-las;
- utilizar os arquivos existentes (PLAN.md, este CLAUDE.md, código já escrito) como fonte de contexto;
- verificar o código produzido antes de considerá-lo concluído;
- executar os testes apropriados;
- informar problemas encontrados, mesmo que isso signifique admitir que algo não funcionou;
- nunca inventar resultados;
- nunca afirmar que algo foi validado quando não foi.

As decisões importantes devem ser compreendidas e verificadas pelo desenvolvedor, não apenas aceitas automaticamente. Não fabricar informações para o `AI-LOG.md`. O `AI-LOG.md` deve registrar apenas acontecimentos reais ocorridos durante o desenvolvimento.

## 12. Git

- O histórico deve representar o desenvolvimento real.
- Não fazer squash dos commits.
- Não reescrever artificialmente o histórico.
- Não criar commits falsos.
- Não alterar datas de commits para simular histórico.
- Commits devem representar mudanças reais e coerentes.

**Não realizar commits automaticamente a menos que isso seja explicitamente solicitado.**

## 13. Docker

O objetivo final é executar o projeto com `docker compose up --build` em uma máquina limpa. O projeto não deve depender do ambiente Brixly para funcionar.

**Não afirmar que o Docker foi validado dentro da Brixly quando ele não estiver disponível neste ambiente.** A validação real do Docker Compose será feita posteriormente em ambiente externo apropriado.

## 14. Escopo

O teste **não exige**:
- autenticação;
- controle de permissões;
- edição/exclusão de colaboradores;
- microsserviços;
- filas;
- cache;
- WebSockets;
- otimizações prematuras;
- arquitetura excessivamente complexa.

Priorizar:
- corretude das regras;
- testes;
- clareza;
- rastreabilidade;
- simplicidade;
- funcionamento real.

## 15. Forma de trabalho

Para tarefas pequenas, executar diretamente após analisar o contexto.

Para tarefas relevantes ou que envolvam várias etapas:
1. Analisar os arquivos existentes.
2. Apresentar o plano da tarefa.
3. Implementar.
4. Executar os testes relevantes.
5. Revisar o resultado.
6. Informar exatamente o que foi alterado e o que foi validado.

Se houver ambiguidade que possa ser resolvida razoavelmente, tomar uma decisão explícita e registrá-la no local apropriado (PLAN.md ou AI-LOG.md, conforme o caso). Não parar desnecessariamente esperando confirmação quando a tarefa puder avançar com uma decisão documentada.

## 16. Segurança contra alterações indevidas

Nunca:
- instalar software no host Brixly sem autorização explícita;
- modificar infraestrutura global;
- apagar arquivos fora do escopo do projeto;
- alterar arquivos internos da plataforma Brixly;
- utilizar credenciais ou dados de outros projetos;
- criar dependências ocultas do ambiente Brixly.
