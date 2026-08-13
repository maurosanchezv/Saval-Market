import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Search, Plus, Edit2, Trash2, X, Save, Image, Package, Grid, List, Upload, Settings, AlertTriangle, AlertCircle, CheckCircle, Info, Eye, EyeOff, ScanLine } from 'lucide-react';
import { BUSINESS_CONFIG, formatPrecio } from '../config/businessConfig';
import EscanerCodigoBarras from '../components/EscanerCodigoBarras';

export default function Inventario() {
  const location = useLocation();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null); // null = Crear, product = Editar
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState('Almacén');
  const [unidadMedida, setUnidadMedida] = useState('un'); // 'un' | 'kg'
  const [tasaIva, setTasaIva] = useState('10'); // '10' | '5' (Ley 6380/2019: 5% para canasta familiar y frutas/verduras frescas)
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);
  const [esNovedad, setEsNovedad] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState('');

  // Escaneo de código de barras
  const [showScanner, setShowScanner] = useState(false); // escanear desde el header: busca o crea
  const [showScannerCampo, setShowScannerCampo] = useState(false); // escanear para llenar el campo del formulario
  const [ajusteStockProducto, setAjusteStockProducto] = useState(null); // producto encontrado al escanear, para sumar/restar stock
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteModo, setAjusteModo] = useState('sumar'); // 'sumar' | 'restar'
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);

  // Asistente Paso a Paso (Wizard) para Bebidas
  const [wizardStep, setWizardStep] = useState(0); // 0: select mode, 1: standard form, 2: brand, 3: envase, 4: medida, 5: prices/stock
  const [wizardMarca, setWizardMarca] = useState('');
  const [wizardOtroMarca, setWizardOtroMarca] = useState('');
  const [wizardEnvase, setWizardEnvase] = useState('');
  const [wizardMedida, setWizardMedida] = useState('');
  const [wizardOtroMedidaText, setWizardOtroMedidaText] = useState('');
  const [precioAnterior, setPrecioAnterior] = useState('');

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

  // Gestion de Categorias
  const [categoriasLista, setCategoriasLista] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [nuevaCategoriaText, setNuevaCategoriaText] = useState('');

  const cargarCategorias = () => {
    if (!localStorage.getItem('mock_saval_categorias')) {
      localStorage.setItem('mock_saval_categorias', JSON.stringify(BUSINESS_CONFIG.categorias));
    }
    const list = JSON.parse(localStorage.getItem('mock_saval_categorias') || '[]');
    setCategoriasLista(list);
  };

  const fetchProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre');
    
    if (!error && data) {
      setProductos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initData = async () => {
      await fetchProductos();
      cargarCategorias();
      // Si venimos de un escaneo sin coincidencias en Punto de Venta, abrir directo el alta con el código cargado
      if (location.state?.codigoBarrasPrefill) {
        openAddModal(location.state.codigoBarrasPrefill);
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    initData();
  }, []);

  const openAddModal = (codigoBarrasPrefill = '') => {
    setCurrentProduct(null);
    setNombre('');
    setDescripcion('');
    setPrecioVenta('');
    setPrecioCosto('');
    setStock('');
    setCategoria(categoriasLista[0] || 'General');
    setUnidadMedida('un');
    setTasaIva('10');
    setImagenUrl('');
    setActivo(true);
    setEsNovedad(false);
    // Si viene de un escaneo sin coincidencias, saltar directo al formulario tradicional con el código ya cargado
    setWizardStep(codigoBarrasPrefill ? 1 : 0);
    setWizardMarca('');
    setWizardOtroMarca('');
    setWizardEnvase('');
    setWizardMedida('');
    setWizardOtroMedidaText('');
    setPrecioAnterior('');
    setCodigoBarras(codigoBarrasPrefill);
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setCurrentProduct(prod);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion || '');
    setPrecioVenta(prod.precio_venta.toString());
    setPrecioCosto(prod.precio_costo ? prod.precio_costo.toString() : '');
    setStock(prod.stock.toString());
    setCategoria(prod.categoria || 'General');
    setUnidadMedida(prod.unidad_medida || 'un');
    setTasaIva(prod.tasa_iva != null ? String(prod.tasa_iva) : '10');
    setImagenUrl(prod.imagen_url || '');
    setPrecioAnterior(prod.precio_anterior ? prod.precio_anterior.toString() : '');
    setActivo(prod.activo !== false);
    setEsNovedad(prod.es_novedad === true);
    setCodigoBarras(prod.codigo_barras || '');
    setWizardStep(1); // Se salta el asistente en edición
    setIsModalOpen(true);
  };

  // Escaneo desde el header: si el código ya existe abre el ajuste rápido de stock, si no, crea el producto
  const handleScanBuscarOCrear = (codigo) => {
    setShowScanner(false);
    const encontrado = productos.find(p => p.codigo_barras && p.codigo_barras === codigo);
    if (encontrado) {
      setAjusteStockProducto(encontrado);
      setAjusteCantidad('');
      setAjusteModo('sumar');
    } else {
      showToast(`Código ${codigo} no encontrado. Completá los datos para crear el producto.`, 'info');
      openAddModal(codigo);
    }
  };

  const confirmarAjusteStock = async () => {
    const cantidad = parseFloat(ajusteCantidad) || 0;
    if (cantidad <= 0) {
      showToast('Ingresá una cantidad mayor a cero.', 'warning');
      return;
    }
    const delta = ajusteModo === 'sumar' ? cantidad : -cantidad;
    const nuevoStock = ajusteStockProducto.stock + delta;
    if (nuevoStock < 0) {
      showToast('No podés quitar más stock del disponible.', 'warning');
      return;
    }

    setGuardandoAjuste(true);
    const { error } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', ajusteStockProducto.id);
    setGuardandoAjuste(false);

    if (error) {
      showToast('Error al ajustar el stock: ' + error.message, 'error');
      return;
    }
    showToast(`Stock de ${ajusteStockProducto.nombre} actualizado a ${nuevoStock}.`, 'success');
    setAjusteStockProducto(null);
    setAjusteCantidad('');
    fetchProductos();
  };

  const agregarCategoriaNueva = () => {
    const nueva = nuevaCategoriaText.trim();
    if (!nueva) return;

    // Capitalizar la primera letra
    const nuevaFormateada = nueva.charAt(0).toUpperCase() + nueva.slice(1);

    if (categoriasLista.includes(nuevaFormateada)) {
      showToast('Esta categoría ya existe.', 'warning');
      return;
    }

    const nuevaLista = [...categoriasLista, nuevaFormateada];
    localStorage.setItem('mock_saval_categorias', JSON.stringify(nuevaLista));
    setCategoriasLista(nuevaLista);
    setNuevaCategoriaText('');
    showToast('Categoría creada correctamente.', 'success');
  };

  const eliminarCategoria = (catParaEliminar) => {
    if (categoriasLista.length <= 1) {
      showToast('El sistema debe tener al menos una categoría.', 'error');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la categoría "${catParaEliminar}"?`)) {
      return;
    }

    const nuevaLista = categoriasLista.filter(cat => cat !== catParaEliminar);
    localStorage.setItem('mock_saval_categorias', JSON.stringify(nuevaLista));
    setCategoriasLista(nuevaLista);
    showToast('Categoría eliminada.', 'info');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("La imagen es demasiado grande. Por favor, selecciona una foto menor a 2MB para evitar saturar el almacenamiento.", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenUrl(reader.result); // Guarda la imagen convertida en Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    let finalNombre = nombre;
    let finalCategoria = categoria;

    if (wizardStep === 5) {
      finalNombre = `${wizardMarca === 'Otro' ? wizardOtroMarca : wizardMarca} ${wizardMedida} ${wizardEnvase}`;
      finalCategoria = 'Bebidas';
    }

    if (!finalNombre || !finalNombre.trim()) {
      showToast("El nombre del producto es obligatorio.", "warning");
      return;
    }

    const productPayload = {
      nombre: finalNombre.trim(),
      descripcion: descripcion || null,
      precio_venta: parseFloat(precioVenta),
      precio_costo: precioCosto ? parseFloat(precioCosto) : null,
      precio_anterior: precioAnterior ? parseFloat(precioAnterior) : null,
      stock: parseFloat(stock) || 0,
      categoria: finalCategoria || 'General',
      unidad_medida: unidadMedida || 'un',
      tasa_iva: wizardStep === 5 ? 10 : (parseInt(tasaIva, 10) || 10),
      codigo_barras: codigoBarras.trim() || null,
      imagen_url: imagenUrl || null,
      activo,
      es_novedad: esNovedad
    };

    if (currentProduct) {
      // Editar
      const { error } = await supabase
        .from('productos')
        .update(productPayload)
        .eq('id', currentProduct.id);

      if (error) {
        showToast('Error al actualizar el producto: ' + error.message, 'error');
      } else {
        showToast('Producto actualizado con éxito.', 'success');
        setIsModalOpen(false);
        fetchProductos();
      }
    } else {
      // Crear
      const { error } = await supabase
        .from('productos')
        .insert(productPayload);

      if (error) {
        showToast('Error al guardar el producto: ' + error.message, 'error');
      } else {
        showToast('Producto creado con éxito.', 'success');
        setIsModalOpen(false);
        fetchProductos();
      }
    }
  };

  const toggleActivo = async (prod) => {
    const nuevoActivo = prod.activo === false;
    const { error } = await supabase.from('productos').update({ activo: nuevoActivo }).eq('id', prod.id);
    if (error) {
      showToast('Error al cambiar la visibilidad: ' + error.message, 'error');
      return;
    }
    showToast(
      nuevoActivo ? `${prod.nombre} ahora se muestra en el catálogo online.` : `${prod.nombre} ya no se muestra en el catálogo online.`,
      'info'
    );
    fetchProductos();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        showToast('Error al eliminar producto: ' + error.message, 'error');
      } else {
        showToast('Producto eliminado.', 'info');
        fetchProductos();
      }
    }
  };

  // Filtrado
  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          (p.descripcion && p.descripcion.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === 'Todos' || p.categoria === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categorias = ['Todos', ...categoriasLista];

  return (
    <div className="flex-1 p-6 space-y-8 bg-bg-primary overflow-y-auto">
      
      {/* Header Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-text-primary mb-1">
            Inventario de Productos
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Agrega, edita y gestiona el stock de tu catálogo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { cargarCategorias(); setIsCategoryModalOpen(true); }}
            className="px-4 py-2.5 rounded-2xl bg-bg-secondary border border-border-custom hover:bg-bg-primary text-text-primary text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings size={18} />
            <span>Gestionar Categorías</span>
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 rounded-2xl bg-bg-secondary border border-border-custom hover:bg-bg-primary text-text-primary text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Escanear para buscar un producto o cargar uno nuevo"
          >
            <ScanLine size={18} />
            <span>Escanear</span>
          </button>
          <button
            onClick={() => openAddModal()}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Buscador, Filtro y Switch de Vistas */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              type="text"
              placeholder="Buscar producto por nombre o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border-custom bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          
          {/* Switch de Vistas (Tabla vs Grid de Cajitas) */}
          <div className="flex items-center border border-border-custom rounded-2xl bg-bg-secondary p-1 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Vista de Tarjetas (Cajitas)"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Vista de Tabla (Lista)"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-primary-soft text-primary'
                  : 'bg-bg-secondary text-text-secondary border border-border-custom hover:bg-bg-primary hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Tarjetas (Cajitas) o Tabla de Productos */}
      <div>
        {loading ? (
          <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-text-secondary font-medium text-xs">Cargando inventario...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
            <Package className="mx-auto text-text-muted mb-4 animate-bounce" size={44} />
            <p className="text-text-secondary font-medium text-xs">No hay productos que coincidan con la búsqueda</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* VISTA EN CAJITAS (GRID) */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {filteredProducts.map(prod => {
              const profit = prod.precio_costo ? (prod.precio_venta - prod.precio_costo) : 0;
              const marginPercent = prod.precio_costo ? Math.round((profit / prod.precio_costo) * 100) : 0;
              const stockPercentage = Math.min(100, Math.max(0, (prod.stock / 15) * 100));

              return (
                <div
                  key={prod.id}
                  className={`bg-bg-secondary border border-border-custom rounded-2xl sm:rounded-3xl overflow-hidden premium-card flex flex-col justify-between ${prod.activo === false ? 'opacity-60' : ''}`}
                >
                  {/* Foto y Categoría */}
                  <div className="aspect-video w-full bg-bg-primary relative overflow-hidden group border-b border-border-custom">
                    <img
                      src={prod.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'}
                      alt={prod.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {prod.activo === false && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-500 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                        Oculto del catálogo
                      </span>
                    )}
                    <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-bg-secondary/95 backdrop-blur-md text-primary text-[8px] sm:text-[9px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-primary/10 shadow-sm">
                      {prod.categoria}
                    </span>
                  </div>

                  {/* Datos del producto */}
                  <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <h4 className="font-heading font-bold text-text-primary text-xs sm:text-sm line-clamp-2" title={prod.nombre}>
                        {prod.nombre}
                      </h4>
                      {prod.descripcion && (
                        <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed">
                          {prod.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Precios y Rentabilidad */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 bg-bg-primary/50 border border-border-custom rounded-2xl p-2 sm:p-3 text-[10px]">
                      <div>
                        <p className="text-text-secondary font-medium">Costo</p>
                        <p className="font-semibold text-text-primary mt-0.5">
                          {prod.precio_costo ? formatPrecio(prod.precio_costo) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary font-medium">P. Venta</p>
                        <p className="font-extrabold text-primary mt-0.5">
                          {formatPrecio(prod.precio_venta)}
                        </p>
                      </div>
                      {prod.precio_costo && marginPercent > 0 && (
                        <div className="col-span-2 border-t border-border-custom/60 pt-1.5 mt-1 text-[9px] flex items-center justify-between">
                          <span className="text-text-secondary font-medium hidden sm:inline">Ganancia</span>
                          <span className="text-text-secondary font-medium sm:hidden">Gan.</span>
                          <span className="font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/10 px-1 sm:px-1.5 py-0.2 rounded-md">
                            +{marginPercent}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Barra de Stock Visual */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-secondary font-medium">Stock:</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded-lg ${
                          prod.stock <= 0
                            ? 'bg-red-500 text-white border border-red-500'
                            : prod.stock <= 3
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15' 
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                        }`}>
                          {prod.stock <= 0 ? '0 u.' : `${prod.stock} u.`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-bg-primary rounded-full overflow-hidden border border-border-custom/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            prod.stock <= 0 
                              ? 'bg-red-500' 
                              : prod.stock <= 3 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones en Tarjeta */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 p-2.5 sm:p-3 border-t border-border-custom bg-bg-primary/20">
                    <button
                      onClick={() => toggleActivo(prod)}
                      className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-bg-primary border border-border-custom text-text-secondary hover:text-primary transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title={prod.activo === false ? 'Mostrar en el catálogo online' : 'Ocultar del catálogo online'}
                    >
                      {prod.activo === false ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                    <button
                      onClick={() => openEditModal(prod)}
                      className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-bg-primary border border-border-custom text-text-secondary hover:text-primary transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Editar Producto"
                    >
                      <Edit2 size={11} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-red-500 border border-border-custom hover:border-red-500 text-text-secondary hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Eliminar Producto"
                    >
                      <Trash2 size={11} />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VISTA EN TABLA (LISTA TRADICIONAL) */
          <div className="bg-bg-secondary border border-border-custom rounded-3xl overflow-hidden hover:shadow-md transition-all">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-text-secondary font-bold uppercase tracking-wider bg-bg-primary/50">
                    <th className="py-3.5 px-4 w-12">Foto</th>
                    <th className="py-3.5 px-4">Producto</th>
                    <th className="py-3.5 px-4">Categoría</th>
                    <th className="py-3.5 px-4 text-right">Costo</th>
                    <th className="py-3.5 px-4 text-right">Precio Venta</th>
                    <th className="py-3.5 px-4 text-center">Stock</th>
                    <th className="py-3.5 px-4 text-center">Catálogo</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-text-primary">
                  {filteredProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-bg-primary/50 transition-colors">
                      <td className="py-3 px-4">
                        <img
                          src={prod.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'}
                          alt={prod.nombre}
                          className="w-9 h-9 rounded-xl object-cover border border-border-custom"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <p className="font-semibold text-text-primary">{prod.nombre}</p>
                        {prod.descripcion && (
                          <p className="text-[10px] text-text-secondary line-clamp-1 mt-0.5">{prod.descripcion}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-bg-primary border border-border-custom font-semibold text-[10px] inline-flex items-center gap-1">
                          <span>{prod.categoria}</span>
                          {prod.unidad_medida === 'kg' && <span className="text-amber-500 font-bold">⚖️ kg</span>}
                          {prod.unidad_medida === 'docena' && <span className="text-amber-500 font-bold">🍌 doc.</span>}
                          {prod.unidad_medida === 'mazo' && <span className="text-emerald-500 font-bold">🌿 mazo</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-text-secondary">
                        {prod.precio_costo ? formatPrecio(prod.precio_costo) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatPrecio(prod.precio_venta)} {prod.unidad_medida === 'kg' ? '/kg' : prod.unidad_medida === 'docena' ? '/doc.' : prod.unidad_medida === 'mazo' ? '/mazo' : ''}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded-lg ${
                          prod.stock <= 0
                            ? 'bg-red-500 text-white'
                            : prod.stock <= 3
                              ? 'bg-amber-500/10 text-amber-500' 
                              : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {prod.stock} {prod.unidad_medida === 'kg' ? 'kg' : prod.unidad_medida === 'docena' ? 'doc.' : prod.unidad_medida === 'mazo' ? 'mazo' : 'un.'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleActivo(prod)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] cursor-pointer transition-colors ${
                            prod.activo === false
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          }`}
                          title={prod.activo === false ? 'Mostrar en el catálogo online' : 'Ocultar del catálogo online'}
                        >
                          {prod.activo === false ? <EyeOff size={11} /> : <Eye size={11} />}
                          {prod.activo === false ? 'Oculto' : 'Visible'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-primary transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500 text-text-secondary hover:text-white transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Agregar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
              <h3 className="font-heading font-bold text-lg text-text-primary">
                {currentProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Paso 0: Selección de Asistente vs Tradicional */}
            {wizardStep === 0 && (
              <div className="space-y-6 py-4">
                <p className="text-xs text-text-secondary text-center">
                  Selecciona la opción de carga que prefieras para agilizar el proceso
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setCategoria('Bebidas');
                      setWizardStep(2);
                    }}
                    className="p-5 rounded-3xl border border-border-custom bg-bg-secondary hover:border-primary text-center space-y-3 transition-all cursor-pointer hover:bg-bg-primary/20 flex flex-col items-center justify-center min-h-[160px] group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">🥤</span>
                    <div>
                      <h4 className="font-heading font-extrabold text-sm text-text-primary">
                        Asistente de Bebidas
                      </h4>
                      <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                        Carga rápida paso a paso (marca, envase, medida). Sin escribir.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setWizardStep(1)}
                    className="p-5 rounded-3xl border border-border-custom bg-bg-secondary hover:border-primary text-center space-y-3 transition-all cursor-pointer hover:bg-bg-primary/20 flex flex-col items-center justify-center min-h-[160px] group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">📦</span>
                    <div>
                      <h4 className="font-heading font-extrabold text-sm text-text-primary">
                        Otro Producto
                      </h4>
                      <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                        Formulario tradicional para almacén, limpieza, panadería, etc.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Paso 2: Selección de Marca */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border-custom pb-2">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                    Paso 1 de 4: Marca
                  </span>
                  <button 
                    onClick={() => setWizardStep(0)}
                    className="text-[10px] font-bold text-text-secondary hover:text-text-primary"
                  >
                    &larr; Volver
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["Coca-Cola", "Fanta", "Sprite", "Pulp", "Pepsi", "Pilsen", "Munich", "Niko", "Kandy"].map(brand => (
                    <button
                      key={brand}
                      onClick={() => {
                        setWizardMarca(brand);
                        setWizardStep(3);
                      }}
                      className="py-3 px-2 rounded-xl border border-border-custom bg-bg-primary hover:border-primary hover:text-primary transition-all text-xs font-bold text-center cursor-pointer"
                    >
                      {brand}
                    </button>
                  ))}
                  <button
                    onClick={() => setWizardMarca('Otro')}
                    className="py-3 px-2 rounded-xl border border-border-custom bg-bg-primary hover:border-primary hover:text-primary transition-all text-xs font-bold text-center cursor-pointer col-span-3"
                  >
                    Otro (Escribir marca...)
                  </button>
                </div>

                {wizardMarca === 'Otro' && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-text-secondary uppercase">Escribe la Marca:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. Paso de los Toros, Budweiser"
                        value={wizardOtroMarca}
                        onChange={(e) => setWizardOtroMarca(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (wizardOtroMarca.trim()) {
                            setWizardStep(3);
                          } else {
                            alert("Por favor, escribe el nombre de la marca.");
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paso 3: Envase */}
            {wizardStep === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border-custom pb-2">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                    Paso 2 de 4: Envase
                  </span>
                  <button 
                    onClick={() => setWizardStep(2)}
                    className="text-[10px] font-bold text-text-secondary hover:text-text-primary"
                  >
                    &larr; Volver
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {["Plástico (PET)", "Vidrio Retornable", "Vidrio No Retornable", "Lata", "Tetra Pak"].map(env => (
                    <button
                      key={env}
                      onClick={() => {
                        setWizardEnvase(env);
                        setWizardStep(4);
                      }}
                      className="py-4 px-3 rounded-xl border border-border-custom bg-bg-primary hover:border-primary hover:text-primary transition-all text-xs font-bold text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <span className="text-base">
                        {env.includes("Plástico") ? "🥤" : env.includes("Retornable") ? "🍾" : env.includes("Lata") ? "🥫" : "📦"}
                      </span>
                      <span>{env}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paso 4: Medida */}
            {wizardStep === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border-custom pb-2">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                    Paso 3 de 4: Medida / Tamaño
                  </span>
                  <button 
                    onClick={() => setWizardStep(3)}
                    className="text-[10px] font-bold text-text-secondary hover:text-text-primary"
                  >
                    &larr; Volver
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["220 ml", "250 ml", "350 ml", "500 ml", "1 L", "1.5 L", "2 L", "2.25 L", "2.5 L", "3 L"].map(med => (
                    <button
                      key={med}
                      onClick={() => {
                        setWizardMedida(med);
                        setWizardStep(5);
                      }}
                      className="py-3 px-2 rounded-xl border border-border-custom bg-bg-primary hover:border-primary hover:text-primary transition-all text-xs font-bold text-center cursor-pointer"
                    >
                      {med}
                    </button>
                  ))}
                  <button
                    onClick={() => setWizardMedida('Otro')}
                    className="py-3 px-2 rounded-xl border border-border-custom bg-bg-primary hover:border-primary hover:text-primary transition-all text-xs font-bold text-center cursor-pointer col-span-3"
                  >
                    Otra medida...
                  </button>
                </div>

                {wizardMedida === 'Otro' && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-text-secondary uppercase">Escribe la medida:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. 330 ml, 1.75 L, 5 L"
                        value={wizardOtroMedidaText}
                        onChange={(e) => setWizardOtroMedidaText(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (wizardOtroMedidaText.trim()) {
                            setWizardMedida(wizardOtroMedidaText.trim());
                            setWizardStep(5);
                          } else {
                            alert("Por favor, escribe la medida.");
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paso 5: Detalles finales de inventario para bebidas */}
            {wizardStep === 5 && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border-custom pb-2 mb-2">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                    Paso 4 de 4: Carga de Inventario
                  </span>
                  <button 
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="text-[10px] font-bold text-text-secondary hover:text-text-primary"
                  >
                    &larr; Volver
                  </button>
                </div>

                {/* Vista Previa del Producto Generado */}
                <div className="p-4 bg-primary-soft/30 border border-primary/20 rounded-2xl space-y-1">
                  <span className="text-[9px] uppercase font-black text-primary tracking-wider block">
                    Nombre del producto que se creará
                  </span>
                  <p className="font-heading font-extrabold text-text-primary text-base">
                    {`${wizardMarca === 'Otro' ? wizardOtroMarca : wizardMarca} ${wizardMedida} ${wizardEnvase}`}
                  </p>
                  <p className="text-[9px] text-text-secondary">
                    Categoría: <span className="font-bold">Bebidas</span> (Asignada automáticamente)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Stock */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Stock Inicial</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="invisible" />
                </div>

                {/* Código de Barras */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Código de Barras (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej. 7791234567890"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScannerCampo(true)}
                      className="px-3 rounded-xl border border-border-custom bg-bg-primary text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer shrink-0"
                      title="Escanear código de barras"
                    >
                      <ScanLine size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Costo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase block truncate">Costo</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={precioCosto}
                      onChange={(e) => setPrecioCosto(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Precio Venta */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase block truncate">Venta</label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Precio Anterior / Oferta */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase block truncate" title="Precio Anterior (Tachado)">Antes (Gs.)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Tachado"
                      value={precioAnterior}
                      onChange={(e) => setPrecioAnterior(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Carga de Imagen (Subir foto o pegar URL) */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-text-secondary uppercase block">Foto del Producto</label>

                  {/* Vista Previa de la Imagen */}
                  {imagenUrl && (
                    <div className="flex items-center gap-3 p-3 bg-bg-primary border border-border-custom rounded-2xl">
                      <img
                        src={imagenUrl}
                        alt="Vista previa"
                        className="w-14 h-14 rounded-xl object-cover border border-border-custom shadow-sm shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-text-primary">Vista previa de la foto seleccionada</p>
                        <button
                          type="button"
                          onClick={() => setImagenUrl('')}
                          className="text-[9px] font-extrabold text-white bg-red-500 hover:bg-red-600 transition-colors mt-0.5 px-1.5 py-0.5 rounded"
                        >
                          Quitar Imagen
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Botón Subir Foto / Tomar Foto */}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="product-image-file-w"
                      />
                      <label
                        htmlFor="product-image-file-w"
                        className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-dashed border-border-custom bg-bg-primary text-xs font-bold text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer h-10"
                      >
                        <Upload size={14} />
                        <span>Subir o Tomar Foto</span>
                      </label>
                    </div>

                    {/* Campo de URL de Internet */}
                    <div className="relative">
                      <Image size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        type="url"
                        placeholder="O pegar URL de imagen..."
                        value={imagenUrl.startsWith('data:') ? '' : imagenUrl}
                        onChange={(e) => setImagenUrl(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Disponibilidad en Catálogo Online */}
                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-border-custom bg-bg-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    Disponible en el catálogo online
                    <span className="block text-[10px] text-text-secondary font-normal mt-0.5">
                      Desmarcá esto para productos de oferta variable (ej. frutas y verduras) que solo vendés en el local.
                    </span>
                  </span>
                </label>

                {/* Marcar como Novedad */}
                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-border-custom bg-bg-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esNovedad}
                    onChange={(e) => setEsNovedad(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    Marcar como Novedad ⭐
                    <span className="block text-[10px] text-text-secondary font-normal mt-0.5">
                      Aparece destacado en la sección "Novedades" del catálogo online.
                    </span>
                  </span>
                </label>

                {/* Footer Modal */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-custom mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Guardar Producto</span>
                  </button>
                </div>
              </form>
            )}

            {/* Paso 1: Formulario Tradicional (Para otros productos o edición) */}
            {wizardStep === 1 && (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Harina de Trigo Tipo 0000 1kg"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Descripción</label>
                  <textarea
                    placeholder="Detalles sobre empaque, marca, tamaño, etc."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows="2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Código de Barras */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Código de Barras (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej. 7791234567890"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScannerCampo(true)}
                      className="px-3 rounded-xl border border-border-custom bg-bg-primary text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer shrink-0"
                      title="Escanear código de barras"
                    >
                      <ScanLine size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Categoría */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Categoría</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                    >
                      {categoriasLista.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo de Venta / Unidad */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Tipo Venta</label>
                    <select
                      value={unidadMedida}
                      onChange={(e) => setUnidadMedida(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                    >
                      <option value="un">📦 Por Unidad (un)</option>
                      <option value="kg">⚖️ Por Kilo (kg)</option>
                      <option value="docena">🍌 Por Docena (doc)</option>
                      <option value="mazo">🌿 Por Mazo (mazo)</option>
                    </select>
                  </div>

                  {/* Stock */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">
                      Stock ({unidadMedida === 'kg' ? 'en Kg' : unidadMedida === 'docena' ? 'en Docenas' : unidadMedida === 'mazo' ? 'en Mazos' : 'en Unidades'})
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0"
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Costo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase block truncate">Costo</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={precioCosto}
                      onChange={(e) => setPrecioCosto(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Precio Venta */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase block truncate">Venta</label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Precio Anterior / Oferta */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase block truncate" title="Precio Anterior (Tachado)">Antes (Gs.)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Tachado"
                      value={precioAnterior}
                      onChange={(e) => setPrecioAnterior(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Tasa de IVA (para el ticket fiscal) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Tasa de IVA</label>
                  <select
                    value={tasaIva}
                    onChange={(e) => setTasaIva(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  >
                    <option value="10">10% (Tasa general)</option>
                    <option value="5">5% (Canasta familiar: arroz, fideos, aceite, leche, huevos, harina, sal / Frutas y verduras frescas)</option>
                  </select>
                </div>

                {/* Carga de Imagen (Subir foto o pegar URL) */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-text-secondary uppercase block">Foto del Producto</label>

                  {/* Vista Previa de la Imagen */}
                  {imagenUrl && (
                    <div className="flex items-center gap-3 p-3 bg-bg-primary border border-border-custom rounded-2xl">
                      <img 
                        src={imagenUrl} 
                        alt="Vista previa" 
                        className="w-14 h-14 rounded-xl object-cover border border-border-custom shadow-sm shrink-0" 
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-text-primary">Vista previa de la foto seleccionada</p>
                        <button
                          type="button"
                          onClick={() => setImagenUrl('')}
                          className="text-[9px] font-extrabold text-white bg-red-500 hover:bg-red-600 transition-colors mt-0.5 px-1.5 py-0.5 rounded"
                        >
                          Quitar Imagen
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Botón Subir Foto / Tomar Foto */}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="product-image-file"
                      />
                      <label
                        htmlFor="product-image-file"
                        className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-dashed border-border-custom bg-bg-primary text-xs font-bold text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer h-10"
                      >
                        <Upload size={14} />
                        <span>Subir o Tomar Foto</span>
                      </label>
                    </div>

                    {/* Campo de URL de Internet */}
                    <div className="relative">
                      <Image size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        type="url"
                        placeholder="O pegar URL de imagen..."
                        value={imagenUrl.startsWith('data:') ? '' : imagenUrl}
                        onChange={(e) => setImagenUrl(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Disponibilidad en Catálogo Online */}
                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-border-custom bg-bg-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    Disponible en el catálogo online
                    <span className="block text-[10px] text-text-secondary font-normal mt-0.5">
                      Desmarcá esto para productos de oferta variable (ej. frutas y verduras) que solo vendés en el local.
                    </span>
                  </span>
                </label>

                {/* Marcar como Novedad */}
                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-border-custom bg-bg-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esNovedad}
                    onChange={(e) => setEsNovedad(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    Marcar como Novedad ⭐
                    <span className="block text-[10px] text-text-secondary font-normal mt-0.5">
                      Aparece destacado en la sección "Novedades" del catálogo online.
                    </span>
                  </span>
                </label>

                {/* Footer Modal */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-custom mt-6">
                  {currentProduct === null && (
                    <button
                      type="button"
                      onClick={() => setWizardStep(0)}
                      className="px-4 py-2 rounded-xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer mr-auto"
                    >
                      &larr; Volver al Asistente
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Guardar Producto</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Gestionar Categorías */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
              <h3 className="font-heading font-bold text-lg text-text-primary">
                Gestionar Categorías
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Agregar Nueva Categoría */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. Congelados, Fiambrería..."
                  value={nuevaCategoriaText}
                  onChange={(e) => setNuevaCategoriaText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  onClick={agregarCategoriaNueva}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Agregar
                </button>
              </div>

              {/* Listado de Categorías con botón eliminar */}
              <div className="max-h-60 overflow-y-auto border border-border-custom rounded-2xl divide-y divide-border-custom bg-bg-primary/30">
                {categoriasLista.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-3 text-xs font-semibold text-text-primary">
                    <span>{cat}</span>
                    <button
                      onClick={() => eliminarCategoria(cat)}
                      className="p-1.5 rounded-lg hover:bg-red-500 text-text-secondary hover:text-white transition-colors cursor-pointer"
                      title="Eliminar Categoría"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escáner: desde el header (busca o crea) */}
      {showScanner && (
        <EscanerCodigoBarras
          titulo="Escanear producto"
          onDetected={handleScanBuscarOCrear}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Escáner: para llenar el campo de código de barras del formulario */}
      {showScannerCampo && (
        <EscanerCodigoBarras
          titulo="Escanear código de barras"
          onDetected={(codigo) => { setCodigoBarras(codigo); setShowScannerCampo(false); }}
          onClose={() => setShowScannerCampo(false)}
        />
      )}

      {/* Modal Ajuste Rápido de Stock (producto encontrado al escanear) */}
      {ajusteStockProducto && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !guardandoAjuste && setAjusteStockProducto(null)} />

          <div className="relative w-full max-w-sm bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-custom">
              <h3 className="font-heading font-bold text-lg text-text-primary">Ajustar Stock</h3>
              <button
                onClick={() => setAjusteStockProducto(null)}
                disabled={guardandoAjuste}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-bg-primary border border-border-custom">
              <p className="font-bold text-text-primary text-sm">{ajusteStockProducto.nombre}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Stock actual: <span className="font-bold text-text-primary">{ajusteStockProducto.stock} {ajusteStockProducto.unidad_medida === 'kg' ? 'kg' : 'un.'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAjusteModo('sumar')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  ajusteModo === 'sumar' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-bg-primary text-text-secondary border-border-custom'
                }`}
              >
                + Agregar Stock
              </button>
              <button
                type="button"
                onClick={() => setAjusteModo('restar')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  ajusteModo === 'restar' ? 'bg-red-500 text-white border-red-500' : 'bg-bg-primary text-text-secondary border-border-custom'
                }`}
              >
                − Quitar Stock
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary uppercase">Cantidad</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={ajusteCantidad}
                onChange={(e) => setAjusteCantidad(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-border-custom bg-bg-primary text-base font-extrabold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <button
              onClick={confirmarAjusteStock}
              disabled={guardandoAjuste}
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {guardandoAjuste ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Save size={16} />
                  <span>Confirmar</span>
                </>
              )}
            </button>
          </div>
        </div>
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
