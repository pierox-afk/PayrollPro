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
import axios from 'axios';
import * as os from 'os';

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');
const TASA_FILE = path.join(DATA_DIR, 'tasa.json');

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

// --- Empleados CRUD
app.get('/api/empleados', async (req, res) => {
  try {
    const empleados = await prisma.empleado.findMany();
    res.json({ ok: true, data: empleados });
  } catch (err) {
    console.error('Error fetching empleados', err);
    res.status(500).json({ error: 'No se pudieron obtener los empleados' });
  }
});

app.post('/api/empleados', async (req, res) => {
  try {
    const { cedula, nombre, cargo, sueldoBase, fechaIngreso } = req.body;
    const empleado = await prisma.empleado.create({
      data: {
        cedula: String(cedula).replace(/\./g, '').trim(),
        nombre,
        cargo,
        sueldoBase: Number(sueldoBase) || 0,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : new Date(),
      },
    });
    res.json({ ok: true, data: empleado });
  } catch (err) {
    console.error('Error creating empleado', err);
    res.status(500).json({ error: 'No se pudo crear el empleado' });
  }
});

app.put('/api/empleados/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, cargo, sueldoBase, fechaIngreso } = req.body;
    const empleado = await prisma.empleado.update({
      where: { id },
      data: {
        nombre,
        cargo,
        sueldoBase: Number(sueldoBase) || 0,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : undefined,
      },
    });
    res.json({ ok: true, data: empleado });
  } catch (err) {
    console.error('Error updating empleado', err);
    res.status(500).json({ error: 'No se pudo actualizar el empleado' });
  }
});

app.delete('/api/empleados/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.empleado.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting empleado', err);
    res.status(500).json({ error: 'No se pudo eliminar el empleado' });
  }
});

// --- Crear nominas y guardar historico
app.post('/api/nominas', async (req, res) => {
  try {
    const { periodo, items } = req.body; // periodo: {fechaInicio, fechaFin, descripcion}, items: [{empleadoId, fiado}]

    // crear periodo
    const periodoCreado = await prisma.periodoNomina.create({
      data: {
        fechaInicio: periodo?.fechaInicio ? new Date(periodo.fechaInicio) : new Date(),
        fechaFin: periodo?.fechaFin ? new Date(periodo.fechaFin) : new Date(),
        descripcion: periodo?.descripcion || 'Periodo creado manualmente',
        aplicaCestaticket: !!periodo?.aplicaCestaticket,
        aplicaDeduccionesLey: periodo?.aplicaDeduccionesLey !== false,
      },
    });

    // Asegurarse de que exista el concepto FIADO
    let conceptoFiado = await prisma.concepto.findFirst({ where: { nombre: 'FIADO' } });
    if (!conceptoFiado) {
      conceptoFiado = await prisma.concepto.create({
        data: { nombre: 'FIADO', tipo: 'DEDUCCION', modoCalculo: 'FIJO', valor: 0 },
      });
    }

    const creadas: any[] = [];

    for (const it of items as any[]) {
      const empleado = await prisma.empleado.findUnique({ where: { id: Number(it.empleadoId) } });
      if (!empleado) continue;

      const fiado = Number(it.fiado) || 0;

      // calcular totales sencillos: sueldo mensual - fiado (este es un ejemplo)
      const totalPagar = empleado.sueldoBase - fiado;

      const nomina = await prisma.nomina.create({
        data: {
          empleadoId: empleado.id,
          periodoId: periodoCreado.id,
          totalPagar: Number(totalPagar),
        },
      });

      await prisma.detalleNomina.create({
        data: {
          nominaId: nomina.id,
          conceptoId: conceptoFiado.id,
          monto: fiado,
        },
      });

      creadas.push({ empleado: { id: empleado.id, nombre: empleado.nombre, cedula: empleado.cedula }, fiado, nominaId: nomina.id });
    }

    res.json({ ok: true, periodo: periodoCreado, creadas });
  } catch (err) {
    console.error('Error creando nominas', err);
    res.status(500).json({ error: 'No se pudieron crear las nóminas' });
  }
});

