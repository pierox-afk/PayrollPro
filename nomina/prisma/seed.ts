import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lista completa extraída de las imágenes de Doña Aurora
const empleadosDoñaAurora = [
  { nombre: "AMILCAR MORILLO", cedula: "15704205", cargo: "Panadero" },
  { nombre: "EDGAR MORILLO", cedula: "9508834", cargo: "Ayudante" },
  { nombre: "ALEXANDER CASTILLO", cedula: "16840985", cargo: "Hornero" },
  { nombre: "JOSE MANUEL GOMEZ", cedula: "26565973", cargo: "Despachador" },
  { nombre: "JOSE LUIS SANCHEZ", cedula: "14490452", cargo: "Mantenimiento" },
  { nombre: "YOHANNY RIVERO", cedula: "32208224", cargo: "Cajero" },
  { nombre: "YLMAR DURAN", cedula: "17103663", cargo: "Pastelero" },
  { nombre: "ALEXANDER DURAN", cedula: "17103664", cargo: "Ayudante" },
  { nombre: "GILBERTO SANGRONIS", cedula: "17102897", cargo: "Seguridad" },
  { nombre: "NESTOR GONZALEZ", cedula: "28568950", cargo: "Chofer" },
  { nombre: "EDUARDO GOMEZ", cedula: "18888921", cargo: "Gerente" },
  { nombre: "MARIBEL SANCHEZ", cedula: "16707905", cargo: "Limpieza" },
  { nombre: "JOSE PALMERA", cedula: "28235467", cargo: "Ayudante" },
  { nombre: "ANDREINA RIVERO", cedula: "25784054", cargo: "Empleado" },
  { nombre: "EDGAR YSEA", cedula: "7344021", cargo: "Empleado" },
  { nombre: "JOSE GONZALEZ", cedula: "19251021", cargo: "Empleado" },
  { nombre: "ZURIMA MORALES", cedula: "18770631", cargo: "Empleado" },
  { nombre: "YANELIS FALCON", cedula: "6983493", cargo: "Empleado" },
  { nombre: "JUAN ROMERO", cedula: "5295436", cargo: "Empleado" },
  { nombre: "JOSE GUTIERREZ", cedula: "24562328", cargo: "Empleado" },
  { nombre: "NEXIS ALVAREZ", cedula: "18888919", cargo: "Empleado" },
  { nombre: "NORELY VARGAS", cedula: "22602224", cargo: "Empleado" },
  { nombre: "IVAN GONZALEZ", cedula: "21545430", cargo: "Empleado" },
  { nombre: "CARLOS CORDERO", cedula: "32149150", cargo: "Empleado" },
  { nombre: "SONIA REYES", cedula: "20932672", cargo: "Empleado" },
  { nombre: "PEDRO GRANDA", cedula: "19180635", cargo: "Empleado" },
  { nombre: "NOHELY MORALES", cedula: "24624552", cargo: "Empleado" },
  { nombre: "IRAIDA JIMENEZ", cedula: "14733189", cargo: "Empleado" },
  { nombre: "NORBELYS JIMENEZ", cedula: "24581899", cargo: "Empleado" },
  { nombre: "ISMELDA VARGAS", cedula: "9621218", cargo: "Empleado" },
  { nombre: "CARLOS BETANCOURT", cedula: "32149064", cargo: "Empleado" },
  { nombre: "JEURIS PEÑA", cedula: "32216755", cargo: "Empleado" },
  { nombre: "MILEXI ROMERO", cedula: "18888902", cargo: "Empleado" },
  { nombre: "JUAN C PALENCIA", cedula: "27116762", cargo: "Empleado" },
  { nombre: "EDUARDO GOMEZ", cedula: "32216762", cargo: "Empleado" },
  { nombre: "YOHANDERSON LOAIZA", cedula: "27843650", cargo: "Empleado" },
  { nombre: "LUIS CALDAS", cedula: "18479302", cargo: "Empleado" },
  { nombre: "LUIISA CORDERO", cedula: "27843553", cargo: "Empleado" },
  { nombre: "WUILME JIMENEZ", cedula: "16274652", cargo: "Empleado" },
  { nombre: "MARIA PEREIRA", cedula: "25128087", cargo: "Empleado" },
  { nombre: "NORELBYS RIVERO", cedula: "16707936", cargo: "Empleado" },
  { nombre: "GENESIS RIOS", cedula: "28634165", cargo: "Empleado" },
  { nombre: "YOSELIMAR HERNANDEZ", cedula: "32216890", cargo: "Empleado" },
  { nombre: "CARLOS LOAIZA", cedula: "27924393", cargo: "Empleado" },
];

async function main() {
  console.log("🌱 Sembrando nómina masiva de Doña Aurora...");

  // Crear concepto genérico si no existe
  await prisma.concepto.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: "Asignación General",
      tipo: "ASIGNACION",
      modoCalculo: "FIJO",
      valor: 0,
    },
  });

  // Insertar cada empleado
  for (const emp of empleadosDoñaAurora) {
    await prisma.empleado.upsert({
      where: { cedula: emp.cedula },
      update: { sueldoBase: 5000.0 }, // Actualizamos sueldo a todos
      create: {
        cedula: emp.cedula,
        nombre: emp.nombre,
        cargo: emp.cargo,
        sueldoBase: 5000.0, // Ponemos 5000 para que la deuda no deje el saldo en negativo
        fechaIngreso: new Date("2024-01-01"),
      },
    });
  }

  console.log(
    `✅ ¡${empleadosDoñaAurora.length} empleados registrados en la Base de Datos!`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
