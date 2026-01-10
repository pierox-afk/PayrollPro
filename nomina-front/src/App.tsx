import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  Calculator,
  Loader2,
  ArrowLeftRight,
  AlertCircle,
  Croissant,
  User,
  Printer,
  Plus,
  Trash2,
  FilePlus,
} from "lucide-react";

interface ResultadoNomina {
  id: string;
  nombre: string;
  cedula: string;
  ingresoBase: number | string;
  deudaDescontada: number | string;
  neto: number | string;
  cestaTicket?: number | string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoNomina[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [tasaCambio, setTasaCambio] = useState<number | string>(60.0);
  const [moneda, setMoneda] = useState<"USD" | "VES">("USD");
  const [cestaticket, setCestaticket] = useState<number | string>(0);
  const [overrideCestaPorFila, setOverrideCestaPorFila] =
    useState<boolean>(false);

  const bottomRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (resultados.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [resultados.length]);

  const procesarNomina = async (archivoAProcesar: File) => {
    setLoading(true);
    setResultados([]);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivoAProcesar);
    formData.append("periodoId", "1");

    try {
      interface Procesado {
        nombre?: string;
        cedula?: string;
        neto?: number | string;
        deudaDescontada?: number | string;
        [key: string]: unknown;
      }

      const respuesta = await axios.post(
        `${API_URL}/api/procesar-nomina`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const procesados: Procesado[] = (respuesta.data?.procesados ??
        []) as Procesado[];

      const datosProcesados = procesados.map((item) => {
        const neto = Number(item.neto) || 0;
        const deuda = Number(item.deudaDescontada) || 0;
        return {
          ...item,
          id: crypto.randomUUID(), // ID único seguro
          ingresoBase: neto + deuda,
          neto,
          deudaDescontada: deuda,
        } as ResultadoNomina;
      });

      setResultados(datosProcesados);
    } catch (err) {
      console.error(err);
      let mensaje = "Ocurrió un error inesperado al procesar la nómina.";

      if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          mensaje = err.response.data.error;
        } else if (err.code === "ERR_NETWORK") {
          mensaje =
            "No se pudo conectar con el servidor. Verifica que el backend esté encendido y la base de datos accesible.";
        } else {
          mensaje = `Error de comunicación: ${err.message}`;
        }
      }
      setError(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      procesarNomina(file);
    }
  };

  const crearNominaVacia = () => {
    const nuevo: ResultadoNomina = {
      id: crypto.randomUUID(),
      nombre: "Empleado Nuevo",
      cedula: "",
      ingresoBase: 0,
      deudaDescontada: 0,
      neto: 0,
    };
    setResultados([nuevo]);
  };

  const agregarEmpleadoManual = () => {
    const nuevo: ResultadoNomina = {
      id: crypto.randomUUID(),
      nombre: "",
      cedula: "",
      ingresoBase: 0,
      deudaDescontada: 0,
      neto: 0,
    };
    setResultados([...resultados, nuevo]);
  };

  const eliminarEmpleado = (id: string) => {
    if (confirm("¿Eliminar a este empleado?")) {
      setResultados(resultados.filter((r) => r.id !== id));
    }
  };

  const imprimirReporte = () => {
    window.print();
  };

