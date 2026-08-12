import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatPrecio } from '../config/businessConfig';
import Ticket from '../components/Ticket';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, CreditCard, Check, AlertTriangle, AlertCircle, CheckCircle, Info, X, ScanLine } from 'lucide-react';
import EscanerCodigoBarras from '../components/EscanerCodigoBarras';

export default function PuntoVenta() {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showScanner, setShowScanner] = useState(false);

  // Carrito de POS
  const [carrito, setCarrito] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState(''); // Teclado numérico TPV: efectivo entregado por el cliente
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('productos'); // 'productos' | 'carrito' (para vista móvil)
  const [ticketVenta, setTicketVenta] = useState(null);

  // Modal para Venta por Peso / Dinero (Calculadora Dual)
  const [weightModalProduct, setWeightModalProduct] = useState(null);
  const [weightModalTab, setWeightModalTab] = useState('dinero'); // 'dinero' | 'peso'
  const [customMonto, setCustomMonto] = useState('2000');
  const [customPeso, setCustomPeso] = useState('0.5');

  // Toast Notification State
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'warning' | 'error' | 'info' }

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    setLoading(true);
    // Cargar productos
    const { data: prods } = await supabase.from('productos').select('*').order('nombre');
    if (prods) setProductos(prods);

    // Cargar clientes
    const { data: clients } = await supabase.from('clientes').select('*').order('nombre');
    if (clients) setClientes(clients);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const agregarAlCarrito = (producto) => {
    // Si el producto es por kilo, abrir modal de selección dual (por dinero o por peso)
    if (producto.unidad_medida === 'kg') {
      const itemExistente = carrito.find(i => i.id === producto.id);
      setWeightModalProduct(producto);
      setWeightModalTab('dinero');
      setCustomMonto(itemExistente?.montoFijo ? itemExistente.montoFijo.toString() : '2000');
      setCustomPeso(itemExistente ? itemExistente.cantidad.toString() : '0.5');
      return;
    }

    const itemEnCarrito = carrito.find(item => item.id === producto.id);
    if (itemEnCarrito) {
      if (itemEnCarrito.cantidad >= producto.stock) {
        showToast(`No hay más stock disponible. Máximo: ${producto.stock}`, 'warning');
        return;
      }
      setCarrito(carrito.map(item => 
        item.id === producto.id 
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_venta } 
          : item
      ));
      showToast(`Se agregó ${producto.nombre} al carrito.`, 'success');
    } else {
      if (producto.stock <= 0) {
        showToast('Este producto no tiene stock disponible.', 'error');
        return;
      }
      setCarrito([...carrito, { ...producto, cantidad: 1, subtotal: producto.precio_venta }]);
      showToast(`Se agregó ${producto.nombre} al carrito.`, 'success');
    }
  };

  const confirmarAgregarPeso = () => {
    if (!weightModalProduct) return;

    let kilos = 0;
    let subtotal = 0;

    if (weightModalTab === 'dinero') {
      const monto = parseFloat(customMonto) || 0;
      if (monto <= 0) {
        showToast('Ingresa un monto válido en Guaraníes.', 'warning');
        return;
      }
      subtotal = monto;
      kilos = parseFloat((monto / weightModalProduct.precio_venta).toFixed(3));
    } else {
      const peso = parseFloat(customPeso) || 0;
      if (peso <= 0) {
        showToast('Ingresa un peso válido en Kg.', 'warning');
        return;
      }
      kilos = peso;
      subtotal = Math.round(peso * weightModalProduct.precio_venta);
    }

    if (kilos > weightModalProduct.stock) {
      showToast(`Stock insuficiente. Disponible: ${weightModalProduct.stock} kg`, 'warning');
      return;
    }

    const itemExistente = carrito.find(item => item.id === weightModalProduct.id);
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.id === weightModalProduct.id
          ? {
              ...item,
              cantidad: kilos,
              subtotal,
              montoFijo: weightModalTab === 'dinero' ? subtotal : null
            }
          : item
      ));
    } else {
      setCarrito([
        ...carrito,
        {
          ...weightModalProduct,
          cantidad: kilos,
          subtotal,
          montoFijo: weightModalTab === 'dinero' ? subtotal : null
        }
      ]);
    }

    showToast(`Agregado: ${weightModalProduct.nombre} (${kilos} kg = ${formatPrecio(subtotal)})`, 'success');
    setWeightModalProduct(null);
  };

  const cambiarCantidad = (id, delta) => {
    const item = carrito.find(item => item.id === id);
    if (!item) return;

    if (item.unidad_medida === 'kg') {
      const original = productos.find(p => p.id === id);
      setWeightModalProduct(original || item);
      setWeightModalTab('peso');
      setCustomPeso(item.cantidad.toString());
      setCustomMonto((item.subtotal || Math.round(item.cantidad * item.precio_venta)).toString());
      return;
    }

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter(item => item.id !== id));
      showToast('Producto eliminado del carrito.', 'info');
    } else {
      const original = productos.find(p => p.id === id);
      if (nuevaCantidad > original.stock) {
        showToast(`Stock insuficiente. Disponible: ${original.stock}`, 'warning');
        return;
      }
      setCarrito(carrito.map(item => 
        item.id === id 
          ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio_venta } 
          : item
      ));
    }
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
    showToast('Producto eliminado del carrito.', 'info');
  };

  const handleScan = (codigo) => {
    setShowScanner(false);
    const producto = productos.find(p => p.codigo_barras && p.codigo_barras === codigo);
    if (!producto) {
      showToast(`No se encontró ningún producto con el código ${codigo}.`, 'warning');
      return;
    }
    agregarAlCarrito(producto);
  };

  const handleFinalizarVenta = async () => {
    if (carrito.length === 0) {
      showToast('Agrega al menos un producto al carrito.', 'warning');
      return;
    }

    if (metodoPago === 'Efectivo' && (parseInt(montoRecibido, 10) || 0) < totalVenta) {
      showToast('El monto recibido es menor al total. Verifica el efectivo entregado por el cliente.', 'warning');
      return;
    }

    setSubmitting(true);
    
    // Formatear items para RPC
    const items = carrito.map(item => ({
      producto_id: item.id,
      cantidad: item.cantidad
    }));

    const { data, error } = await supabase.rpc('registrar_venta', {
      p_cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
      p_items: items,
      p_metodo_pago: metodoPago,
      p_cliente_nombre: clienteSeleccionado ? clienteSeleccionado.nombre : 'Venta de Caja (Cliente Casual)',
      p_hora_retiro: 'Inmediato (Caja)',
      p_estado: 'entregado'
    });

    if (error) {
      showToast('Error al registrar la venta: ' + error.message, 'error');
    } else {
      showToast('¡Venta realizada con éxito! Stock actualizado.', 'success');
      setTicketVenta({
        clienteNombre: clienteSeleccionado ? clienteSeleccionado.nombre : null,
        clienteRuc: clienteSeleccionado ? (clienteSeleccionado.ruc || clienteSeleccionado.ci) : null,
        fecha: new Date().toISOString(),
        ventaId: data,
        items: carrito.map(item => ({
          cantidad: item.unidad_medida === 'kg' ? item.cantidad : item.cantidad,
          nombre: item.nombre + (item.unidad_medida === 'kg' ? ` (${item.cantidad} kg)` : ''),
          precio_venta: item.subtotal ? Math.round(item.subtotal / (item.cantidad || 1)) : item.precio_venta,
          tasa_iva: item.tasa_iva ?? 10
        })),
        total: totalVenta,
        metodoPago,
        recibido: metodoPago === 'Efectivo' ? (parseInt(montoRecibido, 10) || 0) : null,
        vuelto: metodoPago === 'Efectivo' ? ((parseInt(montoRecibido, 10) || 0) - totalVenta) : null
      });
      setCarrito([]);
      setClienteSeleccionado(null);
      setMetodoPago('Efectivo');
      setMontoRecibido('');
      // Recargar catálogo y stock
      await fetchData();
    }
    setSubmitting(false);
  };

  // Filtrado de productos
  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'Todos' || p.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categorias = ['Todos', ...new Set(productos.map(p => p.categoria).filter(Boolean))];
  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);
  const vuelto = (parseInt(montoRecibido, 10) || 0) - totalVenta;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100dvh-64px)] bg-bg-primary overflow-hidden">
      
      {/* Mobile Tabs Toggle (Solo visible en pantallas chicas) */}
      <div className="flex md:hidden border-b border-border-custom bg-bg-secondary w-full">
        <button
          onClick={() => setActiveTab('productos')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'productos'
              ? 'border-primary text-primary bg-primary-soft/10'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Productos ({filteredProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('carrito')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'carrito'
              ? 'border-primary text-primary bg-primary-soft/10'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Carrito ({carrito.reduce((acc, item) => acc + item.cantidad, 0)})
          {carrito.length > 0 && (
            <span className="absolute top-2.5 right-6 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </button>
      </div>

      {/* PANEL IZQUIERDO: Búsqueda y Selección de Productos */}
      <div className={`flex-1 p-6 flex flex-col h-full overflow-hidden border-r border-border-custom bg-bg-primary ${
        activeTab === 'productos' ? 'flex' : 'hidden md:flex'
      }`}>
        
        {/* Header POS */}
        <div className="mb-6">
          <h1 className="font-heading font-extrabold text-2xl text-text-primary mb-1">
            Punto de Venta (TPV)
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Factura y descuenta stock al instante
          </p>
        </div>

        {/* Buscador y Categorías */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                placeholder="Escribe el nombre o categoría del producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border-custom bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="shrink-0 p-2.5 rounded-2xl border border-border-custom bg-bg-secondary text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer"
              title="Escanear código de barras"
            >
              <ScanLine size={18} />
            </button>
          </div>

          {/* Pestañas de categoría grandes, estilo botonera TPV */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all cursor-pointer border-2 shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-bg-secondary text-text-secondary border-border-custom hover:border-primary/40 hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Listado de Productos Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p className="text-text-secondary font-medium">Cargando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-secondary font-medium">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => agregarAlCarrito(prod)}
                  disabled={prod.stock <= 0}
                  className={`rounded-2xl border border-border-custom bg-bg-secondary text-left flex flex-col justify-between premium-card overflow-hidden relative cursor-pointer ${
                    prod.stock <= 0 ? 'opacity-60 cursor-not-allowed bg-bg-primary' : ''
                  }`}
                >
                  {/* Foto compacta */}
                  <div className="aspect-[16/10] w-full bg-bg-primary relative overflow-hidden border-b border-border-custom shrink-0">
                    <img
                      src={prod.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'}
                      alt={prod.nombre}
                      className="w-full h-full object-cover"
                    />
                    <span className={`absolute top-1.5 right-1.5 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-lg shrink-0 backdrop-blur-sm ${
                      prod.stock <= 0
                        ? 'bg-red-500 text-white'
                        : prod.stock <= 3
                          ? 'bg-bg-secondary/90 border border-border-custom/50 text-amber-500'
                          : 'bg-bg-secondary/90 border border-border-custom/50 text-emerald-500'
                    }`}>
                      {prod.stock <= 0 ? 'Agotado' : `${prod.stock} ${prod.unidad_medida === 'kg' ? 'kg' : prod.unidad_medida === 'docena' ? 'doc.' : 'u.'}`}
                    </span>
                  </div>

                  {/* Datos */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5">
                    <div>
                      <span className="text-[8px] sm:text-[9px] uppercase font-bold text-text-secondary tracking-wider block">
                        {prod.categoria}
                      </span>
                      <h4 className="font-heading font-bold text-text-primary text-[11px] sm:text-xs line-clamp-1 mt-0.5" title={prod.nombre}>
                        {prod.nombre}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-auto pt-0.5">
                      <span className="font-heading font-extrabold text-sm sm:text-base text-primary">
                        {formatPrecio(prod.precio_venta)}
                      </span>
                      <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 border border-primary/5 text-primary flex items-center justify-center font-bold text-sm sm:text-base hover:scale-105 active:scale-95 transition-transform shrink-0">
                        +
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: Facturación y Carrito de POS */}
      <div className={`w-full md:w-96 p-6 bg-bg-secondary border-t md:border-t-0 border-border-custom flex flex-col h-full overflow-hidden ${
        activeTab === 'carrito' ? 'flex' : 'hidden md:flex'
      }`}>
        
        {/* Título Carrito */}
        <div className="flex items-center gap-2 pb-4 border-b border-border-custom mb-6">
          <ShoppingCart size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-sm text-text-primary uppercase tracking-wider">
            Carrito de Facturación
          </h3>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-6 pr-1">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary py-12">
              <ShoppingCart className="text-text-muted mb-2 opacity-50" size={32} />
              <p className="text-xs font-semibold">El carrito está vacío</p>
              <p className="text-[10px] text-text-muted mt-0.5">Haz clic en los productos para agregarlos.</p>
            </div>
          ) : (
            carrito.map(item => {
              const itemSubtotal = item.subtotal || (item.precio_venta * item.cantidad);
              const esKg = item.unidad_medida === 'kg';

              return (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border-custom bg-bg-primary text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-text-primary truncate">{item.nombre}</p>
                      {esKg && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold shrink-0">
                          ⚖️ Kg
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {formatPrecio(item.precio_venta)} {esKg ? '/kg' : 'c/u'} &bull; <span className="font-bold text-text-primary">{formatPrecio(itemSubtotal)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {esKg ? (
                      <button
                        onClick={() => cambiarCantidad(item.id, 0)}
                        className="px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-custom hover:border-primary text-text-primary text-[11px] font-bold transition-all cursor-pointer"
                        title="Haz clic para modificar kilos o monto en guaraníes"
                      >
                        {item.cantidad} kg
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="h-6 w-6 rounded-md bg-bg-secondary border border-border-custom flex items-center justify-center text-text-secondary hover:text-primary transition-colors cursor-pointer"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-5 text-center font-bold text-text-primary">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="h-6 w-6 rounded-md bg-bg-secondary border border-border-custom flex items-center justify-center text-text-secondary hover:text-primary transition-colors cursor-pointer"
                        >
                          <Plus size={10} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="p-1 rounded-md text-text-secondary hover:bg-red-500 hover:text-white transition-colors ml-1 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Opciones de la Compra */}
        {carrito.length > 0 && (
          <div className="space-y-4 border-t border-border-custom pt-4 mb-6">
            
            {/* Cliente Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <User size={12} />
                <span>Cliente Asignado</span>
              </label>
              <select
                value={clienteSeleccionado ? clienteSeleccionado.id : ''}
                onChange={(e) => {
                  const client = clientes.find(c => c.id === e.target.value);
                  setClienteSeleccionado(client || null);
                }}
                className="w-full px-3 py-2 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none transition-all"
              >
                <option value="">-- Consumidor Casual --</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.telefono || 'Sin tel'})</option>
                ))}
              </select>
            </div>

            {/* Medio de Pago */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <CreditCard size={12} />
                <span>Método de Pago</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Efectivo', 'Débito', 'Transferencia'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMetodoPago(m);
                      if (m !== 'Efectivo') setMontoRecibido('');
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      metodoPago === m
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-bg-primary text-text-secondary border-border-custom hover:bg-bg-primary/80 hover:text-text-primary'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Teclado numérico TPV: efectivo entregado y cálculo de vuelto */}
            {metodoPago === 'Efectivo' && (
              <div className="space-y-2 p-3 rounded-2xl border border-border-custom bg-bg-primary">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Recibe (Gs.)</span>
                  <span className="font-heading font-black text-lg text-text-primary">
                    {montoRecibido ? parseInt(montoRecibido, 10).toLocaleString('es-PY') : '0'}
                  </span>
                </div>

                {/* Billetes rápidos */}
                <div className="grid grid-cols-3 gap-1.5">
                  {['5000', '10000', '20000', '50000', '100000'].map(billete => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setMontoRecibido(billete)}
                      className="py-1.5 rounded-lg text-[10px] font-bold border border-border-custom bg-bg-secondary text-text-secondary hover:border-primary hover:text-primary transition-all cursor-pointer"
                    >
                      {parseInt(billete, 10).toLocaleString('es-PY')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMontoRecibido(String(totalVenta))}
                    className="py-1.5 rounded-lg text-[10px] font-bold border border-primary bg-primary-soft text-primary cursor-pointer"
                  >
                    Exacto
                  </button>
                </div>

                {/* Teclado numérico */}
                <div className="grid grid-cols-3 gap-1.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digito => (
                    <button
                      key={digito}
                      type="button"
                      onClick={() => setMontoRecibido(prev => (prev === '0' ? '' : prev) + digito)}
                      className="py-2.5 rounded-lg text-sm font-bold bg-bg-secondary border border-border-custom text-text-primary hover:border-primary transition-all cursor-pointer"
                    >
                      {digito}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMontoRecibido('')}
                    className="py-2.5 rounded-lg text-xs font-bold bg-red-500 border border-red-500 text-white hover:bg-red-600 transition-all cursor-pointer"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => setMontoRecibido(prev => (prev === '0' ? '' : prev) + '0')}
                    className="py-2.5 rounded-lg text-sm font-bold bg-bg-secondary border border-border-custom text-text-primary hover:border-primary transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setMontoRecibido(prev => prev.slice(0, -1))}
                    className="py-2.5 rounded-lg text-xs font-bold bg-bg-secondary border border-border-custom text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>

                {/* Vuelto a entregar */}
                <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                  vuelto >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500 border-red-500'
                }`}>
                  <span className={`text-[10px] font-bold uppercase ${vuelto >= 0 ? 'text-emerald-500' : 'text-white'}`}>
                    {vuelto >= 0 ? 'Vuelto a entregar' : 'Falta recibir'}
                  </span>
                  <span className={`font-heading font-black text-base ${vuelto >= 0 ? 'text-emerald-500' : 'text-white'}`}>
                    {formatPrecio(Math.abs(vuelto))}
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Resumen Factura y Checkout */}
        <div className="border-t border-border-custom pt-4 space-y-4 bg-bg-secondary mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase">Monto Total</span>
            <span className="text-2xl font-heading font-black text-text-primary">
              {formatPrecio(totalVenta)}
            </span>
          </div>

          <button
            onClick={handleFinalizarVenta}
            disabled={carrito.length === 0 || submitting}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              carrito.length === 0 || submitting
                ? 'bg-border-custom text-text-muted cursor-not-allowed shadow-none'
                : 'bg-primary hover:bg-primary-hover active:bg-primary-active text-white'
            }`}
          >
            {submitting ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <>
                <Check size={16} />
                <span>Cobrar y Registrar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Calculadora Dual por Peso / Dinero */}
      {weightModalProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWeightModalProduct(null)} />

          <div className="relative w-full max-w-md bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all space-y-5">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-text-primary">
                    {weightModalProduct.nombre}
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Precio: <span className="font-bold text-primary">{formatPrecio(weightModalProduct.precio_venta)} / kg</span> &bull; Stock: {weightModalProduct.stock} kg
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWeightModalProduct(null)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs Selector: Por Dinero vs Por Peso */}
            <div className="flex bg-bg-primary p-1 rounded-2xl border border-border-custom">
              <button
                type="button"
                onClick={() => setWeightModalTab('dinero')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  weightModalTab === 'dinero'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>💵 Por Dinero (Gs.)</span>
              </button>
              <button
                type="button"
                onClick={() => setWeightModalTab('peso')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  weightModalTab === 'peso'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>⚖️ Por Kilos (Kg)</span>
              </button>
            </div>

            {/* Pestaña A: Por Dinero (Gs.) */}
            {weightModalTab === 'dinero' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase block mb-1.5">
                    Monto a llevar (en Guaraníes)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-secondary">Gs.</span>
                    <input
                      type="number"
                      step="500"
                      placeholder="2000"
                      value={customMonto}
                      onChange={(e) => setCustomMonto(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border-custom bg-bg-primary text-base font-extrabold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Botones Rápidos de Dinero en Guaraníes */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Montos Frecuentes:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {['1000', '2000', '3000', '5000', '10000', '15000', '20000', '50000'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCustomMonto(m)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          customMonto === m
                            ? 'bg-primary-soft text-primary border-primary'
                            : 'bg-bg-primary text-text-secondary border-border-custom hover:border-primary/40'
                        }`}
                      >
                        Gs. {parseInt(m).toLocaleString('es-PY')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cálculo Resultado de Regla de Tres */}
                <div className="p-3.5 rounded-2xl bg-bg-primary border border-border-custom space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary">Equivalente a Descontar:</span>
                  <p className="font-heading font-black text-xl text-emerald-500">
                    {((parseFloat(customMonto) || 0) / weightModalProduct.precio_venta).toFixed(3)} kg
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Se cobrará exactamente <span className="font-bold text-text-primary">Gs. {parseInt(customMonto || 0).toLocaleString('es-PY')}</span>
                  </p>
                </div>
              </div>
            ) : (
              /* Pestaña B: Por Kilos (Kg) */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase block mb-1.5">
                    Cantidad de Kilos (Kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      placeholder="0.5"
                      value={customPeso}
                      onChange={(e) => setCustomPeso(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-border-custom bg-bg-primary text-base font-extrabold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-secondary">kg</span>
                  </div>
                </div>

                {/* Botones Rápidos de Peso */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Pesos Frecuentes:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '250g (1/4 kg)', val: '0.25' },
                      { label: '500g (1/2 kg)', val: '0.5' },
                      { label: '750g (3/4 kg)', val: '0.75' },
                      { label: '1 kg', val: '1' },
                      { label: '1.5 kg', val: '1.5' },
                      { label: '2 kg', val: '2' },
                    ].map(w => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => setCustomPeso(w.val)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          customPeso === w.val
                            ? 'bg-primary-soft text-primary border-primary'
                            : 'bg-bg-primary text-text-secondary border-border-custom hover:border-primary/40'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cálculo Resultado de Regla de Tres */}
                <div className="p-3.5 rounded-2xl bg-bg-primary border border-border-custom space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary">Monto Total a Cobrar:</span>
                  <p className="font-heading font-black text-xl text-primary">
                    {formatPrecio((parseFloat(customPeso) || 0) * weightModalProduct.precio_venta)}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Por <span className="font-bold text-text-primary">{customPeso || 0} kg</span> a {formatPrecio(weightModalProduct.precio_venta)} / kg
                  </p>
                </div>
              </div>
            )}

            {/* Acciones Modal */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setWeightModalProduct(null)}
                className="flex-1 py-3 rounded-2xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAgregarPeso}
                className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escáner de código de barras */}
      {showScanner && (
        <EscanerCodigoBarras
          titulo="Escanear producto"
          onDetected={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Ticket de la venta recién cobrada */}
      {ticketVenta && (
        <Ticket
          clienteNombre={ticketVenta.clienteNombre}
          clienteRuc={ticketVenta.clienteRuc}
          fecha={ticketVenta.fecha}
          ventaId={ticketVenta.ventaId}
          items={ticketVenta.items}
          total={ticketVenta.total}
          metodoPago={ticketVenta.metodoPago}
          recibido={ticketVenta.recibido}
          vuelto={ticketVenta.vuelto}
          onClose={() => setTicketVenta(null)}
        />
      )}

      {/* Notificación Toast Personalizada */}
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
