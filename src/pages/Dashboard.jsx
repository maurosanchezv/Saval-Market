import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { BUSINESS_CONFIG, formatPrecio } from '../config/businessConfig';
import { DollarSign, ShoppingBag, Package, Users, TrendingUp, AlertCircle, ShoppingCart, ClipboardList, CheckCircle, Eye, X, Receipt, MessageCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import Ticket from '../components/Ticket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Clasifica el badge de una venta: los pedidos de WhatsApp muestran su `estado`,
// el resto (ventas de caja) muestra el método de pago tal cual.
const badgeTextoVenta = (sale) => {
  if (sale.estado === 'cancelado') return 'Cancelado';
  if (sale.metodo_pago?.startsWith('WhatsApp')) {
    return sale.estado ? sale.estado.charAt(0).toUpperCase() + sale.estado.slice(1) : 'Pendiente';
  }
  return sale.metodo_pago;
};

const badgeClaseVenta = (sale) => {
  if (sale.estado === 'cancelado') return 'bg-red-500 text-white border-red-500';
  if (sale.metodo_pago?.startsWith('WhatsApp')) {
    switch (sale.estado) {
      case 'entregado': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  }
  return 'bg-primary/10 text-primary border-primary/5';
};

// Abreviatura de la unidad de medida para mostrar en la lista de compras
const unidadAbrev = (unidad) => {
  if (unidad === 'kg') return 'kg';
  if (unidad === 'docena') return 'doc.';
  if (unidad === 'mazo') return 'mazo';
  return 'un.';
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    ventasTotal: 0,
    ventasCant: 0,
    productosCant: 0,
    clientesCant: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para modal de detalle de venta y ticket
  const [selectedSale, setSelectedSale] = useState(null);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // 1. Obtener conteo de productos e inventario crítico
      const { data: prods } = await supabase.from('productos').select('*');
      if (prods) setProductosList(prods);
      const criticalStock = prods ? prods.filter(p => p.stock <= 3) : [];
      
      // 2. Obtener clientes
      const { data: clients } = await supabase.from('clientes').select('*');
      
      // 3. Obtener ventas
      const { data: sales } = await supabase.from('ventas').select('*');
      
      if (prods && clients && sales) {
        // Las ventas canceladas (devoluciones) no cuentan como facturación real
        const ventasValidas = sales.filter(v => v.estado !== 'cancelado');
        const totalFacturado = ventasValidas.reduce((acc, v) => acc + v.total, 0);

        setStats({
          ventasTotal: totalFacturado,
          ventasCant: ventasValidas.length,
          productosCant: prods.length,
          clientesCant: clients.length
        });

        setStockAlerts(criticalStock);
        
        // Obtener últimas 5 ventas con su cliente asociado
        const recentFormatted = sales
          .slice(-5)
          .reverse()
          .map(sale => {
            const cliente = clients.find(c => c.id === sale.cliente_id);
            return {
              ...sale,
              clienteNombre: cliente ? cliente.nombre : (sale.cliente_nombre || 'Cliente Casual')
            };
          });
        setRecentSales(recentFormatted);

        // Agrupar ventas por fecha para gráficos (últimos 7 días)
        const salesByDay = {};
        ventasValidas.forEach(sale => {
          const dateStr = new Date(sale.creado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
          salesByDay[dateStr] = (salesByDay[dateStr] || 0) + sale.total;
        });

        const dailyChart = Object.keys(salesByDay).map(day => ({
          name: day,
          ventas: salesByDay[day]
        })).slice(-7); // últimas 7 entradas

        // Si no hay ventas, crear datos mock de gráfico para rellenar estéticamente
        setChartData(dailyChart.length > 0 ? dailyChart : [
          { name: 'Lunes', ventas: 4000 },
          { name: 'Martes', ventas: 3000 },
          { name: 'Miércoles', ventas: 2000 },
          { name: 'Jueves', ventas: 2780 },
          { name: 'Viernes', ventas: 1890 },
          { name: 'Sábado', ventas: 2390 },
          { name: 'Domingo', ventas: 3490 }
        ]);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  // Envía la lista de reposición de stock crítico como mensaje de WhatsApp
  const enviarListaCompras = () => {
    if (stockAlerts.length === 0) return;

    const items = stockAlerts
      .map(prod => `• ${prod.nombre} (quedan ${prod.stock} ${unidadAbrev(prod.unidad_medida)})`)
      .join('\n');

    const mensaje = `*Lista de Compras - Stock Bajo*\n_${BUSINESS_CONFIG.nombre}_\n\n${items}\n\nGenerado el ${new Date().toLocaleDateString('es-PY')}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-bg-primary">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-text-secondary font-medium">Cargando métricas del negocio...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-8 bg-bg-primary overflow-y-auto">
      
      {/* Saludo / Header */}
      <div>
        <h1 className="font-heading font-extrabold text-3xl text-text-primary mb-1">
          Panel de Control
        </h1>
        <p className="text-xs text-text-secondary font-medium">
          Métricas y rendimiento general de {BUSINESS_CONFIG.nombre}
        </p>
      </div>

      {/* Accesos Directos Rápidos en Grid Dual */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Accesos Directos
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link
            to="/admin/punto-venta"
            className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 p-3 sm:p-5 rounded-3xl border border-border-custom bg-bg-secondary hover:border-primary transition-all duration-200 cursor-pointer group hover:bg-bg-primary/30"
          >
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/5 group-hover:scale-110 transition-transform shrink-0">
              <ShoppingCart size={20} className="sm:size-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-extrabold text-xs sm:text-sm text-text-primary flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 justify-center sm:justify-start">
                <span>Punto de Venta</span>
                <span className="text-[8px] bg-primary-soft text-primary font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider w-fit">
                  Caja
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-text-secondary mt-1 hidden sm:block truncate">
                Registra compras de clientes y emite tickets en un toque.
              </p>
            </div>
          </Link>

          <Link
            to="/admin/pedidos"
            className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 p-3 sm:p-5 rounded-3xl border border-border-custom bg-bg-secondary hover:border-primary transition-all duration-200 cursor-pointer group hover:bg-bg-primary/30"
          >
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/5 group-hover:scale-110 transition-transform shrink-0">
              <ClipboardList size={20} className="sm:size-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-extrabold text-xs sm:text-sm text-text-primary flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 justify-center sm:justify-start">
                <span>Pedidos</span>
                <span className="text-[8px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider w-fit">
                  WhatsApp
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-text-secondary mt-1 hidden sm:block truncate">
                Gestiona pedidos pendientes, listos y entregados.
              </p>
            </div>
          </Link>

          <Link
            to="/admin/inventario"
            className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 p-3 sm:p-5 rounded-3xl border border-border-custom bg-bg-secondary hover:border-primary transition-all duration-200 cursor-pointer group hover:bg-bg-primary/30"
          >
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/5 group-hover:scale-110 transition-transform shrink-0">
              <Package size={20} className="sm:size-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-extrabold text-xs sm:text-sm text-text-primary flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 justify-center sm:justify-start">
                <span>Inventario</span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider w-fit">
                  Stock
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-text-secondary mt-1 hidden sm:block truncate">
                Carga nuevos productos, ajusta stock y cambia precios de venta.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Bento Grid: Fila 1 - KPIs Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Facturación Total"
          value={formatPrecio(stats.ventasTotal)}
          icon={DollarSign}
          description="Total neto acumulado de ventas registradas."
          trend="+12.5%"
          trendType="up"
        />
        <StatCard
          title="Ventas Realizadas"
          value={stats.ventasCant}
          icon={ShoppingBag}
          description="Órdenes concretadas en punto de venta o pedidos."
          trend="+4.3%"
          trendType="up"
        />
        <StatCard
          title="Variedad Catálogo"
          value={`${stats.productosCant} items`}
          icon={Package}
          description="Productos únicos creados en inventario."
          trend="Estable"
          trendType="neutral"
        />
        <StatCard
          title="Clientes Registrados"
          value={stats.clientesCant}
          icon={Users}
          description="Base de datos de compradores activos."
          trend="+8%"
          trendType="up"
        />
      </div>

      {/* Bento Grid: Fila 2 - Reportes de Gráficos Asimétricos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Ventas (Grande) */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border-custom bg-bg-secondary flex flex-col justify-between premium-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-1">
                Tendencia de Ventas (Facturación)
              </h3>
              <p className="text-xs text-text-muted font-medium">
                Resumen de ingresos del periodo más reciente
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/5 shadow-sm">
              <TrendingUp size={16} />
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas de Stock Crítico (Chico) */}
        <div className="p-6 rounded-3xl border border-border-custom bg-bg-secondary flex flex-col justify-between premium-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Alertas de Inventario
            </h3>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border border-current/10 ${stockAlerts.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <AlertCircle size={16} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-60 space-y-3">
            {stockAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <CheckCircle className="text-emerald-500 mb-2" size={24} />
                <p className="text-xs font-semibold text-text-primary">Stock optimizado</p>
                <p className="text-[10px] text-text-secondary">No hay productos con stock crítico (menos de 3 unidades).</p>
              </div>
            ) : (
              stockAlerts.map(prod => (
                <div key={prod.id} className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border-custom bg-bg-primary text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary truncate">{prod.nombre}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">{prod.categoria}</p>
                  </div>
                  <span className="bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-lg whitespace-nowrap">
                    Quedan: {prod.stock}
                  </span>
                </div>
              ))
            )}
          </div>

          {stockAlerts.length > 0 ? (
            <button
              onClick={enviarListaCompras}
              className="w-full mt-4 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle size={15} />
              <span>Enviar Lista por WhatsApp</span>
            </button>
          ) : (
            <p className="text-[10px] text-text-secondary border-t border-border-custom pt-3 mt-4 font-semibold text-center uppercase tracking-wider">
              Reponer stock pronto
            </p>
          )}
        </div>
      </div>

      {/* Bento Grid: Fila 3 - Últimas Ventas */}
      <div className="grid grid-cols-1 gap-6">
        <div className="p-6 rounded-3xl border border-border-custom bg-bg-secondary premium-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-1">
                Últimas 5 Ventas Registradas
              </h3>
              <p className="text-xs text-text-muted font-medium">
                Historial reciente de transacciones en caja o pedidos
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/5 shadow-sm">
              <ShoppingCart size={16} />
            </div>
          </div>

          {/* Vista Tabla Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-text-secondary font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">ID Transacción</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha/Hora</th>
                  <th className="py-3 px-4">Medio de Pago</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-text-primary">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-text-secondary font-medium">
                      No se han registrado ventas todavía.
                    </td>
                  </tr>
                ) : (
                  recentSales.map(sale => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="hover:bg-primary/10 cursor-pointer transition-colors group"
                      title="Hacé click para ver detalles de esta venta"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-text-secondary flex items-center gap-1.5">
                        <Eye size={14} className="text-text-secondary group-hover:text-primary transition-colors" />
                        <span>{sale.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">{sale.clienteNombre}</td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {new Date(sale.creado_en).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg font-semibold text-[10px] border ${badgeClaseVenta(sale)}`}>
                          {badgeTextoVenta(sale)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sm">
                        {formatPrecio(sale.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Vista Listado Móvil */}
          <div className="sm:hidden flex flex-col gap-3">
            {recentSales.length === 0 ? (
              <p className="text-center py-6 text-text-secondary text-xs">
                No se han registrado ventas todavía.
              </p>
            ) : (
              recentSales.map(sale => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="p-4 rounded-2xl border border-border-custom bg-bg-primary space-y-3 hover:border-primary/50 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-text-primary text-xs flex items-center gap-1">
                        <span>{sale.clienteNombre}</span>
                        <Eye size={12} className="text-primary shrink-0" />
                      </p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        {new Date(sale.creado_en).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className="font-mono text-[9px] font-semibold text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded border border-border-custom">
                      #{sale.id.slice(0, 6)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className={`px-2 py-0.5 rounded-lg font-semibold text-[9px] border ${badgeClaseVenta(sale)}`}>
                      {badgeTextoVenta(sale)}
                    </span>
                    <span className="font-extrabold text-xs text-text-primary">
                      {formatPrecio(sale.total)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentSales.some(s => s.metodo_pago?.startsWith('WhatsApp')) && (
            <p className="text-[10px] text-text-secondary text-center mt-4 pt-4 border-t border-border-custom">
              Para gestionar el estado de los pedidos de WhatsApp, andá a{' '}
              <Link to="/admin/pedidos" className="text-primary font-bold hover:underline">Pedidos</Link>.
            </p>
          )}
        </div>
      </div>

      {/* Modal Detalle de Venta */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSale(null)} />

          <div className="relative w-full max-w-lg bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all space-y-5">
            {/* Encabezado */}
            <div className="flex items-start justify-between pb-4 border-b border-border-custom">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                  Detalle de Venta #{selectedSale.id}
                </span>
                <h3 className="font-heading font-extrabold text-xl text-text-primary mt-0.5">
                  {selectedSale.clienteNombre}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1.5 rounded-xl bg-bg-primary border border-border-custom hover:border-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Meta datos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-bg-primary border border-border-custom text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-text-secondary">Fecha / Hora</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {new Date(selectedSale.creado_en).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-secondary">Medio de Pago</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md font-bold text-[10px] border ${badgeClaseVenta(selectedSale)}`}>
                  {badgeTextoVenta(selectedSale)}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-secondary">Estado</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md font-bold text-[10px] border uppercase ${
                  selectedSale.estado === 'cancelado'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                  {selectedSale.estado || 'Entregado'}
                </span>
              </div>
            </div>

            {/* Desglose de Productos */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Productos Comprados ({selectedSale.items ? selectedSale.items.length : 0})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {(selectedSale.items || []).map((item, idx) => {
                  const prod = productosList.find(p => p.id === item.producto_id);
                  const nombre = prod ? prod.nombre : (item.nombre || 'Producto');
                  const precio = prod ? prod.precio_venta : (item.precio_venta || 0);
                  const subtotal = precio ? precio * item.cantidad : null;

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-bg-primary/60 border border-border-custom text-xs">
                      <div>
                        <p className="font-bold text-text-primary">{nombre}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          Cantidad: <span className="font-bold text-primary">{item.cantidad}</span>
                          {precio > 0 && ` × ${formatPrecio(precio)}`}
                        </p>
                      </div>
                      {subtotal !== null && (
                        <span className="font-bold text-text-primary text-sm">
                          {formatPrecio(subtotal)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-border-custom pt-4">
              <span className="text-xs font-bold uppercase text-text-secondary">Total Facturado</span>
              <span className="font-heading font-extrabold text-2xl text-text-primary">
                {formatPrecio(selectedSale.total)}
              </span>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="flex-1 py-2.5 rounded-2xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => setShowTicket(true)}
                className="flex-1 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt size={16} />
                <span>Ver Ticket / Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {showTicket && selectedSale && (
        <Ticket
          clienteNombre={selectedSale.clienteNombre}
          fecha={selectedSale.creado_en}
          ventaId={selectedSale.id}
          items={(selectedSale.items || []).map(item => {
            const prod = productosList.find(p => p.id === item.producto_id);
            return {
              cantidad: item.cantidad,
              nombre: prod ? prod.nombre : (item.nombre || 'Producto'),
              precio_venta: prod ? prod.precio_venta : (item.precio_venta || 0)
            };
          })}
          total={selectedSale.total}
          metodoPago={selectedSale.metodo_pago}
          onClose={() => setShowTicket(false)}
        />
      )}

    </div>
  );
}
