import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Clock, 
  FileText, 
  Save, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles,
  Receipt,
  Building2,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { getBusinessConfig, saveBusinessConfig, DEFAULT_BUSINESS_CONFIG } from '../config/businessConfig';

export default function Configuracion() {
  const [config, setConfig] = useState(() => getBusinessConfig() || DEFAULT_BUSINESS_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loaded = getBusinessConfig();
    if (loaded) {
      setConfig(loaded);
    }
  }, []);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...(prev || DEFAULT_BUSINESS_CONFIG), [field]: value }));
  };

  const handleBancarioChange = (field, value) => {
    setConfig(prev => {
      const current = prev || DEFAULT_BUSINESS_CONFIG;
      return {
        ...current,
        datosBancarios: {
          ...(current.datosBancarios || DEFAULT_BUSINESS_CONFIG.datosBancarios),
          [field]: value
        }
      };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const configToSave = config || DEFAULT_BUSINESS_CONFIG;
    saveBusinessConfig(configToSave);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetDefault = () => {
    if (window.confirm("¿Deseas restaurar la configuración original de Saval Market?")) {
      saveBusinessConfig(DEFAULT_BUSINESS_CONFIG);
      setConfig(DEFAULT_BUSINESS_CONFIG);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("La imagen es muy pesada. Por favor seleccioná un archivo de menos de 3 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentConfig = config || DEFAULT_BUSINESS_CONFIG;
  const bancarios = currentConfig.datosBancarios || DEFAULT_BUSINESS_CONFIG.datosBancarios;

  return (
    <div className="flex-1 p-6 bg-bg-primary overflow-y-auto">
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-custom pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <Sparkles size={14} />
            <span>Personalización Marca Blanca (White-Label)</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary">
            Configuración del Negocio & Marca
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Personalizá el nombre, logo, número de WhatsApp, datos bancarios/alias, dirección y tickets de tu despensa o local.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-4 py-2.5 rounded-xl border border-border-custom hover:bg-bg-secondary text-text-secondary text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
            title="Restaurar Valores por Defecto"
          >
            <RefreshCw size={14} />
            <span>Restaurar Predeterminado</span>
          </button>
        </div>
      </div>

      {/* Alerta de Éxito */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 animate-fade-in shadow-md">
          <CheckCircle2 size={20} className="shrink-0" />
          <div className="text-xs sm:text-sm font-bold">
            ¡Configuración guardada exitosamente! Los cambios se aplicaron de inmediato a todo el sistema, catálogo y tickets POS.
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda & Centro: Formulario Principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bloque 1: Identidad de Marca */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-custom space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border-custom/60 pb-3">
              <Store className="text-primary" size={20} />
              <h2 className="font-heading font-bold text-base text-text-primary">
                Identidad del Comercio & Logo
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Nombre del Local / Despensa *
                </label>
                <input
                  type="text"
                  value={currentConfig.nombre || ''}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="ej: Despensa San José / Saval Market"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>

              {/* Subida de Logo: Opción Archivo Local o URL */}
              <div className="space-y-2 pt-1 border-t border-border-custom/40">
                <label className="block text-xs font-bold text-text-primary">
                  Logo del Local (Subir Imagen desde la Computadora o Pegar URL)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Botón para seleccionar archivo local de la computadora/teléfono */}
                  <div>
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                      <ImageIcon size={16} />
                      <span>📁 Elegir Foto desde mi Dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Input alternativo URL web */}
                  <div className="relative">
                    <input
                      type="url"
                      value={currentConfig.logoUrl && !currentConfig.logoUrl.startsWith('data:') ? currentConfig.logoUrl : ''}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder="O pegar URL: https://.../logo.png"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:border-primary"
                    />
                    <ImageIcon className="absolute left-3 top-3 text-text-muted" size={14} />
                  </div>
                </div>

                {/* Previsualización y botón de quitar */}
                {currentConfig.logoUrl && (
                  <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-xl border border-border-custom mt-2">
                    <div className="h-10 w-24 bg-black/40 rounded-lg p-1 flex items-center justify-center overflow-hidden border border-white/10">
                      <img src={currentConfig.logoUrl} alt="Vista previa" className="h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">Logo Cargado Exitosamente</p>
                      <p className="text-[10px] text-emerald-500 font-semibold">🟢 Listo para usarse en la tienda y tickets</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('logoUrl', '')}
                      className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg cursor-pointer px-2 py-1"
                    >
                      Quitar Logo
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Dirección del Local *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={currentConfig.direccion || ''}
                      onChange={(e) => handleChange('direccion', e.target.value)}
                      placeholder="ej: San Lorenzo, Paraguay"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                      required
                    />
                    <MapPin className="absolute left-3 top-3 text-text-muted" size={16} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Horario de Atención *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={currentConfig.horario || ''}
                      onChange={(e) => handleChange('horario', e.target.value)}
                      placeholder="ej: 07:00 a 21:00 hs de corrido"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                      required
                    />
                    <Clock className="absolute left-3 top-3 text-text-muted" size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 2: WhatsApp & Contacto */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-custom space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border-custom/60 pb-3">
              <MessageSquare className="text-emerald-500" size={20} />
              <h2 className="font-heading font-bold text-base text-text-primary">
                Canal de WhatsApp & Pedidos Online
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Número de WhatsApp (con código de país) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentConfig.whatsappNumber || ''}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                    placeholder="595981123456"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary font-mono"
                    required
                  />
                  <MessageSquare className="absolute left-3 top-3 text-emerald-500" size={16} />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Formato: <span className="font-mono">595981...</span> (sin el signo + ni espacios).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Teléfono Visible en Ticket / Local
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentConfig.telefono || ''}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    placeholder="0981 123 456"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary font-mono"
                  />
                  <Phone className="absolute left-3 top-3 text-text-muted" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Datos Bancarios & Alias para Transferencia / QR */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-custom space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border-custom/60 pb-3">
              <CreditCard className="text-sky-400" size={20} />
              <h2 className="font-heading font-bold text-base text-text-primary">
                Datos Bancarios & Alias para Transferencias
              </h2>
            </div>

            <p className="text-xs text-text-secondary">
              Estos datos aparecerán en el carrito de compras del cliente (con botón de copiar alias con 1 toque) y en el mensaje de WhatsApp.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Nombre del Banco
                </label>
                <input
                  type="text"
                  value={bancarios.banco || ''}
                  onChange={(e) => handleBancarioChange('banco', e.target.value)}
                  placeholder="ej: Banco Itaú Paraguay / Ueno"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Titular de la Cuenta
                </label>
                <input
                  type="text"
                  value={bancarios.titular || ''}
                  onChange={(e) => handleBancarioChange('titular', e.target.value)}
                  placeholder="ej: Saval Market S.A. / Juan Pérez"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  RUC o C.I. del Titular
                </label>
                <input
                  type="text"
                  value={bancarios.rucCi || ''}
                  onChange={(e) => handleBancarioChange('rucCi', e.target.value)}
                  placeholder="ej: 80054321-9"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={bancarios.nroCuenta || ''}
                  onChange={(e) => handleBancarioChange('nroCuenta', e.target.value)}
                  placeholder="ej: 720192834"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Alias para Transferencias (Copia rápida)
                </label>
                <input
                  type="text"
                  value={bancarios.alias || ''}
                  onChange={(e) => handleBancarioChange('alias', e.target.value)}
                  placeholder="ej: savalmarket.itau / despensasanjose"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-bold text-primary focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Tus clientes podrán copiar el alias directamente desde el carrito de compras con un solo toque.
                </p>
              </div>
            </div>
          </div>

          {/* Bloque 4: Datos de Facturación & Timbrado SET */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-custom space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border-custom/60 pb-3">
              <Receipt className="text-amber-500" size={20} />
              <h2 className="font-heading font-bold text-base text-text-primary">
                Datos Legales & Ticket de Impresión (POS)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Razón Social *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentConfig.razonSocial || ''}
                    onChange={(e) => handleChange('razonSocial', e.target.value)}
                    placeholder="ej: Despensa San José S.R.L."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                    required
                  />
                  <Building2 className="absolute left-3 top-3 text-text-muted" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  RUC *
                </label>
                <input
                  type="text"
                  value={currentConfig.ruc || ''}
                  onChange={(e) => handleChange('ruc', e.target.value)}
                  placeholder="ej: 80012345-6"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  N° de Timbrado SET
                </label>
                <input
                  type="text"
                  value={currentConfig.timbrado || ''}
                  onChange={(e) => handleChange('timbrado', e.target.value)}
                  placeholder="ej: 16894320"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Vigencia del Timbrado
                </label>
                <input
                  type="text"
                  value={currentConfig.timbradoVigencia || ''}
                  onChange={(e) => handleChange('timbradoVigencia', e.target.value)}
                  placeholder="ej: 01/01/2026 al 31/12/2026"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-custom rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Botón Guardar Cambios */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Save size={18} />
              <span>Guardar Configuración de Marca</span>
            </button>
          </div>
        </div>

        {/* Columna Derecha: Vista Previa en Vivo */}
        <div className="space-y-6">
          <div className="sticky top-20 bg-bg-secondary rounded-2xl p-6 border border-border-custom space-y-4 shadow-md">
            <h3 className="font-heading font-extrabold text-sm text-text-primary flex items-center gap-2 border-b border-border-custom/60 pb-3">
              <Sparkles size={16} className="text-primary" />
              <span>Vista Previa de Marca en Vivo</span>
            </h3>

            {/* Tarjeta Simulación Header / Tienda */}
            <div className="p-4 rounded-xl bg-bg-primary border border-border-custom space-y-3">
              <div className="flex items-center justify-between border-b border-border-custom/40 pb-2">
                <div className="flex items-center gap-2">
                  {currentConfig.logoUrl ? (
                    <img src={currentConfig.logoUrl} alt="Logo" className="h-6 object-contain" />
                  ) : (
                    <span className="font-black text-base text-text-primary tracking-tight uppercase">
                      {currentConfig.nombre || "Mi Local"}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  🟢 Abierto
                </span>
              </div>

              <div className="text-xs space-y-1">
                <p className="font-bold text-text-primary">
                  {currentConfig.nombre || "Nombre de la Despensa"}
                </p>
                <p className="text-[11px] text-text-secondary flex items-center gap-1">
                  <MapPin size={12} className="text-primary shrink-0" />
                  {currentConfig.direccion || "Dirección no especificada"}
                </p>
                <p className="text-[11px] text-text-secondary flex items-center gap-1">
                  <Clock size={12} className="text-text-muted shrink-0" />
                  {currentConfig.horario || "Horario de atención"}
                </p>
              </div>

              <div className="pt-1">
                <a
                  href={`https://wa.me/${currentConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp: {currentConfig.whatsappNumber}</span>
                </a>
              </div>
            </div>

            {/* Simulación de Ticket Impreso */}
            <div className="p-4 rounded-xl bg-white text-gray-900 font-mono text-[10px] space-y-1 shadow-inner border border-gray-200">
              <div className="text-center font-bold text-xs uppercase border-b border-dashed border-gray-400 pb-1 mb-1">
                {currentConfig.nombre || "MI LOCAL"}
              </div>
              <p>Razón Social: {currentConfig.razonSocial || "Nombre S.A."}</p>
              <p>RUC: {currentConfig.ruc || "123456-7"}</p>
              <p>Timbrado: {currentConfig.timbrado || "12345678"}</p>
              <p>Dirección: {currentConfig.direccion || "San Lorenzo"}</p>
              <p>Tel: {currentConfig.telefono || "0981..."}</p>
              <div className="border-b border-dashed border-gray-400 my-1"></div>
              <p className="text-center font-bold">*** TICKET DEMO ***</p>
            </div>
          </div>
        </div>
      </form>
    </div>
    </div>
  );
}
