import { useState, useEffect } from 'react';
import { formatPrecio, getBusinessConfig } from '../config/businessConfig';
import { X, Printer, ShieldCheck } from 'lucide-react';

// Ticket imprimible homologado según normativa de la DNIT (ex SET - Paraguay)
// `items` debe ser una lista de [{ cantidad, nombre, precio_venta }]
export default function Ticket({ clienteNombre, clienteRuc, fecha, ventaId, items = [], total, metodoPago, recibido, vuelto, onClose }) {
  const [bizConfig, setBizConfig] = useState(getBusinessConfig());
  const [rucEditado, setRucEditado] = useState(clienteRuc || '');
  const [nombreEditado, setNombreEditado] = useState(clienteNombre || '');

  useEffect(() => {
    setBizConfig(getBusinessConfig());
  }, []);

  // Formateador de números sin símbolo de moneda
  const formatMonto = (num) => Math.round(num || 0).toLocaleString('es-PY');

  const totalOperacion = typeof total === 'number' ? total : parseFloat(total) || 0;

  // Discriminación de IVA por ítem según su tasa (Ley N° 6380/2019, Art. 90-91: 10% general,
  // 5% para canasta familiar -arroz, fideos, aceite, leche, huevos, harina, sal- y productos
  // agrícolas/hortícolas/frutícolas en estado natural). Precios cargados con IVA incluido.
  const desgloseIva = items.reduce((acc, item) => {
    const precioUnit = item.precio_venta || (totalOperacion && items.length === 1 ? totalOperacion : 0);
    const subtotalItem = precioUnit ? precioUnit * item.cantidad : 0;
    const tasa = item.tasa_iva ?? 10;

    if (tasa === 5) {
      const ivaItem = Math.round(subtotalItem / 21);
      acc.gravado5 += subtotalItem - ivaItem;
      acc.iva5 += ivaItem;
    } else if (tasa === 0) {
      acc.exentas += subtotalItem;
    } else {
      const ivaItem = Math.round(subtotalItem / 11);
      acc.gravado10 += subtotalItem - ivaItem;
      acc.iva10 += ivaItem;
    }
    return acc;
  }, { gravado10: 0, iva10: 0, gravado5: 0, iva5: 0, exentas: 0 });

  const totalIvaDiscriminado = desgloseIva.iva10 + desgloseIva.iva5;

  // Formato secuencial oficial 001-001-XXXXXXX
  const numSecuencial = ventaId
    ? `001-001-${String(ventaId.replace(/\D/g, '') || '10001').padStart(7, '0').slice(-7)}`
    : '001-001-0000001';

  // Identificación del comprador según exigencia DNIT
  const nombreLimpio = nombreEditado.trim();
  const esAnonimo = !nombreLimpio || nombreLimpio === 'Cliente Casual' || nombreLimpio === 'Venta de Caja' || nombreLimpio === 'Cliente sin nombre';
  const compradorNombre = esAnonimo ? 'Sin Nombre' : nombreLimpio;
  const compradorRuc = rucEditado.trim() || (esAnonimo ? 'X' : 'Sin RUC');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-6 transition-all">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h3 className="font-heading font-bold text-base text-text-primary">Ticket Oficial DNIT</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Edición de nombre y RUC/C.I. del cliente antes de imprimir (no se imprimen estos campos, solo el resultado) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase">
              Nombre del Cliente
            </label>
            <input
              type="text"
              placeholder="Ej. Juan Pérez"
              value={nombreEditado}
              onChange={(e) => setNombreEditado(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase">
              RUC / C.I. (si lo solicita)
            </label>
            <input
              type="text"
              placeholder="Ej. 4123456-7"
              value={rucEditado}
              onChange={(e) => setRucEditado(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border-custom bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Área imprimible del Ticket */}
        <div className="ticket-print-area font-mono text-xs text-black space-y-3 bg-white p-5 rounded-xl shadow-inner border border-gray-300">
          
          {/* 1. Datos del Emisor y Timbrado */}
          <div className="text-center space-y-0.5 border-b border-dashed border-gray-500 pb-3">
            <p className="font-extrabold text-sm tracking-tight text-black uppercase">{bizConfig.razonSocial || bizConfig.nombre}</p>
            <p className="text-[11px] font-semibold text-gray-900">{bizConfig.nombre}</p>
            <p className="text-[11px] font-extrabold text-black">RUC: {bizConfig.ruc || '80000000-0'}</p>
            {bizConfig.direccion && (
              <p className="text-[10px] font-medium text-gray-800">{bizConfig.direccion}</p>
            )}
            {bizConfig.telefono && (
              <p className="text-[10px] font-medium text-gray-800">Tel: {bizConfig.telefono}</p>
            )}
            
            <div className="pt-2 text-[10px] text-gray-900 space-y-0.5 border-t border-dotted border-gray-400 mt-2">
              <p><span className="font-extrabold">TIMBRADO N°:</span> {bizConfig.timbrado || '16000000'}</p>
              <p><span className="font-extrabold">VIGENCIA:</span> {bizConfig.timbradoVigencia || '01/01/2026 al 31/12/2026'}</p>
              <p className="font-extrabold text-xs text-black pt-0.5">COMPROBANTE DE VENTA TICKET</p>
              <p className="font-extrabold text-xs text-black">N° {numSecuencial}</p>
            </div>
          </div>

          {/* 2. Datos de la Operación y Comprador */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-500 pb-2.5">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">FECHA/HORA:</span>
              <span className="font-bold text-black">{new Date(fecha || Date.now()).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">CONDICIÓN:</span>
              <span className="font-bold text-black">CONTADO</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">CLIENTE:</span>
              <span className="font-bold text-black truncate max-w-[170px]">{compradorNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">RUC / C.I.:</span>
              <span className="font-bold text-black">{compradorRuc}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">MEDIO PAGO:</span>
              <span className="font-bold text-black">{metodoPago || 'Efectivo'}</span>
            </div>
            {recibido != null && (
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800">RECIBIDO:</span>
                <span className="font-bold text-black">Gs. {formatMonto(recibido)}</span>
              </div>
            )}
            {vuelto != null && (
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800">VUELTO:</span>
                <span className="font-bold text-black">Gs. {formatMonto(vuelto)}</span>
              </div>
            )}
          </div>

          {/* 3. Detalle de Bienes / Servicios */}
          <div className="space-y-1.5 border-b border-dashed border-gray-500 pb-3">
            <div className="flex justify-between text-[10px] font-extrabold text-black border-b border-gray-400 pb-1">
              <span>CANT / DESCRIPCIÓN</span>
              <span>P.UNIT / SUBT</span>
            </div>
            {items.map((item, idx) => {
              const precioUnit = item.precio_venta || (totalOperacion && items.length === 1 ? totalOperacion : 0);
              const subtotalItem = precioUnit ? precioUnit * item.cantidad : null;

              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-[11px] text-black">
                    <span className="truncate max-w-[200px]">{item.cantidad}x {item.nombre}</span>
                    {subtotalItem !== null && (
                      <span>{formatMonto(subtotalItem)}</span>
                    )}
                  </div>
                  {precioUnit > 0 && item.cantidad > 1 && (
                    <div className="text-[10px] text-gray-700 font-semibold text-right">
                      ({formatMonto(precioUnit)} c/u)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Total a Pagar */}
          <div className="flex justify-between items-center text-xs font-extrabold py-1.5 border-b border-dashed border-gray-500 text-black">
            <span>TOTAL A PAGAR:</span>
            <span className="text-base font-extrabold">{formatPrecio(totalOperacion)}</span>
          </div>

          {/* 5. Discriminación de IVA según DNIT */}
          <div className="text-[10px] text-black space-y-1 pt-1">
            <p className="font-extrabold text-center text-black text-[10px] uppercase">LIQUIDACIÓN DEL IVA (INCLUIDO)</p>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-800">GRAVADO 10%:</span>
              <span>Gs. {formatMonto(desgloseIva.gravado10)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-black">
              <span>IVA 10%:</span>
              <span>Gs. {formatMonto(desgloseIva.iva10)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700">
              <span>GRAVADO 5%:</span>
              <span>Gs. {formatMonto(desgloseIva.gravado5)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700">
              <span>IVA 5%:</span>
              <span>Gs. {formatMonto(desgloseIva.iva5)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700">
              <span>EXENTAS:</span>
              <span>Gs. {formatMonto(desgloseIva.exentas)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-black border-t border-dotted border-gray-500 pt-1 mt-1">
              <span>TOTAL IVA DISCRIMINADO:</span>
              <span>Gs. {formatMonto(totalIvaDiscriminado)}</span>
            </div>
          </div>

          {/* Mensaje Final */}
          <div className="text-center text-[10px] text-gray-800 pt-2 border-t border-dashed border-gray-400">
            <p className="font-bold text-black">¡GRACIAS POR SU PREFERENCIA!</p>
            <p className="text-[9px] text-gray-700 font-medium mt-0.5">Original: Cliente | Duplicado: Archivo Tributario</p>
          </div>

        </div>

        {/* Acciones Modal */}
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-bg-primary text-xs font-bold text-text-secondary border border-border-custom hover:bg-bg-primary/80 transition-all cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}

