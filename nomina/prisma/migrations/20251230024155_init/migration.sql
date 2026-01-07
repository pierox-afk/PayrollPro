-- CreateTable
CREATE TABLE "Empleado" (
    "id" SERIAL NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "sueldoBase" DOUBLE PRECISION NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concepto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "modoCalculo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Concepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoNomina" (
    "id" SERIAL NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "aplicaCestaticket" BOOLEAN NOT NULL DEFAULT false,
    "aplicaDeduccionesLey" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PeriodoNomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomina" (
    "id" SERIAL NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "totalPagar" DOUBLE PRECISION NOT NULL,
    "fechaCalculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleNomina" (
    "id" SERIAL NOT NULL,
    "nominaId" INTEGER NOT NULL,
    "conceptoId" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleNomina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_cedula_key" ON "Empleado"("cedula");

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoNomina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleNomina" ADD CONSTRAINT "DetalleNomina_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "Nomina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleNomina" ADD CONSTRAINT "DetalleNomina_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "Concepto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
