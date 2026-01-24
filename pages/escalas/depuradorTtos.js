import { useCallback, useEffect, useMemo, useState } from 'react';
import InformeCopiable from '@/components/InformeCopiable';
import Papa from 'papaparse';

/* Añado el estado para reglas y la URL del csv */

const REGLAS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT-HP_OCXjtFN6cCrpBgViv59ufFzUBerAK5jvTSLoT27zC_ux_3YTpX4oQcmCNIZg7blWaBANXtUkF/pub?output=csv';

/* Carga las reglas al montar */

// Helpers
const RX_TERA = /^Terapia\/Medicamento:\s*(.*)\s*$/i;
const RX_POSO = /^Posolog[ií]a\/Observaciones:\s*(.*)\s*$/i;

function normEspacios(s) {
  return (s || '').replace(/\s{2,}/g, ' ').trim();
}

function normalizarUnidades(s) {
  if (!s) return s;

  return (
    s
      // pasar todo a una forma conocida
      .replace(/(\d+(?:[.,]\d+)?)\s*MG\b/gi, '$1mg')
      .replace(/(\d+(?:[.,]\d+)?)\s*MCG\b/gi, '$1mcg')
      .replace(/(\d+(?:[.,]\d+)?)\s*ML\b/gi, '$1mL')
      .replace(/(\d+(?:[.,]\d+)?)\s*INH\b/gi, '$1inh')
      .replace(/(\d+(?:[.,]\d+)?)\s*L\b/gi, '$1L')
      .replace(/(\d+(?:[.,]\d+)?)\s*INHAL\b/gi, '$1inh')
  );
}

/**
 * Limpieza de la línea Terapia/Medicamento
 * - Borra paréntesis (fabricantes/blisters), conserva "(FM)" si está al inicio
 * - Quita presentación (28 comprimidos, 1 frasco 5mL...), sin romper dosis mg/mL o 80/12,5
 */
