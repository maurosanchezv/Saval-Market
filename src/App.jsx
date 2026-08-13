import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
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
import Finanzas from './pages/Finanzas';

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
  Banners,
  Finanzas
};

// Componente para proteger rutas administrativas
function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Barra de Navegación Móvil para la administración: solo los 4 accesos esenciales del
// día a día (marcados con mobilePrimary en routesConfig) + un botón "Más" que abre un
// drawer con el resto de los módulos administrativos (Clientes, Banners, Configuración, etc.)
function AdminMobileNav() {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isRouteActive = (route) =>
    route.isAdmin && (route.requiredPackage === 'core' || route.requiredPackage === BUSINESS_CONFIG.tipo);

  const primaryRoutes = routesConfig.filter((route) => isRouteActive(route) && route.mobilePrimary);
  const secondaryRoutes = routesConfig.filter((route) => isRouteActive(route) && !route.mobilePrimary);

  const isOnSecondaryRoute = secondaryRoutes.some((route) => location.pathname.startsWith(route.path));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border-custom flex items-center justify-around z-40 px-2 shadow-lg">
        {primaryRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.path}
              to={route.path}
              onClick={() => setIsMoreOpen(false)}
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

        {secondaryRoutes.length > 0 && (
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
              isOnSecondaryRoute ? 'text-primary font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Menu size={20} />
            <span className="text-[9px] mt-0.5 font-bold tracking-tight">Más</span>
          </button>
        )}
      </nav>

      {/* Drawer "Más": módulos administrativos secundarios, en una hoja que sube desde abajo */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-custom rounded-t-3xl shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-custom sticky top-0 bg-bg-secondary">
              <h3 className="font-heading font-bold text-sm text-text-primary">Más opciones</h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {secondaryRoutes.map((route) => {
                const Icon = route.icon;
                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary-soft/50 text-primary'
                          : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
                      }`
                    }
                  >
                    {Icon && <Icon size={18} />}
                    <span>{route.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
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
