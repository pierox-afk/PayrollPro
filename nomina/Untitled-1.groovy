// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/// Enum que indica si un concepto es asignación o deducción
enum ConceptoTipo {
  ASIGNACION
  DEDUCCION
}

/// Enum para modo de cálculo del concepto
enum ModoConcepto {
  PORCENTAJE
  FIJO
}

/// Estado de la nómina
enum EstadoNomina {
  BORRADOR
  PROCESADA
  PAGADA
  ANULADA
}

/// Tipo de periodo (opcional, facilita filtros)
enum TipoPeriodo {
  QUINCENA
  MENSUAL
  SEMANAL
  OTRO
}

model Empleado {
  id             Int     @id @default(autoincrement())
  nombre         String
  apellido       String?
  identificacion String? @unique
  fechaIngreso   DateTime?
  sueldoBase     Decimal @db.Decimal(14,2) // sueldo base en moneda
  nominas        Nomina[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model PeriodoNomina {
  id                   Int      @id @default(autoincrement())
  tipo                 TipoPeriodo @default(QUINCENA)
  fechaInicio          DateTime
  fechaFin             DateTime
  aplicaCestaticket    Boolean  @default(false) // bandera para bono alimentación
  aplicaDeduccionesLey Boolean  @default(true)  // bandera para IVSS/FAOV, etc.
  nominas              Nomina[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([fechaInicio, fechaFin])
  @@unique([fechaInicio, fechaFin])
}

model Concepto {
  id          Int           @id @default(autoincrement())
  codigo      String        @unique
  nombre      String
  tipo        ConceptoTipo
  modo        ModoConcepto
  valor       Decimal       @db.Decimal(12,4) // porcentaje (ej: 10.5) o monto fijo
  descripcion String?
  activo      Boolean       @default(true)
  detalles    DetalleNomina[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Nomina {
  id                Int           @id @default(autoincrement())
  empleadoId        Int
  periodoNominaId   Int
  fechaPago         DateTime?
  estado            EstadoNomina  @default(BORRADOR)
  totalAsignaciones Decimal       @default(0) @db.Decimal(14,2)
  totalDeducciones  Decimal       @default(0) @db.Decimal(14,2)
  totalNeto         Decimal       @default(0) @db.Decimal(14,2)
  empleado          Empleado      @relation(fields: [empleadoId], references: [id])
  periodo           PeriodoNomina @relation(fields: [periodoNominaId], references: [id])
  detalles          DetalleNomina[]
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  /// Evita crear más de una nómina por empleado en el mismo periodo
  @@unique([empleadoId, periodoNominaId])
  @@index([periodoNominaId])
}

model DetalleNomina {
  id            Int       @id @default(autoincrement())
  nominaId      Int
  conceptoId    Int
  descripcion   String?
  cantidad      Decimal   @default(1) @db.Decimal(12,2)
  base          Decimal   @db.Decimal(14,2)    // base sobre la que se calculó
  porcentaje    Decimal?  @db.Decimal(6,4)      // snapshot si fue porcentaje
  valorUnitario Decimal   @db.Decimal(14,2)    // snapshot del valor fijo (si aplica)
  monto         Decimal   @db.Decimal(14,2)    // monto resultante aplicado (positivo o negativo según tipo)
  creadoEn      DateTime  @default(now())
  nomina        Nomina    @relation(fields: [nominaId], references: [id])
  concepto      Concepto  @relation(fields: [conceptoId], references: [id])

  @@index([nominaId])
  @@index([conceptoId])
}