import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk7eftV0jKqjyLSf0nlVdheLthzEe6YnLH7UfKoKz_8rO0egB7imlswiymtLSRFhUFTv-XA-emUJyT/pub?gid=1829034177&single=true&output=csv';

/* =========================
   UTILIDADES
========================= */
// Detectar vista móvil (React)

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}


// Tipo Título
function toTitleCase(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Formato del nombre
function formatearNombre(nombre) {
  if (!nombre) return { marca: '', resto: '', completo: '' };

  const original = nombre.trim();
  const match = original.match(/\d/);

  let marca = original;
  let resto = '';

  if (match) {
    const i = match.index;
    marca = original.slice(0, i).trim();
    resto = original.slice(i).trim();
  }

  marca = marca.toUpperCase();
  resto = resto.replace(/microgramos/gi, 'mcg').toLowerCase();

  return { marca, resto, completo: original };
}

/* =========================
   COMPONENTE PRINCIPAL
========================= */

export default function Home() {
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Paginación
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);

  // Filtros
  const [search, setSearch] = useState('');
  const [fTipoTratamiento, setFTipoTratamiento] = useState('');
  const [fTipoInhalador, setFTipoInhalador] = useState('');
  const [fAsma, setFAsma] = useState(false);
  const [fEpoc, setFEpoc] = useState(false);
  const [fClases, setFClases] = useState({
    SABA: false,
    SAMA: false,
    LABA: false,
    LAMA: false,
    CI: false
  });

  function resetFiltros() {
    setSearch('');
    setFTipoTratamiento('');
    setFTipoInhalador('');
    setFAsma(false);
    setFEpoc(false);
    setFClases({
      SABA: false,
      SAMA: false,
      LABA: false,
      LAMA: false,
      CI: false
    });
  }
  
  /* ====== Función para manejar el clic en cabeceras ===== */
  function onSort(col) {
  if (sortBy === col) {
    setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
  } else {
    setSortBy(col);
    setSortDir('asc');
  }
}
  /* ===== CARGA CSV ===== */
  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: results => {
        setData(results.data || []);
        setLoading(false);
      },
      error: err => {
        console.error('Error cargando CSV:', err);
        setLoading(false);
      }
    });
  }, []);

  /* ===== FILTRO + ORDEN ===== */
  const filteredAndSortedData = useMemo(() => {
    return [...data]
      .filter(d => {
        if (!d) return false;
        
        /* ===== BUSCADOR TEXTO LIBRE ===== */
  if (search) {
    const texto = search.toLowerCase();

    const hayCoincidencia = Object.values(d)
      .join(' ')
      .toLowerCase()
      .includes(texto);

    if (!hayCoincidencia) return false;
  }
  
        if (fTipoTratamiento && d['TIPO_TRATAMIENTO'] !== fTipoTratamiento) {
          return false;
        }

        if (
          fTipoInhalador &&
          d['DISPOSITIVO_INHALACION'] !== fTipoInhalador
        ) {
          return false;
        }

        if (fAsma || fEpoc) {
          const okAsma = fAsma && d['ASMA (FT 4.1)'] === 'Sí';
          const okEpoc = fEpoc && d['EPOC (FT 4.1)'] === 'Sí';
          if (!okAsma && !okEpoc) return false;
        }

        for (const c in fClases) {
          if (fClases[c] && d[c] !== 'Sí') return false;
        }

        return true;
      })
      .sort((a, b) => {
  const valA = (a?.[sortBy] || '').toString();
  const valB = (b?.[sortBy] || '').toString();

  const cmp = valA.localeCompare(valB, 'es', {
    sensitivity: 'base',
    numeric: true
  });

  return sortDir === 'asc' ? cmp : -cmp;
});

  }, [data, search, fTipoTratamiento, fTipoInhalador, fAsma, fEpoc, fClases, sortBy, sortDir]);

  /* ===== RESET PÁGINA AL CAMBIAR FILTROS ===== */
  useEffect(() => {
    setPage(1);
  }, [search, fTipoTratamiento, fTipoInhalador, fAsma, fEpoc, fClases]);



