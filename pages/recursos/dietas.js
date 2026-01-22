import { useEffect, useMemo, useState } from 'react';
import InformeCopiable from '@/components/InformeCopiable';

function norm(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita tildes
}

export default function DietasYRecomendaciones() {
  const [catalogo, setCatalogo] = useState([]);
  const [q, setQ] = useState('');
  const [fSistema, setFSistema] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch('/dietas_recom/index.json')
      .then((r) => r.json())
      .then((data) => setCatalogo(Array.isArray(data) ? data : []))
      .catch(() => setCatalogo([]));
  }, []);

  const filtrados = useMemo(() => {
    const nq = norm(q).trim();
    const base = fSistema
      ? catalogo.filter((it) => (it.sistemas || []).includes(fSistema))
      : catalogo;
    if (!nq) return base;

    return base.filter((it) => {
      const hay = norm(
        `${it.titulo || ''} ${(it.tags || []).join(' ')} ${(it.sistemas || []).join(' ')}`
      );
      return hay.includes(nq);
    });
  }, [catalogo, q, fSistema]);

  const sistemas = useMemo(() => {
    const set = new Set();
    catalogo.forEach((it) => {
      (it.sistemas || []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [catalogo]);

  const agrupados = useMemo(() => {
    const grupos = {};
    sistemas.forEach((s) => {
      grupos[s] = filtrados.filter((it) => (it.sistemas || []).includes(s));
    });
    const sinSistema = filtrados.filter((it) => !(it.sistemas || []).length);
    if (sinSistema.length) {
      grupos.otros = sinSistema;
    }
    return grupos;
  }, [filtrados, sistemas]);

  async function cargar(it) {
    setSeleccion(it);
    setCargando(true);
    setTexto('');

    try {
      const r = await fetch(it.ruta, { cache: 'no-store' });
      const t = await r.text();
      setTexto(t.trim());
    } catch (e) {
      setTexto('No se pudo cargar el texto.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
      <div className="buscador-wrapper buscador-dietas">
        <span className="buscador-icon" aria-hidden>
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 841.889 595.281"
            xmlSpace="preserve"
          >
            <path
              fill="currentColor"
              d="M699.567,542.207L557.889,394.854c36.428-43.304,56.387-97.789,56.387-154.51
	C614.276,107.82,506.455,0,373.932,0C241.407,0,133.587,107.82,133.587,240.344c0,132.523,107.82,240.344,240.345,240.344
	c49.751,0,97.161-15.006,137.695-43.491l142.754,148.47c5.967,6.196,13.992,9.614,22.593,9.614c8.141,0,15.862-3.104,21.725-8.747
	C711.155,574.549,711.552,554.673,699.567,542.207z M373.931,62.699c97.956,0,177.646,79.689,177.646,177.646
	S471.887,417.99,373.932,417.99c-97.956,0-177.646-79.689-177.646-177.646S275.976,62.699,373.931,62.699z"
            />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Buscar… (p. ej., blanda, gastro, DM)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="buscador-input"
        />
        {q && (
          <button type="button" className="buscador-clear" onClick={() => setQ('')}>
            Limpiar
          </button>
        )}
      </div>

      <div className="filtro-grupo">
        <span className="filtro-titulo">Sistema</span>
        <div className="filtro-botones">
          <button
            className={`filtro-btn ${!fSistema ? 'activo' : ''}`}
            onClick={() => setFSistema('')}
          >
            Todos
          </button>
          {sistemas.map((s) => (
            <button
              key={s}
              className={`filtro-btn ${fSistema === s ? 'activo' : ''}`}
              onClick={() => setFSistema(fSistema === s ? '' : s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dietas-layout">
        <div className="dietas-lista">
          {Object.keys(agrupados).map((grupo) => (
            <div key={grupo} className="dietas-grupo">
              <div className="dietas-grupo-titulo">
                {grupo === 'otros' ? 'Otros' : grupo.charAt(0).toUpperCase() + grupo.slice(1)}
              </div>
              {agrupados[grupo].map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className={`selector-btn dietas-item ${seleccion?.id === it.id ? 'activo' : ''}`}
                  onClick={() => cargar(it)}
                  title={(it.tags || []).join(', ')}
                >
                  {it.titulo}
                </button>
              ))}
            </div>
          ))}

          {!filtrados.length && <div className="muted">Sin resultados</div>}
        </div>

        <div className="dietas-visor">
          {seleccion?.titulo ? (
            <div className="muted" style={{ marginBottom: 8 }}>
              {cargando ? 'Cargando…' : seleccion.titulo}
            </div>
          ) : (
            <div className="muted" style={{ marginBottom: 8 }}>
              Selecciona un texto
            </div>
          )}

          {texto ? <InformeCopiable texto={texto} /> : null}
        </div>
      </div>
    </main>
  );
}
