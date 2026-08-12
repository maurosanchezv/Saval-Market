# Plan de Implementación: Plantilla Base Multi-Rubro (SaaS Boilerplate)

Este documento contiene el plano técnico y el plan de implementación para construir una **plantilla base reutilizable** que sirva como punto de partida para cualquier cliente que llegue: despensa, tienda de ropa, panadería, dentista, veterinaria, peluquería, etc.

**Estrategia de reuso: Fork por cliente.** Cada vez que llega un pedido nuevo, se hace un fork de esta plantilla y se le "enchufa" el paquete de funcionalidades correspondiente al rubro (ver Fase 3). No es multi-tenant — cada cliente tiene su propio proyecto de Supabase y su propio despliegue.

La arquitectura utiliza **Vite + React (Frontend)**, **Tailwind CSS (Diseño)** y **Supabase (Base de datos, Auth y Storage)**.

---

## 🏗️ Arquitectura General

```
[Cliente / Navegador]
       │
       ▼ (React Hooks / Fetch)
[Supabase Client JS]
   ├───► [Autenticación / Login] ──► (Supabase Auth + tabla usuarios)
   ├───► [Consultas SQL protegidas por RLS] ──► [Base de Datos PostgreSQL]
   └───► [Guardar Fotos] ──► (Supabase Storage)
```

La plantilla se divide en tres capas:

1. **CORE** — lo que todo negocio necesita sin importar el rubro (login, usuarios/roles, clientes, dashboard, configuración de marca).
2. **PAQUETE A — Venta de productos** — para negocios que venden algo físico (despensa, ropa, panadería).
3. **PAQUETE B — Turnos y servicios** — para negocios que agendan citas (dentista, veterinaria, peluquería).

**Cómo conviven los paquetes en el código:** en vez de borrar y copiar archivos físicamente al iniciar cada cliente, los dos paquetes viven siempre juntos en el mismo repo, y se activan o desactivan según `BUSINESS_CONFIG.tipo` (rutas y menú del Sidebar condicionales). La ventaja es que la plantilla base sigue siendo un único repo "madre": cuando le corregís un bug o le sumás una mejora al Paquete A, después podés traer ese cambio a los proyectos de clientes ya entregados con un simple `git pull` / merge, en vez de tener que repetir el fix a mano en cada fork. Borrar físicamente el paquete que no se usa queda como una opción opcional de limpieza final, no como el mecanismo de trabajo.

---

## 🗄️ Fase 1: CORE — Base de Datos y Seguridad

Esto se instala siempre, en todos los proyectos, sin excepción.

### 1.1 Tabla de usuarios y roles

Supabase Auth ya maneja el login (`auth.users`), pero necesitamos una tabla propia para guardar el rol de cada persona dentro del negocio:

```sql
-- Tabla de usuarios del sistema (vinculada a auth.users)
create table usuarios (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  rol text not null default 'empleado', -- 'admin', 'empleado'
  activo boolean default true,
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Función que crea automáticamente el registro en "usuarios" cuando alguien se registra
-- Nota: usa coalesce porque "nombre" no siempre viene en raw_user_meta_data
-- (ej: si el usuario se crea desde el dashboard de Supabase o vía magic link sin ese campo).
-- Sin el coalesce, "nombre" quedaría null y podría romper validaciones más adelante.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1), 'Sin nombre'),
    'empleado'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 1.2 Tabla de clientes/pacientes

Todo negocio, venda productos o servicios, necesita saber quién le compra:

```sql
create table clientes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  notas text, -- útil para veterinaria/dentista: alergias, historial breve, etc.
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 1.3 Row Level Security (RLS) — obligatorio

Sin esto, cualquiera con la `anon key` puede leer y escribir toda la base. Se activa en **todas** las tablas:

```sql
-- Activar RLS
alter table usuarios enable row level security;
alter table clientes enable row level security;

-- Solo usuarios autenticados y activos pueden leer/escribir
create policy "Usuarios autenticados pueden ver clientes"
  on clientes for select
  using (auth.uid() is not null);

create policy "Usuarios autenticados pueden crear/editar clientes"
  on clientes for insert
  with check (auth.uid() is not null);

create policy "Usuarios autenticados pueden actualizar clientes"
  on clientes for update
  using (auth.uid() is not null);

-- Un usuario puede ver su propio registro; solo admins ven todos
create policy "Ver propio usuario"
  on usuarios for select
  using (auth.uid() = id);

create policy "Admins ven todos los usuarios"
  on usuarios for select
  using (
    exists (select 1 from usuarios where id = auth.uid() and rol = 'admin')
  );
```

> **Regla general para el resto de las tablas (Paquete A y B):** siempre `enable row level security` + policy mínima de "solo autenticados". Se puede refinar por rol más adelante (ej: solo admin puede eliminar).