function getPaginationPages(current, total) {
  const pages = [];

  if (total <= 7) {
    // pocas páginas → mostrar todas
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (current > 3) {
    pages.push('...');
  }

  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < total) {
      pages.push(i);
    }
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}





  /* ===== PAGINACIÓN ===== */
  const totalPages = Math.ceil(filteredAndSortedData.length / PAGE_SIZE);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSortedData.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedData, page]);

  /* ===== ESTADOS ===== */
  if (loading) return <p>Cargando inhaladores…</p>;
  if (!data.length) return <p>No se han cargado datos</p>;

  /* ===== RENDER ===== */
  return (
    <main style={{ padding: 24 }}>
      {/* FILTROS */}
      <div className="filters">

        {/* Tipo tratamiento */}
        <div className="filtro-grupo">
          <span className="filtro-titulo">Tipo tratamiento</span>
          <div className="filtro-botones">
            {['Mono', 'Dual', 'Triple'].map(v => (
              <button
                key={v}
                className={`filtro-btn ${fTipoTratamiento === v ? 'activo' : ''}`}
                onClick={() =>
                  setFTipoTratamiento(fTipoTratamiento === v ? '' : v)
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo inhalador */}
        <div className="filtro-grupo">
          <span className="filtro-titulo">Tipo inhalador</span>
          <div className="filtro-botones">
            {[
              { value: 'pMDI', label: 'Presurizado' },
              { value: 'DPI', label: 'Polvo seco' },
              { value: 'Nebulizador', label: 'Nebulizador' }
            ].map(opt => (
              <button
                key={opt.value}
                className={`filtro-btn ${fTipoInhalador === opt.value ? 'activo' : ''}`}
                onClick={() =>
                  setFTipoInhalador(
                    fTipoInhalador === opt.value ? '' : opt.value
                  )
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicación */}
        <div className="filtro-grupo">
          <span className="filtro-titulo">Indicación</span>
          <div className="filtro-botones">
            <button
              className={`filtro-btn ${fAsma ? 'activo' : ''}`}
              onClick={() => setFAsma(!fAsma)}
            >
              Asma
            </button>
            <button
              className={`filtro-btn ${fEpoc ? 'activo' : ''}`}
              onClick={() => setFEpoc(!fEpoc)}
            >
              EPOC
            </button>
          </div>
        </div>

        {/* Clases */}
        <div className="filtro-grupo">
          <span className="filtro-titulo">Clases</span>
          <div className="filtro-botones">
            {Object.keys(fClases).map(c => (
              <button
                key={c}
                className={`filtro-btn ${fClases[c] ? 'activo' : ''}`}
                onClick={() =>
                  setFClases({ ...fClases, [c]: !fClases[c] })
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div className="filtro-grupo">
          <span className="filtro-titulo">&nbsp;</span>
          <button className="filtro-btn filtro-reset-btn" onClick={resetFiltros}>
            Borrar filtros
          </button>
        </div>
      </div>

  <div className="buscador-wrapper">
  <span className="buscador-icon" aria-hidden />
  <input
    type="text"
    placeholder="Busca palabras clave..."
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="buscador-input"
  />
</div>      
      
{/* CABECERA TABLA + PAGINACIÓN */}
<div className="tabla-header">

  <div className="tabla-info">
    Mostrando {paginatedData.length} de {filteredAndSortedData.length} resultados
    &nbsp;— Página {page} de {totalPages}
  </div>

  <div className="paginacion">
    <button
      disabled={page === 1}
      onClick={() => setPage(p => Math.max(1, p - 1))}
    >
      ◀
    </button>

    {getPaginationPages(page, totalPages).map((p, i) =>
  p === '...' ? (
    <span key={`sep-${i}`} className="paginacion-separador">
      …
    </span>
  ) : (
    <button
      key={p}
      className={p === page ? 'activo' : ''}
      onClick={() => setPage(p)}
    >
      {p}
    </button>
  )
)}

    <button
      disabled={page === totalPages}
      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
    >
      ▶
    </button>
  </div>
</div>

{isMobile ? (
  <div className="cards-list">
    {paginatedData.map((d, i) => {
      const n = formatearNombre(d.nombre);

      return (
        <div
          key={i}
          className="inhalador-card"
          onClick={() =>
            d['POSOLOGIA_FT_4_2_URL'] &&
            window.open(d['POSOLOGIA_FT_4_2_URL'], '_blank')
          }
        >
          <div className="card-header">
            <strong>{n.marca}</strong>
            {n.resto && <span> {n.resto}</span>}
          </div>

          <div className="card-pa">{toTitleCase(d.vtm)}</div>

          <div className="card-row">
            <span className="label">Dispositivo</span>
            <span>{d.DISPOSITIVO}</span>
          </div>

          <div className="card-row">
            <span className="label">Indicación</span>
            <span>
              {d['ASMA (FT 4.1)'] === 'Sí' && (
                <span className="badge badge-asma">Asma</span>
              )}
              {d['EPOC (FT 4.1)'] === 'Sí' && (
                <span className="badge badge-epoc">EPOC</span>
              )}
            </span>
          </div>

          <div className="card-row">
            <span className="label">Tratamiento</span>
            <span className={`badge badge-${d.TIPO_TRATAMIENTO?.toLowerCase()}`}>
              {d.TIPO_TRATAMIENTO}
            </span>
          </div>

          <div className="card-lab">
            {d.labcomercializador}
          </div>
        </div>
      );
    })}
  </div>
) : (
     <>
      {/* TABLA */}
      <table className="tabla-intranet">
        <thead>
  <tr>
    <th className="sortable col-nombre" onClick={() => onSort('nombre')}>
      Nombre {sortBy === 'nombre' && (sortDir === 'asc' ? '▲' : '▼')}
    </th>

    <th className="sortable col-pa" onClick={() => onSort('vtm')}>
      Principio activo {sortBy === 'vtm' && (sortDir === 'asc' ? '▲' : '▼')}
    </th>

    <th className="sortable col-dispositivo" onClick={() => onSort('DISPOSITIVO')}>
      Dispositivo {sortBy === 'DISPOSITIVO' && (sortDir === 'asc' ? '▲' : '▼')}
    </th>

    <th className="col-indicacion">Indicación</th>

    <th className="sortable col-tipo" onClick={() => onSort('TIPO_TRATAMIENTO')}>
      Tipo {sortBy === 'TIPO_TRATAMIENTO' && (sortDir === 'asc' ? '▲' : '▼')}
    </th>

    <th className="sortable col-lab" onClick={() => onSort('labcomercializador')}>
      Laboratorio {sortBy === 'labcomercializador' && (sortDir === 'asc' ? '▲' : '▼')}
    </th>
  </tr>
</thead>

        <tbody>
          {paginatedData.map((d, i) => {
            const n = formatearNombre(d.nombre);
            return (
              <tr
                key={i}
                onClick={() =>
                  d['POSOLOGIA_FT_4_2_URL'] &&
                  window.open(d['POSOLOGIA_FT_4_2_URL'], '_blank')
                }
                style={{ cursor: 'pointer' }}
              >
                <td className="col-nombre nombre-cell">
                  <span className="nombre-wrapper" title={n.completo}>
                    <strong className="nombre-marca">{n.marca}</strong>
                    {n.resto && <span className="nombre-resto">&nbsp;{n.resto}</span>}
                  </span>
                </td>

                <td className="col-pa">{toTitleCase(d.vtm)}</td>

                <td className="col-dispositivo">{d.DISPOSITIVO}</td>

                <td className="col-indicacion">
                  {d['ASMA (FT 4.1)'] === 'Sí' && (
                    <span className="badge badge-asma">Asma</span>
                  )}
                  {d['EPOC (FT 4.1)'] === 'Sí' && (
                    <span className="badge badge-epoc">EPOC</span>
                  )}
                </td>

                <td className="col-tipo">
                  <span className={`badge badge-${d.TIPO_TRATAMIENTO?.toLowerCase()}`}>
                    {d.TIPO_TRATAMIENTO}
                  </span>
                </td>

                <td className="col-lab">{d.labcomercializador}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </>
)}
      {/* PAGINACIÓN */}
      <div className="paginacion">
        <button
          disabled={page === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          ◀ Anterior
        </button>

        {getPaginationPages(page, totalPages).map((p, i) =>
  p === '...' ? (
    <span key={`sep-${i}`} className="paginacion-separador">
      …
    </span>
  ) : (
    <button
      key={p}
      className={p === page ? 'activo' : ''}
      onClick={() => setPage(p)}
    >
      {p}
    </button>
  )
)}

        <button
          disabled={page === totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          Siguiente ▶
        </button>
      </div>
    </main>
  );
}