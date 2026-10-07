// Formata uma data civil "YYYY-MM-DD" (exatamente como a API devolve)
// para exibição no formato brasileiro "DD/MM/YYYY".
//
// NUNCA usa `new Date("YYYY-MM-DD")` para isso — construir um `Date` a
// partir de uma string de data pura é interpretado pelo navegador como
// meia-noite UTC, podendo exibir o dia ERRADO em fusos horários
// negativos (ex.: America/Sao_Paulo), fazendo a data "andar um dia
// para trás" dependendo do horário local do navegador. Em vez disso,
// os componentes ano/mês/dia são extraídos diretamente da string,
// tratando a data como civil (sem timezone), nunca como timestamp.
export function formatarData(dataIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso)

  if (!match) {
    return dataIso
  }

  const [, ano, mes, dia] = match
  return `${dia}/${mes}/${ano}`
}
