import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk7eftV0jKqjyLSf0nlVdheLthzEe6YnLH7UfKoKz_8rO0egB7imlswiymtLSRFhUFTv-XA-emUJyT/pub?gid=1829034177&single=true&output=csv';

/* =========================
   UTILIDADES
========================= */

// Título (Primera letra en mayúscula)
function toTitleCase(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Formato del nombre (marca en mayúsculas + resto minúsculas)
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

  return {
    marca,
    resto,
    completo: original
  };
}

/* =========================
   COMPONENTE PRINCIPAL
========================= */

export default function Home() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
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
        const n = (a?.nombre || '').localeCompare(
          b?.nombre || '',
          'es',
          { sensitivity: 'base' }
        );
        if (n !== 0) return n;

        return (a?.labcomercializador || '').localeCompare(
          b?.labcomercializador || '',
          'es',
          { sensitivity: 'base' }
        );
      });
  }, [data, fTipoTratamiento, fTipoInhalador, fAsma, fEpoc, fClases]);

  /* ===== ESTADOS ===== */
  if (loading) return <p>Cargando inhaladores…</p>;
  if (!data.length) return <p>No se han cargado datos</p>;

  /* ===== RENDER ===== */
  return (
    <main style={{ padding: 24 }}>
      <h1>Inhaladores</h1>

      {/* FILTROS */}
      <div className="filters">
        <div>
          <label>Tipo tratamiento</label>
          <select
            value={fTipoTratamiento}
            onChange={e => setFTipoTratamiento(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="Mono">Monoterapia</option>
            <option value="Dual">Terapia dual</option>
            <option value="Triple">Triple terapia</option>
          </select>
        </div>

        <div>
          <label>Tipo inhalador</label>
          <select
            value={fTipoInhalador}
            onChange={e => setFTipoInhalador(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pMDI">pMDI</option>
            <option value="DPI">DPI</option>
            <option value="Nebulizador">Nebulizador</option>
          </select>
        </div>

        <div>
          <label>Indicación</label>
          <label>
            <input
              type="checkbox"
              checked={fAsma}
              onChange={e => setFAsma(e.target.checked)}
            />{' '}
            Asma
          </label>
          <label>
            <input
              type="checkbox"
              checked={fEpoc}
              onChange={e => setFEpoc(e.target.checked)}
            />{' '}
            EPOC
          </label>
        </div>

        <div>
          <label>Clases</label>
          {Object.keys(fClases).map(c => (
            <label key={c}>
              <input
                type="checkbox"
                checked={fClases[c]}
                onChange={e =>
                  setFClases({ ...fClases, [c]: e.target.checked })
                }
              />{' '}
              {c}
            </label>
          ))}
        </div>
      </div>

      <p>Total resultados: {filteredAndSortedData.length}</p>

      {/* TABLA */}
      <table className="tabla-intranet">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Principio activo</th>
            <th>Dispositivo</th>
            <th>Tipo inhalador</th>
            <th>Indicación</th>
            <th>Tipo tratamiento</th>
            <th>Laboratorio</th>
          </tr>
        </thead>

        <tbody>
          {filteredAndSortedData.map((d, i) => {
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
                <td className="nombre-cell">
                  <span className="nombre-wrapper" title={n.completo}>
                    <strong>{n.marca}</strong>
                    {n.resto && <span>&nbsp;{n.resto}</span>}
                  </span>
                </td>
                <td>{toTitleCase(d.vtm)}</td>
                <td>{d.DISPOSITIVO}</td>
                <td>{d.DISPOSITIVO_INHALACION}</td>
                <td>
  {d['ASMA (FT 4.1)'] === 'Sí' && (
    <span className="badge badge-asma">Asma</span>
  )}
  {d['EPOC (FT 4.1)'] === 'Sí' && (
    <span className="badge badge-epoc">EPOC</span>
  )}
</td>
                <td>
  <span className={`badge badge-${d.TIPO_TRATAMIENTO?.toLowerCase()}`}>
    {d.TIPO_TRATAMIENTO}
  </span>
</td>
                <td>{d.labcomercializador}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style jsx>{`
/* ---- TABLA ESTILO INTRANET ---- */

.tabla-intranet {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: #ffffff;
}

/* Cabecera */
.tabla-intranet thead th {
  background-color: #4f7f8a;   /* teal hospitalario */
  color: #ffffff;
  text-align: left;
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 2px solid #3f6973;
}

/* Celdas */
.tabla-intranet td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: top;
  color: #111827;
}

/* Hover de fila */
.tabla-intranet tbody tr:hover {
  background-color: #e3edef;   /* gris-azulado suave */
}

/* Nombre */
.nombre-cell {
  max-width: 420px;
}

.nombre-wrapper {
  display: inline-flex;
  max-width: 100%;
  white-space: nowrap;
}

.nombre-marca {
  font-weight: 700;
  text-transform: uppercase;
  margin-right: 4px;
}

.nombre-resto {
  font-weight: 400;
  text-transform: lowercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Badges (sobrios, intranet) */
.badge {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 4px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* Indicaciones */
.badge-asma {
  background: #e6f4ea;
  color: #137333;
}

.badge-epoc {
  background: #fff4e5;
  color: #92400e;
}

/* Tipo tratamiento */
.badge-mono {
  background: #f3f4f6;
  color: #374151;
}

.badge-dual {
  background: #e0f2fe;
  color: #075985;
}

.badge-triple {
  background: #fee2e2;
  color: #991b1b;
}

/* Filtros */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 16px;
  font-size: 13px;
}

.filters > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filters label {
  font-weight: 500;
}

/* Selects y checkboxes */
.filters select {
  padding: 4px 6px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 13px;
}

.filters input[type="checkbox"] {
  margin-right: 4px;
}
`}</style>
    </main>
  );
}