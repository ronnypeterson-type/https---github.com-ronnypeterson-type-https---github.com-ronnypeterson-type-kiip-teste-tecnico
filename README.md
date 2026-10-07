# Controle de Férias — Teste Técnico Kiip

Sistema de controle de férias desenvolvido para o teste técnico de Dev Pleno da Kiip.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL
- ORM: Prisma
- Testes: Vitest + Supertest + React Testing Library
- Infraestrutura: Docker Compose + Nginx

## Executando o projeto

Na raiz do projeto:

``` bash
docker compose up --build
```

Depois acesse:

http://localhost:8080

O Docker Compose inicializa automaticamente:

1. PostgreSQL
2. Migrações do Prisma
3. Backend
4. Frontend com Nginx

O frontend utiliza /api como entrada para a API. O Nginx encaminha essas requisições internamente para o backend.

## Testes

### Backend

No diretório ackend:

``` bash
cd backend
npm ci
npm test
```

Os testes cobrem as regras de negócio R1 até R7, além dos casos da camada de aplicação e da API.

### Testes de integração

Os testes que dependem de PostgreSQL real ficam separados:

``` bash
npm run test:integration
```

Esses testes permanecem explicitamente marcados como skip enquanto a execução depender de uma instância PostgreSQL de integração separada. Eles não são considerados testes aprovados na validação final.

### Frontend

No diretório rontend:

``` bash
cd frontend
npm ci
npm test -- --run
```

## API

A API externa é acessada através de /api.

### Healthcheck

``` bash
curl http://localhost:8080/api/health
```

### Criar colaborador

A criação de colaborador é feita somente pela API.

``` bash
curl -X POST http://localhost:8080/api/colaboradores \
  -H "Content-Type: application/json" \
  -d '{"nome":"João da Silva","dataAdmissao":"2025-03-15","salarioMensal":"3500.00"}'
```

### Listar colaboradores

``` bash
curl http://localhost:8080/api/colaboradores
```

### Consultar períodos

``` bash
curl http://localhost:8080/api/colaboradores/1/periodos
```

### Agendar férias

``` bash
curl -X POST http://localhost:8080/api/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{"periodoNumero":1,"dataInicio":"2026-10-19","quantidadeDias":14}'
```

### Listar agendamentos

``` bash
curl http://localhost:8080/api/colaboradores/1/ferias
```

### Cancelar agendamento

``` bash
curl -X DELETE http://localhost:8080/api/colaboradores/1/ferias/1
```

## Regras de negócio

### R1 — Período aquisitivo

A cada 12 meses de vínculo são adquiridos 30 dias de férias.

Os períodos são calculados a partir da data de admissão.

Datas de aniversário inexistentes, como 29/02 em anos não bissextos, utilizam o último dia válido do mês.

### R2 — Período concessivo

As férias de um período aquisitivo somente podem ser agendadas dentro do respectivo período concessivo.

O intervalo completo das férias precisa estar contido no período concessivo.

### R3 — Fracionamento

Um período aquisitivo pode possuir no máximo três agendamentos.

Pelo menos um dos períodos precisa possuir 14 dias ou mais.

Os demais precisam possuir pelo menos 5 dias.

O sistema rejeita operações que deixariam um saldo impossível de completar posteriormente.

### R4 — Data de início

O início das férias não pode ocorrer:

- no domingo;
- em feriado;
- nos dois dias anteriores a um domingo;
- nos dois dias anteriores a um feriado.

Os feriados definidos pelo teste para 2026, 2027 e 2028 são considerados pela aplicação.

### R5 — Sobreposição

Agendamentos ativos do mesmo colaborador não podem se sobrepor.

O intervalo é tratado de forma inclusiva, considerando a data inicial e todos os dias da duração das férias.

### R6 — Datas futuras

Só é permitido:

- agendar férias com início posterior à data atual;
- cancelar férias cujo início ainda seja posterior à data atual.

### R7 — Valores

A remuneração das férias é:

salário × dias / 30

O adicional de um terço é:

salário × dias / 90

Cada valor é arredondado individualmente para centavos usando arredondamento HALF_UP.

O total é a soma dos dois valores já arredondados.

Os cálculos monetários do domínio utilizam igint em centavos. Prisma.Decimal é utilizado somente na fronteira de persistência.

Exemplo:

- Salário: R$ 3.500,00
- Férias: 14 dias
- Remuneração: R$ 1.633,33
- Terço: R$ 544,44
- Total: R$ 2.177,77

## Decisões de implementação

### Datas

As datas de negócio são representadas como calendário civil no formato YYYY-MM-DD.

O domínio utiliza um CalendarDate próprio para evitar cálculos de datas dependentes do timezone do ambiente.

A data atual da aplicação considera America/Sao_Paulo.

### Períodos aquisitivos

Os períodos aquisitivos não são persistidos no banco.

Eles são derivados a partir da data de admissão e do número do período.

O período concessivo também é derivado.

### Agendamentos

Um agendamento armazena:

- colaborador;
- número do período aquisitivo;
- data de início;
- quantidade de dias;
- status.

A data final é derivada quando necessária.

### Concorrência

O agendamento utiliza uma transação com lock da linha do colaborador para evitar que requisições concorrentes consumam o mesmo saldo de férias.

O repositório utilizado dentro da transação é criado a partir do cliente transacional, evitando estado mutável compartilhado entre requisições.

### Separação de responsabilidades

As regras de negócio permanecem no domínio.

A camada de aplicação coordena os casos de uso.

Controllers e rotas são responsáveis pelo HTTP.

Os repositórios são responsáveis pela persistência.

O frontend não replica as regras de negócio.

## Interface

A interface permite:

- selecionar colaborador;
- consultar saldo;
- visualizar períodos aquisitivos e concessivos;
- agendar férias;
- visualizar agendamentos;
- cancelar agendamento;
- visualizar mensagens de sucesso e rejeição.

A criação de colaboradores permanece disponível somente pela API, conforme o escopo definido para a aplicação.

## Validação Docker

A aplicação foi validada externamente utilizando Docker Desktop.

A validação confirmou:

- build dos containers;
- inicialização do PostgreSQL;
- execução da migração Prisma;
- inicialização do backend;
- inicialização do frontend;
- comunicação frontend → Nginx → backend;
- criação real de colaborador;
- consulta real de períodos;
- agendamento de férias;
- cálculo dos valores;
- rejeição por R3;
- rejeição por R4;
- rejeição por R5;
- cancelamento;
- retorno do saldo após cancelamento.

Durante a validação inicial no Windows foi identificado um problema de quebra de linha no docker-entrypoint.sh (CRLF). O arquivo foi normalizado para LF e o repositório passou a declarar essa exigência em .gitattributes.

## Limitações conhecidas

Os testes de integração que dependem diretamente de PostgreSQL real permanecem marcados como skip na suíte automatizada.

Isso é intencional e não deve ser interpretado como aprovação desses testes.

A validação real do fluxo completo com PostgreSQL foi realizada separadamente através do Docker Compose.

## Histórico e processo com IA

O projeto mantém histórico incremental de commits e documentação das decisões.

PLAN.md registra o planejamento inicial e as decisões adicionadas durante a implementação.

AI-LOG.md registra momentos reais em que o direcionamento da IA foi revisado ou corrigido durante o desenvolvimento.