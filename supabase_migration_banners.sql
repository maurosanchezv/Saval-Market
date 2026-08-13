-- ============================================================
-- Migración: Banners promocionales administrables (panel /admin/banners)
-- Ejecutar UNA SOLA VEZ en el SQL Editor de un proyecto Supabase
-- que ya tenía el esquema anterior (sin tabla `banners`).
--
-- Los proyectos nuevos NO necesitan este archivo: ya reciben esto
-- incluido directamente en supabase_schema.sql.
-- ============================================================

create table banners (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  subtitulo text,
  badge text,
  boton_texto text default 'Ver más',
  categoria_destino text default 'Todos', -- categoría a la que se filtra el catálogo al hacer clic
  imagen_url text,
  orden integer default 0, -- controla el orden de aparición en el carrusel (menor = primero)
  activo boolean default true,
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table banners enable row level security;

create policy "Autenticados acceden a banners" on banners for all using (auth.uid() is not null);
create policy "Público ve banners activos" on banners for select using (activo = true);

-- ============================================================
-- Datos iniciales: los 4 banners originales (diseño/colores de referencia),
-- ahora como filas editables desde /admin/banners en vez de estar hardcodeados.
-- ============================================================
insert into banners (titulo, subtitulo, badge, boton_texto, categoria_destino, imagen_url, orden, activo) values
('Verdulería Fresca al Mejor Precio', 'Tomate perita, bananas por docena y productos seleccionados de la zona.', '⚖️ Productos por Kilo & Docena', 'Ver Verdulería', 'Verdulería', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=1200', 1, true),
('Bebidas Frías Listas para Llevar', 'Gaseosas de 2L, jugos en polvo, jugos naturales y cervezas heladas.', '🥤 Bebidas & Refrescos', 'Ver Bebidas', 'Bebidas', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=1200', 2, true),
('Coquito Casero & Panadería Saval', 'Fritos, pan lactal y coquitos crujientes al peso elaborados todos los días.', '🥐 Horneado Fresco Todos los Días', 'Ver Panadería', 'Panadería', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200', 3, true),
('Hacé tu Pedido Online y Retirá Sin Filas', 'Armá tu lista desde tu celular y pasá a retirar por el local.', '⚡ Servicio Pickup Rápido', 'Ver Todo el Catálogo', 'Todos', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200', 4, true);