app.get('/api/nominas', async (req, res) => {
  try {
    const nominas = await prisma.nomina.findMany({ include: { empleado: true, periodo: true, detalles: true } });
    res.json({ ok: true, data: nominas });
  } catch (err) {
    console.error('Error fetching nominas', err);
    res.status(500).json({ error: 'No se pudieron obtener las nóminas' });
  }
});

// Exportar excel para un periodo
app.get('/api/nominas/periodo/:periodoId/export', async (req, res) => {
  try {
    const periodoId = Number(req.params.periodoId);
    const nominas = await prisma.nomina.findMany({ where: { periodoId }, include: { empleado: true, detalles: { include: { concepto: true } } } });

    const rows = nominas.map((n) => {
      const fiadoDetalle = n.detalles.find((d) => d.concepto?.nombre === 'FIADO');
      return {
        Empleado: n.empleado.nombre,
        Cedula: n.empleado.cedula,
        SueldoMensual: n.empleado.sueldoBase,
        TotalPagar: n.totalPagar,
        Fiado: fiadoDetalle ? fiadoDetalle.monto : 0,
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'Nomina');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="nomina-periodo-${periodoId}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('Error exporting excel', err);
    res.status(500).json({ error: 'No se pudo exportar el Excel' });
  }
});

// --- Tasa del dolar (caché en archivo por 12 horas)
app.get('/api/tasa-dolar', async (req, res) => {
  try {
    // comprobar cache
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const exists = await fs.promises
      .access(TASA_FILE)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      const raw = await fs.promises.readFile(TASA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const age = Date.now() - (parsed._fetchedAt || 0);
      if (age < 1000 * 60 * 60 * 12) {
        return res.json({ ok: true, tasa: parsed.tasa, source: 'cache' });
      }
    }

    // obtener de API externa (acepta ?sourceUrl=...)
    const sourceUrl = String(req.query.sourceUrl || 'https://www.dolarvzla.com/settings/api');
    const resp = await axios.get(sourceUrl, { timeout: 5000, responseType: 'text' });
    const raw = resp.data;
    let tasa: number | null = null;

    // Si la respuesta es JSON parseable, intentar extraer campos conocidos
    try {
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (parsed?.dolar && typeof parsed.dolar === 'number') tasa = parsed.dolar;
        else if (parsed?.buy && typeof parsed.buy === 'number') tasa = parsed.buy;
        else if (typeof parsed === 'number') tasa = parsed;
        else if (parsed?.USD && parsed?.USD?.value) tasa = Number(parsed.USD.value);
      }
    } catch (e) {
      // no es JSON, puede ser HTML
    }

    // Si no obtuvimos tasa desde JSON, intentar extraer números desde HTML usando regex
    if (!tasa) {
      const text = String(raw);
      // Buscar números con decimales o miles (p. ej. 123456.78 o 123.456,78)
      const numberRegex = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?/g;
      const matches = text.match(numberRegex) || [];
      const nums = matches
        .map((s) => s.replace(/\./g, '').replace(',', '.'))
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n) && Number.isFinite(n));

      if (nums.length) {
        // Elegir el número más grande plausible (heurística) -- suele ser la tasa en Bs
        tasa = Math.max(...nums);
      }
    }

    if (!tasa) {
      await fs.promises.writeFile(TASA_FILE, JSON.stringify({ tasa: null, _fetchedAt: Date.now(), raw: raw ? String(raw).slice(0, 200) : null }, null, 2));
      return res.status(502).json({ error: 'No se pudo obtener la tasa desde la API externa', raw: typeof raw === 'string' ? String(raw).slice(0, 400) : raw });
    }

    await fs.promises.writeFile(TASA_FILE, JSON.stringify({ tasa, _fetchedAt: Date.now(), raw: raw ? String(raw).slice(0, 400) : null }, null, 2));
    res.json({ ok: true, tasa, source: sourceUrl });
  } catch (err) {
    console.error('Error fetching tasa dolar', err);
    res.status(500).json({ error: 'No se pudo obtener la tasa del dólar' });
  }
});

app.listen(3000, () => {
  console.log(' Servidor Doña Aurora listo en puerto 3000');
});
