-- ============================================================
-- Esquema Supabase para Saval Market (plantilla react)
-- Ejecutar completo en el SQL Editor de Supabase (Project > SQL Editor > New query)
-- ============================================================

-- ============================================
-- CORE: Clientes
-- ============================================
create table clientes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  notas text,
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- PAQUETE PRODUCTOS: Productos y Ventas
-- ============================================
create table productos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  precio_venta numeric(10,2) not null,
  precio_costo numeric(10,2),
  precio_anterior numeric(10,2), -- precio tachado para ofertas
  stock numeric(10,3) default 0, -- numeric (no integer) para poder vender por kg
  categoria text default 'General',
  unidad_medida text default 'un', -- 'un' | 'kg' | 'docena' | 'mazo'
  tasa_iva integer default 10, -- 10 | 5 (Ley 6380/2019: 5% canasta familiar y frutas/verduras frescas)
  codigo_barras text, -- para buscar/cargar el producto escaneando con la cámara
  imagen_url text,
  activo boolean default true, -- si es false, no aparece en el catálogo público pero sigue en Punto de Venta
  es_novedad boolean default false, -- marca manual para destacar en "Novedades" del catálogo
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

create index productos_codigo_barras_idx on productos (codigo_barras);

create table ventas (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nombre text, -- nombre tipeado en el checkout del catálogo (pedidos sin cliente registrado)
  hora_retiro text,
  estado text default 'entregado', -- entregado (venta de caja) | pendiente/cancelado (pedido de WhatsApp)
  metodo_pago text default 'Efectivo', -- Efectivo | Débito | Transferencia | WhatsApp (canal de origen)
  metodo_cobro text, -- se completa recién al entregar un pedido pendiente
  total numeric(10,2) not null,
  items jsonb not null default '[]'::jsonb, -- [{ "producto_id": "...", "cantidad": 2 }, ...]
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- Row Level Security
-- ============================================
alter table clientes enable row level security;
alter table productos enable row level security;
alter table ventas enable row level security;

create policy "Autenticados acceden a clientes" on clientes for all using (auth.uid() is not null);
create policy "Autenticados acceden a productos" on productos for all using (auth.uid() is not null);
create policy "Autenticados acceden a ventas" on ventas for all using (auth.uid() is not null);

-- El catálogo público (sin login) necesita poder leer los productos activos
create policy "Público ve productos activos" on productos for select using (activo = true);

-- ============================================
-- Función atómica para registrar ventas y descontar stock
-- security definer: permite que el checkout público (WhatsApp, sin login)
-- también pueda insertar la venta y descontar stock a través de esta función,
-- aunque las tablas estén protegidas por RLS para el resto de operaciones.
-- ============================================
create or replace function registrar_venta(
  p_cliente_id uuid,
  p_items jsonb,
  p_metodo_pago text,
  p_cliente_nombre text default null,
  p_hora_retiro text default null,
  p_estado text default 'entregado'
)
returns uuid as $$
declare
  v_venta_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_precio numeric;
  v_stock_actual numeric;
begin
  -- Calcular total y validar stock (con "for update" para evitar condiciones de carrera)
  for v_item in select * from jsonb_array_elements(p_items) loop
    select precio_venta, stock into v_precio, v_stock_actual
    from productos where id = (v_item->>'producto_id')::uuid
    for update;

    if not found then
      raise exception 'Producto % no existe', v_item->>'producto_id';
    end if;

    if v_stock_actual < (v_item->>'cantidad')::numeric then
      raise exception 'Stock insuficiente para producto %', v_item->>'producto_id';
    end if;

    v_total := v_total + (v_precio * (v_item->>'cantidad')::numeric);
  end loop;

  insert into ventas (cliente_id, total, metodo_pago, cliente_nombre, hora_retiro, estado, items)
  values (p_cliente_id, v_total, p_metodo_pago, p_cliente_nombre, p_hora_retiro, p_estado, p_items)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    update productos set stock = stock - (v_item->>'cantidad')::numeric
    where id = (v_item->>'producto_id')::uuid;
  end loop;

  return v_venta_id;
end;
$$ language plpgsql security definer;
