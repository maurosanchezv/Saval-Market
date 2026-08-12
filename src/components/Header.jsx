import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, LogOut, Store, ArrowLeft, ShieldAlert, Menu, Sun, Moon } from 'lucide-react';
import { getBusinessConfig, getEffectiveTheme, setEffectiveTheme } from '../config/businessConfig';
import { supabase, isUsingMock } from '../supabaseClient';
import logoImg from '../assets/logo.png';

export default function Header({ cartCount, onCartClick, user, onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  const [currentUser, setCurrentUser] = useState(user || null);
  const [businessConfig, setBusinessConfig] = useState(getBusinessConfig());
  const [theme, setTheme] = useState(getEffectiveTheme());

  useEffect(() => {
    const handleConfigUpdate = () => {
      setBusinessConfig(getBusinessConfig());
    };
    window.addEventListener('business_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('business_config_updated', handleConfigUpdate);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setEffectiveTheme(nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setCurrentUser(data.user);
      });
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });
      return () => subscription?.unsubscribe();
    }
  }, [user]);

  // Animación del carrito
  const [isPopping, setIsPopping] = useState(false);
  const prevCartCount = React.useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setIsPopping(true);
      const timer = setTimeout(() => setIsPopping(false), 300);
      return () => clearTimeout(timer);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-custom bg-bg-secondary/80 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Izquierda: Logo / Volver */}
        <div className="flex items-center gap-3">
          {isAdminPath ? (
            <div className="flex items-center gap-2">
              {onMenuToggle && (
                <button
                  onClick={onMenuToggle}
                  className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer mr-1"
                  title="Alternar Menú"
                >
                  <Menu size={20} />
                </button>
              )}
              <button 
                onClick={() => navigate('/')} 
                className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Ver Tienda</span>
              </button>
            </div>
          ) : (
            <div 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 select-none cursor-pointer"
            >
              {businessConfig.logoUrl ? (
                <img 
                  src={businessConfig.logoUrl} 
                  alt={businessConfig.nombre} 
                  className="h-8 w-auto object-contain max-w-[160px]" 
                />
              ) : (
                <span
                  className="text-xl tracking-tight text-text-primary uppercase font-black"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {businessConfig.nombre}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Centro: Notificación de modo Mock/Desarrollo */}
        {isUsingMock && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium animate-pulse">
            <ShieldAlert size={14} />
            <span>Modo Demostración (LocalDB)</span>
          </div>
        )}

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-3">
          {/* Toggle de Tema Claro/Oscuro */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-primary transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!isAdminPath ? (
            <>
              {/* Indicador de Ubicación y Teléfono en la Cabecera */}
              <div className="hidden sm:flex items-center gap-3 text-xs font-semibold text-text-secondary border-r border-border-custom pr-3">
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {businessConfig.direccion || 'Paraguay'}
                </span>
              </div>

              {/* Acceso Admin (Solo si está logueado) */}
              {currentUser && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors cursor-pointer animate-fade-in"
                >
                  Panel Admin
                </button>
              )}
            </>
          ) : (
            currentUser && (
              <div className="flex items-center gap-4">
                <span className="hidden md:inline text-xs text-text-secondary font-medium">
                  {currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-custom text-xs font-semibold text-text-secondary hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
