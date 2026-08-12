import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Plus, X, Save, Users, Phone, Mail, MapPin, Clipboard, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { BUSINESS_CONFIG } from '../config/businessConfig';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre');
    
    if (!error && data) {
      setClientes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const openAddModal = () => {
    setNombre('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setNotas('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const clientPayload = {
      nombre,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      notas: notas || null
    };

    const { error } = await supabase
      .from('clientes')
      .insert(clientPayload);

    if (error) {
      showToast('Error al crear el cliente: ' + error.message, 'error');
    } else {
      showToast('Cliente registrado con éxito.', 'success');
      setIsModalOpen(false);
      fetchClientes();
    }
  };

  // Filtrado
  const filteredClients = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.telefono && c.telefono.includes(searchQuery)) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-6 space-y-8 bg-bg-primary overflow-y-auto">
      
      {/* Header Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-text-primary mb-1">
            Clientes Registrados
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Visualiza y administra la base de datos de tus compradores
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
        <input
          type="text"
          placeholder="Buscar cliente por nombre, teléfono o correo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border-custom bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Grid de Clientes (Estilo Bento Grid Card) */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-text-secondary font-medium">Cargando base de datos...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary border border-border-custom rounded-3xl">
          <Users className="mx-auto text-text-muted mb-4" size={44} />
          <p className="text-text-secondary font-medium">No se encontraron clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredClients.map(client => (
            <div 
              key={client.id}
              className="bg-bg-secondary rounded-2xl sm:rounded-3xl border border-border-custom p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-200"
            >
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-primary-soft text-primary font-bold text-xs sm:text-sm">
                    {client.nombre.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-heading font-extrabold text-xs sm:text-base text-text-primary truncate" title={client.nombre}>
                    {client.nombre}
                  </h3>
                </div>

                <div className="space-y-2 text-[10px] sm:text-xs text-text-secondary font-medium">
                  {client.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-text-muted shrink-0" />
                      <span className="truncate">{client.telefono}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-text-muted shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.direccion && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-text-muted shrink-0" />
                      <span className="truncate">{client.direccion}</span>
                    </div>
                  )}
                  {client.notas && (
                    <div className="flex items-start gap-1.5 bg-bg-primary p-2 rounded-xl border border-border-custom mt-1.5">
                      <Clipboard size={12} className="text-text-muted mt-0.5 shrink-0" />
                      <p className="text-[9px] text-text-secondary italic line-clamp-2 leading-tight">{client.notas}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[8px] sm:text-[9px] text-text-muted font-bold uppercase tracking-wider mt-4 sm:mt-5 border-t border-border-custom pt-2.5 sm:pt-3">
                Registrado: {new Date(client.creado_en).toLocaleDateString('es-AR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Registrar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
              <h3 className="font-heading font-bold text-lg text-text-primary">
                Registrar Nuevo Cliente
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Teléfono de Contacto</label>
                <input
                  type="tel"
                  placeholder="Ej. 1123456789"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="juan@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Dirección */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Dirección de Entrega / Domicilio</label>
                <input
                  type="text"
                  placeholder="Ej. Av. Rivadavia 1234, CABA"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Notas / Observaciones</label>
                <textarea
                  placeholder="Ej. Horario preferente, alergias, referencias del domicilio..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows="2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

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
                  <span>Registrar Cliente</span>
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
