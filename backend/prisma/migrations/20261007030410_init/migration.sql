-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('ativo', 'cancelado');

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "data_admissao" DATE NOT NULL,
    "salario_mensal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "colaboradores_salario_mensal_positivo" CHECK ("salario_mensal" > 0)
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" SERIAL NOT NULL,
    "colaborador_id" INTEGER NOT NULL,
    "periodo_numero" INTEGER NOT NULL,
    "data_inicio" DATE NOT NULL,
    "quantidade_dias" INTEGER NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'ativo',

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agendamentos_periodo_numero_valido" CHECK ("periodo_numero" >= 1),
    CONSTRAINT "agendamentos_quantidade_dias_valida" CHECK ("quantidade_dias" >= 1 AND "quantidade_dias" <= 30)
);

-- CreateIndex
CREATE INDEX "agendamentos_colaborador_id_idx" ON "agendamentos"("colaborador_id");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

