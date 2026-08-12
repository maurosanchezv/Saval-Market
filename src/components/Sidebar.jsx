import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { routesConfig } from '../config/routesConfig';
import { getBusinessConfig } from '../config/businessConfig';
import { Store } from 'lucide-react';

export default function Sidebar({ isOpen }) {
  const [businessConfig, setBusinessConfig] = useState(getBusinessConfig());

  useEffect(() => {
    const handleConfigUpdate = () => {
      setBusinessConfig(getBusinessConfig());
    };
    window.addEventListener('business_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('business_config_updated', handleConfigUpdate);
  }, []);

  // Filtrar rutas administrativas correspondientes al rubro actual
  const adminRoutes = routesConfig.filter(
    (route) => route.isAdmin && (route.requiredPackage === 'core' || route.requiredPackage === businessConfig.tipo)
  );

  return (
    <aside className={`border-r border-border-custom bg-bg-secondary hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 transition-all duration-300 ease-in-out shrink-0
      ${isOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'}
    `}>
      
      {/* Información del Negocio en Admin */}
      <div className="p-6 border-b border-border-custom shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-text-primary truncate max-w-[130px]">
              {businessConfig.nombre}
            </h2>
            <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">
              Administración
            </p>
          </div>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {adminRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary-soft/50 text-primary border-l-4 border-primary pl-3'
                    : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
                }`
              }
            >
              {Icon && <Icon size={18} />}
              <span>{route.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-border-custom text-center shrink-0">
        <p className="text-[10px] text-text-muted font-medium">
          Boilerplate v4.0.0-Beta
        </p>
      </div>
    </aside>
  );
}
