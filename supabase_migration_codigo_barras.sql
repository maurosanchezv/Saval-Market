-- ============================================================
-- Migración: Código de barras en productos (escaneo con cámara)
-- Ejecutar UNA SOLA VEZ en el SQL Editor de un proyecto Supabase
-- que ya tenía el esquema anterior (sin columna `codigo_barras`).
--
-- Los proyectos nuevos NO necesitan este archivo: ya reciben esto
-- incluido directamente en supabase_schema.sql.
-- ============================================================

alter table productos add column codigo_barras text;

create index productos_codigo_barras_idx on productos (codigo_barras);