  // --- LÓGICA DE EDICIÓN ---
  const actualizarTexto = (
    id: string,
    campo: "nombre" | "cedula",
    valor: string
  ) => {
    setResultados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const actualizarMonto = (
    id: string,
    campo: "ingresoBase" | "deudaDescontada" | "neto",
    valorInput: string
  ) => {
    const nuevosResultados = [...resultados];
    const index = nuevosResultados.findIndex((r) => r.id === id);
    if (index === -1) return;

    const empleado = { ...nuevosResultados[index] };

    if (valorInput === "") {
      empleado[campo] = "";
      nuevosResultados[index] = empleado;
      setResultados(nuevosResultados);
      return;
    }

    const valorNumerico = parseFloat(valorInput);
    if (isNaN(valorNumerico)) return;

    const tasa = Number(tasaCambio) || 1;
    let valorEnDolares = valorNumerico;
    // Si estamos en Bs, convertimos a Dólares para guardar
    if (moneda === "VES") valorEnDolares = valorNumerico / tasa;

    if (campo === "ingresoBase") {
      empleado.ingresoBase = valorEnDolares;
      const deuda = Number(empleado.deudaDescontada) || 0;
      empleado.neto = valorEnDolares - deuda;
    } else if (campo === "deudaDescontada") {
      empleado.deudaDescontada = valorEnDolares;
      const ingreso = Number(empleado.ingresoBase) || 0;
      empleado.neto = ingreso - valorEnDolares;
    } else if (campo === "neto") {
      empleado.neto = valorEnDolares;
      const deuda = Number(empleado.deudaDescontada) || 0;
      empleado.ingresoBase = valorEnDolares + deuda;
    }

    nuevosResultados[index] = empleado;
    setResultados(nuevosResultados);
  };

  const actualizarCestaTicket = (valorInput: string) => {
    if (valorInput === "") {
      setCestaticket("");
      return;
    }
    const valorNumerico = parseFloat(valorInput);
    if (isNaN(valorNumerico)) return;
    const tasa = Number(tasaCambio) || 1;
    // Si la moneda visible es VES, convertimos a USD para guardar
    const valorUSD = moneda === "VES" ? valorNumerico / tasa : valorNumerico;
    setCestaticket(valorUSD);
  };

  const obtenerValorVisual = (valorUSD: number | string) => {
    if (valorUSD === "") return "";
    const numero = Number(valorUSD);
    const tasa = Number(tasaCambio) || 1;
    if (moneda === "USD") return Math.round(numero * 100) / 100;
    return Math.round(numero * tasa * 100) / 100;
  };

  const aplicarCestaATodos = () => {
    const valor = Number(cestaticket) || 0;
    const nuevos = resultados.map((r) => ({ ...r, cestaTicket: valor }));
    setResultados(nuevos);
  };

  const actualizarCestaPorEmpleado = (id: string, valorInput: string) => {
    const nuevos = [...resultados];
    const index = nuevos.findIndex((r) => r.id === id);
    if (index === -1) return;

    const empleado = { ...nuevos[index] };

    if (valorInput === "") {
      empleado.cestaTicket = "";
      nuevos[index] = empleado;
      setResultados(nuevos);
      return;
    }

    const valorNumerico = parseFloat(valorInput);
    if (isNaN(valorNumerico)) return;
    const tasa = Number(tasaCambio) || 1;
    const valorUSD = moneda === "VES" ? valorNumerico / tasa : valorNumerico;
    empleado.cestaTicket = valorUSD;

    nuevos[index] = empleado;
    setResultados(nuevos);
  };

  const totalCesta = overrideCestaPorFila
    ? resultados.reduce((acc, curr) => acc + (Number(curr.cestaTicket) || 0), 0)
    : (Number(cestaticket) || 0) * resultados.length;

  const totalDolares =
    resultados.reduce((acc, curr) => acc + (Number(curr.neto) || 0), 0) +
    totalCesta;
  const totalBolivares = totalDolares * (Number(tasaCambio) || 0);

  return (
    <div
      className={`min-h-screen font-sans pb-32 transition-colors duration-500
      ${
        moneda === "USD"
          ? "bg-emerald-50 text-emerald-900"
          : "bg-blue-50 text-blue-900"
      }
      print:bg-white print:text-black print:pb-0
    `}
    >
      {/* HEADER */}
      <header
        className="bg-white shadow-md border-b-4 sticky top-0 z-20 transition-colors duration-300 print:hidden"
        style={{ borderColor: moneda === "USD" ? "#10b981" : "#3b82f6" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                moneda === "USD" ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              <Croissant
                className={`w-6 h-6 ${
                  moneda === "USD" ? "text-emerald-600" : "text-blue-600"
                }`}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">Doña Aurora</h1>
              <p className="text-xs opacity-70">Sistema de Nómina</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center px-3 gap-2 border-r border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase">
                Tasa:
              </span>
              <div className="relative">
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  Bs
                </span>
                <input
                  type="number"
                  value={tasaCambio}
                  onChange={(e) =>
                    setTasaCambio(
                      e.target.value === "" ? "" : parseFloat(e.target.value)
                    )
                  }
                  className="w-20 pl-5 py-1 text-sm font-bold text-gray-800 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center px-3 gap-2 border-r border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase">
                Cestáticket:
              </span>
              <div className="relative">
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  {moneda === "USD" ? "$" : "Bs"}
                </span>
                <input
                  type="number"
                  value={obtenerValorVisual(cestaticket)}
                  onChange={(e) => actualizarCestaTicket(e.target.value)}
                  className="w-20 pl-5 py-1 text-sm font-bold text-gray-800 bg-transparent focus:outline-none"
                />
              </div>
              <button
                onClick={aplicarCestaATodos}
                className="ml-3 px-3 py-1 text-xs bg-gray-100 rounded border border-gray-200 hover:bg-gray-50"
              >
                Aplicar a todos
              </button>
              <label className="ml-3 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={overrideCestaPorFila}
                  onChange={() =>
                    setOverrideCestaPorFila(!overrideCestaPorFila)
                  }
                />
                <span>Editar por fila</span>
              </label>
            </div>

            <button
              onClick={() => setMoneda(moneda === "USD" ? "VES" : "USD")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                ${
                  moneda === "USD"
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }
              `}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {moneda === "USD" ? "USD" : "Bs."}
            </button>

            <button
              onClick={imprimirReporte}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-gray-700 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </header>

      {/* HEADER IMPRESIÓN */}
      <div className="hidden print:block text-center pt-8 pb-4 border-b-2 border-gray-300 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 uppercase">
          Panadería Doña Aurora C.A.
        </h1>
        <p className="text-gray-600">
          Reporte de Nómina - {new Date().toLocaleDateString()}
        </p>
        <p className="text-sm mt-2">
          Tasa aplicada: <b>{Number(tasaCambio).toFixed(2)} Bs/$</b>
        </p>
        <p className="text-sm mt-2">
          Cesta Ticket por empleado:{" "}
          <b>
            {overrideCestaPorFila
              ? "Variable (ver tabla)"
              : moneda === "USD"
              ? `$ ${Number(cestaticket).toFixed(2)}`
              : `Bs ${(
                  Number(cestaticket || 0) * (Number(tasaCambio) || 1)
                ).toFixed(2)}`}
          </b>
        </p>
      </div>

      <main className="max-w-7xl mx-auto mt-8 px-4 print:mt-0 print:px-0">
        {/* PANTALLA DE INICIO / CARGA */}
        {!resultados.length && (
          <div className="bg-white rounded-xl shadow-lg p-10 text-center max-w-xl mx-auto mt-10 border border-gray-100 print:hidden">
            <Calculator
              className={`w-16 h-16 mx-auto mb-4 ${
                moneda === "USD" ? "text-emerald-400" : "text-blue-400"
              }`}
            />
            <h2 className="text-2xl font-bold mb-6">Cargar Nómina</h2>

            <div className="flex flex-col gap-4">
              {/* OPCIÓN 1: SUBIR EXCEL */}
              <div className="relative w-full">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button
                  className={`w-full px-8 py-4 rounded-xl text-white font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2
                    ${
                      moneda === "USD"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }
                  `}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {loading ? "Procesando..." : "Subir Archivo Excel"}
                </button>
              </div>

              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span>O</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {/* OPCIÓN 2: CREAR DESDE CERO */}
              <button
                onClick={crearNominaVacia}
                className="w-full px-8 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <FilePlus className="w-5 h-5" />
                Crear Planilla Vacía
              </button>
            </div>

            {error && (
              <div className="mt-6 text-red-500 flex items-center justify-center gap-2 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* TABLA PRINCIPAL */}
        {resultados.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 print:shadow-none print:border-none print:rounded-none">
            {/* BARRA SUPERIOR TABLA */}
            <div
              className={`px-6 py-3 border-b flex justify-between items-center print:hidden
               ${
                 moneda === "USD"
                   ? "bg-emerald-50 border-emerald-100"
                   : "bg-blue-50 border-blue-100"
               }
            `}
            >
              <h3 className="font-bold text-lg">
                Empleados ({resultados.length})
              </h3>
              <button
                onClick={agregarEmpleadoManual}
                className="text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm font-semibold transition-all active:scale-95"
              >
                <Plus className="w-3 h-3" /> Nuevo Empleado
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left print:text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider print:bg-white print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="px-4 py-3 min-w-[220px]">Empleado</th>
                    <th className="px-4 py-3 text-center w-32 bg-gray-100/50 print:bg-transparent">
                      Ingreso Base
                    </th>
                    <th className="px-4 py-3 text-center w-32 bg-red-50/50 text-red-700 print:bg-transparent print:text-black">
                      Deuda
                    </th>
                    <th className="px-4 py-3 text-center w-28 bg-yellow-50/50 text-yellow-700 print:bg-transparent print:text-black">
                      Cesta Ticket
                    </th>
                    <th className="px-4 py-3 text-right w-40 bg-green-50/50 text-green-700 print:bg-transparent print:text-black">
                      Total ({moneda === "USD" ? "$" : "Bs"})
                    </th>
                    <th className="px-4 py-3 w-10 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm print:divide-gray-300">
                  {resultados.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors group print:hover:bg-transparent"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors print:hidden" />
                          <input
                            type="text"
                            value={item.nombre}
                            placeholder="Nombre del Empleado"
                            onChange={(e) =>
                              actualizarTexto(item.id, "nombre", e.target.value)
                            }
                            className="font-bold text-gray-800 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none w-full placeholder-gray-300 print:placeholder-transparent"
                          />
                        </div>
                        <input
                          type="text"
                          value={item.cedula}
                          onChange={(e) =>
                            actualizarTexto(item.id, "cedula", e.target.value)
                          }
                          placeholder="Cédula / ID"
                          className="text-xs text-gray-500 font-mono ml-6 bg-transparent focus:outline-none w-full placeholder-gray-300 print:text-gray-600 print:ml-0 print:block"
                        />
                      </td>

                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={obtenerValorVisual(item.ingresoBase)}
                          onChange={(e) =>
                            actualizarMonto(
                              item.id,
                              "ingresoBase",
                              e.target.value
                            )
                          }
                          placeholder="0"
                          className="w-full p-2 text-center font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 print:bg-transparent print:border-none print:text-right"
                        />
                      </td>

                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={obtenerValorVisual(item.deudaDescontada)}
                          onChange={(e) =>
                            actualizarMonto(
                              item.id,
                              "deudaDescontada",
                              e.target.value
                            )
                          }
                          placeholder="0"
                          className={`w-full p-2 text-center font-bold rounded border focus:outline-none focus:ring-2 print:bg-transparent print:border-none print:text-right print:text-black
                            ${
                              moneda === "USD"
                                ? "text-red-600 bg-red-50 border-red-100 focus:ring-red-200"
                                : "text-orange-600 bg-orange-50 border-orange-100 focus:ring-orange-200"
                            }
                          `}
                        />
                      </td>

                      <td className="px-2 py-2">
                        {overrideCestaPorFila ? (
                          <div className="flex items-center">
                            <input
                              type="number"
                              value={obtenerValorVisual(item.cestaTicket ?? "")}
                              onChange={(e) =>
                                actualizarCestaPorEmpleado(
                                  item.id,
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className={`w-full p-2 text-center font-bold rounded border focus:outline-none focus:ring-2 print:bg-transparent print:border-none print:text-right print:text-black text-yellow-700 bg-yellow-50 border-yellow-100 focus:ring-yellow-200`}
                            />
                            {Number(item.cestaTicket ?? cestaticket) !==
                              Number(cestaticket) && (
                              <span className="ml-2 text-xs text-yellow-700">
                                *
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={obtenerValorVisual(cestaticket)}
                            readOnly
                            placeholder="0"
                            className={`w-full p-2 text-center font-bold rounded border focus:outline-none focus:ring-2 print:bg-transparent print:border-none print:text-right print:text-black text-yellow-700 bg-yellow-50 border-yellow-100 focus:ring-yellow-200`}
                          />
                        )}
                      </td>

                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={obtenerValorVisual(item.neto)}
                          onChange={(e) =>
                            actualizarMonto(item.id, "neto", e.target.value)
                          }
                          placeholder="0"
                          className={`w-full p-2 text-right font-bold text-lg rounded border focus:outline-none focus:ring-2 print:bg-transparent print:border-none print:text-black print:text-base
                            ${
                              moneda === "USD"
                                ? "text-emerald-700 bg-emerald-50 border-emerald-100 focus:ring-emerald-200"
                                : "text-blue-700 bg-blue-50 border-blue-100 focus:ring-blue-200"
                            }
                          `}
                        />
                      </td>

                      <td className="px-2 py-2 text-center print:hidden">
                        <button
                          onClick={() => eliminarEmpleado(item.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  <tr ref={bottomRef}></tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 print:hidden">
              <button
                onClick={agregarEmpleadoManual}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" /> Agregar Fila Manual
              </button>
            </div>
          </div>
        )}
      </main>
      {resultados.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t shadow-2xl p-4 z-30 print:static print:shadow-none print:border-t-2 print:border-black print:mt-4 print:pb-20">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-gray-400 text-xs hidden sm:block w-1/3 print:hidden">
              * Cambios guardados temporalmente.
            </div>
            <div className="flex gap-8 text-right justify-end w-full sm:w-auto">
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest print:text-black">
                  Total USD
                </p>
                <p className="text-2xl font-bold text-emerald-600 print:text-black">
                  ${" "}
                  {totalDolares.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="border-l pl-8 print:border-black">
                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest print:text-black">
                  Total VES
                </p>
                <p className="text-2xl font-bold text-blue-600 print:text-black">
                  Bs{" "}
                  {totalBolivares.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-1 print:text-black">
                  * Incluye cesta ticket por empleado (
                  {overrideCestaPorFila
                    ? "Variable (ver tabla)"
                    : moneda === "USD"
                    ? `$ ${Number(cestaticket).toFixed(2)}`
                    : `Bs ${(
                        Number(cestaticket || 0) * (Number(tasaCambio) || 1)
                      ).toFixed(2)}`}
                  )
                </p>
              </div>
            </div>
          </div>

          <div className="hidden print:flex justify-around mt-16 text-center text-sm">
            <div className="border-t border-black px-12 pt-2">
              <p>Firma y Sello</p>
              <p className="font-bold">Panadería Doña Aurora</p>
            </div>
            <div className="border-t border-black px-12 pt-2">
              <p>Recibido Conforme</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