function limpiarNombreMedicamento(raw) {
  let s = normEspacios(raw);

  // Conservar "(FM)" si está al inicio
  const tieneFM = /^\(FM\)\s*/i.test(s);
  if (tieneFM) s = s.replace(/^\(FM\)\s*/i, '');

  // BORRAR TODO lo que esté entre paréntesis, en cualquier posición
  s = s.replace(/\([^)]*\)/g, ' ');
  s = normEspacios(s);

  // Normalizar separadores
  s = s
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*,\s*/g, ',');

  // --- Recorte agresivo de COLAS de presentación (abreviadas) ---
  s = s.replace(
    /\s+\d+\s*(COMPR|COMPR\.|COMP|CAPS|TAB|SOBR|PARCH|AMP|VIAL|JER|FRAS|ENV|TUB|CART)\b.*$/gi,
    ''
  );

  // PULSACIONES / DOSIS / INHALACIÓN y formas abreviadas
  s = s.replace(/\s+\d+\s*(PULSAC(IONES)?|PULSACIONES|DOSIS)\b.*$/gi, '');

  // Cadenas típicas de inhaladores/MDI
  s = s.replace(/\s+(SUSP|SOLUC|SOL)\s+PARA\s+INHALAC.*$/gi, '');
  s = s.replace(/\s+ENV(ASE)?\s+A\s+PRESION.*$/gi, '');
  s = s.replace(/\s+ENV\s+PRESION.*$/gi, '');

  // Abreviaturas finales frecuentes: EFG, REC PEL, RE PE, GASTRORRESIST, LIBERAC PROLON...
  s = s.replace(
    /\s+\b(EFG|REC\s*PEL|RE\s*PE|GASTRORRESIST(ENTES)?|LIBERAC(ION)?\s*PROLON)\b.*$/gi,
    ''
  );

  // Quitar “/ 28 COMPRIMIDOS ...” al final (presentación tras /)
  s = s.replace(/\s*\/\s*\d+\s+[A-ZÁÉÍÓÚÑ0-9 .,+/()-]+$/gi, '');

  // Quitar bloque de presentación que arranca por número + forma, al final
  // (esto quita "28 COMPRIMIDOS ...", "30 ENVASES UNIDOSIS 0,3ML COLIRIO...", "1 FRASCO 7,5ML...")
  s = s.replace(
    /\s+\d+\s*(COMPRIMIDOS?|CAPSULAS?|C[ÁA]PSULAS?|TABLETAS?|SOBRES?|PARCHES?|AMPOLLAS?|VIALES?|JERINGAS?|FRASCOS?|ENVASES?|TUBOS?)\b.*$/gi,
    ''
  );

  // Quitar “forma farmacéutica” residual al final si quedó (sin tocar dosis)
  s = s.replace(
    /\s+\b(RECUBIERTOS?|RECUB\.?|PEL(I)?C(ULA)?|GASTRORRESISTENTES?|EFERVESCENTES?|LIBERACI[ÓO]N|MODIFICADA|UNIDOSIS|MONODOSIS|COLIRIO|SUSPENSI[ÓO]N|SOLUCI[ÓO]N|POMADA|UNG[ÜU]ENTO|OFTALMICA|TRANSDERMICOS?|INHALAD(OR)?|DOSIS|POLVO|NEBULIZADOR|GRANULADO|PARA\s+SOLUCI[ÓO]N\s+ORAL)\b.*$/gi,
    ''
  );

  // Caso típico: "PSICOTRIC 25mg 60COMPRIMIDOS" -> "PSICOTRIC 25mg 60cp"
  s = s.replace(/\b(\d+)\s*COMPRIMIDOS?\b/gi, '$1cp');
  s = s.replace(/\b(\d+)\s*C0MPR\b/gi, '$1cp');

  // Quitar "/" colgante final (p.ej. "METOTREXATO ... /")
  s = s.replace(/\/\s*$/g, '');

  // Unidades + espacios finales

  s = normEspacios(s);

  // Reponer "(FM)" si venía
  if (tieneFM) s = `(FM) ${s}`;

  // Normalizar unidades y eliminar espacio número-unidad (PASO FINAL)
  s = normalizarUnidades(s);

  // último repaso de espacios
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}

/**
 * Limpieza de Posología/Observaciones
 * Objetivo: "1 cp diario", "4 cp/semanales", "1 gota/12 h", "1 cp/2 días", "1 env./semanal"...
 */
