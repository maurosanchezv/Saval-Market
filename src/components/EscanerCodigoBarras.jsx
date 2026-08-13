import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine, Keyboard } from 'lucide-react';

let contadorInstancias = 0;

// Modal reutilizable: abre la cámara trasera y decodifica códigos de barras (EAN/UPC/Code128, etc.)
// usando html5-qrcode, que funciona tanto en Android/Chrome como en iPhone/Safari.
// Incluye un modo de ingreso manual como respaldo si no hay cámara o se niega el permiso.
export default function EscanerCodigoBarras({ onDetected, onClose, titulo = 'Escanear Código de Barras' }) {
  const [elementId] = useState(() => `escaner-cb-${++contadorInstancias}`);
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  // TEMPORAL: log visible en pantalla para diagnosticar el problema de pantalla negra
  // en Android sin necesitar herramientas de desarrollador conectadas al celular.
  const [debugLog, setDebugLog] = useState([]);

  useEffect(() => {
    if (manualMode) return;
    let detectado = false;
    let cancelado = false;
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    const log = (msg) => {
      console.log('[Escaner]', msg);
      setDebugLog((prev) => [...prev, msg]);
    };

    const checkVideo = (etiqueta) => {
      setTimeout(() => {
        const videoEl = document.querySelector(`#${elementId} video`);
        if (!videoEl) {
          log(`${etiqueta}: no se encontró <video> en el DOM`);
          return;
        }
        log(`${etiqueta}: video ${videoEl.videoWidth}x${videoEl.videoHeight}, readyState=${videoEl.readyState}, paused=${videoEl.paused}`);
      }, 1500);
    };

    const scanConfig = { fps: 10, qrbox: { width: 260, height: 160 } };

    const onSuccess = (decodedText) => {
      if (detectado) return;
      detectado = true;
      scanner.stop().then(() => scanner.clear()).catch(() => {});
      onDetected(decodedText.trim());
    };
    const onFailure = () => {}; // ignorar fallos de decodificación cuadro a cuadro (es normal mientras se enfoca)

    const iniciarEscaner = async () => {
      // En Android/Chrome, arrancar con el constraint genérico { facingMode: 'environment' }
      // deja a veces el <video> con dimensiones 0x0 (pantalla negra) sin lanzar error.
      // Pedimos la lista de cámaras y arrancamos por deviceId explícito, que es estable
      // tanto en Android/Chrome como en iPhone/Safari.
      log('Buscando cámaras disponibles...');
      try {
        const camaras = await Html5Qrcode.getCameras();
        if (cancelado) return;
        log(`Cámaras encontradas: ${camaras?.length || 0} (${camaras?.map((c) => c.label || c.id).join(' | ') || 'sin datos'})`);
        if (!camaras || camaras.length === 0) throw new Error('No hay cámaras disponibles');

        const camaraTrasera =
          camaras.find((c) => /back|trasera|rear|environment/i.test(c.label)) ||
          camaras[camaras.length - 1];

        log(`Iniciando cámara por deviceId: ${camaraTrasera.label || camaraTrasera.id}`);
        await scanner.start(camaraTrasera.id, scanConfig, onSuccess, onFailure);
        log('start() resolvió OK (deviceId)');
        checkVideo('Chequeo video (deviceId)');
      } catch (err) {
        log(`Falló por deviceId: ${err?.message || err}`);
        if (cancelado) return;
        // Respaldo: intentar con el constraint genérico por si getCameras() falló
        // (p. ej. navegadores sin enumerateDevices) antes de mostrar el error.
        try {
          log('Reintentando con facingMode genérico...');
          await scanner.start({ facingMode: 'environment' }, scanConfig, onSuccess, onFailure);
          log('start() resolvió OK (facingMode)');
          checkVideo('Chequeo video (facingMode)');
        } catch (err2) {
          log(`Falló también con facingMode: ${err2?.message || err2}`);
          if (!cancelado) {
            setError('No se pudo acceder a la cámara. Revisá los permisos del navegador o ingresá el código manualmente.');
          }
        }
      }
    };

    iniciarEscaner();

    return () => {
      detectado = true;
      cancelado = true;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, [manualMode, onDetected, elementId]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) onDetected(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-bg-secondary border border-border-custom rounded-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-custom">
          <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-1.5">
            <ScanLine size={16} className="text-primary" />
            <span>{titulo}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {!manualMode ? (
          <>
            <div id={elementId} className="w-full rounded-2xl overflow-hidden bg-black min-h-[220px]" />
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
            <p className="text-[10px] text-text-secondary text-center">Apuntá la cámara al código de barras del producto.</p>

            {/* TEMPORAL: panel de diagnóstico, quitar una vez resuelto el bug de Android */}
            {debugLog.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Diagnóstico temporal</p>
                {debugLog.map((linea, i) => (
                  <p key={i} className="text-[9px] font-mono text-text-secondary break-words leading-relaxed">
                    {linea}
                  </p>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="w-full py-2 rounded-xl bg-bg-primary border border-border-custom text-text-secondary hover:text-primary hover:border-primary text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Keyboard size={13} />
              <span>Ingresar código manualmente</span>
            </button>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              autoFocus
              inputMode="numeric"
              placeholder="Código de barras"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Buscar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
