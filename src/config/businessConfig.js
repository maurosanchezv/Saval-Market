export const DEFAULT_BUSINESS_CONFIG = {
  nombre: "Saval Market",
  razonSocial: "Saval Market S.A.",
  ruc: "80054321-9",
  timbrado: "16894320",
  timbradoVigencia: "01/01/2026 al 31/12/2026",
  tipo: "productos",
  moneda: "Gs.",
  direccion: "San Lorenzo, Paraguay",
  telefono: "0985 534189",
  whatsappNumber: "595985534189",
  logoUrl: "",
  horario: "07:00 a 21:00 hs",
  whatsappMessageTemplate: "*NUEVO PEDIDO - {storeName}*\n\n¡Hola! Me gustaría realizar el siguiente pedido desde su página web:\n\n{items}\n\n*Total a pagar:* {total}\n*Cliente:* {name}\n*Modalidad:* {pickupTime}\n*Medio de Pago:* {metodoPago}\n{datosBancarios}\n¿Me confirman si ya está listo para pasar a retirar y abonar? ¡Muchas gracias!",
  datosBancarios: {
    banco: "Banco Itaú Paraguay",
    titular: "Saval Market S.A.",
    rucCi: "80054321-9",
    nroCuenta: "720192834",
    alias: "savalmarket.itau",
  },
  theme: "dark",
  density: "compact",
  categorias: ["Almacén", "Bebidas", "Carnicería", "Lácteos", "Limpieza", "Panadería", "Verdulería"],
  branding: {
    primary: {
      light: "#e31b23",
      dark: "#e31b23"
    },
    secondary: {
      light: "#1c2430",
      dark: "#12151b"
    },
    accent: {
      light: "#1e40af",
      dark: "#1e40af"
    }
  }
};

export const getBusinessConfig = () => {
  try {
    const saved = localStorage.getItem("saval_business_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        if (!parsed.whatsappMessageTemplate || !parsed.whatsappMessageTemplate.includes("{datosBancarios}")) {
          parsed.whatsappMessageTemplate = DEFAULT_BUSINESS_CONFIG.whatsappMessageTemplate;
          localStorage.setItem("saval_business_config", JSON.stringify(parsed));
        }
        return { 
          ...DEFAULT_BUSINESS_CONFIG, 
          ...parsed,
          datosBancarios: { ...DEFAULT_BUSINESS_CONFIG.datosBancarios, ...(parsed.datosBancarios || {}) }
        };
      }
    }
  } catch (e) {
    console.error("Error reading business config", e);
  }
  return DEFAULT_BUSINESS_CONFIG;
};

export const saveBusinessConfig = (newConfig) => {
  try {
    localStorage.setItem("saval_business_config", JSON.stringify(newConfig));
    window.dispatchEvent(new Event("business_config_updated"));
  } catch (e) {
    console.error("Error saving business config", e);
  }
};

export const BUSINESS_CONFIG = getBusinessConfig();

export const formatPrecio = (valor) => {
  if (typeof valor !== 'number') valor = parseFloat(valor) || 0;
  const config = getBusinessConfig();
  return `${config.moneda} ${Math.round(valor).toLocaleString('es-PY')}`;
};

// Preferencia de tema del visitante: independiente de saval_business_config para que
// el toggle no quede pisado por un guardado viejo desde la página de Configuración.
const THEME_OVERRIDE_KEY = "saval_theme_override";

export const getEffectiveTheme = () => {
  try {
    const override = localStorage.getItem(THEME_OVERRIDE_KEY);
    if (override === 'light' || override === 'dark') return override;
  } catch (e) {
    console.error("Error reading theme override", e);
  }
  return getBusinessConfig().theme === 'light' ? 'light' : 'dark';
};

export const setEffectiveTheme = (themeName) => {
  try {
    localStorage.setItem(THEME_OVERRIDE_KEY, themeName);
    window.dispatchEvent(new Event("theme_changed"));
  } catch (e) {
    console.error("Error saving theme override", e);
  }
};

// Inyecta los tokens de color de marca en :root según el tema activo. Fuerza también
// los colores de texto (no solo fondo/borde) para que no dependan de prefers-color-scheme
// del sistema operativo, que puede quedar desincronizado del tema elegido acá.
export const applyTheme = (themeName) => {
  const root = document.documentElement;
  const isDark = themeName === 'dark';
  const branding = getBusinessConfig().branding;

  root.classList.toggle('dark', isDark);

  const primaryColor = isDark ? branding.primary.dark : branding.primary.light;
  const secondaryColor = isDark ? branding.secondary.dark : branding.secondary.light;
  const accentColor = isDark ? branding.accent.dark : branding.accent.light;

  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--color-primary-hover', isDark ? branding.primary.light : branding.primary.dark);
  root.style.setProperty('--color-primary-soft', `${primaryColor}1a`); // 10% opacidad
  root.style.setProperty('--color-secondary', secondaryColor);
  root.style.setProperty('--color-accent', accentColor);

  if (isDark) {
    root.style.setProperty('--bg-primary', branding.secondary.dark); // Canvas Carbón
    root.style.setProperty('--bg-secondary', branding.secondary.light); // Gris Titanio
    root.style.setProperty('--bg-card', branding.secondary.light); // Gris Titanio
    root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.14)'); // Contorno blanco translúcido
    root.style.setProperty('--text-primary', '#f1f5f9');
    root.style.setProperty('--text-secondary', '#cbd5e1');
    root.style.setProperty('--text-muted', '#334155');
  } else {
    root.style.setProperty('--bg-primary', '#f8fafc');
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--border-color', '#cbd5e1');
    root.style.setProperty('--text-primary', '#0f172a');
    root.style.setProperty('--text-secondary', '#334155');
    root.style.setProperty('--text-muted', '#cbd5e1');
  }
};
