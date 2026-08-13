import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Upload, Eye, EyeOff, ArrowUp, ArrowDown, ImageOff, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { BUSINESS_CONFIG } from '../config/businessConfig';

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriasLista, setCategoriasLista] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null); // null = Crear, banner = Editar

  // Form State
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [badge, setBadge] = useState('');
  const [botonTexto, setBotonTexto] = useState('Ver más');
  const [categoriaDestino, setCategoriaDestino] = useState('Todos');
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);

  // Toast Notification State
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'warning' | 'error' | 'info' }

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('orden');

    if (!error && data) {
      setBanners(data);
    }
    setLoading(false);
  };

  const cargarCategorias = () => {
    if (!localStorage.getItem('mock_saval_categorias')) {
      localStorage.setItem('mock_saval_categorias', JSON.stringify(BUSINESS_CONFIG.categorias));
    }
    const list = JSON.parse(localStorage.getItem('mock_saval_categorias') || '[]');
    setCategoriasLista(list);
  };

  useEffect(() => {
    fetchBanners();
    cargarCategorias();
  }, []);

  const openAddModal = () => {
    setCurrentBanner(null);
    setTitulo('');
    setSubtitulo('');
    setBadge('');
    setBotonTexto('Ver más');
    setCategoriaDestino('Todos');
    setImagenUrl('');
    setActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (banner) => {
    setCurrentBanner(banner);
    setTitulo(banner.titulo);
    setSubtitulo(banner.subtitulo || '');
    setBadge(banner.badge || '');
    setBotonTexto(banner.boton_texto || 'Ver más');
    setCategoriaDestino(banner.categoria_destino || 'Todos');
    setImagenUrl(banner.imagen_url || '');
    setActivo(banner.activo !== false);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen es demasiado grande. Por favor, selecciona una foto menor a 2MB.', 'warning');
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

    if (!titulo.trim()) {
      showToast('El título del banner es obligatorio.', 'warning');
      return;
    }

    const bannerPayload = {
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim() || null,
      badge: badge.trim() || null,
      boton_texto: botonTexto.trim() || 'Ver más',
      categoria_destino: categoriaDestino || 'Todos',
      imagen_url: imagenUrl || null,
      activo,
    };

    if (currentBanner) {
      const { error } = await supabase
        .from('banners')
        .update(bannerPayload)
        .eq('id', currentBanner.id);

      if (error) {
        showToast('Error al actualizar el banner: ' + error.message, 'error');
      } else {
        showToast('Banner actualizado con éxito.', 'success');
        setIsModalOpen(false);
        fetchBanners();
      }
    } else {
      const maxOrden = banners.reduce((max, b) => Math.max(max, b.orden || 0), 0);
      const { error } = await supabase
        .from('banners')
        .insert({ ...bannerPayload, orden: maxOrden + 1 });

      if (error) {
        showToast('Error al crear el banner: ' + error.message, 'error');
      } else {
        showToast('Banner creado con éxito.', 'success');
        setIsModalOpen(false);
        fetchBanners();
      }
    }
  };

  const toggleActivo = async (banner) => {
    const nuevoActivo = banner.activo === false;
    const { error } = await supabase.from('banners').update({ activo: nuevoActivo }).eq('id', banner.id);
    if (error) {
      showToast('Error al cambiar la visibilidad: ' + error.message, 'error');
      return;
    }
    showToast(
      nuevoActivo ? `${banner.titulo} ahora se muestra en el catálogo online.` : `${banner.titulo} ya no se muestra en el catálogo online.`,
      'info'
    );
    fetchBanners();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este banner? Esta acción no se puede deshacer.')) {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) {
        showToast('Error al eliminar el banner: ' + error.message, 'error');
      } else {
        showToast('Banner eliminado.', 'info');
        fetchBanners();
      }
    }
  };

  // Intercambia el campo "orden" entre un banner y su vecino para moverlo arriba/abajo en el carrusel
  const moverBanner = async (index, direccion) => {
    const destino = index + direccion;
    if (destino < 0 || destino >= banners.length) return;

    const actual = banners[index];
    const vecino = banners[destino];

    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase.from('banners').update({ orden: vecino.orden }).eq('id', actual.id),
      supabase.from('banners').update({ orden: actual.orden }).eq('id', vecino.id),
    ]);

    if (error1 || error2) {
      showToast('Error al reordenar los banners.', 'error');
      return;
    }
    fetchBanners();
  };

  return (
    <div className="flex-1 p-6 space-y-8 bg-bg-primary overflow-y-auto">

      {/* Header Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-text-primary mb-1">
            Banners del Catálogo
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Gestioná las imágenes y textos que rotan en la portada de tu catálogo online
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={18} />
          <span>Nuevo Banner</span>
        </button>
      </div>

      {/* Listado de Banners */}
      <div>
        {loading ? (
          <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-text-secondary font-medium text-xs">Cargando banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
            <ImageOff className="mx-auto text-text-muted mb-4" size={44} />
            <p className="text-text-secondary font-medium text-xs">Todavía no hay banners cargados</p>
            <p className="text-text-muted text-[11px] mt-1">Creá el primero para que aparezca en la portada del catálogo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`bg-bg-secondary border border-border-custom rounded-2xl sm:rounded-3xl overflow-hidden premium-card flex flex-col sm:flex-row ${banner.activo === false ? 'opacity-60' : ''}`}
              >
                {/* Imagen */}
                <div className="w-full sm:w-56 h-36 sm:h-auto shrink-0 bg-bg-primary relative overflow-hidden border-b sm:border-b-0 sm:border-r border-border-custom">
                  {banner.imagen_url ? (
                    <img src={banner.imagen_url} alt={banner.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="text-text-muted" size={28} />
                    </div>
                  )}
                  {banner.activo === false && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                      Oculto
                    </span>
                  )}
                </div>

                {/* Datos y Acciones */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    {banner.badge && (
                      <span className="inline-block bg-primary-soft text-primary text-[9px] font-bold px-2 py-0.5 rounded-lg">
                        {banner.badge}
                      </span>
                    )}
                    <h4 className="font-heading font-bold text-text-primary text-sm line-clamp-1">
                      {banner.titulo}
                    </h4>
                    {banner.subtitulo && (
                      <p className="text-[11px] text-text-secondary line-clamp-2">
                        {banner.subtitulo}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted">
                      Botón: <span className="font-semibold text-text-secondary">"{banner.boton_texto}"</span> &bull; Destino: <span className="font-semibold text-text-secondary">{banner.categoria_destino}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => moverBanner(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-bg-primary border border-border-custom text-text-secondary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Mover arriba"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => moverBanner(index, 1)}
                      disabled={index === banners.length - 1}
                      className="p-1.5 rounded-lg hover:bg-bg-primary border border-border-custom text-text-secondary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Mover abajo"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      onClick={() => toggleActivo(banner)}
                      className="p-1.5 rounded-lg hover:bg-bg-primary border border-border-custom text-text-secondary hover:text-primary transition-all cursor-pointer"
                      title={banner.activo === false ? 'Mostrar en el catálogo online' : 'Ocultar del catálogo online'}
                    >
                      {banner.activo === false ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      onClick={() => openEditModal(banner)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-bg-primary border border-border-custom text-text-secondary hover:text-primary transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Editar Banner"
                    >
                      <Edit2 size={12} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-red-500 border border-border-custom hover:border-red-500 text-text-secondary hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Eliminar Banner"
                    >
                      <Trash2 size={12} />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                {currentBanner ? 'Editar Banner' : 'Nuevo Banner'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Imagen */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-text-secondary uppercase block">Imagen del Banner</label>
                <p className="text-[10px] text-text-muted -mt-1.5">Recomendado: formato horizontal, mínimo 1200x500px, menor a 2MB.</p>

                {imagenUrl && (
                  <div className="flex items-center gap-3 p-3 bg-bg-primary border border-border-custom rounded-2xl">
                    <img
                      src={imagenUrl}
                      alt="Vista previa"
                      className="w-20 h-14 rounded-xl object-cover border border-border-custom shadow-sm shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-text-primary">Vista previa de la imagen seleccionada</p>
                      <button
                        type="button"
                        onClick={() => setImagenUrl('')}
                        className="text-[9px] font-extrabold text-white bg-red-500 hover:bg-red-600 transition-colors mt-0.5 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Quitar Imagen
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="banner-image-file"
                    />
                    <label
                      htmlFor="banner-image-file"
                      className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-dashed border-border-custom bg-bg-primary text-xs font-bold text-text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer h-10"
                    >
                      <Upload size={14} />
                      <span>Subir Imagen</span>
                    </label>
                  </div>

                  <div className="relative">
                    <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
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

              {/* Título */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Verdulería Fresca al Mejor Precio"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Subtítulo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Subtítulo</label>
                <textarea
                  placeholder="Ej. Tomate perita, bananas por docena y productos seleccionados de la zona."
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  rows="2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Badge */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Etiqueta (Badge)</label>
                  <input
                    type="text"
                    placeholder="Ej. 🥤 Bebidas & Refrescos"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Texto del Botón */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Texto del Botón</label>
                  <input
                    type="text"
                    placeholder="Ej. Ver Bebidas"
                    value={botonTexto}
                    onChange={(e) => setBotonTexto(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Categoría Destino */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Sección a la que dirige el botón</label>
                <select
                  value={categoriaDestino}
                  onChange={(e) => setCategoriaDestino(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                >
                  <option value="Todos">Todos los Productos</option>
                  {categoriasLista.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                  Mostrar en el catálogo online
                  <span className="block text-[10px] text-text-secondary font-normal mt-0.5">
                    Desmarcá esto para ocultar el banner temporalmente sin borrarlo.
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
                  <span>Guardar Banner</span>
                </button>
              </div>
            </form>
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
