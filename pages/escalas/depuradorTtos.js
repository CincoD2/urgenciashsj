import { useEffect, useMemo, useState } from 'react';
import InformeCopiable from '@/components/InformeCopiable';
import Papa from 'papaparse';

/* Añado el estado para reglas y la URL del csv */

const REGLAS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT-HP_OCXjtFN6cCrpBgViv59ufFzUBerAK5jvTSLoT27zC_ux_3YTpX4oQcmCNIZg7blWaBANXtUkF/pub?output=csv';

/* Carga las reglas al montar */

export default function DepuradorTtos() {
  const [texto, setTexto] = useState('');
  const [variasLineas, setVariasLineas] = useState(false);
  const [resultado, setResultado] = useState('');
  const [medicamentos, setMedicamentos] = useState([]);
  const [seleccion, setSeleccion] = useState({});
  const [reglas, setReglas] = useState([]); // [{ patron, reemplazo, tipo, flags }]
  const [reglasListas, setReglasListas] = useState(false);
  const textoDepurado = useMemo(() => {
    if (!resultado) return '';
    return resultado;
  }, [resultado]);

  useEffect(() => {
    Papa.parse(REGLAS_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || [])
          .map((r) => ({
            patron: (r.patron || '').trim(),
            reemplazo: (r.reemplazo ?? '').toString(),
            tipo: (r.tipo || 'regex').trim().toLowerCase(), // "regex" | "literal"
            flags: (r.flags || 'g').trim(), // "g" | "gi" etc
          }))
          .filter((r) => r.patron);

        setReglas(rows);
        setReglasListas(true);
      },
      error: (err) => {
        console.error('Error cargando reglas:', err);
        setReglas([]);
        setReglasListas(true); // para no bloquear
      },
    });
  }, []);

  /* Compila las reglas a RegExp (para rendimiento y control) */

  const reglasCompiladas = useMemo(() => {
    return reglas
      .map((r) => {
        try {
          if (r.tipo === 'literal') {
            // escapar literal para que no sea regex
            const escaped = r.patron.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return { re: new RegExp(escaped, r.flags || 'g'), reemplazo: r.reemplazo };
          }
          // regex
          return { re: new RegExp(r.patron, r.flags || 'g'), reemplazo: r.reemplazo };
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

  function depurar(textoOriginal, sustituirSaltoLinea) {
    const fechaActual = new Date().toLocaleDateString('es-ES');
    let textoProcesado = textoOriginal;

    const numVeces = 5;
    for (let n = 0; n < numVeces; n += 1) {
      for (const regla of reglasCompiladas) {
        textoProcesado = textoProcesado.replace(regla.re, regla.reemplazo);
      }
    }

    const lineas = textoProcesado.split('\n');
    const lineasModificadas = [];
    for (let i = 0; i < lineas.length; i += 1) {
      if (
        lineas[i].startsWith('Terapia/Medicamento:') &&
        lineas[i + 1] &&
        lineas[i + 1].startsWith('Posología/Observaciones:')
      ) {
        lineasModificadas.push(
          `${lineas[i]} (${lineas[i + 1].replace('Posología/Observaciones: ', '')})`
        );
        i += 1;
      } else if (lineas[i].startsWith('Posología/Observaciones')) {
        lineasModificadas.push(`(${lineas[i].replace('Posología/Observaciones: ', '')})`);
      } else {
        lineasModificadas.push(lineas[i]);
      }
    }

    const lineasFiltradas = lineasModificadas.filter(
      (linea) =>
        !linea.startsWith('Profesional') &&
        !linea.startsWith('Fecha inicio') &&
        !linea.startsWith('Fecha fin')
    );

    textoProcesado = lineasFiltradas.join('; ').replace(/\n\n/g, '; ');
    textoProcesado = textoProcesado.replace(/; ; /g, '; ');
    textoProcesado = textoProcesado.replace(/Terapia\/Medicamento:/g, '');
    textoProcesado = textoProcesado.replace(/ {2,}/g, ' ');
    textoProcesado = textoProcesado.replace(/ \)/g, ')');

    if (sustituirSaltoLinea) {
      textoProcesado = `Tratamiento crónico (por SIA a fecha ${fechaActual}):\n${textoProcesado}`;
    } else {
      textoProcesado = `Tratamiento crónico (por SIA a fecha ${fechaActual}):${textoProcesado}`;
    }

    if (sustituirSaltoLinea) {
      textoProcesado = textoProcesado.replace(/; /g, '\n');
      textoProcesado = textoProcesado.replace('\n\n', '\n');
      textoProcesado = textoProcesado
        .split('\n')
        .map((linea, index) => {
          if (index === 0) return linea;
          const limpia = linea.trim();
          return limpia ? `- ${limpia}` : linea;
        })
        .join('\n');
    }

    return textoProcesado;
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

  if (!reglasListas) return <p>Cargando reglas…</p>;

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
          <span className="depurador-toggle-label">Multilínea</span>
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
