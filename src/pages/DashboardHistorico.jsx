// src/pages/DashboardHistorico.jsx
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import {
  useDetenidosDashboard,
  ROL_LABELS,
} from '../hooks/useDetenidosDashboard';

// ─── Paleta ──────────────────────────────────────────────────
const COLORES_REGION = [
  '#2563eb','#0891b2','#7c3aed','#db2777',
  '#ea580c','#65a30d','#d97706','#6366f1',
];

// ─── Componente principal ────────────────────────────────────
export default function DashboardHistorico() {
  const {
    tipoPeriodo, setTipoPeriodo,
    fechaRef, setFechaRef,
    rango,
    detenidos,
    perfil,
    esRolSuperior,
    metricas,
    getEstatus,
    loading,
    error,
    recargar,
  } = useDetenidosDashboard();

  // Datos para Pie de estatus
  const dataPie = useMemo(() => {
    return Object.entries(metricas.porEstatus).map(([clave, value]) => {
      const est = getEstatus(clave);
      return { name: est.nombre, value, color: est.color };
    });
  }, [metricas.porEstatus, getEstatus]);

  // Datos para barras de regiones
  const dataRegiones = useMemo(() => {
    return Object.entries(metricas.porRegion)
      .sort((a, b) => b[1] - a[1])
      .map(([name, cantidad]) => ({
        name,
        cantidad,
        esMia: perfil?.region === name,
      }));
  }, [metricas.porRegion, perfil]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Dashboard Histórico
              </h1>
              {perfil && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {perfil.nombre_completo}
                  <span className="mx-1.5">·</span>
                  {ROL_LABELS[perfil.rol] || perfil.rol}
                  {!esRolSuperior && perfil.region && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-blue-600 font-medium">
                      — {perfil.region}
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                        Otras regiones: solo datos generales
                      </span>
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* ─── Filtros ─────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={tipoPeriodo}
                onChange={(e) => setTipoPeriodo(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="quincena1">Quincena 1 (1–15)</option>
                <option value="quincena2">Quincena 2 (16–fin)</option>
                <option value="mes">Mes completo</option>
                <option value="anio">Año completo</option>
              </select>

              {tipoPeriodo !== 'anio' ? (
                <input
                  type="month"
                  value={fechaRef}
                  onChange={(e) => setFechaRef(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <input
                  type="number"
                  min="2020"
                  max="2030"
                  value={fechaRef.split('-')[0]}
                  onChange={(e) => setFechaRef(`${e.target.value}-01`)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}

              <button
                onClick={recargar}
                disabled={loading}
                className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Cargando…' : 'Actualizar'}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
              {rango.label}
            </span>
            {!esRolSuperior && (
              <span className="inline-block text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                Incluye historial de otras regiones
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ─── Contenido ──────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            Error al cargar datos: {error}
          </div>
        )}

        {/* ─── Tarjetas resumen ───────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <TarjetaResumen
            titulo="Total periodo"
            valor={metricas.total}
            icono="📋"
          />
          <TarjetaResumen
            titulo="Mi región"
            valor={metricas.totalMiRegion}
            icono="📍"
            subtexto={perfil?.region}
          />
          <TarjetaResumen
            titulo="Otras regiones"
            valor={metricas.totalOtraRegion}
            icono="🌐"
            subtexto="Datos generales"
          />
          <TarjetaResumen
            titulo="Por vencer (12h)"
            valor={metricas.alertas.porVencer}
            icono="⏳"
            variante={metricas.alertas.porVencer > 0 ? 'alerta' : 'normal'}
            subtexto="Solo mi región"
          />
          <TarjetaResumen
            titulo="48h vencidas"
            valor={metricas.alertas.vencidos}
            icono="🚨"
            variante={metricas.alertas.vencidos > 0 ? 'critico' : 'normal'}
            subtexto="Solo mi región"
          />
        </div>

        {/* ─── Gráficas principales ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tendencia temporal */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Detenciones por día — todas las regiones visibles
            </h2>
            {metricas.serieTemporal.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={metricas.serieTemporal}>
                  <defs>
                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => {
                      const d = new Date(v + 'T00:00:00');
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    labelFormatter={(v) => {
                      const d = new Date(v + 'T00:00:00');
                      return d.toLocaleDateString('es-MX', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      });
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cantidad"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#gradArea)"
                    name="Detenciones"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EstadoVacio loading={loading} />
            )}
          </div>

          {/* Pie de estatus */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Por estatus</h2>
            {dataPie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={dataPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {dataPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {dataPie.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600">{item.name}</span>
                      </span>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EstadoVacio loading={loading} />
            )}
          </div>
        </div>

        {/* ─── Regiones + Top delitos ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Por región */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Por región</h2>
            {dataRegiones.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dataRegiones} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={130} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} name="Detenciones">
                    {dataRegiones.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.esMia ? '#2563eb' : '#94a3b8'}
                        fillOpacity={entry.esMia ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EstadoVacio loading={loading} />
            )}
            {!esRolSuperior && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-600" /> Mi región (acceso completo)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-400 opacity-60" /> Otras (datos generales)
                </span>
              </div>
            )}
          </div>

          {/* Top delitos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Delitos más frecuentes</h2>
            {metricas.topDelitos.length > 0 ? (
              <div className="space-y-3">
                {metricas.topDelitos.map((d, i) => {
                  const pct = metricas.total > 0
                    ? Math.round((d.cantidad / metricas.total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate pr-4">{d.nombre}</span>
                        <span className="text-gray-500 whitespace-nowrap">
                          {d.cantidad} <span className="text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: COLORES_REGION[i % COLORES_REGION.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EstadoVacio loading={loading} />
            )}
          </div>
        </div>

        {/* ─── Tabla de últimos detenidos ──────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Últimos registros del periodo
            </h2>
            <span className="text-xs text-gray-400">{detenidos.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <TablaDetenidos
              detenidos={detenidos.slice(0, 20)}
              getEstatus={getEstatus}
              esRolSuperior={esRolSuperior}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────

function TarjetaResumen({ titulo, valor, icono, subtexto, variante = 'normal' }) {
  const bg = {
    normal:  'bg-white border-gray-200',
    alerta:  'bg-amber-50 border-amber-200',
    critico: 'bg-red-50 border-red-200',
  };
  const txt = {
    normal:  'text-gray-900',
    alerta:  'text-amber-700',
    critico: 'text-red-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[variante]}`}>
      <span className="text-2xl">{icono}</span>
      <p className={`text-2xl font-bold mt-2 ${txt[variante]}`}>{valor}</p>
      <p className="text-xs text-gray-500 mt-0.5">{titulo}</p>
      {subtexto && (
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subtexto}</p>
      )}
    </div>
  );
}

function TablaDetenidos({ detenidos, getEstatus, esRolSuperior, loading }) {
  if (loading) {
    return <div className="px-5 py-10 text-center text-sm text-gray-400">Cargando…</div>;
  }
  if (!detenidos.length) {
    return <div className="px-5 py-10 text-center text-sm text-gray-400">Sin registros en este periodo</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <th className="px-5 py-3">Nombre</th>
          <th className="px-5 py-3">Alias</th>
          <th className="px-5 py-3">Carpeta Inv.</th>
          <th className="px-5 py-3">Delito</th>
          <th className="px-5 py-3">Región</th>
          <th className="px-5 py-3">Fecha</th>
          <th className="px-5 py-3">Estatus</th>
          <th className="px-5 py-3">48h</th>
          <th className="px-5 py-3">Acceso</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {detenidos.map((d) => {
          const est = getEstatus(d.estatus_clave);
          const esMia = d.es_mi_region;
          return (
            <tr
              key={d.id}
              className={`transition-colors ${
                esMia ? 'hover:bg-blue-50/50' : 'hover:bg-gray-50 bg-gray-50/30'
              }`}
            >
              <td className="px-5 py-2.5 font-medium text-gray-900">{d.nombre || '—'}</td>
              <td className="px-5 py-2.5 text-gray-600">{d.alias || '—'}</td>
              <td className="px-5 py-2.5 text-gray-600 font-mono text-xs">{d.carpeta_investigacion || '—'}</td>
              <td className="px-5 py-2.5 text-gray-600 max-w-[200px] truncate">{d.delito || '—'}</td>
              <td className="px-5 py-2.5">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  esMia
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {esMia && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                  {d.region}
                </span>
              </td>
              <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">
                {d.fecha_deteccion
                  ? new Date(d.fecha_deteccion + 'T00:00:00').toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </td>
              <td className="px-5 py-2.5">
                <span
                  className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: est.color + '20',
                    color: est.color,
                  }}
                >
                  {est.nombre}
                </span>
              </td>
              <td className="px-5 py-2.5 text-xs text-gray-500">
                {d.fecha_limite_48h
                  ? new Date(d.fecha_limite_48h).toLocaleString('es-MX', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                  : (
                    !esMia && !esRolSuperior
                      ? <span className="text-gray-300 italic">restringido</span>
                      : '—'
                  )}
              </td>
              <td className="px-5 py-2.5">
                {esMia || esRolSuperior ? (
                  <span className="text-xs text-green-600 font-medium">Completo</span>
                ) : (
                  <span className="text-xs text-gray-400">General</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EstadoVacio({ loading }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-400">
      {loading ? 'Cargando datos…' : 'Sin datos para este periodo'}
    </div>
  );
}