### 1.4 Configuración de marca (White-labeling)

Se resuelve con **CSS custom properties**, no con clases dinámicas de Tailwind (Tailwind compila las clases en build time, así que un valor JS dinámico tipo `bg-[#FF7A59]` no funciona en runtime).

`src/config/businessConfig.js`:
```javascript
export const BUSINESS_CONFIG = {
  nombre: "Despensa El Barrio",
  tipo: "productos", // "productos" | "servicios"  <-- define qué paquete se activa
  moneda: "$",
  colores: {
    primary: "#FF7A59",
    secondary: "#121826"
  }
};
```

Inyección en `src/index.css` (o en un `useEffect` en `App.jsx`):
```javascript
document.documentElement.style.setProperty('--color-primary', BUSINESS_CONFIG.colores.primary);
document.documentElement.style.setProperty('--color-secondary', BUSINESS_CONFIG.colores.secondary);
```

Y en Tailwind (`tailwind.config.js`), se referencian esas variables:
```javascript
theme: {
  extend: {
    colors: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
    }
  }
}
```

Así, cambiar de cliente es solo tocar `businessConfig.js` y las clases `bg-primary`, `text-primary`, etc. ya reaccionan solas.

---

## 🛠️ Fase 2: Setup del Proyecto Frontend

```bash
npx -y create-vite@latest admin-template --template react
npm install @supabase/supabase-js react-router-dom lucide-react recharts
```

`src/supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Estructura de carpetas

```
src/
├── components/
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   └── StatCard.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Clientes.jsx        <- CORE
│   ├── Login.jsx           <- CORE
│   │
│   ├── Inventario.jsx      <- PAQUETE A (siempre presente en el repo)
│   ├── PuntoVenta.jsx      <- PAQUETE A (siempre presente en el repo)
│   │
│   ├── Agenda.jsx          <- PAQUETE B (siempre presente en el repo)
│   └── Turnos.jsx          <- PAQUETE B (siempre presente en el repo)
├── config/
│   └── businessConfig.js
├── App.jsx
└── index.css
```

Los dos paquetes existen siempre en el repo; lo que cambia por cliente es cuáles rutas se registran y cuáles ítems aparecen en el Sidebar, según `BUSINESS_CONFIG.tipo`. En vez de repetir `if (BUSINESS_CONFIG.tipo === '...')` por separado en `App.jsx` y en `Sidebar.jsx`, se centraliza todo en un archivo de configuración declarativo — así hay un solo lugar para auditar qué rutas existen, a qué paquete pertenecen y qué roles pueden verlas.

`src/config/routesConfig.js`:
```javascript
import { LayoutDashboard, Users, Package, ShoppingCart, Calendar, Clock } from 'lucide-react';

export const routesConfig = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    component: "Dashboard",
    roles: ["admin", "empleado"],
    requiredPackage: "core"
  },
  {
    path: "/clientes",
    label: "Clientes",
    icon: Users,
    component: "Clientes",
    roles: ["admin", "empleado"],
    requiredPackage: "core"
  },
  // Paquete A: Productos
  {
    path: "/inventario",
    label: "Inventario",
    icon: Package,
    component: "Inventario",
    roles: ["admin", "empleado"],
    requiredPackage: "productos"
  },
  {
    path: "/punto-venta",
    label: "Punto de Venta",
    icon: ShoppingCart,
    component: "PuntoVenta",
    roles: ["admin", "empleado"],
    requiredPackage: "productos"
  },
  // Paquete B: Servicios
  {
    path: "/agenda",
    label: "Agenda",
    icon: Calendar,
    component: "Agenda",
    roles: ["admin", "empleado"],
    requiredPackage: "servicios"
  },
  {
    path: "/turnos",
    label: "Turnos",
    icon: Clock,
    component: "Turnos",
    roles: ["admin", "empleado"],
    requiredPackage: "servicios"
  }
];
```

Tanto `App.jsx` (rutas) como `Sidebar.jsx` (menú) se generan filtrando este mismo array, así nunca quedan desincronizados entre sí:
```javascript
const routesActivas = routesConfig.filter(route =>
  route.requiredPackage === "core" || route.requiredPackage === BUSINESS_CONFIG.tipo
);
```

Este mismo archivo queda listo para cuando se agregue control de roles más fino (por ahora `admin` y `empleado` ven las mismas rutas, pero el campo `roles` ya está preparado para diferenciarlos).

---

## 📦 Fase 3: PAQUETE A — Venta de Productos

Para: despensa, tienda de ropa, panadería, ferretería, etc.

### 3.1 Tablas

```sql
create table productos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  precio_venta numeric(10,2) not null,
  precio_costo numeric(10,2),
  stock integer default 0,
  categoria text default 'General',
  imagen_url text,
  activo boolean default true, -- si es false, no aparece en el catálogo público pero sigue disponible en Punto de Venta (útil para verdulería/frutería con oferta diaria variable)
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

