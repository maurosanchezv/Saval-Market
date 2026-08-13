import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { BUSINESS_CONFIG, applyTheme, getEffectiveTheme } from './config/businessConfig';
import { routesConfig } from './config/routesConfig';

// Importar Componentes
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Importar Páginas
import Catalogo from './pages/Catalogo';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import PuntoVenta from './pages/PuntoVenta';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Configuracion from './pages/Configuracion';
import Banners from './pages/Banners';

// Mapeo de nombres de componentes string a imports reales
const componentMapping = {
  Catalogo,
  Login,
  Dashboard,
  Inventario,
  PuntoVenta,
  Clientes,
  Pedidos,
  Configuracion,
  Banners
};

// TEMPORAL: visor del diagnóstico del escáner guardado en localStorage.
// Sobrevive a que la pestaña se cuelgue/recargue (a diferencia del estado en memoria
// del modal del escáner). Remover junto con el resto del código de diagnóstico.
function DebugScannerViewer() {
  const [log, setLog] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('debug_escaner_log');
    if (raw) {
      try {
        setLog(JSON.parse(raw));
      } catch {
        setLog(null);
      }
    }
  }, []);

  if (!log || log.length === 0) return null;

  const texto = log.join('\n');

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {open ? (
        <div className="w-[calc(100vw-2rem)] max-w-md bg-black/95 text-amber-300 rounded-2xl shadow-2xl border border-amber-500/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider">Diagnóstico del escáner</span>
            <button onClick={() => setOpen(false)} className="text-white text-xs px-2 cursor-pointer">✕</button>
          </div>
          <pre className="text-[9px] font-mono whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">{texto}</pre>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(texto)}
              className="flex-1 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-bold cursor-pointer"
            >
              Copiar
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('debug_escaner_log');
                setLog(null);
              }}
              className="flex-1 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-bold cursor-pointer"
            >
              Borrar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-full bg-amber-500 text-black text-[10px] font-bold shadow-xl cursor-pointer"
        >
          🐞 Ver diagnóstico del escáner
        </button>
      )}
    </div>
  );
}

// Componente para proteger rutas administrativas
function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Barra de Navegación Móvil para la administración
function AdminMobileNav() {
  const adminRoutes = routesConfig.filter(
    (route) => route.isAdmin && (route.requiredPackage === 'core' || route.requiredPackage === BUSINESS_CONFIG.tipo)
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border-custom flex items-center justify-around z-40 px-2 shadow-lg">
      {adminRoutes.map((route) => {
        const Icon = route.icon;
        return (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
                isActive ? 'text-primary font-bold' : 'text-text-secondary hover:text-text-primary'
              }`
            }
          >
            {Icon && <Icon size={20} />}
            <span className="text-[9px] mt-0.5 font-bold tracking-tight">{route.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// Layout principal que organiza el sidebar y header en admin
function AdminLayout({ user, setUser, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg-primary text-text-primary transition-colors duration-200">
      <Header user={user} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 flex-row relative">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <AdminMobileNav />
    </div>
  );
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Escuchar estado de autenticación en Supabase o mock
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };

    checkUser();

    // Suscribirse a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Inyectar colores de marca en variables de CSS al iniciar, y reaccionar al toggle de tema
  useEffect(() => {
    applyTheme(getEffectiveTheme());

    const handleThemeChange = () => applyTheme(getEffectiveTheme());
    window.addEventListener('theme_changed', handleThemeChange);
    return () => window.removeEventListener('theme_changed', handleThemeChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg-primary flex flex-col items-center justify-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-text-secondary font-medium">Iniciando aplicación...</p>
      </div>
    );
  }

  // Filtrar rutas válidas para el paquete de negocio configurado
  const activeRoutes = routesConfig.filter(route => 
    route.requiredPackage === 'core' || route.requiredPackage === BUSINESS_CONFIG.tipo
  );

  return (
    <BrowserRouter>
      <DebugScannerViewer />
      <Routes>
        {activeRoutes.map((route) => {
          const PageComponent = componentMapping[route.component];
          if (!PageComponent) return null;

          if (route.isAdmin) {
            return (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute user={user}>
                    <AdminLayout user={user} setUser={setUser}>
                      <PageComponent />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
            );
          } else {
            // Rutas públicas (ej. Catálogo y Login)
            return (
              <Route
                key={route.path}
                path={route.path}
                element={
                  route.component === 'Login' ? (
                    <Login setUser={setUser} />
                  ) : (
                    <PageComponent />
                  )
                }
              />
            );
          }
        })}
        {/* Redirección por defecto si no coincide ninguna ruta */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default MainApp;
