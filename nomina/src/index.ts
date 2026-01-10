import express from "express";
import cors from "cors";
import multer from "multer";
import * as xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const MONTO_CESTATICKET = 40.0;
const PORCENTAJE_IVSS = 0.04;
const PORCENTAJE_FAOV = 0.01;

app.post("/api/procesar-nomina", upload.single("archivo"), async (req, res) => {
  try {
    const { periodoId } = req.body;

    if (!req.file)
      return res.status(400).json({ error: "Falta el archivo Excel" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    const datosExcel = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      range: 4,
    });

    console.log(
      "Columnas detectadas en la primera fila:",
      Object.keys(datosExcel[0] || {})
    );

    const resultados = [];

    for (const fila of datosExcel as any[]) {
      const rawCedula =
        fila["C.I"] || fila["c.i"] || fila["cedula"] || fila["C.I "];

      if (!rawCedula) continue;

      const cedulaLimpia = String(rawCedula).replace(/\./g, "").trim();

      const empleado = await prisma.empleado.findUnique({
        where: { cedula: cedulaLimpia },
      });

      if (!empleado) {
        console.log(
          ` Empleado con C.I ${cedulaLimpia} no está en la base de datos.`
        );
        continue;
      }

      let totalAsignaciones = 0;
      let totalDeducciones = 0;

      const sueldoQuincenal = empleado.sueldoBase / 2;
      totalAsignaciones += sueldoQuincenal;

      const ivss = empleado.sueldoBase * PORCENTAJE_IVSS * 0.5;
      const faov = empleado.sueldoBase * PORCENTAJE_FAOV * 0.5;
      totalDeducciones += ivss + faov;

      const deuda = fila["DEUDA"] || 0;
      if (deuda > 0) {
        totalDeducciones += Number(deuda);
      }

      totalAsignaciones += MONTO_CESTATICKET;
      const totalNeto = totalAsignaciones - totalDeducciones;

      resultados.push({
        nombre: empleado.nombre,
        cedula: cedulaLimpia,
        neto: totalNeto,
        deudaDescontada: deuda,
      });
    }

    console.log(` Procesados ${resultados.length} empleados correctamente.`);
    res.json({ message: "Procesado", procesados: resultados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar el archivo" });
  }
});

app.listen(3000, () => {
  console.log(" Servidor Doña Aurora listo en puerto 3000");
});
