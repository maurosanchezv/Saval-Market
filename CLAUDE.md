# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint over the whole project (flat config, eslint.config.js)
```

There is no test framework wired up. The `analisis_plan_plantilla.md` doc discusses a future Playwright E2E suite, but it is explicitly deferred and not present.

Deploys as a static SPA (`vercel.json` rewrites all paths to `/index.html`) — routing is entirely client-side via `react-router-dom`, so any hosting target needs the same catch-all rewrite.

The codebase and all comments/UI strings are in **Spanish** — match that language when adding code, comments, and user-facing text.

## What this project is

This is a **white-label admin/e-commerce boilerplate** ("plantilla") for small businesses in Paraguay. The working model is **fork-per-client, not multi-tenant**: each client gets their own fork, their own Supabase project, and their own deploy. The two feature "packages" (Productos and Servicios) live in the same repo permanently and are toggled per-client via config, so upstream fixes can be pulled into delivered client forks. See `plan_plantilla_admin.md` (the technical plan, including the full Supabase SQL schema and RLS policies) and `analisis_plan_plantilla.md` (design/architecture refinements) for the full intent.

The current fork is configured for **"Saval Market"**, a grocery store, with `BUSINESS_CONFIG.tipo === "productos"`.

## Architecture

**Stack:** Vite 8 + React 19 (`StrictMode`, no TypeScript, JSX only) + Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js` — theme is defined in CSS) + react-router-dom v7 + Supabase + recharts + lucide-react.

Three pieces of config-driven machinery are the heart of this template. Understand these before changing routing, theming, or data access:

### 1. Config-driven routing (`src/config/routesConfig.js` + `src/config/businessConfig.js`)

`routesConfig` is a declarative array of route objects (`path`, `label`, `icon`, `component` as a **string name**, `isAdmin`, `requiredPackage`). `App.jsx` maps the string `component` names to real imports via a `componentMapping` object, then registers only the routes where `requiredPackage === 'core' || requiredPackage === BUSINESS_CONFIG.tipo`. The Sidebar and mobile nav filter the same array, so menu and routes never drift apart.

To add a page: create the component under `src/pages/`, import it into `App.jsx`, add it to `componentMapping`, and add a route entry. Setting `requiredPackage` to `"productos"` or `"servicios"` gates it to a business type; `"core"` means always-on.

`isAdmin: true` routes are wrapped in `ProtectedRoute` (redirects to `/login` when no user) + `AdminLayout` (Header + Sidebar + mobile bottom nav). Admin paths are under `/admin/*`; public routes (`/` catalog, `/login`) render bare.

### 2. Supabase client with localStorage mock fallback (`src/supabaseClient.js`)

This is the most important file to understand for data work. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars are **absent**, the module exports a hand-written **mock** that emulates the Supabase JS API against `localStorage` (keys `mock_saval_*`), and sets `isUsingMock = true`. This lets the app run with zero backend.

The mock reimplements a subset of the real API: `auth` (login with `admin`/`123`), a chainable `from(table).select().eq()/gte()/lte()/order()/single()`, `insert/update/delete`, and the `registrar_venta` RPC. **When you use a Supabase feature (a filter, an RPC, a join), it must exist in both the real client and this mock**, or behavior diverges between dev-without-env and production. `supabase_schema.sql` is the ready-to-run DDL (tables, RLS policies, the `registrar_venta` function) for a new client's Supabase project; `plan_plantilla_admin.md` is the narrative version with rationale.

Pages consume it uniformly: `import { supabase } from '../supabaseClient'` then `await supabase.from('productos').select('*').order('nombre')`. Sales go through `supabase.rpc('registrar_venta', { p_cliente_id, p_items, p_metodo_pago })` for atomic stock decrement — do not decrement stock manually.

### 3. Three-layer CSS token theming (`src/index.css` + `businessConfig.js` + `App.jsx`)

White-labeling is done with **CSS custom properties, not dynamic Tailwind classes** (Tailwind compiles classes at build time, so runtime `bg-[#xxx]` values don't work). Layers: primitives (`--p-slate-900`) → semantics (`--bg-primary`, `--color-primary`) → Tailwind theme (`@theme` block maps them to utility colors like `bg-bg-primary`, `text-primary`, `border-border-custom`).

The theme logic itself lives in `businessConfig.js`, not `App.jsx`: `applyTheme(themeName)` reads `getBusinessConfig().branding` and writes `--color-primary`, `--bg-primary`, etc. onto `document.documentElement`, toggling the `.dark` class. `getEffectiveTheme()` decides light vs. dark — it checks a **separate** localStorage key (`saval_theme_override`) before falling back to `BUSINESS_CONFIG.theme`, so a visitor's manual light/dark toggle (`setEffectiveTheme()`, wired to the Header toggle button) survives independently of whatever the admin last saved in Configuración. `App.jsx`'s `MainApp` just calls `applyTheme(getEffectiveTheme())` on mount and re-runs it on a `theme_changed` event (dispatched by `setEffectiveTheme`) — it does **not** react to `business_config_updated`, so branding-color edits made in Configuración need a reload to visually apply, even though other config fields update live in Header/Sidebar/Catalogo.

Use the semantic Tailwind classes (`bg-bg-primary`, `bg-bg-card`, `text-text-primary`, `text-text-secondary`, `border-border-custom`, `text-primary`, `bg-primary`) rather than hard-coded colors, so theming stays consistent.

`BUSINESS_CONFIG` itself is not just the export from `businessConfig.js` — `getBusinessConfig()` merges the `DEFAULT_BUSINESS_CONFIG` object with whatever is saved under the `saval_business_config` localStorage key, and the admin `Configuracion` page writes to that key via `saveBusinessConfig()` (dispatching a `business_config_updated` event that Header/Sidebar/Catalogo listen for to refresh non-theme fields). So **editing `businessConfig.js` alone won't change a running app's behavior once the admin UI has saved config to localStorage** — clear that key (or use the Configuracion page) to pick up code-level defaults again.

## Other conventions

- **Barcode scanning:** `src/components/EscanerCodigoBarras.jsx` wraps `html5-qrcode` in a reusable modal (camera scan with a manual-entry fallback) and is used from both `Inventario` (assign a `codigo_barras` to a product) and `PuntoVenta` (look up a product by scanning). Products are matched via a plain `productos.find(p => p.codigo_barras === codigo)` — there is no dedicated Supabase query for it, so it works unmodified against both the mock and the real client. `supabase_migration_codigo_barras.sql` is a one-time `ALTER TABLE` for existing client projects created before this column existed; new client projects get it directly from `supabase_schema.sql`.
- **Currency:** use `formatPrecio()` from `businessConfig.js` (formats to `Gs.` with `es-PY` locale, rounds to integer). `BUSINESS_CONFIG.moneda` is the symbol.
- **Catalog → WhatsApp ordering:** the public `/` catalog builds an order message from `BUSINESS_CONFIG.whatsappMessageTemplate` (placeholders `{items}`, `{total}`, `{name}`, `{pickupTime}`) and sends it to `whatsappNumber`. There is no online checkout.
- **Product categories** are enumerated in `BUSINESS_CONFIG.categorias`.
- Adapting this fork to a new client means editing `businessConfig.js` (name, tipo, currency, WhatsApp, branding, categories) and pointing `.env` at that client's Supabase project — see the "Checklist rápido al iniciar un cliente nuevo" in `plan_plantilla_admin.md`.
