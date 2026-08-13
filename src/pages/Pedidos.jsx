import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatPrecio } from '../config/businessConfig';
import Ticket from '../components/Ticket';
import SelectorFecha from '../components/SelectorFecha';
import {
  ClipboardList, Clock, User, CheckCircle, XCircle, Edit2, Trash2, Plus, Minus, X, Save,
  ShoppingBag, AlertTriangle, AlertCircle, Info, Search, Receipt, ShoppingCart, MessageSquare
} from 'lucide-react';

const ESTADO_TABS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'entregado', label: 'Entregados' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: 'todos', label: 'Todos' }
];

const ESTADO_BADGE = {
  pendiente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  entregado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  completado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelado: 'bg-red-500 text-white border-red-500'
};

const METODOS_COBRO = ['Efectivo', 'Transferencia', 'Tarjeta'];

const getNormalEstado = (estado) => {
  if (estado === 'completado') return 'entregado';
  return estado || 'pendiente';
};

const hoyStr = () => new Date().toISOString().slice(0, 10);
const mesActualStr = () => new Date().toISOString().slice(0, 7);

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');
  // Filtro de fecha: tipo 'todos' | 'dia' | 'mes', valor en formato de <input type="date"|"month">
  const [filtroFecha, setFiltroFecha] = useState({ tipo: 'todos', valor: '' });

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => setToast({ message, type });
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Modal de edición
  const [editingPedido, setEditingPedido] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editSearch, setEditSearch] = useState('');

  // Modal de entrega (cobro)
  const [entregandoPedido, setEntregandoPedido] = useState(null);
  const [metodoCobro, setMetodoCobro] = useState('Efectivo');
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);

  // Modal de ticket
  const [ticketPedido, setTicketPedido] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: ventas } = await supabase.from('ventas').select('*').order('creado_en', { ascending: false });
    const { data: prods } = await supabase.from('productos').select('*');
    if (ventas) setPedidos(ventas);
    if (prods) setProductos(prods);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const nombreProducto = (producto_id) => productos.find(p => p.id === producto_id)?.nombre || 'Producto eliminado';

  const pasaFiltroFecha = (pedido) => {
    if (filtroFecha.tipo === 'todos' || !filtroFecha.valor) return true;
    const fecha = new Date(pedido.creado_en);
    if (Number.isNaN(fecha.getTime())) return false;
    const [anio, mes, dia] = filtroFecha.valor.split('-').map(Number);
    if (filtroFecha.tipo === 'dia') {
      return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    }
    if (filtroFecha.tipo === 'mes') {
      return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1;
    }
    return true;
  };

  const pedidosFiltrados = pedidos
    .filter(p => activeTab === 'todos' || getNormalEstado(p.estado) === activeTab)
    .filter(pasaFiltroFecha);

  const contarPorEstado = (estado) => pedidos.filter(p => getNormalEstado(p.estado) === estado && pasaFiltroFecha(p)).length;

  const cancelarPedido = async (pedido) => {
    const esDevolucion = getNormalEstado(pedido.estado) === 'entregado';
    const mensaje = esDevolucion
      ? '¿Cancelar esta venta ya entregada? Se registrará como una devolución y el stock de los productos volverá al inventario.'
      : '¿Cancelar este pedido? Se devolverá el stock reservado al inventario.';
    if (!confirm(mensaje)) return;

    for (const item of pedido.items || []) {
      const producto = productos.find(p => p.id === item.producto_id);
      if (producto) {
        await supabase.from('productos').update({ stock: producto.stock + item.cantidad }).eq('id', producto.id);
      }
    }
    const { error } = await supabase.from('ventas').update({ estado: 'cancelado' }).eq('id', pedido.id);
    if (error) {
      showToast('Error al cancelar el pedido: ' + error.message, 'error');
      return;
    }
    showToast(
      esDevolucion ? 'Venta cancelada por devolución. El stock fue repuesto al inventario.' : 'Pedido cancelado. El stock fue devuelto al inventario.',
      'info'
    );
    fetchData();
  };

  // --- Edición de pedido (cambiar cantidades y agregar productos nuevos) ---

  const openEditModal = (pedido) => {
    const items = (pedido.items || []).map(item => {
      const producto = productos.find(p => p.id === item.producto_id);
      return {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        nombre: producto ? producto.nombre : 'Producto eliminado',
        precio_venta: producto ? producto.precio_venta : 0,
        // Techo editable: lo que queda en stock más lo que este pedido ya tenía reservado.
        stockDisponible: producto ? producto.stock + item.cantidad : item.cantidad
      };
    });
    setEditItems(items);
    setEditSearch('');
    setEditingPedido(pedido);
  };

  const cambiarCantidadEdit = (producto_id, delta) => {
    setEditItems(prev => prev.map(item => {
      if (item.producto_id !== producto_id) return item;
      const nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad < 0) return item;
      if (nuevaCantidad > item.stockDisponible) {
        showToast(`Solo hay ${item.stockDisponible} unidades disponibles de ${item.nombre}.`, 'warning');
        return item;
      }
      return { ...item, cantidad: nuevaCantidad };
    }));
  };

  const quitarItemEdit = (producto_id) => {
    setEditItems(prev => prev.filter(item => item.producto_id !== producto_id));
  };

  const agregarProductoEdit = (producto) => {
    const yaExiste = editItems.find(item => item.producto_id === producto.id);
    if (yaExiste) {
      cambiarCantidadEdit(producto.id, 1);
      return;
    }
    if (producto.stock <= 0) {
      showToast(`${producto.nombre} no tiene stock disponible.`, 'warning');
      return;
    }
    setEditItems(prev => [...prev, {
      producto_id: producto.id,
      cantidad: 1,
      nombre: producto.nombre,
      precio_venta: producto.precio_venta,
      stockDisponible: producto.stock
    }]);
    showToast(`${producto.nombre} agregado al pedido.`, 'success');
  };

  const resultadosBusquedaEdit = editSearch.trim()
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(editSearch.toLowerCase()) &&
        !editItems.some(item => item.producto_id === p.id)
      ).slice(0, 6)
    : [];

  const guardarEdicionPedido = async () => {
    const itemsFinales = editItems.filter(item => item.cantidad > 0);
    if (itemsFinales.length === 0) {
      showToast('El pedido debe tener al menos un producto. Cancélalo si ya no aplica.', 'warning');
      return;
    }

    // Ajustar stock por la diferencia entre lo reservado originalmente y lo editado
    const originalMap = new Map((editingPedido.items || []).map(i => [i.producto_id, i.cantidad]));
    const nuevoMap = new Map(itemsFinales.map(i => [i.producto_id, i.cantidad]));
    const idsAfectados = new Set([...originalMap.keys(), ...nuevoMap.keys()]);

    for (const producto_id of idsAfectados) {
      const original = originalMap.get(producto_id) || 0;
      const nuevo = nuevoMap.get(producto_id) || 0;
      const delta = original - nuevo; // positivo: se libera stock, negativo: se consume más
      if (delta === 0) continue;
      const producto = productos.find(p => p.id === producto_id);
      if (producto) {
        await supabase.from('productos').update({ stock: producto.stock + delta }).eq('id', producto_id);
      }
    }

    const nuevoTotal = itemsFinales.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0);
    const { error } = await supabase.from('ventas').update({
      items: itemsFinales.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
      total: nuevoTotal
    }).eq('id', editingPedido.id);

    if (error) {
      showToast('Error al guardar los cambios: ' + error.message, 'error');
      return;
    }

    showToast('Pedido actualizado correctamente.', 'success');
    setEditingPedido(null);
    fetchData();
  };

  // --- Entrega con cobro y ticket ---

  const abrirEntrega = (pedido) => {
    setMetodoCobro('Efectivo');
    setEntregandoPedido(pedido);
  };

  const confirmarEntrega = async () => {
    setConfirmandoEntrega(true);
    const { error } = await supabase.from('ventas').update({
      estado: 'entregado',
      metodo_cobro: metodoCobro
    }).eq('id', entregandoPedido.id);

    setConfirmandoEntrega(false);

    if (error) {
      showToast('Error al confirmar la entrega: ' + error.message, 'error');
      return;
    }

    showToast('¡Pedido entregado y cobrado con éxito!', 'success');
    setTicketPedido({ ...entregandoPedido, estado: 'entregado', metodo_cobro: metodoCobro });
    setEntregandoPedido(null);
    fetchData();
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-bg-primary overflow-y-auto">

      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-3xl text-text-primary mb-1 flex items-center gap-2">
          <ClipboardList className="text-primary" size={28} />
          Pedidos
        </h1>
        <p className="text-xs text-text-secondary font-medium">
          Pedidos hechos por el catálogo online vía WhatsApp
        </p>
      </div>

      {/* Tabs por estado */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {ESTADO_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.value
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-secondary text-text-secondary border border-border-custom hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <span>{tab.label}</span>
            {tab.value !== 'todos' && (
              <span className={`text-[10px] font-extrabold px-1.5 rounded-full ${
                activeTab === tab.value ? 'bg-white/20' : 'bg-bg-primary'
              }`}>
                {contarPorEstado(tab.value)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtro de fecha: chips rápidos + selección puntual de día o mes */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFiltroFecha({ tipo: 'todos', valor: '' })}
          className={`px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
            filtroFecha.tipo === 'todos'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-bg-secondary text-text-secondary border border-border-custom hover:bg-bg-primary hover:text-text-primary'
          }`}
        >
          Todas las fechas
        </button>
        <button
          onClick={() => setFiltroFecha({ tipo: 'dia', valor: hoyStr() })}
          className={`px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
            filtroFecha.tipo === 'dia' && filtroFecha.valor === hoyStr()
              ? 'bg-primary text-white shadow-sm'
              : 'bg-bg-secondary text-text-secondary border border-border-custom hover:bg-bg-primary hover:text-text-primary'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setFiltroFecha({ tipo: 'mes', valor: mesActualStr() })}
          className={`px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
            filtroFecha.tipo === 'mes' && filtroFecha.valor === mesActualStr()
              ? 'bg-primary text-white shadow-sm'
              : 'bg-bg-secondary text-text-secondary border border-border-custom hover:bg-bg-primary hover:text-text-primary'
          }`}
        >
          Este Mes
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <div className="w-full sm:w-40">
            <SelectorFecha
              tipo="date"
              value={filtroFecha.tipo === 'dia' ? filtroFecha.valor : ''}
              onChange={(e) => setFiltroFecha(e.target.value ? { tipo: 'dia', valor: e.target.value } : { tipo: 'todos', valor: '' })}
              placeholder="Elegir día"
              tamano="sm"
            />
          </div>
          <div className="w-full sm:w-40">
            <SelectorFecha
              tipo="month"
              value={filtroFecha.tipo === 'mes' ? filtroFecha.valor : ''}
              onChange={(e) => setFiltroFecha(e.target.value ? { tipo: 'mes', valor: e.target.value } : { tipo: 'todos', valor: '' })}
              placeholder="Elegir mes"
              tamano="sm"
            />
          </div>
        </div>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-text-secondary font-medium text-xs">Cargando pedidos...</p>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
          <ShoppingBag className="mx-auto text-text-muted mb-4" size={44} />
          <p className="text-text-secondary font-medium text-xs">
            No hay pedidos en esta categoría{filtroFecha.tipo !== 'todos' ? ' para la fecha seleccionada' : ''}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pedidosFiltrados.map(pedido => {
            const estado = pedido.estado || 'pendiente';
            const isWhatsApp = pedido.metodo_pago && pedido.metodo_pago.startsWith('WhatsApp');
            return (
              <div key={pedido.id} className="bg-bg-secondary border border-border-custom rounded-3xl p-5 premium-card flex flex-col gap-4">

                {/* Encabezado del pedido */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-text-secondary shrink-0" />
                      <h3 className="font-heading font-bold text-text-primary text-sm truncate">
                        {pedido.cliente_nombre || 'Cliente sin nombre'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                      <Clock size={12} />
                      <span>{pedido.hora_retiro || 'Sin horario definido'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border ${ESTADO_BADGE[estado] || ESTADO_BADGE.entregado}`}>
                      {estado === 'completado' ? 'entregado' : estado}
                    </span>
                    {isWhatsApp ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <MessageSquare size={10} /> WhatsApp
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[9px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        <ShoppingCart size={10} /> POS ({pedido.metodo_pago || 'Caja'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-border-custom pt-3 space-y-1.5">
                  {(pedido.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-text-primary font-medium truncate pr-2">
                        {item.cantidad}x {nombreProducto(item.producto_id)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total y fecha */}
                <div className="flex items-center justify-between border-t border-border-custom pt-3">
                  <span className="text-[10px] text-text-muted font-medium">
                    {new Date(pedido.creado_en).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="font-heading font-extrabold text-text-primary text-base">
                    {formatPrecio(pedido.total)}
                  </span>
                </div>

                {/* Acciones */}
                {estado === 'pendiente' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => abrirEntrega(pedido)}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      <span>Entregar</span>
                    </button>
                    <button
                      onClick={() => openEditModal(pedido)}
                      className="px-3 py-2 rounded-xl bg-bg-primary border border-border-custom hover:border-primary text-text-secondary hover:text-primary transition-all cursor-pointer"
                      title="Editar Pedido"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => cancelarPedido(pedido)}
                      className="px-3 py-2 rounded-xl bg-bg-primary border border-border-custom hover:bg-red-500 hover:border-red-500 text-text-secondary hover:text-white transition-all cursor-pointer"
                      title="Cancelar Pedido"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                )}
                {(estado === 'entregado' || estado === 'completado') && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setTicketPedido(pedido)}
                      className="flex-1 py-2 rounded-xl bg-bg-primary border border-border-custom hover:border-primary text-text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold"
                    >
                      <Receipt size={14} />
                      <span>Ver Ticket</span>
                    </button>
                    <button
                      onClick={() => cancelarPedido(pedido)}
                      className="px-3 py-2 rounded-xl bg-bg-primary border border-border-custom hover:bg-red-500 hover:border-red-500 text-text-secondary hover:text-white transition-all cursor-pointer"
                      title="Cancelar venta (devolución)"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Pedido */}
      {editingPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPedido(null)} />

          <div className="relative w-full max-w-lg bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
              <div>
                <h3 className="font-heading font-bold text-lg text-text-primary">Editar Pedido</h3>
                <p className="text-[11px] text-text-secondary">{editingPedido.cliente_nombre || 'Cliente sin nombre'}</p>
              </div>
              <button
                onClick={() => setEditingPedido(null)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Buscador para agregar productos nuevos al pedido */}
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={15} />
              <input
                type="text"
                placeholder="Buscar producto para agregar al pedido..."
                value={editSearch}
                onChange={(e) => setEditSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {resultadosBusquedaEdit.length > 0 && (
                <div className="absolute z-10 mt-1.5 w-full bg-bg-secondary border border-border-custom rounded-xl shadow-lg overflow-hidden">
                  {resultadosBusquedaEdit.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { agregarProductoEdit(p); setEditSearch(''); }}
                      disabled={p.stock <= 0}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors ${
                        p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-primary cursor-pointer'
                      }`}
                    >
                      <span className="font-semibold text-text-primary truncate">{p.nombre}</span>
                      <span className="text-text-secondary shrink-0">{formatPrecio(p.precio_venta)} · {p.stock} u.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {editItems.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-6">
                  No quedan productos en este pedido. Guardá para cancelarlo o cerrá sin guardar.
                </p>
              ) : (
                editItems.map(item => (
                  <div key={item.producto_id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border-custom bg-bg-primary">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-primary truncate">{item.nombre}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{formatPrecio(item.precio_venta)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => cambiarCantidadEdit(item.producto_id, -1)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-bg-secondary border border-border-custom text-text-secondary hover:text-primary transition-colors cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold text-text-primary w-6 text-center">{item.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidadEdit(item.producto_id, 1)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-bg-secondary border border-border-custom text-text-secondary hover:text-primary transition-colors cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => quitarItemEdit(item.producto_id)}
                        className="p-1.5 rounded-md text-text-secondary hover:bg-red-500 hover:text-white transition-colors ml-1 cursor-pointer"
                        title="Quitar producto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-custom">
              <span className="text-xs font-bold text-text-secondary uppercase">Nuevo Total</span>
              <span className="font-heading font-extrabold text-lg text-text-primary">
                {formatPrecio(editItems.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0))}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-2">
              <button
                onClick={() => setEditingPedido(null)}
                className="px-4 py-2 rounded-xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicionPedido}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Entrega y Cobro */}
      {entregandoPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !confirmandoEntrega && setEntregandoPedido(null)} />

          <div className="relative w-full max-w-sm bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
              <h3 className="font-heading font-bold text-lg text-text-primary">Confirmar Entrega</h3>
              <button
                onClick={() => setEntregandoPedido(null)}
                disabled={confirmandoEntrega}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-1">{entregandoPedido.cliente_nombre || 'Cliente sin nombre'}</p>
            <p className="font-heading font-extrabold text-2xl text-text-primary mb-5">
              {formatPrecio(entregandoPedido.total)}
            </p>

            <label className="text-xs font-bold text-text-secondary uppercase block mb-2">¿Cómo te pagó?</label>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {METODOS_COBRO.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodoCobro(m)}
                  className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    metodoCobro === m
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-bg-primary text-text-secondary border-border-custom hover:bg-bg-primary/80 hover:text-text-primary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              onClick={confirmarEntrega}
              disabled={confirmandoEntrega}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {confirmandoEntrega ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Receipt size={16} />
                  <span>Confirmar y Generar Ticket</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal Ticket */}
      {ticketPedido && (
        <Ticket
          clienteNombre={ticketPedido.cliente_nombre}
          fecha={ticketPedido.creado_en}
          ventaId={ticketPedido.id}
          items={(ticketPedido.items || []).map(item => {
            const prod = productos.find(p => p.id === item.producto_id);
            return {
              cantidad: item.cantidad,
              nombre: prod ? prod.nombre : nombreProducto(item.producto_id),
              precio_venta: prod ? prod.precio_venta : 0,
              tasa_iva: prod ? (prod.tasa_iva ?? 10) : 10
            };
          })}
          total={ticketPedido.total}
          metodoPago={ticketPedido.metodo_cobro || ticketPedido.metodo_pago}
          onClose={() => setTicketPedido(null)}
        />
      )}

      {/* Notificación Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] sm:w-full bg-bg-secondary/95 backdrop-blur-md border border-border-custom rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex gap-3.5 items-center animate-slide-in-right">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' :
            toast.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' :
            toast.type === 'error' ? 'bg-red-500 text-white border border-red-500' :
            'bg-sky-500/10 text-sky-500 border border-sky-500/10'
          }`}>
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-none mb-1">
              {toast.type === 'success' ? 'Éxito' :
               toast.type === 'warning' ? 'Atención' :
               toast.type === 'error' ? 'Error' :
               'Información'}
            </h4>
            <p className="text-xs sm:text-sm font-semibold text-text-primary leading-tight">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