function limpiarPosologia(raw) {
  let s = (raw || '').replace(/\r/g, '').trim();

  // Si viene posología con varias frases: quedarse con la primera pauta útil
  s = s.split(/\ba\s+continuaci[óo]n\b/gi)[0];

  // Quitar colas frecuentes
  s = s.replace(/\bCR[ÓO]NICO\b/gi, '');
  s = s.replace(/\bdurante\s+\d+\s+d[ií]as?\b/gi, '');
  s = s.replace(/\bexcepto\b.*$/i, '');
  s = s.replace(/\bcuando\b.*$/i, '');

  // Normalizar "día/s"
  s = s.replace(/día\/s/gi, 'días');

  // Texto → número
  s = s.replace(/\b2\s*y\s*MEDIO\b/gi, '2,5');
  s = s.replace(/\b1\s*y\s*MEDIO\b/gi, '1,5');

  // Abreviar unidades
  s = s.replace(/\bCOMPRIMIDO(S)?\b/gi, 'cp');
  s = s.replace(/\bC[ÁA]PSULA(S)?\b/gi, 'cáps');
  s = s.replace(/\bSOBRE(S)?\b/gi, 'sobre');
  s = s.replace(/\bTIRA(S)?\s+REACTIVA(S)?\b/gi, 'tira');
  s = s.replace(/\bENVASE(S)?\b/gi, 'env.');
  s = s.replace(/\bGOTA(S)?\b/gi, 'gota');
  s = s.replace(/\bPULSACI[ÓO]N(ES)?\b/gi, 'inh');
  s = s.replace(/\bPARCHE(S)?\b/gi, 'parche');
  s = s.replace(/\bAMPOLLA(S)?\b/gi, 'amp');
  s = s.replace(/\bJERINGA(S)?\b/gi, 'iny');
  s = s.replace(/\bVIAL(ES)?\b/gi, 'vial');
  s = s.replace(/\bPULVERIZACI[ÓO]N(ES)?\b/gi, 'inh');
  s = s.replace(/\bCARTUCHO\/PLUMA\b/gi, 'iny');

  // Quitar ruido oftálmico
  s = s.replace(/\b(MONODOSIS|UNIDOSIS|OFTALMICO|OFT[ÁA]LMICA)\b/gi, '');

  // Frecuencias
  s = s.replace(/\bcada\s+12\s+horas?\b/gi, '/12h');
  s = s.replace(/\bcada\s+8\s+horas?\b/gi, '/8h');
  s = s.replace(/\bcada\s+6\s+horas?\b/gi, '/6h');
  s = s.replace(/\bcada\s+24\s+horas?\b/gi, 'diario');
  s = s.replace(/\bcada\s+d[ií]a\b/gi, 'diario');
  s = s.replace(/\bcada\s+7\s+d[ií]as?\b/gi, 'semanal');
  s = s.replace(/\bcada\s+30\s+d[ií]as?\b/gi, 'mensual');
  s = s.replace(/\bcada\s+28\s+d[ií]as?\b/gi, '/28 días');
  s = s.replace(/\bcada\s+14\s+d[ií]as?\b/gi, '/14 días');
  s = s.replace(/\bcada\s+3\s+d[ií]as?\b/gi, '/3 días');
  s = s.replace(/\bpor\s+la\s+ma[ñn]ana\b/gi, 'por la mañana');
  s = s.replace(/\bpor\s+la\s+noche\b/gi, 'por la noche');
  s = s.replace(/\ben\s+el\s+desayuno\b/gi, 'en el desayuno');

  // Espacios
  s = normEspacios(s);

  // Compactar " / 12 h" → "/12 h"
  s = s.replace(/\s*\/\s*/g, '/').replace(/\/(\d+)\s*h/gi, '/$1h');

  // Parse: cantidad + unidad + resto
  const m = s.match(
    /^(\d+(?:[.,]\d+)?)\s*(cp|cáps|sobre|tira|env\.|gota|inh|parche|amp|iny|vial)\s*(.*)$/i
  );
  if (!m) return s;

  const qty = m[1].replace('.', ',');
  const unit = m[2];
  let rest = (m[3] || '').trim();

  // Si no hay frecuencia clara, devolver simplificado
  if (!rest) return `${qty} ${unit}`.trim();

  // diario
  if (/^diario(s)?$/i.test(rest)) return `${qty} ${unit} diario`;

  // semanal / mensual (con plural según qty)
  if (/^semanal(es)?$/i.test(rest)) {
    const plural = qty === '1' || qty === '1,0' ? 'semanal' : 'semanales';
    return `${qty} ${unit}/${plural}`;
  }
  if (/^mensual(es)?$/i.test(rest)) {
    return `${qty} ${unit}/mensual`;
  }

  // Si rest empieza por "/": "/12 h", "/2 días", "/28 días"...
  if (rest.startsWith('/')) return `${qty} ${unit}${rest}`;

  // Si rest contiene "diario" dentro de frase (p.ej. "en cada ojo diario")
  if (/\bdiario(s)?\b/i.test(rest)) return `${qty} ${unit} diario`;

  // Por defecto: devolver "qty unit rest"
  return normEspacios(`${qty} ${unit} ${rest}`);
}

/**
 * depurar: parsea bloques Terapia/Medicamento + Posología/Observaciones
 * y genera salida
 */
