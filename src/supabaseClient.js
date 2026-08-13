import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inicializar base de datos mock en localStorage con productos en Guaraníes (Gs.)
const initMockDB = () => {
  const initialProducts = [
    { id: '1', nombre: 'Coca Cola Sabor Original 2L', descripcion: 'Gaseosa refrescante sabor original en envase descartable', precio_venta: 12000, precio_costo: 8500, stock: 24, categoria: 'Bebidas', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300' },
    { id: '2', nombre: 'Pulp Guaraná 2L', descripcion: 'Gaseosa sabor guaraná original de industria nacional paraguaya', precio_venta: 9500, precio_costo: 6800, stock: 30, categoria: 'Bebidas', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&q=80&w=300' },
    { id: '3', nombre: 'Fanta Naranja 2L', descripcion: 'Gaseosa sabor naranja refrescante de 2 litros', precio_venta: 10500, precio_costo: 7500, stock: 18, categoria: 'Bebidas', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?auto=format&fit=crop&q=80&w=300' },
    { id: '4', nombre: 'Sprite Limón 2L', descripcion: 'Gaseosa sabor lima-limón en envase de 2 litros', precio_venta: 11000, precio_costo: 7800, stock: 15, categoria: 'Bebidas', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=300' },
    { id: '5', nombre: 'Paso de los Toros Pomelo 1.5L', descripcion: 'Agua tónica sabor pomelo bien refrescante de 1.5 litros', precio_venta: 9000, precio_costo: 6200, stock: 12, categoria: 'Bebidas', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1527960656306-ee376a809b68?auto=format&fit=crop&q=80&w=300' },

    { id: '6', nombre: 'Galletitas Mabel Rellenas Limón 140g', descripcion: 'Galletitas rellenas sabor a limón Mabel', precio_venta: 3500, precio_costo: 2400, stock: 20, categoria: 'Almacén', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=300' },
    { id: '7', nombre: 'Obleas Mabel Frutilla 120g', descripcion: 'Obleas crujientes con relleno sabor frutilla Mabel', precio_venta: 3000, precio_costo: 2000, stock: 25, categoria: 'Almacén', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1558961309-dbdf0f6580ef?auto=format&fit=crop&q=80&w=300' },
    { id: '8', nombre: 'Oreo Original 117g', descripcion: 'Galletitas rellenas de chocolate Oreo', precio_venta: 7500, precio_costo: 5200, stock: 15, categoria: 'Almacén', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1558961309-dbdf0f6580ef?auto=format&fit=crop&q=80&w=300' },

    { id: '9', nombre: 'Coquito Casero Saval (al peso)', descripcion: 'Coquito crujiente tradicional elaborado por Saval Market (precio por kg)', precio_venta: 16000, precio_costo: 10000, stock: 40, categoria: 'Panadería', unidad_medida: 'kg', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300' },
    { id: '10', nombre: 'Pan Lactal Lactolanda Familiar', descripcion: 'Pan de molde blanco Lactolanda Familiar', precio_venta: 14000, precio_costo: 9800, stock: 10, categoria: 'Panadería', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300' },

    { id: '11', nombre: 'Fideos Tallarín Anita 400g', descripcion: 'Fideos de sémola de trigo candeal tipo tallarín', precio_venta: 4200, precio_costo: 2900, stock: 35, categoria: 'Almacén', unidad_medida: 'un', tasa_iva: 5, imagen_url: 'https://images.unsplash.com/photo-1612966608967-30924e4af31a?auto=format&fit=crop&q=80&w=300' },
    { id: '12', nombre: 'Fideos Tirabuzón Federal 400g', descripcion: 'Fideos tipo tirabuzón de Federal', precio_venta: 4500, precio_costo: 3100, stock: 30, categoria: 'Almacén', unidad_medida: 'un', tasa_iva: 5, imagen_url: 'https://images.unsplash.com/photo-1612966608967-30924e4af31a?auto=format&fit=crop&q=80&w=300' },

    { id: '13', nombre: 'Leche Entera Trébol UHT 1L', descripcion: 'Leche entera fresca Coop Trébol de producción nacional', precio_venta: 7200, precio_costo: 5000, stock: 24, categoria: 'Lácteos', unidad_medida: 'un', tasa_iva: 5, imagen_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300' },
    { id: '14', nombre: 'Yogur Entero Lactolanda Frutilla 1L', descripcion: 'Yogur bebible sabor a frutilla de Lactolanda', precio_venta: 11500, precio_costo: 8000, stock: 12, categoria: 'Lácteos', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=300' },

    { id: '15', nombre: 'Papas Fritas Lays Clásicas 120g', descripcion: 'Papas fritas saladas crujientes tradicionales', precio_venta: 12500, precio_costo: 8500, stock: 14, categoria: 'Almacén', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d20?auto=format&fit=crop&q=80&w=300' },

    { id: '16', nombre: 'Detergente Líquido Activo Limón 750ml', descripcion: 'Detergente lavavajillas con alto poder desengrasante cítrico', precio_venta: 6800, precio_costo: 4800, stock: 10, categoria: 'Limpieza', unidad_medida: 'un', tasa_iva: 10, imagen_url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=300' },

    { id: '17', nombre: 'Tomate Perita (al kg)', descripcion: 'Tomate fresco de la zona, ideal para salsas (precio por kg)', precio_venta: 6000, precio_costo: 3800, stock: 2.5, categoria: 'Verdulería', unidad_medida: 'kg', tasa_iva: 5, imagen_url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&q=80&w=300', activo: true },
    { id: '18', nombre: 'Banana de Estación (por docena)', descripcion: 'Banana madura seleccionada (precio por docena)', precio_venta: 10000, precio_costo: 6000, stock: 4, categoria: 'Verdulería', unidad_medida: 'docena', tasa_iva: 5, imagen_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=300', activo: true }
  ];

  const existingProds = localStorage.getItem('mock_saval_productos');
  if (!existingProds) {
    localStorage.setItem('mock_saval_productos', JSON.stringify(initialProducts));
  } else {
    // Si ya existían productos en localStorage, migrar y asegurar unidades de medida
    try {
      const list = JSON.parse(existingProds);
      const newList = list.map(p => {
        if (p.id === '18' || p.nombre.toLowerCase().includes('banana por docena')) {
          return { ...p, nombre: 'Banana de Estación (por docena)', unidad_medida: 'docena', activo: true, tasa_iva: p.tasa_iva ?? 5 };
        }
        if (p.id === '17' || p.nombre.toLowerCase().includes('tomate')) {
          return { ...p, unidad_medida: 'kg', activo: true, tasa_iva: p.tasa_iva ?? 5 };
        }
        return { ...p, unidad_medida: p.unidad_medida || 'un', tasa_iva: p.tasa_iva ?? 10 };
      });
      localStorage.setItem('mock_saval_productos', JSON.stringify(newList));
    } catch (e) {
      localStorage.setItem('mock_saval_productos', JSON.stringify(initialProducts));
    }
  }
  if (!localStorage.getItem('mock_saval_clientes')) {
    localStorage.setItem('mock_saval_clientes', JSON.stringify([
      { id: 'c1', nombre: 'Juan Pérez (San Lorenzo)', telefono: '0981123456', email: 'juan@email.com', creado_en: new Date().toISOString() },
      { id: 'c2', nombre: 'María Rodríguez (San Lorenzo)', telefono: '0971987654', email: 'maria@email.com', creado_en: new Date().toISOString() }
    ]));
  }
  if (!localStorage.getItem('mock_saval_ventas')) {
    localStorage.setItem('mock_saval_ventas', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_saval_usuarios')) {
    localStorage.setItem('mock_saval_usuarios', JSON.stringify([
      { id: 'u1', nombre: 'Admin Saval', rol: 'admin', activo: true }
    ]));
  }
  if (!localStorage.getItem('mock_saval_banners')) {
    localStorage.setItem('mock_saval_banners', JSON.stringify([
      { id: 'b1', titulo: 'Verdulería Fresca al Mejor Precio', subtitulo: 'Tomate perita, bananas por docena y productos seleccionados de la zona.', badge: '⚖️ Productos por Kilo & Docena', boton_texto: 'Ver Verdulería', categoria_destino: 'Verdulería', imagen_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=1200', orden: 1, activo: true },
      { id: 'b2', titulo: 'Bebidas Frías Listas para Llevar', subtitulo: 'Gaseosas de 2L, jugos en polvo, jugos naturales y cervezas heladas.', badge: '🥤 Bebidas & Refrescos', boton_texto: 'Ver Bebidas', categoria_destino: 'Bebidas', imagen_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=1200', orden: 2, activo: true },
      { id: 'b3', titulo: 'Coquito Casero & Panadería Saval', subtitulo: 'Fritos, pan lactal y coquitos crujientes al peso elaborados todos los días.', badge: '🥐 Horneado Fresco Todos los Días', boton_texto: 'Ver Panadería', categoria_destino: 'Panadería', imagen_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200', orden: 3, activo: true },
      { id: 'b4', titulo: 'Hacé tu Pedido Online y Retirá Sin Filas', subtitulo: 'Armá tu lista desde tu celular y pasá a retirar por el local.', badge: '⚡ Servicio Pickup Rápido', boton_texto: 'Ver Todo el Catálogo', categoria_destino: 'Todos', imagen_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200', orden: 4, activo: true }
    ]));
  }
};

// Instanciar cliente real o mockup
export let supabase;
export let isUsingMock = false;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  isUsingMock = true;
  initMockDB();

  // Mock client simulation
  supabase = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        if (email.includes('admin') && password === '123') {
          const user = { id: 'u1', email, user_metadata: { nombre: 'Admin Saval' } };
          localStorage.setItem('mock_session', JSON.stringify(user));
          return { data: { user, session: { access_token: 'mock-token' } }, error: null };
        }
        return { data: { user: null, session: null }, error: { message: 'Credenciales inválidas. Utiliza usuario "admin" y contraseña "123".' } };
      },
      signOut: async () => {
        localStorage.removeItem('mock_session');
        return { error: null };
      },
      getUser: async () => {
        const session = localStorage.getItem('mock_session');
        return { data: { user: session ? JSON.parse(session) : null }, error: null };
      },
      onAuthStateChange: () => {
        return {
          data: {
            subscription: {
              unsubscribe: () => {}
            }
          }
        };
      }
    },
    from: (table) => {
      const storageKey = `mock_saval_${table}`;
      const getData = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
      const setData = (data) => localStorage.setItem(storageKey, JSON.stringify(data));

      return {
        select: () => {
          let currentData = getData();

          const chain = {
            eq: (field, value) => {
              currentData = currentData.filter(item => item[field] === value);
              return chain;
            },
            gte: (field, value) => {
              currentData = currentData.filter(item => item[field] >= value);
              return chain;
            },
            lte: (field, value) => {
              currentData = currentData.filter(item => item[field] <= value);
              return chain;
            },
            order: (field, { ascending = true } = {}) => {
              currentData.sort((a, b) => {
                if (a[field] < b[field]) return ascending ? -1 : 1;
                if (a[field] > b[field]) return ascending ? 1 : -1;
                return 0;
              });
              return chain;
            },
            single: async () => {
              return { data: currentData[0] || null, error: currentData.length ? null : { message: 'Not found' } };
            },
            then: (resolve) => {
              resolve({ data: currentData, error: null });
            }
          };

          return chain;
        },
        insert: (rowOrRows) => {
          const currentData = getData();
          const newRows = Array.isArray(rowOrRows)
            ? rowOrRows.map(r => ({ id: Math.random().toString(36).substr(2, 9), creado_en: new Date().toISOString(), ...r }))
            : [{ id: Math.random().toString(36).substr(2, 9), creado_en: new Date().toISOString(), ...rowOrRows }];
          
          setData([...currentData, ...newRows]);

          return {
            select: () => ({
              single: async () => ({ data: newRows[0], error: null }),
              then: (resolve) => resolve({ data: newRows, error: null })
            }),
            then: (resolve) => resolve({ data: newRows, error: null })
          };
        },
        update: (updates) => {
          return {
            eq: (matchField, matchValue) => {
              const currentData = getData();
              const updatedData = currentData.map(item => {
                if (item[matchField] === matchValue) {
                  return { ...item, ...updates };
                }
                return item;
              });
              setData(updatedData);
              const updatedRows = updatedData.filter(item => item[matchField] === matchValue);
              return {
                then: (resolve) => resolve({ data: updatedRows, error: null })
              };
            }
          };
        },
        delete: () => {
          return {
            eq: (matchField, matchValue) => {
              const currentData = getData();
              const filteredData = currentData.filter(item => item[matchField] !== matchValue);
              setData(filteredData);
              return {
                then: (resolve) => resolve({ data: null, error: null })
              };
            }
          };
        }
      };
    },
    rpc: async (functionName, args) => {
      if (functionName === 'registrar_venta') {
        const { p_cliente_id, p_items, p_metodo_pago, p_cliente_nombre = null, p_hora_retiro = null, p_estado = 'entregado' } = args;

        try {
          const productos = JSON.parse(localStorage.getItem('mock_saval_productos') || '[]');
          let total = 0;

          // Validar stock primero
          for (const item of p_items) {
            const prod = productos.find(p => p.id === item.producto_id);
            if (!prod) {
              throw new Error(`Producto con ID ${item.producto_id} no existe`);
            }
            if (prod.stock < item.cantidad) {
              throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}`);
            }
            const itemSubtotal = item.monto_fijo || item.subtotal || (prod.precio_venta * item.cantidad);
            total += itemSubtotal;
          }

          // Descontar stock y guardar
          const productosActualizados = productos.map(prod => {
            const item = p_items.find(i => i.producto_id === prod.id);
            if (item) {
              return { ...prod, stock: prod.stock - item.cantidad };
            }
            return prod;
          });
          localStorage.setItem('mock_saval_productos', JSON.stringify(productosActualizados));

          // Registrar venta
          const ventas = JSON.parse(localStorage.getItem('mock_saval_ventas') || '[]');
          const nuevaVenta = {
            id: 'v-' + Math.random().toString(36).substr(2, 9),
            cliente_id: p_cliente_id,
            cliente_nombre: p_cliente_nombre || (p_cliente_id ? null : 'Venta de Caja'),
            hora_retiro: p_hora_retiro || 'Retiro Inmediato',
            estado: p_estado || 'entregado',
            total,
            metodo_pago: p_metodo_pago,
            creado_en: new Date().toISOString(),
            items: p_items
          };
          ventas.push(nuevaVenta);
          localStorage.setItem('mock_saval_ventas', JSON.stringify(ventas));

          return { data: nuevaVenta.id, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      }
      return { data: null, error: { message: 'Función RPC no implementada en el Mock.' } };
    }
  };
}
