import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Label from '../ui/Label';
import Modal from '../ui/Modal';
import Table from '../ui/Table';
import FormField from '../ui/FormField';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Empleado = { id: number; cedula: string; nombre: string; cargo: string; sueldoBase: number };

export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'empleados' | 'nominas'>('empleados');

  // new empleado form
  const [form, setForm] = useState({ cedula: '', nombre: '', cargo: '', sueldoBase: '' });

  const fetchEmpleados = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/empleados`);
      if (r.data?.ok) setEmpleados(r.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Error cargando empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const crear = async () => {
    try {
      const payload = {
        cedula: form.cedula,
        nombre: form.nombre,
        cargo: form.cargo,
        sueldoBase: Number(form.sueldoBase) || 0,
        fechaIngreso: new Date().toISOString(),
      };
      const r = await axios.post(`${API}/api/empleados`, payload);
      if (r.data?.ok) {
        setForm({ cedula: '', nombre: '', cargo: '', sueldoBase: '' });
        fetchEmpleados();
      }
    } catch (err) {
      console.error(err);
      alert('No se pudo crear el empleado');
    }
  };

  

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const performDelete = async (id: number | null) => {
    if (!id) return;
    try {
      await axios.delete(`${API}/api/empleados/${id}`);
      setConfirmDeleteId(null);
      fetchEmpleados();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar');
    }
  };

  const generarNomina = async () => {
    if (!confirm('Generar nómina para todos los empleados (se te pedirá el monto fiado por cada uno)?')) return;
    const items: any[] = [];
    for (const e of empleados) {
      const input = prompt(`¿Cuánto fiaron ${e.nombre} (${e.cedula})?`, '0') || '0';
      const fiado = parseFloat(input || '0') || 0;
      items.push({ empleadoId: e.id, fiado });
    }

    const periodo = { fechaInicio: new Date().toISOString(), fechaFin: new Date().toISOString(), descripcion: `Generada ${new Date().toISOString()}` };
    const r = await axios.post(`${API}/api/nominas`, { periodo, items });
    if (r.data?.ok) {
      alert('Nóminas generadas. Puedes exportar el excel desde la sección Nominas.');
      setView('nominas');
    } else {
      alert('Error generando nóminas');
    }
  };

  return (
    <div className="p-4 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Panel de administración</h2>
        <div>
          <Button className="mr-2" onClick={() => setView('empleados')}>Empleados</Button>
          <Button className="mr-2" onClick={() => setView('nominas')}>Nóminas</Button>
          <Button className="bg-red-600 text-white" onClick={() => { localStorage.removeItem('admin:logged'); onLogout(); }}>Salir</Button>
        </div>
      </div>

      {view === 'empleados' && (
        <div>
          <h3 className="font-semibold">Crear empleado</h3>
          <Card className="my-2">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label>Cédula</Label>
                <Input placeholder="Cédula" value={form.cedula} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, cedula: e.target.value })} />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input placeholder="Nombre" value={form.nombre} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input placeholder="Cargo" value={form.cargo} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div>
                <Label>Sueldo mensual</Label>
                <Input placeholder="Sueldo mensual" value={form.sueldoBase} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sueldoBase: e.target.value })} />
              </div>
            </div>
            <div className="mb-4 flex gap-2 mt-4">
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white" onClick={crear}>Crear</Button>
              <Button onClick={fetchEmpleados}>Refrescar</Button>
              <Button onClick={generarNomina}>Generar nómina (pregunta fiados)</Button>
            </div>
          </Card>

          <h3 className="font-semibold mt-4">Empleados</h3>
          {loading ? <div>Cargando...</div> : (
            <Table>
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-100"><th className="p-2">Cédula</th><th>Nombre</th><th>Cargo</th><th>Sueldo</th><th></th></tr>
                </thead>
                <tbody>
                  {empleados.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-2">{e.cedula}</td>
                      <td>{e.nombre}</td>
                      <td>{e.cargo}</td>
                      <td>{e.sueldoBase}</td>
                      <td><Button className="text-red-600" onClick={() => setConfirmDeleteId(e.id)}>Eliminar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          )}
        </div>
      )}

      {view === 'nominas' && (
        <div>
          <h3 className="font-semibold">Exportar nóminas</h3>
          <p className="text-sm text-muted">Puedes exportar por periodo. Introduce el id del periodo que quieres exportar.</p>
          <ExportForm />
        </div>
      )}
      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <h3 className="font-semibold">Eliminar empleado</h3>
        <p className="mt-2">¿Estás seguro de que quieres eliminar este empleado?</p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
          <Button className="bg-red-600 text-white" onClick={() => performDelete(confirmDeleteId)}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

function ExportForm() {
  const [periodoId, setPeriodoId] = useState('');

  const descargar = () => {
    if (!periodoId) return alert('Indica el id del periodo');
    const url = `${API}/api/nominas/periodo/${periodoId}/export`;
    window.open(url, '_blank');
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <FormField>
        <Input placeholder="Periodo ID" value={periodoId} onChange={(e) => setPeriodoId((e.target as HTMLInputElement).value)} />
      </FormField>
      <Button className="bg-blue-600 text-white" onClick={descargar}>Descargar Excel</Button>
    </div>
  );
}