function depurar(textoOriginal, multilinea) {
  const fechaActual = new Date().toLocaleDateString('es-ES');

  const lineas = (textoOriginal || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd());

  const items = [];
  let medActual = null;
  let posoActual = '';

  for (let i = 0; i < lineas.length; i += 1) {
    const l = lineas[i].trim();
    if (!l) continue;

    const m1 = l.match(RX_TERA);
    if (m1) {
      if (medActual) items.push({ med: medActual, poso: posoActual || '' });
      medActual = m1[1] || '';
      posoActual = '';
      continue;
    }

    const m2 = l.match(RX_POSO);
    if (m2) {
      posoActual = m2[1] || '';
      continue;
    }

    // Continuación de posología (casos con saltos) mientras ya haya posología
    if (medActual && posoActual && !/^Profesional\b/i.test(l) && !/^Fecha\b/i.test(l)) {
      posoActual = `${posoActual} ${l}`.trim();
    }
  }

  if (medActual) items.push({ med: medActual, poso: posoActual || '' });

  const itemsLimpios = items
    .map(({ med, poso }) => {
      const medL = limpiarNombreMedicamento(med);
      const posoL = limpiarPosologia(poso);
      if (!medL) return null;
      return { med: medL, poso: posoL };
    })
    .filter(Boolean);

  const header = `Tratamiento (por SIA a fecha ${fechaActual}):`;

  if (!itemsLimpios.length) return header;

  if (multilinea) {
    return (
      header +
      '\n' +
      itemsLimpios.map(({ med, poso }) => `- ${med}${poso ? ` (${poso})` : ''}`).join('\n')
    );
  }

  return (
    header +
    ' ' +
    itemsLimpios.map(({ med, poso }) => `${med}${poso ? ` (${poso})` : ''}`).join('; ')
  );
}

