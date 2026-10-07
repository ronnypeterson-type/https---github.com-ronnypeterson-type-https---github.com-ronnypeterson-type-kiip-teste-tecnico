import { describe, expect, it } from "vitest"
import { Prisma } from "@prisma/client"
import { createCalendarDate, toISODateString } from "../../../src/utils/calendar-date.js"
import {
  calendarDateParaDate,
  centavosParaDecimal,
  dateParaCalendarDate,
  decimalParaCentavos,
} from "../../../src/infrastructure/prisma/conversoes.js"

// Estes são testes UNITÁRIOS das funções de conversão — não exigem
// conexão com PostgreSQL (apenas a classe `Prisma.Decimal`, que é
// puramente computacional, sem I/O). Todos os valores foram verificados
// por execução real antes de serem fixados aqui.

describe("conversões Prisma ↔ domínio — dinheiro (Decimal ↔ centavos)", () => {
  it("3500.00 → 350000n (sem perda, sem passar por Number)", () => {
    expect(decimalParaCentavos(new Prisma.Decimal("3500.00"))).toBe(350000n)
  })

  it("3500.50 → 350050n", () => {
    expect(decimalParaCentavos(new Prisma.Decimal("3500.50"))).toBe(350050n)
  })

  it("0.01 → 1n (menor valor representável)", () => {
    expect(decimalParaCentavos(new Prisma.Decimal("0.01"))).toBe(1n)
  })

  it("99999999.99 → 9999999999n (valor máximo de NUMERIC(10,2))", () => {
    expect(decimalParaCentavos(new Prisma.Decimal("99999999.99"))).toBe(9999999999n)
  })

  it("350000n → 3500.00 (direção inversa)", () => {
    expect(centavosParaDecimal(350000n).toFixed(2)).toBe("3500.00")
  })

  it("350050n → 3500.50", () => {
    expect(centavosParaDecimal(350050n).toFixed(2)).toBe("3500.50")
  })

  it("round-trip Decimal → centavos → Decimal preserva o valor exato", () => {
    const valores = ["3500.00", "1412.00", "99999999.99", "0.01", "1000.05"]

    for (const valor of valores) {
      const centavos = decimalParaCentavos(new Prisma.Decimal(valor))
      const deVolta = centavosParaDecimal(centavos)
      expect(deVolta.toFixed(2)).toBe(valor)
    }
  })
})

describe("conversões Prisma ↔ domínio — datas (Date ↔ CalendarDate, sem deslocamento de timezone)", () => {
  it("CalendarDate → Date → CalendarDate preserva exatamente o dia (round-trip)", () => {
    const original = createCalendarDate(2026, 3, 16)
    const comoDate = calendarDateParaDate(original)
    const deVolta = dateParaCalendarDate(comoDate)

    expect(deVolta).toEqual(original)
  })

  it("o Date intermediário é meia-noite UTC exata (não depende do timezone do processo)", () => {
    const data = calendarDateParaDate(createCalendarDate(2026, 3, 16))
    expect(data.toISOString()).toBe("2026-03-16T00:00:00.000Z")
  })

  it("dateParaCalendarDate usa componentes UTC, não locais (não desloca o dia)", () => {
    // Esta data, se lida com getFullYear/getMonth/getDate (métodos
    // LOCAIS) num processo em America/Sao_Paulo (UTC-3), devolveria
    // 15/03/2026 — um dia ERRADO (confirmado por execução real antes
    // desta implementação). Usando os métodos UTC, o resultado correto
    // é 16/03/2026.
    const data = new Date("2026-03-16T00:00:00.000Z")
    expect(dateParaCalendarDate(data)).toEqual({ year: 2026, month: 3, day: 16 })
  })

  it("preserva a data corretamente atravessando a virada de ano", () => {
    const original = createCalendarDate(2026, 12, 31)
    const deVolta = dateParaCalendarDate(calendarDateParaDate(original))
    expect(toISODateString(deVolta)).toBe("2026-12-31")
  })

  it("preserva a data corretamente em 29/02 de ano bissexto", () => {
    const original = createCalendarDate(2024, 2, 29)
    const deVolta = dateParaCalendarDate(calendarDateParaDate(original))
    expect(toISODateString(deVolta)).toBe("2024-02-29")
  })
})
