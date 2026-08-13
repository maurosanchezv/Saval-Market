import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getBusinessConfig, formatPrecio } from "../config/businessConfig";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Clock,
  User,
  X,
  CheckCircle,
  ArrowRight,
  MessageCircle,
  MapPin,
  CreditCard,
  HelpCircle,
  Bell,
  Flame,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "../components/Header";

// Degradado oscuro fijo aplicado sobre la imagen de cada banner para que el texto sea legible
const BANNER_GRADIENT = "from-black/85 via-black/55 to-black/20";

// Mapeo predeterminado de estilos de cajitas por categoría
const CATEGORY_STYLE_MAP = {
  "Todos": { icon: "🛒", badge: "Catálogo Completo", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400", gradient: "from-slate-900/90 to-gray-950/80" },
  "Novedades 🔥": { icon: "🔥", badge: "Ofertas & Destacados", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400", gradient: "from-amber-900/90 to-red-950/80" },
  "Verdulería": { icon: "🥦", badge: "Kilos & Docenas", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=400", gradient: "from-emerald-900/90 to-teal-950/80" },
  "Bebidas": { icon: "🥤", badge: "Refrescos Helados", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400", gradient: "from-red-900/90 to-rose-950/80" },
  "Panadería": { icon: "🥐", badge: "Fresco del Día", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400", gradient: "from-amber-900/90 to-yellow-950/80" },
  "Lácteos": { icon: "🥛", badge: "Trébol & Lactolanda", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400", gradient: "from-blue-900/90 to-sky-950/80" },
  "Almacén": { icon: "🥫", badge: "Fideos & Galletitas", image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=400", gradient: "from-orange-900/90 to-amber-950/80" },
  "Limpieza": { icon: "🧹", badge: "Detergentes & Más", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=400", gradient: "from-cyan-900/90 to-teal-950/80" },
  "Carnicería": { icon: "🥩", badge: "Cortes de Carne", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=400", gradient: "from-red-950/90 to-amber-950/80" },
};

const isStoreOpen = () => {
  const now = new Date();
  const hora = now.getHours();
  return hora >= 7 && hora < 21;
};

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [carrito, setCarrito] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null); // Producto seleccionado para Vista Rápida
  const [businessConfig, setBusinessConfig] = useState(getBusinessConfig());

  useEffect(() => {
    const handleConfigUpdate = () => {
      setBusinessConfig(getBusinessConfig());
    };
    window.addEventListener('business_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('business_config_updated', handleConfigUpdate);
  }, []);

  // Banner Slider State
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Cargar banners activos desde el panel administrativo
  useEffect(() => {
    const fetchBanners = async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("activo", true)
        .order("orden");

      if (!error && data) {
        setBanners(data);
        setCurrentBannerIndex(0);
      }
    };
    fetchBanners();
  }, []);

  // Auto-play banners cada 4.5 segundos
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Modal para Venta por Peso / Dinero (Calculadora Dual en Web)
  const [weightModalProduct, setWeightModalProduct] = useState(null);
  const [weightModalTab, setWeightModalTab] = useState("dinero"); // 'dinero' | 'peso'
  const [customMonto, setCustomMonto] = useState("2000");
  const [customPeso, setCustomPeso] = useState("0.5");

  // Toast Notification State
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'warning' | 'error' | 'info' }

  const showToast = (message, type = "info") => {
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

  // Checkout Form
  const [clienteNombre, setClienteNombre] = useState("");
  const [tipoRetiro, setTipoRetiro] = useState("asap"); // 'asap' | 'programado'
  const [metodoPagoCart, setMetodoPagoCart] = useState("Efectivo (al retirar)"); // 'Efectivo (al retirar)' | 'Transferencia / QR'
  const [retiroFecha, setRetiroFecha] = useState("");
  const [retiroHora, setRetiroHora] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // Cargar productos
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("nombre");

      if (!error && data) {
        setProductos(data.filter((p) => p.activo !== false));
      }
      setLoading(false);
    };
    fetchProductos();
  }, []);

  // Agregar al carrito
  const agregarAlCarrito = (producto) => {
    if (producto.unidad_medida === "kg") {
      const itemExistente = carrito.find((i) => i.id === producto.id);
      setWeightModalProduct(producto);
      setWeightModalTab("dinero");
      setCustomMonto(
        itemExistente?.montoFijo ? itemExistente.montoFijo.toString() : "2000",
      );
      setCustomPeso(
        itemExistente ? itemExistente.cantidad.toString() : "0.5",
      );
      return;
    }

    const itemEnCarrito = carrito.find((item) => item.id === producto.id);
    if (itemEnCarrito) {
      if (itemEnCarrito.cantidad >= producto.stock) {
        showToast(
          `Stock máximo alcanzado para ${producto.nombre} (${producto.stock} disponibles)`,
          "warning",
        );
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_venta }
            : item,
        ),
      );
      showToast(`¡Se agregó ${producto.nombre} al carrito!`, "success");
    } else {
      if (producto.stock <= 0) {
        showToast("Este producto no tiene stock disponible.", "error");
        return;
      }
      setCarrito([...carrito, { ...producto, cantidad: 1, subtotal: producto.precio_venta }]);
      showToast(`¡Se agregó ${producto.nombre} al carrito!`, "success");
    }
  };

  const confirmarAgregarPeso = () => {
    if (!weightModalProduct) return;

    let kilos = 0;
    let subtotal = 0;

    if (weightModalTab === "dinero") {
      const monto = parseFloat(customMonto) || 0;
      if (monto <= 0) {
        showToast("Ingresa un monto válido en Guaraníes.", "warning");
        return;
      }
      subtotal = monto;
      kilos = parseFloat(
        (monto / weightModalProduct.precio_venta).toFixed(3),
      );
    } else {
      const peso = parseFloat(customPeso) || 0;
      if (peso <= 0) {
        showToast("Ingresa un peso válido en Kg.", "warning");
        return;
      }
      kilos = peso;
      subtotal = Math.round(peso * weightModalProduct.precio_venta);
    }

    if (kilos > weightModalProduct.stock) {
      showToast(
        `Stock insuficiente. Disponible: ${weightModalProduct.stock} kg`,
        "warning",
      );
      return;
    }

    const itemExistente = carrito.find(
      (item) => item.id === weightModalProduct.id,
    );
    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.id === weightModalProduct.id
            ? {
                ...item,
                cantidad: kilos,
                subtotal,
                montoFijo: weightModalTab === "dinero" ? subtotal : null,
              }
            : item,
        ),
      );
    } else {
      setCarrito([
        ...carrito,
        {
          ...weightModalProduct,
          cantidad: kilos,
          subtotal,
          montoFijo: weightModalTab === "dinero" ? subtotal : null,
        },
      ]);
    }

    showToast(
      `¡Agregado: ${weightModalProduct.nombre} (${kilos} kg = ${formatPrecio(subtotal)})!`,
      "success",
    );
    setWeightModalProduct(null);
  };

  // Modificar cantidad en carrito
  const cambiarCantidad = (id, delta) => {
    const item = carrito.find((item) => item.id === id);
    if (!item) return;

    if (item.unidad_medida === "kg") {
      const original = productos.find((p) => p.id === id);
      setWeightModalProduct(original || item);
      setWeightModalTab("peso");
      setCustomPeso(item.cantidad.toString());
      setCustomMonto(
        (item.subtotal || Math.round(item.cantidad * item.precio_venta)).toString(),
      );
      return;
    }

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter((item) => item.id !== id));
      showToast(`Se eliminó el producto del carrito.`, "info");
    } else {
      const original = productos.find((p) => p.id === id);
      if (nuevaCantidad > original.stock) {
        showToast(
          `Solo hay ${original.stock} unidades de este producto.`,
          "warning",
        );
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.id === id
            ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio_venta }
            : item,
        ),
      );
    }
  };

  // Eliminar del carrito
  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  // Obtener los IDs de los 8 productos más nuevos (por fecha de creación,
  // no por "id" — con Supabase real el id es un uuid, no un número comparable)
  const newestProductIds = [...productos]
    .sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0))
    .slice(0, 8)
    .map((p) => p.id);

  // Filtrar productos
  const filteredProducts = productos.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion &&
        p.descripcion.toLowerCase().includes(search.toLowerCase()));

    let matchesCategory = false;
    if (selectedCategory === "Todos") {
      matchesCategory = true;
    } else if (selectedCategory === "Novedades 🔥") {
      // Es novedad si se marcó manualmente, tiene precio de oferta, o es uno de los 8 más nuevos
      const tieneDescuento =
        p.precio_anterior && p.precio_anterior > p.precio_venta;
      const esNuevo = p.es_novedad === true || newestProductIds.includes(p.id);
      matchesCategory = tieneDescuento || esNuevo;
    } else {
      matchesCategory = p.categoria === selectedCategory;
    }

    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas e insertar la categoría virtual de Novedades
  const categorias = [
    "Todos",
    "Novedades 🔥",
    ...new Set(productos.map((p) => p.categoria).filter(Boolean)),
  ];

  // Filtrar productos para el carrusel horizontal de destacados (ofertas o nuevos)
  const destacados = productos
    .filter(
      (p) =>
        p.es_novedad === true ||
        (p.precio_anterior && p.precio_anterior > p.precio_venta) ||
        newestProductIds.slice(0, 4).includes(p.id),
    )
    .slice(0, 8);

  // Calcular total
  const totalCarrito = carrito.reduce(
    (acc, item) => acc + (item.subtotal || item.precio_venta * item.cantidad),
    0,
  );

  // Enviar pedido por WhatsApp
  const enviarPedidoWhatsApp = () => {
    if (!clienteNombre.trim()) {
      setCheckoutError("Por favor ingresa tu nombre.");
      return;
    }
    if (tipoRetiro === "programado" && (!retiroFecha || !retiroHora)) {
      setCheckoutError("Por favor selecciona la fecha y hora de retiro.");
      return;
    }
    setCheckoutError("");

    // Formatear items
    const itemsFormatted = carrito
      .map((item) => {
        const itemSubtotal = item.subtotal || item.precio_venta * item.cantidad;
        if (item.unidad_medida === "kg") {
          return `- ${item.nombre}: ${item.cantidad} kg (Subtotal: ${formatPrecio(itemSubtotal)})`;
        }
        return `- ${item.cantidad}x ${item.nombre} (Subtotal: ${formatPrecio(itemSubtotal)})`;
      })
      .join("\n");

    // Determinar hora
    const tiempoRetiroStr =
      tipoRetiro === "asap"
        ? "Hoy mismo lo antes posible (en 15-30 min)"
        : `${new Date(retiroFecha + "T00:00:00").toLocaleDateString("es-PY")} a las ${retiroHora} hs`;

    // Determinar datos bancarios según medio de pago seleccionado
    const datosBancariosStr = (metodoPagoCart === "Transferencia / QR")
      ? `\n*DATOS PARA TRANSFERENCIA / ALIAS:*\nBanco: ${businessConfig.datosBancarios?.banco || 'Itaú'}\nTitular: ${businessConfig.datosBancarios?.titular || businessConfig.nombre}\nCuenta N°: ${businessConfig.datosBancarios?.nroCuenta || ''}\n*Alias:* ${businessConfig.datosBancarios?.alias || ''}\n⚠️ *Aviso:* Por favor realizá la transferencia antes de pasar a retirar tu pedido. ¡Muchas gracias!\n`
      : "";

    // Generar mensaje
    const message = (businessConfig.whatsappMessageTemplate || "*NUEVO PEDIDO - {storeName}*\n\n¡Hola! Me gustaría realizar el siguiente pedido desde su página web:\n\n{items}\n\n*Total a pagar:* {total}\n*Cliente:* {name}\n*Modalidad:* {pickupTime}\n*Medio de Pago:* {metodoPago}\n{datosBancarios}\n¿Me confirman si ya está listo para pasar a retirar y abonar? ¡Muchas gracias!")
      .replace("{storeName}", businessConfig.nombre || "Despensa")
      .replace("{items}", itemsFormatted)
      .replace("{total}", formatPrecio(totalCarrito))
      .replace("{name}", clienteNombre.trim())
      .replace("{pickupTime}", tiempoRetiroStr)
      .replace("{metodoPago}", metodoPagoCart)
      .replace("{datosBancarios}", datosBancariosStr);

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${businessConfig.whatsappNumber}?text=${encodedText}`;

    // Registrar el pedido como venta pendiente y descontar stock de forma automática/temporal
    const itemsParaRegistro = carrito.map((item) => ({
      producto_id: item.id,
      cantidad: item.cantidad,
    }));

    supabase
      .rpc("registrar_venta", {
        p_cliente_id: null,
        p_items: itemsParaRegistro,
        p_metodo_pago: "WhatsApp",
        p_cliente_nombre: clienteNombre.trim(),
        p_hora_retiro: tiempoRetiroStr,
        p_estado: "pendiente",
      })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error al registrar pedido pendiente:", error.message);
        }
      });

    // Abrir WhatsApp en pestaña nueva
    window.open(whatsappUrl, "_blank");

    // Limpiar carrito y cerrar drawer
    setCarrito([]);
    setIsCartOpen(false);
    setClienteNombre("");
    setRetiroFecha("");
    setRetiroHora("");
    setTipoRetiro("asap");
    showToast(
      "¡Pedido enviado! Te redireccionamos a WhatsApp para finalizar.",
      "success",
    );
  };

  return (
    <div className="min-h-[100dvh] bg-bg-primary transition-colors duration-200">
      <Header
        cartCount={carrito.reduce((a, b) => a + b.cantidad, 0)}
        onCartClick={() => setIsCartOpen(true)}
      />

      {/* Hero Carousel Banner Promocional Rotativo (administrable desde /admin/banners) */}
      {banners.length > 0 && (
        <section className="relative overflow-hidden bg-bg-secondary border-b border-border-custom">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[260px] sm:h-[340px] md:h-[380px]">
              {/* Slide de Banners */}
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentBannerIndex
                      ? "opacity-100 z-10 pointer-events-auto"
                      : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  {/* Imagen de Fondo */}
                  <img
                    src={banner.imagen_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200"}
                    alt={banner.titulo}
                    className="w-full h-full object-cover scale-105"
                  />

                  {/* Capa de Degradado Oscuro */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${BANNER_GRADIENT}`}
                  />

                  {/* Contenido del Banner */}
                  <div className="absolute inset-0 p-6 sm:p-10 md:p-12 flex flex-col justify-center max-w-2xl text-white">
                    {banner.badge && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold text-white mb-3 w-fit border border-white/20">
                        <Sparkles size={12} className="text-amber-300 animate-pulse" />
                        {banner.badge}
                      </span>
                    )}
                    <h2 className="font-heading font-extrabold text-2xl sm:text-4xl md:text-5xl text-white leading-tight mb-2 tracking-tight drop-shadow-md">
                      {banner.titulo}
                    </h2>
                    {banner.subtitulo && (
                      <p className="text-white/90 text-xs sm:text-base mb-5 line-clamp-2 leading-relaxed drop-shadow-sm">
                        {banner.subtitulo}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedCategory(banner.categoria_destino || "Todos");
                          const el = document.getElementById("catalogo-principal");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-white text-gray-950 font-bold text-xs sm:text-sm shadow-xl hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer group"
                      >
                        <span>{banner.boton_texto || "Ver más"}</span>
                        <ArrowRight
                          size={16}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </button>

                      <div className="hidden sm:flex items-center gap-2 ml-2">
                        {isStoreOpen() ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold backdrop-blur-sm">
                            🟢 Abierto hoy (07:00 a 21:00 hs)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-red-500/30 text-red-200 border border-red-400/30 text-[11px] font-bold backdrop-blur-sm">
                            🔴 Horario: 07:00 a 21:00 hs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Botones Flechas Izquierda / Derecha */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentBannerIndex(
                        (prev) => (prev - 1 + banners.length) % banners.length,
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all cursor-pointer hover:scale-110"
                    title="Anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentBannerIndex((prev) => (prev + 1) % banners.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all cursor-pointer hover:scale-110"
                    title="Siguiente"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Puntitos Indicadores (Pagination Dots) */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {banners.map((banner, idx) => (
                      <button
                        key={banner.id}
                        onClick={() => setCurrentBannerIndex(idx)}
                        className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === currentBannerIndex
                            ? "w-8 bg-white"
                            : "w-2.5 bg-white/40 hover:bg-white/70"
                        }`}
                        title={`Ver banner ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Cuerpo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Barra de Búsqueda Destacada y Categorías */}
        <div id="catalogo-principal" className="space-y-4 mb-8">
          {/* Barra de Búsqueda Estilo Supermercado */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center border-2 border-border-custom focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl bg-bg-secondary shadow-md transition-all duration-200 overflow-hidden">
              <Search
                className="ml-4 text-text-secondary shrink-0"
                size={22}
              />
              <input
                type="text"
                placeholder="¿Qué estás buscando? (ej: Tomate, Gaseosa, Yerba, Pan)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-3.5 bg-transparent text-sm sm:text-base font-medium text-text-primary focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mr-3 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Contador de resultados cuando se busca */}
            {search.trim() !== "" && (
              <div className="mt-2 text-xs font-bold text-text-secondary flex items-center justify-between px-2">
                <span>
                  Resultados para: <span className="text-primary">"{search}"</span>
                </span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
                  {filteredProducts.length} productos encontrados
                </span>
              </div>
            )}
          </div>

          {/* Cajitas de Secciones (Estilo San Cayetano Supermercados) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-text-primary flex items-center gap-2">
                <span>🛍️</span>
                <span>Explorá por Secciones</span>
              </h3>
              {selectedCategory !== "Todos" && (
                <button
                  onClick={() => setSelectedCategory("Todos")}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Ver todas las secciones
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {categorias.map((catName) => {
                const style = CATEGORY_STYLE_MAP[catName] || {
                  icon: "📦",
                  badge: "Sección Disponible",
                  image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
                  gradient: "from-slate-900/90 to-gray-950/80",
                };
                const isSelected = selectedCategory === catName;
                const count =
                  catName === "Todos"
                    ? productos.length
                    : productos.filter((p) => p.categoria === catName).length;

                return (
                  <button
                    key={catName}
                    onClick={() => {
                      setSelectedCategory(catName);
                      const el = document.getElementById("listado-productos");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`relative rounded-2xl overflow-hidden p-3 flex flex-col justify-between h-28 sm:h-32 text-left transition-all duration-300 cursor-pointer group shadow-md ${
                      isSelected
                        ? "ring-4 ring-primary scale-105 shadow-xl"
                        : "hover:scale-[1.03] hover:shadow-lg"
                    }`}
                  >
                    {/* Imagen de fondo de la cajita */}
                    <img
                      src={style.image}
                      alt={catName}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Degradado para legibilidad */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${style.gradient}`}
                    />

                    {/* Contenido de la cajita */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-xl filter drop-shadow">{style.icon}</span>
                      <span className="bg-black/40 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/20">
                        {count} {count === 1 ? "item" : "items"}
                      </span>
                    </div>

                    <div className="relative z-10">
                      <h4 className="font-heading font-extrabold text-xs sm:text-sm text-white leading-tight drop-shadow">
                        {catName === "Todos" ? "Todos los Productos" : catName}
                      </h4>
                      <p className="text-[9px] text-white/80 line-clamp-1 mt-0.5 font-medium">
                        {style.badge}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Carrusel de Productos Destacados y Ofertas (Opción 1) */}
        {!loading &&
          selectedCategory === "Todos" &&
          !search &&
          destacados.length > 0 && (
            <div className="mb-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame
                    className="text-red-500 fill-red-500 animate-pulse"
                    size={20}
                  />
                  <h2 className="font-heading font-extrabold text-lg sm:text-xl text-text-primary">
                    Ofertas y Novedades Destacadas 🔥
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCategory("Novedades 🔥")}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Ver todo
                </button>
              </div>

              {/* Contenedor Horizontal del Carrusel */}
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/10 -mx-4 px-4 sm:mx-0 sm:px-0">
                {destacados.map((prod) => (
                  <div
                    key={`destacado-${prod.id}`}
                    className="w-[220px] sm:w-[250px] shrink-0 bg-bg-secondary rounded-2xl sm:rounded-3xl border border-border-custom overflow-hidden flex flex-col justify-between premium-card shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Imagen */}
                    <div
                      className="aspect-square bg-bg-primary relative overflow-hidden group cursor-pointer"
                      onClick={() => setQuickViewProduct(prod)}
                    >
                      <img
                        src={
                          prod.imagen_url ||
                          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300"
                        }
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {prod.stock <= 0 ? (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-md">
                            Sin Stock
                          </span>
                        </div>
                      ) : (
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                          {prod.precio_anterior &&
                            prod.precio_anterior > prod.precio_venta && (
                              <span className="bg-red-500 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase shadow-sm">
                                -
                                {Math.round(
                                  ((prod.precio_anterior - prod.precio_venta) /
                                    prod.precio_anterior) *
                                    100,
                                )}
                                %
                              </span>
                            )}
                          {(prod.es_novedad === true || newestProductIds.slice(0, 4).includes(prod.id)) && (
                            <span className="bg-sky-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shadow-sm">
                              Nuevo
                            </span>
                          )}
                        </div>
                      )}
                      <span className="absolute top-2 right-2 bg-bg-secondary/95 backdrop-blur-md text-primary text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-primary/10 shadow-sm">
                        {prod.categoria}
                      </span>
                    </div>

                    {/* Info del Producto */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-1.5">
                      <div>
                        <h3
                          className="font-heading font-bold text-text-primary text-xs sm:text-sm line-clamp-1 hover:text-primary cursor-pointer transition-colors"
                          onClick={() => setQuickViewProduct(prod)}
                        >
                          {prod.nombre}
                        </h3>
                        <p className="text-[10px] text-text-secondary line-clamp-2">
                          {prod.descripcion || "Sin descripción disponible."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                          {prod.precio_anterior &&
                            prod.precio_anterior > prod.precio_venta && (
                              <span className="text-[9px] text-text-muted line-through leading-none mb-0.5">
                                {formatPrecio(prod.precio_anterior)}
                              </span>
                            )}
                          <span className="font-heading font-extrabold text-xs sm:text-sm text-text-primary">
                            {formatPrecio(prod.precio_venta)}
                          </span>
                        </div>
                        <button
                          onClick={() => agregarAlCarrito(prod)}
                          disabled={prod.stock <= 0}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer ${
                            prod.stock <= 0
                              ? "bg-border-custom text-text-muted cursor-not-allowed"
                              : "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                          }`}
                          title="Agregar al Carrito"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Título del Listado Principal */}
        {!loading && (
          <h2 id="listado-productos" className="font-heading font-extrabold text-lg sm:text-xl text-text-primary mb-4 sm:mb-6 scroll-mt-6">
            {selectedCategory === "Todos"
              ? "Todos los Productos"
              : selectedCategory}
          </h2>
        )}

        {/* Listado de Productos */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-text-secondary font-medium">
              Cargando catálogo de productos...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border-custom rounded-3xl bg-bg-secondary">
            <ShoppingBag className="mx-auto text-text-muted mb-4" size={48} />
            <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
              No se encontraron productos
            </h3>
            <p className="text-text-secondary text-sm">
              Prueba ajustando la búsqueda o seleccionando otra categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-bg-secondary rounded-2xl sm:rounded-3xl border border-border-custom overflow-hidden flex flex-col justify-between premium-card"
              >
                {/* Imagen del Producto (Click abre vista rápida) */}
                <div
                  className="aspect-square bg-bg-primary relative overflow-hidden group cursor-pointer"
                  onClick={() => setQuickViewProduct(prod)}
                >
                  <img
                    src={
                      prod.imagen_url ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300"
                    }
                    alt={prod.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {prod.stock <= 0 ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase shadow-md text-center">
                        Sin Stock
                      </span>
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5 items-start">
                      {prod.precio_anterior &&
                        prod.precio_anterior > prod.precio_venta && (
                          <span className="bg-red-500 text-white text-[8px] sm:text-[9.5px] font-black px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md sm:rounded-lg uppercase shadow-sm">
                            -
                            {Math.round(
                              ((prod.precio_anterior - prod.precio_venta) /
                                prod.precio_anterior) *
                                100,
                            )}
                            %
                          </span>
                        )}
                      {prod.stock <= (prod.unidad_medida === 'kg' ? 5 : 3) && (
                        <span className="bg-amber-500 text-white text-[7.5px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-md sm:rounded-lg uppercase shadow-sm">
                          {prod.unidad_medida === 'kg'
                            ? `Quedan ${prod.stock} kg`
                            : prod.unidad_medida === 'docena'
                              ? `Últimas ${prod.stock} docenas`
                              : prod.unidad_medida === 'mazo'
                                ? `Últimos ${prod.stock} mazos`
                                : `Últimas ${prod.stock} u.`}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-bg-secondary/95 backdrop-blur-md text-primary text-[8px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-primary/10 shadow-sm">
                    {prod.categoria}
                  </span>
                </div>

                {/* Info del Producto */}
                <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-1.5 sm:gap-2">
                  <div>
                    <h3
                      className="font-heading font-bold text-text-primary text-xs sm:text-base line-clamp-2 mb-0.5 sm:mb-1 hover:text-primary cursor-pointer transition-colors"
                      onClick={() => setQuickViewProduct(prod)}
                    >
                      {prod.nombre}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-text-secondary line-clamp-2 mb-2 sm:mb-3">
                      {prod.descripcion || "Sin descripción disponible."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      {prod.precio_anterior &&
                        prod.precio_anterior > prod.precio_venta && (
                          <span className="text-[10px] sm:text-xs text-text-muted line-through leading-none mb-0.5">
                            {formatPrecio(prod.precio_anterior)}
                          </span>
                        )}
                      <span className="font-heading font-extrabold text-sm sm:text-lg text-text-primary">
                        {formatPrecio(prod.precio_venta)}
                        {prod.unidad_medida === 'kg' ? ' / kg' : prod.unidad_medida === 'docena' ? ' / docena' : prod.unidad_medida === 'mazo' ? ' / mazo' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => agregarAlCarrito(prod)}
                      disabled={prod.stock <= 0}
                      className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                        prod.stock <= 0
                          ? "bg-border-custom text-text-muted cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                      }`}
                      title="Agregar al Carrito"
                    >
                      <Plus size={16} className="sm:hidden" />
                      <Plus size={18} className="hidden sm:block" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Sección Informativa (FAQ & Datos del Local) */}
      <section className="border-t border-border-custom bg-bg-secondary/40 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* FAQ */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-text-primary mb-2">
                Preguntas Frecuentes
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary">
                Todo lo que necesitás saber sobre tus retiros en Saval Market
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl border border-border-custom bg-bg-secondary premium-card space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/5">
                  <HelpCircle size={20} />
                </div>
                <h4 className="font-heading font-bold text-text-primary text-base">
                  ¿Tiene algún costo retirar?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  ¡Ninguno! Hacer tu pedido y retirarlo del local es 100%
                  gratuito. Solo pagás el valor de los productos que llevás al
                  momento de retirar.
                </p>
              </div>

              <div className="p-6 rounded-3xl border border-border-custom bg-bg-secondary premium-card space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/5">
                  <CreditCard size={20} />
                </div>
                <h4 className="font-heading font-bold text-text-primary text-base">
                  ¿Cómo realizo el pago?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Pagás al momento de retirar en local. Aceptamos efectivo
                  (Guaraníes), tarjetas de crédito/débito y pagos con código QR
                  o transferencias.
                </p>
              </div>

              <div className="p-6 rounded-3xl border border-border-custom bg-bg-secondary premium-card space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/5">
                  <Clock size={20} />
                </div>
                <h4 className="font-heading font-bold text-text-primary text-base">
                  ¿Cuánto tiempo guardan mi pedido?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Guardamos tu pedido armado durante todo el día seleccionado.
                  Si vas a retrasarte o querés cancelar, podés avisarnos
                  directamente por WhatsApp.
                </p>
              </div>
            </div>
          </div>

          {/* Ficha Informativa del Local (Limpia, Elegante y Rápida) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border-custom text-center md:text-left">
            <div className="flex flex-col md:flex-row gap-3.5 items-center md:items-start p-4 rounded-2xl bg-bg-secondary border border-border-custom shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin size={20} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-text-primary text-sm">Nuestra Ubicación</h4>
                <p className="text-xs text-text-secondary mt-0.5">San Lorenzo, Paraguay.</p>
                <a
                  href="https://maps.app.goo.gl/LcmEfiUAZVjyv6ML9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-primary hover:underline mt-1 inline-block"
                >
                  📍 Ver en Google Maps
                </a>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3.5 items-center md:items-start p-4 rounded-2xl bg-bg-secondary border border-border-custom shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-text-primary text-sm">Horarios de Atención</h4>
                <p className="text-xs text-text-secondary mt-0.5">Lun a Dom: 07:00 a 21:00 hs</p>
                <span className="text-[11px] font-bold text-emerald-500 mt-1 inline-block">
                  {isStoreOpen() ? "🟢 Abierto Ahora" : "🔴 Cerrado"}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3.5 items-center md:items-start p-4 rounded-2xl bg-bg-secondary border border-border-custom shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-text-primary text-sm">Medios de Pago</h4>
                <p className="text-xs text-text-secondary mt-0.5">Efectivo, Tarjetas & QR</p>
                <p className="text-[11px] text-text-muted mt-1">Abonás al retirar tu pedido</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer sencillo */}
      <footer className="border-t border-border-custom py-8 bg-bg-secondary/20 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-text-muted text-[10px] font-semibold uppercase tracking-wider">
        <span>
          &copy; {new Date().getFullYear()} {businessConfig.nombre} - {businessConfig.direccion || 'Paraguay'}. Todos los derechos reservados.
        </span>
        <a
          href="/login"
          className="hover:text-primary transition-colors text-[9px] hover:underline"
        >
          Acceso Administrativo
        </a>
      </footer>

      {/* Botón Flotante del Carrito (Ubicado justo ARRIBA del botón de WhatsApp) */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-22 right-6 z-40 flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-primary hover:bg-primary-hover text-white shadow-[0_4px_20px_rgba(227,27,35,0.45)] hover:shadow-[0_4px_25px_rgba(227,27,35,0.65)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs group"
        title="Ver Carrito de Compras"
      >
        <div className="relative flex items-center justify-center">
          <ShoppingBag size={20} />
          {carrito.length > 0 && (
            <span className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary text-[10px] font-black shadow-sm ring-2 ring-primary">
              {carrito.length}
            </span>
          )}
        </div>
        <span className="font-heading font-extrabold text-xs ml-0.5">
          {totalCarrito > 0 ? formatPrecio(totalCarrito) : "Carrito"}
        </span>
      </button>

      {/* Botón Flotante de WhatsApp para Consultas */}
      <a
        href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hola!%20Tengo%20una%20consulta%20sobre%20${encodeURIComponent(businessConfig.nombre)}...`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.55)] transition-all duration-300 hover:scale-110 active:scale-95 group"
        title="¿Tenés alguna duda? Escribinos"
      >
        <MessageCircle size={24} className="animate-pulse" />
        <span className="absolute right-14 bg-bg-secondary text-text-primary text-[10px] font-bold px-3 py-1.5 rounded-xl border border-border-custom shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          ¿Tenés dudas? Escribinos
        </span>
      </a>

      {/* Drawer del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Fondo traslúcido */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-bg-secondary flex flex-col shadow-2xl transition-transform duration-200">
              {/* Header Drawer */}
              <div className="p-6 border-b border-border-custom flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-primary" />
                  <h2 className="font-heading font-bold text-lg text-text-primary">
                    Tu Pedido
                  </h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contenido Carrito */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {carrito.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingBag
                      className="mx-auto text-text-muted mb-4"
                      size={48}
                    />
                    <p className="text-text-secondary font-medium">
                      El carrito está vacío
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Explora productos y agrégalos para armar tu pedido.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Lista de Items */}
                    <div className="space-y-4">
                      {carrito.map((item) => {
                        const itemSubtotal = item.subtotal || item.precio_venta * item.cantidad;
                        const esKg = item.unidad_medida === "kg";

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-border-custom bg-bg-primary"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-semibold text-text-primary truncate">
                                  {item.nombre}
                                </h4>
                                {esKg && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold shrink-0">
                                    ⚖️ Kg
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {formatPrecio(item.precio_venta)} {esKg ? "/kg" : "c/u"} &bull; <span className="font-bold text-text-primary">{formatPrecio(itemSubtotal)}</span>
                              </p>
                            </div>

                            {/* Controles de cantidad */}
                            <div className="flex items-center gap-2">
                              {esKg ? (
                                <button
                                  onClick={() => cambiarCantidad(item.id, 0)}
                                  className="px-3 py-1 rounded-lg bg-bg-secondary border border-border-custom hover:border-primary text-text-primary text-xs font-bold transition-all cursor-pointer"
                                  title="Haz clic para modificar kilos o monto"
                                >
                                  {item.cantidad} kg
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => cambiarCantidad(item.id, -1)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-bg-secondary border border-border-custom text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-sm font-bold text-text-primary w-5 text-center">
                                    {item.cantidad}
                                  </span>
                                  <button
                                    onClick={() => cambiarCantidad(item.id, 1)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-bg-secondary border border-border-custom text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => eliminarDelCarrito(item.id)}
                                className="p-1 rounded-md text-text-secondary hover:bg-red-500 hover:text-white transition-colors ml-1 cursor-pointer"
                                title="Quitar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Formulario de Retiro / Delivery (Siguiente Paso) */}
                    <div className="border-t border-border-custom pt-6 space-y-4">
                      <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-1.5">
                        <CheckCircle size={16} className="text-primary" />
                        <span>Detalles del Retiro</span>
                      </h3>

                      {checkoutError && (
                        <div className="p-3 rounded-xl bg-red-500 border border-red-500 text-xs text-white font-semibold">
                          {checkoutError}
                        </div>
                      )}

                      {/* Nombre */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">
                          Tu Nombre
                        </label>
                        <div className="relative">
                          <User
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                          />
                          <input
                            type="text"
                            placeholder="Ej. Juan Pérez"
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>

                      {/* Tipo de Retiro Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-secondary uppercase">
                          ¿Cuándo pasás a retirar?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTipoRetiro("asap")}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              tipoRetiro === "asap"
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-bg-primary text-text-secondary border-border-custom hover:bg-bg-primary/80 hover:text-text-primary"
                            }`}
                          >
                            Hoy lo antes posible
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTipoRetiro("programado");
                              setRetiroFecha(
                                new Date().toISOString().split("T")[0],
                              );
                            }}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              tipoRetiro === "programado"
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-bg-primary text-text-secondary border-border-custom hover:bg-bg-primary/80 hover:text-text-primary"
                            }`}
                          >
                            Programar día y hora
                          </button>
                        </div>
                      </div>

                      {/* Fecha y Hora (Mostrar solo si está programado) */}
                      {tipoRetiro === "programado" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">
                              Fecha de Retiro
                            </label>
                            <div className="relative">
                              <Calendar
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                              />
                              <input
                                type="date"
                                value={retiroFecha}
                                onChange={(e) => setRetiroFecha(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">
                              Hora de Retiro
                            </label>
                            <div className="relative">
                              <Clock
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                              />
                              <input
                                type="time"
                                value={retiroHora}
                                onChange={(e) => setRetiroHora(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Medio de Pago Selector */}
                      <div className="space-y-1.5 pt-2 border-t border-border-custom/50">
                        <label className="text-xs font-bold text-text-secondary uppercase">
                          Medio de Pago
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Efectivo (al retirar)", "Transferencia / QR"].map((metodo) => (
                            <button
                              key={metodo}
                              type="button"
                              onClick={() => setMetodoPagoCart(metodo)}
                              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                metodoPagoCart === metodo
                                  ? "bg-primary text-white border-primary shadow-sm"
                                  : "bg-bg-primary text-text-secondary border-border-custom hover:bg-bg-primary/80 hover:text-text-primary"
                              }`}
                            >
                              {metodo}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ficha de Datos Bancarios & Copiar Alias */}
                      {metodoPagoCart === "Transferencia / QR" && (
                        <div className="p-3.5 rounded-2xl bg-bg-primary border border-primary/30 space-y-2 text-xs shadow-sm mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary flex items-center gap-1.5">
                              <CreditCard size={14} />
                              <span>Datos Bancarios</span>
                            </span>
                            {businessConfig.datosBancarios?.alias && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(businessConfig.datosBancarios.alias);
                                  showToast(`¡Alias copiado! ${businessConfig.datosBancarios.alias}`, "success");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-bold shadow-sm hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                📋 Copiar Alias
                              </button>
                            )}
                          </div>

                          <div className="text-[11px] text-text-secondary space-y-0.5 font-medium">
                            <p><strong className="text-text-primary">Banco:</strong> {businessConfig.datosBancarios?.banco || "Itaú"}</p>
                            <p><strong className="text-text-primary">Titular:</strong> {businessConfig.datosBancarios?.titular || businessConfig.nombre}</p>
                            <p><strong className="text-text-primary">RUC/C.I.:</strong> {businessConfig.datosBancarios?.rucCi || businessConfig.ruc}</p>
                            <p><strong className="text-text-primary">Cuenta N°:</strong> {businessConfig.datosBancarios?.nroCuenta || "720192834"}</p>
                            <p><strong className="text-primary font-bold">Alias:</strong> <span className="font-mono">{businessConfig.datosBancarios?.alias || "savalmarket.itau"}</span></p>
                          </div>

                          {/* Advertencia de Abono Previo */}
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold flex items-start gap-2 mt-2">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                            <span>Por favor realizá la transferencia antes de pasar a retirar tu pedido. ¡Muchas gracias!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Drawer */}
              {carrito.length > 0 && (
                <div className="p-6 border-t border-border-custom bg-bg-primary space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-secondary uppercase">
                      Total Estimado
                    </span>
                    <span className="text-2xl font-heading font-black text-text-primary">
                      {formatPrecio(totalCarrito)}
                    </span>
                  </div>

                  <button
                    onClick={enviarPedidoWhatsApp}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enviar por WhatsApp</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Rápida */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setQuickViewProduct(null)}
          />

          <div className="relative w-full max-w-2xl bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
            {/* Botón Cerrar */}
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Lado Izquierdo: Imagen */}
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-bg-primary relative md:h-[400px]">
              <img
                src={
                  quickViewProduct.imagen_url ||
                  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300"
                }
                alt={quickViewProduct.nombre}
                className="w-full h-full object-cover"
              />
              {quickViewProduct.stock <= 0 ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-md">
                    Sin Stock
                  </span>
                </div>
              ) : (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                  {quickViewProduct.precio_anterior &&
                    quickViewProduct.precio_anterior >
                      quickViewProduct.precio_venta && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                        Oferta -
                        {Math.round(
                          ((quickViewProduct.precio_anterior -
                            quickViewProduct.precio_venta) /
                            quickViewProduct.precio_anterior) *
                            100,
                        )}
                        %
                      </span>
                    )}
                  {quickViewProduct.stock <= 3 && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                      Últimos {quickViewProduct.stock}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Lado Derecho: Detalles */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between gap-6 md:h-[400px] bg-bg-secondary">
              <div className="space-y-4">
                <div>
                  <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-primary/10 shadow-sm">
                    {quickViewProduct.categoria}
                  </span>
                  <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-text-primary mt-2 leading-tight">
                    {quickViewProduct.nombre}
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {quickViewProduct.descripcion ||
                    "Este producto no cuenta con una descripción detallada por el momento."}
                </p>

                <div className="flex items-center justify-between text-xs border-t border-border-custom pt-4">
                  <span className="text-text-secondary font-medium">
                    Disponibilidad:
                  </span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-lg ${
                      quickViewProduct.stock <= 0
                        ? "bg-red-500 text-white"
                        : quickViewProduct.stock <= 3
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-emerald-500/10 text-emerald-500"
                    }`}
                  >
                    {quickViewProduct.stock <= 0
                      ? "Agotado"
                      : `${quickViewProduct.stock} unidades`}
                  </span>
                </div>
              </div>

              {/* Botón de Agregar al Carrito */}
              <div className="flex items-center gap-4 border-t border-border-custom pt-4 mt-auto">
                <div className="flex flex-col shrink-0">
                  {quickViewProduct.precio_anterior &&
                    quickViewProduct.precio_anterior >
                      quickViewProduct.precio_venta && (
                      <span className="text-xs text-text-muted line-through leading-none mb-0.5">
                        {formatPrecio(quickViewProduct.precio_anterior)}
                      </span>
                    )}
                  <span className="font-heading font-extrabold text-xl text-text-primary">
                    {formatPrecio(quickViewProduct.precio_venta)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    agregarAlCarrito(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  disabled={quickViewProduct.stock <= 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white transition-all cursor-pointer ${
                    quickViewProduct.stock <= 0
                      ? "bg-border-custom text-text-muted cursor-not-allowed"
                      : "bg-primary hover:bg-primary-hover shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  <Plus size={18} />
                  <span>Agregar al Pedido</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Calculadora Dual por Peso / Dinero en la Web */}
      {weightModalProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWeightModalProduct(null)}
          />

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
                    Precio:{" "}
                    <span className="font-bold text-primary">
                      {formatPrecio(weightModalProduct.precio_venta)} / kg
                    </span>
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
                onClick={() => setWeightModalTab("dinero")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  weightModalTab === "dinero"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>💵 Pedir por Dinero (Gs.)</span>
              </button>
              <button
                type="button"
                onClick={() => setWeightModalTab("peso")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  weightModalTab === "peso"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>⚖️ Pedir por Kilos (Kg)</span>
              </button>
            </div>

            {/* Pestaña A: Por Dinero (Gs.) */}
            {weightModalTab === "dinero" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase block mb-1.5">
                    ¿Por cuánto querés llevar? (en Guaraníes)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-secondary">
                      Gs.
                    </span>
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
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Montos Frecuentes:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "1000",
                      "2000",
                      "3000",
                      "5000",
                      "10000",
                      "15000",
                      "20000",
                      "50000",
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCustomMonto(m)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          customMonto === m
                            ? "bg-primary-soft text-primary border-primary"
                            : "bg-bg-primary text-text-secondary border-border-custom hover:border-primary/40"
                        }`}
                      >
                        Gs. {parseInt(m).toLocaleString("es-PY")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cálculo Resultado de Regla de Tres */}
                <div className="p-3.5 rounded-2xl bg-bg-primary border border-border-custom space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary">
                    Equivalente aproximado:
                  </span>
                  <p className="font-heading font-black text-xl text-emerald-500">
                    {(
                      (parseFloat(customMonto) || 0) /
                      weightModalProduct.precio_venta
                    ).toFixed(3)}{" "}
                    kg
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Monto a pagar:{" "}
                    <span className="font-bold text-text-primary">
                      Gs. {parseInt(customMonto || 0).toLocaleString("es-PY")}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              /* Pestaña B: Por Kilos (Kg) */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase block mb-1.5">
                    ¿Cuántos Kilos querés? (Kg)
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
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-secondary">
                      kg
                    </span>
                  </div>
                </div>

                {/* Botones Rápidos de Peso */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Pesos Frecuentes:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "250g (1/4 kg)", val: "0.25" },
                      { label: "500g (1/2 kg)", val: "0.5" },
                      { label: "750g (3/4 kg)", val: "0.75" },
                      { label: "1 kg", val: "1" },
                      { label: "1.5 kg", val: "1.5" },
                      { label: "2 kg", val: "2" },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => setCustomPeso(w.val)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          customPeso === w.val
                            ? "bg-primary-soft text-primary border-primary"
                            : "bg-bg-primary text-text-secondary border-border-custom hover:border-primary/40"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cálculo Resultado de Regla de Tres */}
                <div className="p-3.5 rounded-2xl bg-bg-primary border border-border-custom space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary">
                    Monto Total Estimado:
                  </span>
                  <p className="font-heading font-black text-xl text-primary">
                    {formatPrecio(
                      (parseFloat(customPeso) || 0) *
                        weightModalProduct.precio_venta,
                    )}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Por{" "}
                    <span className="font-bold text-text-primary">
                      {customPeso || 0} kg
                    </span>{" "}
                    a {formatPrecio(weightModalProduct.precio_venta)} / kg
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
                <span>Agregar al Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast Personalizada (Ubicada en la esquina inferior izquierda) */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] sm:w-full bg-bg-secondary/95 backdrop-blur-md border border-border-custom rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex gap-3.5 items-center animate-slide-in-right">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                : toast.type === "warning"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                  : toast.type === "error"
                    ? "bg-red-500 text-white border border-red-500"
                    : "bg-sky-500/10 text-sky-500 border border-sky-500/10"
            }`}
          >
            {toast.type === "success" && <CheckCircle size={18} />}
            {toast.type === "warning" && <AlertTriangle size={18} />}
            {toast.type === "error" && <AlertCircle size={18} />}
            {toast.type === "info" && <Info size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-none mb-1">
              {toast.type === "success"
                ? "Éxito"
                : toast.type === "warning"
                  ? "Atención"
                  : toast.type === "error"
                    ? "Error"
                    : "Información"}
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