export default function DepuradorTtos() {
  const [texto, setTexto] = useState('');
  const [variasLineas, setVariasLineas] = useState(false);
  const [resultado, setResultado] = useState('');
  const [medicamentos, setMedicamentos] = useState([]);
  const [seleccion, setSeleccion] = useState({});
  const [reglas, setReglas] = useState([]); // [{ patron, reemplazo, tipo, flags }]
  const [reglasListas, setReglasListas] = useState(false);

  const [reglasCargando, setReglasCargando] = useState(false);

  const cargarReglas = useCallback(() => {
    setReglasCargando(true);
    setReglasListas(false);

    // evita caché del CSV publicado
    const url = `${REGLAS_URL}${REGLAS_URL.includes('?') ? '&' : '?'}_ts=${Date.now()}`;

    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || [])
          .map((r) => ({
            patron: (r.patron || '').trim(),
            reemplazo: (r.reemplazo ?? '').toString(),
            tipo: (r.tipo || 'regex').trim().toLowerCase(),
            flags: (r.flags || 'g').trim(),
          }))
          .filter((r) => r.patron);

        setReglas(rows);
        setReglasListas(true);
        setReglasCargando(false);
      },
      error: (err) => {
        console.error('Error cargando reglas:', err);
        setReglas([]);
        setReglasListas(true);
        setReglasCargando(false);
      },
    });
  }, []);

  const textoDepurado = useMemo(() => {
    if (!resultado) return '';
    return resultado;
  }, [resultado]);

  useEffect(() => {
    cargarReglas();
  }, [cargarReglas]);

  /* Compila las reglas a RegExp (para rendimiento y control) */

  const reglasCompiladas = useMemo(() => {
    return reglas
      .map((r) => {
        try {
          if (r.tipo === 'literal') {
            // escapar literal para que no sea regex
            const escaped = r.patron.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return {
              re: new RegExp(escaped, r.flags || 'g'),
              reemplazo: r.reemplazo,
            };
          }
          // regex
          return {
            re: new RegExp(r.patron, r.flags || 'g'),
            reemplazo: r.reemplazo,
          };
        } catch (e) {
          console.warn('Regla inválida, se omite:', r, e);
          return null;
        }
      })
      .filter(Boolean);
  }, [reglas]);

  function extraerMedicamentos(textoOriginal) {
    const lineas = textoOriginal.split('\n');
    const lista = [];
    for (let i = 0; i < lineas.length; i += 1) {
      const linea = lineas[i];
      if (linea.startsWith('Terapia/Medicamento:')) {
        const nombre = linea.replace('Terapia/Medicamento:', '').trim();
        const bloque = [linea];
        if (lineas[i + 1] && lineas[i + 1].startsWith('Posología/Observaciones:')) {
          bloque.push(lineas[i + 1]);
        }
        lista.push({
          id: `${i}-${nombre}`,
          nombre,
          bloque,
        });
      }
    }
    return lista;
  }

  function filtrarTextoPorSeleccion(textoOriginal) {
    if (!medicamentos.length) return textoOriginal;
    const activos = medicamentos.filter((m) => seleccion[m.id]);
    if (!activos.length) return '';
    return activos.map((m) => m.bloque.join('\n')).join('\n');
  }

  const onDepurar = (nuevoTexto, nuevoVariasLineas = variasLineas) => {
    if (!nuevoTexto || !nuevoTexto.trim()) {
      setResultado('');
      setMedicamentos([]);
      setSeleccion({});
      return;
    }
    const textoFiltrado = filtrarTextoPorSeleccion(nuevoTexto);
    setResultado(depurar(textoFiltrado, nuevoVariasLineas));
  };

  const onLimpiar = () => {
    setTexto('');
    setResultado('');
    setMedicamentos([]);
    setSeleccion({});
  };

  useEffect(() => {
    if (!texto || !texto.trim()) {
      setMedicamentos([]);
      setSeleccion({});
      setResultado('');
      return;
    }
    const lista = extraerMedicamentos(texto);
    setMedicamentos(lista);
    const nuevaSeleccion = {};
    lista.forEach((m) => {
      nuevaSeleccion[m.id] = true;
    });
    setSeleccion(nuevaSeleccion);
  }, [texto]);

  useEffect(() => {
    if (!reglasListas) return;
    if (!texto || !texto.trim()) return;
    onDepurar(texto, variasLineas);
  }, [seleccion, texto, variasLineas, reglasListas, reglasCompiladas]);

  if (!reglasListas && !reglasCargando) return <p>Cargando reglas…</p>;
  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
      <div className="input-group">
        <label>Texto original</label>
        <textarea
          className="depurador-textarea"
          value={texto}
          onChange={(e) => {
            const nuevoTexto = e.target.value;
            setTexto(nuevoTexto);
          }}
          placeholder="Pega tu texto aquí"
        />
      </div>

      {medicamentos.length ? (
        <div className="depurador-lista">
          <div className="depurador-lista-titulo">
            Medicamentos detectados ({medicamentos.length})
          </div>
          <div className="depurador-lista-items">
            {medicamentos.map((m) => (
              <label key={m.id} className="depurador-item">
                <input
                  type="checkbox"
                  checked={!!seleccion[m.id]}
                  onChange={() =>
                    setSeleccion((prev) => ({
                      ...prev,
                      [m.id]: !prev[m.id],
                    }))
                  }
                />
                <span>{m.nombre || 'Sin nombre'}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="depurador-acciones">
        <div className="depurador-toggle">
          <span
            className="depurador-toggle-label"
            onDoubleClick={cargarReglas}
            title="Doble clic para recargar reglas (temporal)"
          >
            Multilínea{reglasCargando ? ' (recargando…)' : ''}
          </span>{' '}
          <div className="selector-botones">
            <button
              type="button"
              className={`selector-btn ${variasLineas ? 'activo' : ''}`}
              onClick={() => {
                const nuevoValor = !variasLineas;
                setVariasLineas(nuevoValor);
                onDepurar(texto, nuevoValor);
              }}
            >
              {variasLineas ? 'Sí' : 'No'}
            </button>
          </div>
        </div>

        <button className="reset-btn depurador-reset" type="button" onClick={onLimpiar}>
          Limpiar texto
        </button>
      </div>

      {textoDepurado ? <InformeCopiable texto={textoDepurado} /> : null}
    </main>
  );
}
