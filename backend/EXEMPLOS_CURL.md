# Exemplos de requisições HTTP (curl)

Documentação **temporária** de apoio a esta etapa (API REST). Não é o
README final do projeto (que será escrito em etapa de fechamento).

Todos os exemplos abaixo refletem exatamente a implementação atual e
foram verificados por execução real (scripts manuais via `tsx` + app
Express real, ou testes Supertest), com o servidor rodando em
`http://localhost:3001` (porta padrão de `server.ts`, configurável via
`PORT`).

Os valores de data usados dependem de "hoje" real do sistema no
momento da execução (R6 exige início estritamente futuro) — os
exemplos abaixo foram verificados com "hoje" = `2026-10-07`. Ajuste as
datas conforme a data real de quem for reproduzir os exemplos.

## 1. Criar colaborador

```bash
curl -X POST http://localhost:3001/colaboradores \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Ana",
    "dataAdmissao": "2023-01-10",
    "salarioMensal": "3500.00"
  }'
```

Resposta (201):

```json
{
  "id": 1,
  "nome": "Ana",
  "dataAdmissao": "2023-01-10",
  "salarioMensal": "3500.00"
}
```

Erro de entrada (400) — campo ausente/mal formatado:

```bash
curl -X POST http://localhost:3001/colaboradores \
  -H "Content-Type: application/json" \
  -d '{"dataAdmissao": "2023-01-10", "salarioMensal": "3500.00"}'
```

```json
{ "error": { "code": "ENTRADA_INVALIDA", "message": "O campo \"nome\"..." } }
```

Corpo da requisição não é um JSON válido (400 — qualquer endpoint que recebe body):

```bash
curl -X POST http://localhost:3001/colaboradores \
  -H "Content-Type: application/json" \
  -d '{ isto não é JSON válido'
```

```json
{ "error": { "code": "ENTRADA_INVALIDA", "message": "O corpo da requisição não é um JSON válido." } }
```

## 2. Consultar períodos (saldo) de um colaborador

```bash
curl http://localhost:3001/colaboradores/1/periodos
```

Resposta (200) — períodos do 1º até o aquisitivo vigente, inclusive:

```json
{
  "periodos": [
    {
      "periodoNumero": 1,
      "aquisitivoInicio": "2023-01-10",
      "aquisitivoFim": "2024-01-09",
      "concessivoInicio": "2024-01-10",
      "concessivoFim": "2025-01-09",
      "diasAdquiridos": 30,
      "diasAgendados": 0,
      "diasDisponiveis": 30
    },
    { "periodoNumero": 2, "...": "..." },
    { "periodoNumero": 3, "...": "..." },
    { "periodoNumero": 4, "...": "..." }
  ]
}
```

Colaborador inexistente (404):

```bash
curl http://localhost:3001/colaboradores/999/periodos
```

```json
{ "error": { "code": "NAO_ENCONTRADO", "message": "Colaborador com id 999 não encontrado." } }
```

## 3. Agendar férias

```bash
curl -X POST http://localhost:3001/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{
    "periodoNumero": 3,
    "dataInicio": "2026-11-16",
    "quantidadeDias": 14
  }'
```

Resposta (201) — inclui data final calculada e os valores R7:

```json
{
  "id": 1,
  "colaboradorId": 1,
  "periodoNumero": 3,
  "dataInicio": "2026-11-16",
  "dataFim": "2026-11-29",
  "quantidadeDias": 14,
  "status": "ativo",
  "valores": {
    "remuneracao": "1633.33",
    "tercoConstitucional": "544.44",
    "total": "2177.77"
  }
}
```

### Rejeições por regra de negócio (todas 422, código = número da regra)

R2 — fora do período concessivo:

```bash
curl -X POST http://localhost:3001/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{"periodoNumero": 3, "dataInicio": "2025-06-01", "quantidadeDias": 14}'
```

```json
{ "error": { "code": "R2", "message": "Este período de férias precisa estar totalmente dentro do período concessivo do aquisitivo escolhido." } }
```

R3 — fracionamento inviável (depois de já ter 14 dias agendados, tentando +12, restando só 4):

```bash
curl -X POST http://localhost:3001/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{"periodoNumero": 3, "dataInicio": "2026-12-14", "quantidadeDias": 12}'
```

```json
{ "error": { "code": "R3", "message": "Este agendamento deixaria 4 dia(s) de saldo, insuficiente..." } }
```

R4 — início em domingo:

```bash
curl -X POST http://localhost:3001/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{"periodoNumero": 3, "dataInicio": "2026-11-15", "quantidadeDias": 5}'
```

```json
{ "error": { "code": "R4", "message": "As férias não podem começar em um domingo..." } }
```

R5 — sobreposição com período já agendado:

```bash
curl -X POST http://localhost:3001/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{"periodoNumero": 3, "dataInicio": "2026-11-23", "quantidadeDias": 5}'
```

```json
{ "error": { "code": "R5", "message": "Este período de férias se sobrepõe a outro período já agendado..." } }
```

R6 — início não é estritamente futuro:

```bash
curl -X POST http://localhost:3001/colaboradores/1/ferias \
  -H "Content-Type: application/json" \
  -d '{"periodoNumero": 3, "dataInicio": "2026-01-15", "quantidadeDias": 14}'
```

```json
{ "error": { "code": "R6", "message": "As férias só podem ser agendadas para uma data de início posterior a hoje..." } }
```

## 4. Cancelar agendamento (cancelamento lógico)

```bash
curl -X DELETE http://localhost:3001/colaboradores/1/ferias/1
```

Resposta (200):

```json
{ "id": 1, "status": "cancelado" }
```

Já cancelado anteriormente (409):

```bash
curl -X DELETE http://localhost:3001/colaboradores/1/ferias/1
```

```json
{ "error": { "code": "CONFLITO", "message": "Este agendamento já foi cancelado anteriormente." } }
```

Agendamento inexistente (404):

```bash
curl -X DELETE http://localhost:3001/colaboradores/1/ferias/999
```

```json
{ "error": { "code": "NAO_ENCONTRADO", "message": "Agendamento com id 999 não encontrado." } }
```

## 5. Listar agendamentos de um colaborador (inclui cancelados)

```bash
curl http://localhost:3001/colaboradores/1/ferias
```

Resposta (200):

```json
{
  "agendamentos": [
    {
      "id": 1,
      "colaboradorId": 1,
      "periodoNumero": 3,
      "dataInicio": "2026-11-16",
      "dataFim": "2026-11-29",
      "quantidadeDias": 14,
      "status": "cancelado",
      "valores": {
        "remuneracao": "1633.33",
        "tercoConstitucional": "544.44",
        "total": "2177.77"
      }
    }
  ]
}
```

## Observações sobre os formatos usados em todos os endpoints

- Datas: sempre `"YYYY-MM-DD"` (string), nunca timestamp.
- Dinheiro: sempre string decimal com 2 casas (ex.: `"1633.33"`), nunca
  `number` — evita tanto o erro de serializar `bigint` quanto o erro de
  ponto flutuante que `number` reintroduziria.
- Erros sempre no formato `{"error": {"code": "...", "message": "..."}}`.
