import { LayoutDashboard, Users, Package, ShoppingCart, ClipboardList, Settings, Image } from 'lucide-react';

export const routesConfig = [
  // Rutas públicas
  {
    path: "/",
    label: "Catálogo",
    icon: null,
    component: "Catalogo",
    isAdmin: false,
    requiredPackage: "core"
  },
  {
    path: "/login",
    label: "Acceso Admin",
    icon: null,
    component: "Login",
    isAdmin: false,
    requiredPackage: "core"
  },
  // Rutas de administración (Bajo Auth)
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    component: "Dashboard",
    isAdmin: true,
    requiredPackage: "core",
    mobilePrimary: true // se muestra en la barra de navegación inferior en mobile
  },
  {
    path: "/admin/inventario",
    label: "Inventario",
    icon: Package,
    component: "Inventario",
    isAdmin: true,
    requiredPackage: "productos",
    mobilePrimary: true
  },
  {
    path: "/admin/punto-venta",
    label: "Punto de Venta",
    icon: ShoppingCart,
    component: "PuntoVenta",
    isAdmin: true,
    requiredPackage: "productos",
    mobilePrimary: true
  },
  {
    path: "/admin/pedidos",
    label: "Pedidos",
    icon: ClipboardList,
    component: "Pedidos",
    isAdmin: true,
    requiredPackage: "productos",
    mobilePrimary: true
  },
  {
    path: "/admin/clientes",
    label: "Clientes",
    icon: Users,
    component: "Clientes",
    isAdmin: true,
    requiredPackage: "core"
  },
  {
    path: "/admin/banners",
    label: "Banners",
    icon: Image,
    component: "Banners",
    isAdmin: true,
    requiredPackage: "core"
  },
  {
    path: "/admin/configuracion",
    label: "Configuración",
    icon: Settings,
    component: "Configuracion",
    isAdmin: true,
    requiredPackage: "core"
  }
];