create table ventas (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nombre text, -- nombre tipeado en el checkout del catálogo (pedidos sin cliente registrado)
  hora_retiro text, -- texto libre ("Hoy lo antes posible" o fecha/hora programada)
  estado text default 'completado', -- completado (venta de caja), pendiente/entregado/cancelado (pedido de WhatsApp)
  metodo_cobro text, -- Efectivo/Transferencia/Tarjeta, se completa recién al entregar el pedido (null hasta entonces)
  total numeric(10,2) not null,
  metodo_pago text default 'Efectivo', -- canal de origen de la venta: 'Efectivo'/'Débito'/'Transferencia' (caja) o 'WhatsApp' (catálogo online)
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

create table detalles_venta (
  id uuid default gen_random_uuid() primary key,
  venta_id uuid references ventas(id) on delete cascade not null,
  producto_id uuid references productos(id) on delete set null,
  cantidad integer not null,
  precio_unitario numeric(10,2) not null
);

alter table productos enable row level security;
alter table ventas enable row level security;
alter table detalles_venta enable row level security;

create policy "Autenticados acceden a productos" on productos for all using (auth.uid() is not null);
create policy "Autenticados acceden a ventas" on ventas for all using (auth.uid() is not null);
create policy "Autenticados acceden a detalles_venta" on detalles_venta for all using (auth.uid() is not null);
```

### 3.2 Función atómica para descontar stock (corrige el bug anterior)

El código anterior nunca restaba el stock, y si dos cajeros venden el mismo producto al mismo tiempo, se puede generar stock negativo. Se resuelve con una función en Postgres (RPC) que descuenta de forma atómica:

```sql
create or replace function registrar_venta(
  p_cliente_id uuid,
  p_items jsonb, -- [{ "producto_id": "...", "cantidad": 2 }, ...]
  p_metodo_pago text,
  p_cliente_nombre text default null,
  p_hora_retiro text default null,
  p_estado text default 'completado'
)
returns uuid as $$
declare
  v_venta_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_precio numeric;
  v_stock_actual integer;
begin
  -- Calcular total y validar stock
  for v_item in select * from jsonb_array_elements(p_items) loop
    select precio_venta, stock into v_precio, v_stock_actual
    from productos where id = (v_item->>'producto_id')::uuid
    for update; -- bloquea la fila para evitar condiciones de carrera

    -- Si el producto no existe, la fila anterior no encuentra nada y v_precio queda null.
    -- Sin este chequeo, la venta se registraría igual con un total mal calculado (fallo silencioso).
    if not found then
      raise exception 'Producto % no existe', v_item->>'producto_id';
    end if;

    if v_stock_actual < (v_item->>'cantidad')::integer then
      raise exception 'Stock insuficiente para producto %', v_item->>'producto_id';
    end if;

    v_total := v_total + (v_precio * (v_item->>'cantidad')::integer);
  end loop;

  -- Crear la venta
  insert into ventas (cliente_id, total, metodo_pago, cliente_nombre, hora_retiro, estado)
  values (p_cliente_id, v_total, p_metodo_pago, p_cliente_nombre, p_hora_retiro, p_estado)
  returning id into v_venta_id;

  -- Crear detalles y descontar stock
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into detalles_venta (venta_id, producto_id, cantidad, precio_unitario)
    select v_venta_id, (v_item->>'producto_id')::uuid, (v_item->>'cantidad')::integer, precio_venta
    from productos where id = (v_item->>'producto_id')::uuid;

    update productos set stock = stock - (v_item->>'cantidad')::integer
    where id = (v_item->>'producto_id')::uuid;
  end loop;

  return v_venta_id;
end;
$$ language plpgsql;
```

Llamado desde React (reemplaza la lógica manual de `finalizarVenta`):
```javascript
const finalizarVenta = async () => {
  const items = carrito.map(item => ({
    producto_id: item.id,
    cantidad: item.cantidad
  }));

  const { data, error } = await supabase.rpc('registrar_venta', {
    p_cliente_id: clienteSeleccionado?.id || null,
    p_items: items,
    p_metodo_pago: metodoPago
  });

  if (error) return alert('Error al registrar la venta: ' + error.message);

  setCarrito([]);
  alert('¡Venta realizada con éxito!');
};
```

> Nota: la pantalla `Pedidos.jsx` (gestión de pedidos hechos por el catálogo vía WhatsApp) cambia `estado` con un `update().eq('id', ...)` simple en vez de borrado físico, para mantener historial de pedidos cancelados (mismo criterio de soft-delete usado en `turnos`, ver Fase 4). Al cancelar o editar cantidades de un pedido, el stock se devuelve producto por producto con `update` sobre `productos` — no hay un RPC atómico equivalente a `registrar_venta` para esto todavía; si el negocio necesita alta concurrencia ahí (varios cajeros editando pedidos a la vez), conviene migrar esa lógica a una función `actualizar_pedido(p_venta_id, p_items)` con el mismo patrón de `for update` que ya usa `registrar_venta`.

---

## 📅 Fase 4: PAQUETE B — Turnos y Servicios

Para: dentista, veterinaria, peluquería, consultorios en general.

### 4.1 Tablas

```sql
create table servicios (
  id uuid default gen_random_uuid() primary key,
  nombre text not null, -- ej: "Limpieza dental", "Baño y corte", "Consulta general"
  duracion_minutos integer not null default 30,
  precio numeric(10,2) not null,
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

create table turnos (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade not null,
  servicio_id uuid references servicios(id) on delete set null,
  usuario_id uuid references usuarios(id) on delete set null, -- quién lo atiende
  fecha_hora timestamp with time zone not null,
  estado text default 'pendiente', -- pendiente, confirmado, completado, cancelado
  notas text,
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table servicios enable row level security;
alter table turnos enable row level security;

create policy "Autenticados acceden a servicios" on servicios for all using (auth.uid() is not null);
create policy "Autenticados acceden a turnos" on turnos for all using (auth.uid() is not null);
```

> Nota: se usa `estado` como texto simple en vez de borrado físico, para mantener historial de turnos cancelados (mismo criterio de soft-delete que ya usás en GasTubos).

### 4.2 Consulta base de agenda del día

```javascript
const obtenerTurnosDelDia = async (fecha) => {
  const inicio = `${fecha}T00:00:00`;
  const fin = `${fecha}T23:59:59`;

  const { data, error } = await supabase
    .from('turnos')
    .select('*, clientes(nombre, telefono), servicios(nombre, duracion_minutos)')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)
    .order('fecha_hora', { ascending: true });

  return data;
};
```

---

## 📈 Plan de Trabajo

1. **Semana 1: CORE**
   * Crear proyecto Supabase, tablas `usuarios` y `clientes`, activar RLS, configurar el trigger de registro automático de usuario.
   * Armar `Login.jsx`, `Sidebar.jsx`, `Header.jsx` y la inyección de `businessConfig.js` con CSS variables.
2. **Semana 2: Elegir y montar el paquete según el primer cliente real**
   * Si es rubro "productos" → Paquete A (tablas, `Inventario.jsx`, `PuntoVenta.jsx` con la función `registrar_venta`).
   * Si es rubro "servicios" → Paquete B (tablas, `Agenda.jsx`, `Turnos.jsx`).
3. **Semana 3: Dashboard y reportes**
   * Gráficos con `recharts`: ventas del día/semana (Paquete A) o turnos del día/próximos (Paquete B).
4. **Semana 4: Pulido y checklist de entrega por cliente**
   * Verificar RLS activo en todas las tablas, `businessConfig.js` actualizado, variables de entorno de Supabase configuradas, dominio/despliegue del cliente.

---

## ✅ Checklist rápido al iniciar un cliente nuevo

- [ ] Fork del repo base
- [ ] Nuevo proyecto en Supabase (URL + anon key en `.env`)
- [ ] Ejecutar script CORE (usuarios, clientes, RLS, trigger)
- [ ] Ejecutar script del Paquete correspondiente (A o B)
- [ ] Completar `businessConfig.js` (nombre, tipo, colores)
- [ ] Crear primer usuario admin
- [ ] Probar flujo completo (login → operación principal → dashboard)

---

## 🔮 Mejoras futuras opcionales (no forman parte del plan de las 4 semanas)

Estas ideas surgieron de un análisis adicional del plan. Son válidas y pueden sumar valor más adelante, pero agregarlas ahora retrasaría el objetivo principal: tener una base simple y funcional para empezar a tomar clientes. Quedan anotadas para revisar cuando la plantilla ya esté rodando con algunos clientes reales.

- **Sistema de tokens de diseño en 3 capas (Primitivo → Semántico → Componente) + modo oscuro.** Útil en productos SaaS grandes con equipo de diseño dedicado. Para el perfil de cliente actual (negocios chicos e informales), las 2-3 variables CSS que ya usa la plantilla (`--color-primary`, `--color-secondary`) son suficientes.
- **Layout tipo "Bento Grid" para el Dashboard.** Mejora estética interesante, pero conviene evaluarla recién cuando el CORE y los paquetes A/B ya estén funcionando — hoy sería pulir el diseño de algo que todavía no existe.
- **Suite de pruebas automatizadas end-to-end (Playwright).** Buena práctica de ingeniería en general, pero representa overhead considerable para un template mantenido por una sola persona. Tiene más sentido incorporarla una vez que haya varios clientes reales usando el sistema y el costo de una regresión sea mayor que el costo de escribir y mantener los tests.
