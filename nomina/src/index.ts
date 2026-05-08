import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const MONTO_CESTATICKET = 40.0;
const PORCENTAJE_IVSS = 0.04;
const PORCENTAJE_FAOV = 0.01;

app.post('/api/procesar-nomina', upload.single('archivo'), async (req, res) => {
  try {
    const { periodoId } = req.body;
    const negativoPercent = Number(req.body.negativoPercent) || 0;
    const negativoNota = req.body.negativoNota || '';

    if (!req.file) return res.status(400).json({ error: 'Falta el archivo Excel' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    const datosExcel = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      range: 4,
    });

    console.log('Columnas detectadas en la primera fila:', Object.keys(datosExcel[0] || {}));

    const resultados = [];

    for (const fila of datosExcel as any[]) {
      const rawCedula = fila['C.I'] || fila['c.i'] || fila['cedula'] || fila['C.I '];

      if (!rawCedula) continue;

      const cedulaLimpia = String(rawCedula).replace(/\./g, '').trim();

      const empleado = await prisma.empleado.findUnique({
        where: { cedula: cedulaLimpia },
      });

      if (!empleado) {
        console.log(` Empleado con C.I ${cedulaLimpia} no está en la base de datos.`);
        continue;
      }

      let totalAsignaciones = 0;
      let totalDeducciones = 0;

      const sueldoQuincenal = empleado.sueldoBase / 2;
      totalAsignaciones += sueldoQuincenal;

      const ivss = empleado.sueldoBase * PORCENTAJE_IVSS * 0.5;
      const faov = empleado.sueldoBase * PORCENTAJE_FAOV * 0.5;
      totalDeducciones += ivss + faov;

      const deuda = fila['DEUDA'] || 0;
      if (deuda > 0) {
        totalDeducciones += Number(deuda);
      }

      // Aplicar % negativo (si se proporcionó). Se interpreta como porcentaje sobre sueldo base.
      let deduccionNegativa = 0;
      if (negativoPercent !== 0) {
        // Usamos el valor absoluto del porcentaje; si usuario escribe -2, se aplica 2%.
        deduccionNegativa = empleado.sueldoBase * (Math.abs(negativoPercent) / 100) * 0.5; // quincena
        totalDeducciones += deduccionNegativa;
      }

      totalAsignaciones += MONTO_CESTATICKET;
      const totalNeto = totalAsignaciones - totalDeducciones;

      resultados.push({
        nombre: empleado.nombre,
        cedula: cedulaLimpia,
        neto: totalNeto,
        deudaDescontada: deuda,
        negativoNota,
        deduccionNegativa,
      });
    }

    console.log(` Procesados ${resultados.length} empleados correctamente.`);
    res.json({ message: 'Procesado', procesados: resultados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});

// Guardar resultados en disco (persistencia local)
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

app.post('/api/save-report', async (req, res) => {
  try {
    const payload = req.body;
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(RESULTS_FILE, JSON.stringify(payload, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving report:', err);
    res.status(500).json({ error: 'No se pudo guardar el reporte' });
  }
});

app.get('/api/load-report', async (req, res) => {
  try {
    const exists = await fs.promises
      .access(RESULTS_FILE)
      .then(() => true)
      .catch(() => false);
    if (!exists) return res.json({ ok: true, data: null });
    const content = await fs.promises.readFile(RESULTS_FILE, 'utf-8');
    const data = JSON.parse(content);
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error loading report:', err);
    res.status(500).json({ error: 'No se pudo leer el reporte' });
  }
});

app.listen(3000, () => {
  console.log(' Servidor Doña Aurora listo en puerto 3000');
});
