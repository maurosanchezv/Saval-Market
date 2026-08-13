import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatPrecio } from '../config/businessConfig';
import { DollarSign, CalendarDays, CalendarRange, Calendar, Receipt, ShoppingCart } from 'lucide-react';
import StatCard from '../components/StatCard';

const inicioDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
};
const finDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Igual criterio que en Dashboard: los pedidos de WhatsApp muestran su estado,
// el resto (ventas de caja) muestra el método con el que se cobró.
const badgeEstadoVenta = (venta) => {
  if (venta.estado === 'cancelado') return { texto: 'Cancelado', clase: 'bg-red-500 text-white border-red-500' };
  if (venta.metodo_pago?.startsWith('WhatsApp')) {
    const texto = venta.estado ? venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1) : 'Pendiente';
    return venta.estado === 'entregado'
      ? { texto, clase: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
      : { texto, clase: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  }
  return { texto: 'Entregado', clase: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
};

const conceptoVenta = (venta) => (venta.metodo_pago?.startsWith('WhatsApp') ? 'Pedido Web (WhatsApp)' : 'Venta en POS');

export default function Finanzas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoy = useMemo(() => new Date(), []);
  const primerDiaMes = useMemo(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1), [hoy]);
  const primerDiaAnio = useMemo(() => new Date(hoy.getFullYear(), 0, 1), [hoy]);

  // Rango personalizado: arranca en el mes en curso, el usuario lo puede ajustar libremente
  const [rangoDesde, setRangoDesde] = useState(primerDiaMes.toISOString().slice(0, 10));
  const [rangoHasta, setRangoHasta] = useState(hoy.toISOString().slice(0, 10));

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('ventas').select('*').order('creado_en', { ascending: false });
      if (!error && data) setVentas(data);
      setLoading(false);
    };
    fetchVentas();
  }, []);

  // Las ventas canceladas (devoluciones) no cuentan como facturación real, mismo criterio que Dashboard
  const ventasValidas = useMemo(() => ventas.filter((v) => v.estado !== 'cancelado'), [ventas]);

  const sumaEnRango = (desde, hasta) =>
    ventasValidas
      .filter((v) => {
        const fecha = new Date(v.creado_en);
        return fecha >= desde && fecha <= hasta;
      })
      .reduce((acc, v) => acc + v.total, 0);

  const gananciasHoy = sumaEnRango(inicioDelDia(hoy), finDelDia(hoy));
  const gananciasMes = sumaEnRango(primerDiaMes, finDelDia(hoy));
  const gananciasAnio = sumaEnRango(primerDiaAnio, finDelDia(hoy));

  const rangoDesdeFecha = inicioDelDia(new Date(`${rangoDesde}T00:00:00`));
  const rangoHastaFecha = finDelDia(new Date(`${rangoHasta}T00:00:00`));
  const rangoValido = rangoDesdeFecha <= rangoHastaFecha;
  const gananciasRango = rangoValido ? sumaEnRango(rangoDesdeFecha, rangoHastaFecha) : 0;

  // Historial de movimientos del rango seleccionado (incluye cancelados, marcados como tales,
  // para que el listado sirva como auditoría completa y no solo como sumatoria de ingresos)
  const movimientosRango = useMemo(() => {
    if (!rangoValido) return [];
    const desde = inicioDelDia(new Date(`${rangoDesde}T00:00:00`));
    const hasta = finDelDia(new Date(`${rangoHasta}T00:00:00`));
    return ventas
      .filter((v) => {
        const fecha = new Date(v.creado_en);
        return fecha >= desde && fecha <= hasta;
      })
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  }, [ventas, rangoDesde, rangoHasta, rangoValido]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-bg-primary">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-text-secondary font-medium">Cargando movimientos financieros...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-8 bg-bg-primary overflow-y-auto">

      {/* Header Sección */}
      <div>
        <h1 className="font-heading font-extrabold text-3xl text-text-primary mb-1">
          Finanzas
        </h1>
        <p className="text-xs text-text-secondary font-medium">
          Ganancias y movimientos de dinero del negocio
        </p>
      </div>

      {/* KPIs Rápidos: Día / Mes / Año */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <StatCard
          title="Ganancias del Día"
          value={formatPrecio(gananciasHoy)}
          icon={Calendar}
          description="Total acumulado hoy."
        />
        <StatCard
          title="Ganancias del Mes"
          value={formatPrecio(gananciasMes)}
          icon={CalendarDays}
          description="Acumulado del mes en curso."
        />
        <StatCard
          title="Ganancias del Año"
          value={formatPrecio(gananciasAnio)}
          icon={CalendarRange}
          description="Acumulado del año en curso."
        />
      </div>

      {/* Filtro Personalizado por Fechas */}
      <div className="p-4 sm:p-6 rounded-3xl border border-border-custom bg-bg-secondary premium-card space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/5 shadow-sm shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Consultar por Rango de Fechas</h3>
            <p className="text-[10px] text-text-secondary">Elegí un período personalizado para ver el total ingresado</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-text-secondary uppercase">Desde</label>
            <input
              type="date"
              value={rangoDesde}
              max={rangoHasta}
              onChange={(e) => setRangoDesde(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-text-secondary uppercase">Hasta</label>
            <input
              type="date"
              value={rangoHasta}
              min={rangoDesde}
              onChange={(e) => setRangoHasta(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex-1 p-3 rounded-xl bg-primary-soft/40 border border-primary/10 text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase text-primary tracking-wider">Total del período</p>
            <p className="font-heading font-extrabold text-lg text-text-primary">
              {rangoValido ? formatPrecio(gananciasRango) : '—'}
            </p>
          </div>
        </div>
        {!rangoValido && (
          <p className="text-xs text-red-500 font-semibold">La fecha "Desde" no puede ser posterior a "Hasta".</p>
        )}
      </div>

      {/* Tabla/Historial de Movimientos */}
      <div className="p-4 sm:p-6 rounded-3xl border border-border-custom bg-bg-secondary premium-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-1">
              Historial de Movimientos
            </h3>
            <p className="text-xs text-text-muted font-medium">
              {movimientosRango.length} {movimientosRango.length === 1 ? 'movimiento' : 'movimientos'} en el período seleccionado
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/5 shadow-sm shrink-0">
            <Receipt size={16} />
          </div>
        </div>

        {/* Vista Tabla Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-custom text-text-secondary font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom text-text-primary">
              {movimientosRango.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-secondary font-medium">
                    No hay movimientos registrados en este período.
                  </td>
                </tr>
              ) : (
                movimientosRango.map((venta) => {
                  const badge = badgeEstadoVenta(venta);
                  return (
                    <tr key={venta.id} className="hover:bg-bg-primary/50 transition-colors">
                      <td className="py-3.5 px-4 text-text-secondary">
                        {new Date(venta.creado_en).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold flex items-center gap-1.5">
                        <ShoppingCart size={12} className="text-text-secondary shrink-0" />
                        <span>{conceptoVenta(venta)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {venta.metodo_cobro || venta.metodo_pago}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg font-semibold text-[10px] border ${badge.clase}`}>
                          {badge.texto}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sm">
                        {formatPrecio(venta.total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Listado Móvil */}
        <div className="sm:hidden flex flex-col gap-3">
          {movimientosRango.length === 0 ? (
            <p className="text-center py-6 text-text-secondary text-xs">
              No hay movimientos registrados en este período.
            </p>
          ) : (
            movimientosRango.map((venta) => {
              const badge = badgeEstadoVenta(venta);
              return (
                <div
                  key={venta.id}
                  className="p-4 rounded-2xl border border-border-custom bg-bg-primary space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                        <ShoppingCart size={12} className="text-text-secondary shrink-0" />
                        <span className="truncate">{conceptoVenta(venta)}</span>
                      </p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        {new Date(venta.creado_en).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg font-semibold text-[9px] border shrink-0 ${badge.clase}`}>
                      {badge.texto}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-border-custom/60">
                    <span className="text-[10px] text-text-secondary font-medium">
                      {venta.metodo_cobro || venta.metodo_pago}
                    </span>
                    <span className="font-extrabold text-sm text-text-primary">
                      {formatPrecio(venta.total)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
