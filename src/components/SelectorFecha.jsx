import { Calendar } from 'lucide-react';

// Input de fecha/mes "custom": el <input type="date|month"> nativo queda invisible mas
// arriba (para conservar el selector propio del sistema operativo al tocar), y el texto
// que ve el usuario lo dibujamos nosotros, siempre en formato gregoriano explícito.
// Esto evita que en algunos Android el campo muestre el calendario del sistema operativo
// (ej. era japonesa "Reiwa") en vez de una fecha legible.
export default function SelectorFecha({
  tipo = 'date',
  value,
  onChange,
  min,
  max,
  placeholder = 'Seleccionar fecha',
  mostrarIcono = true,
  tamano = 'md',
}) {
  const texto = !value
    ? placeholder
    : tipo === 'month'
      ? new Date(`${value}-01T00:00:00`).toLocaleDateString('es-PY', { month: 'long', year: 'numeric', calendar: 'gregory' })
      : new Date(`${value}T00:00:00`).toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric', calendar: 'gregory' });

  const paddingVertical = tamano === 'sm' ? 'py-2' : 'py-2.5';
  const textoTamano = tamano === 'sm' ? 'text-[11px] font-semibold' : 'text-sm';

  return (
    <div className="relative min-w-0">
      {mostrarIcono && (
        <Calendar size={tamano === 'sm' ? 12 : 14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none z-10" />
      )}
      <div
        className={`w-full min-w-0 ${paddingVertical} ${textoTamano} rounded-xl border border-border-custom bg-bg-primary truncate whitespace-nowrap ${
          mostrarIcono ? 'pl-8 pr-3' : 'px-3'
        } ${value ? 'text-text-primary' : 'text-text-secondary'}`}
      >
        {texto}
      </div>
      <input
        type={tipo}
        value={value || ''}
        min={min}
        max={max}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
