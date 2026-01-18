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

function resetFiltros() {
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
      
     {/* FILTROS */}
<div className="filters">

  {/* Tipo tratamiento (uno solo) */}
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

  {/* Tipo inhalador (uno solo) */}
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


  {/* Indicación (múltiple) */}
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

  {/* Clases (múltiple) */}
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

      <p>Total resultados: {filteredAndSortedData.length}</p>

      {/* TABLA */}
      <table className="tabla-intranet">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Principio activo</th>
            <th>Dispositivo</th>
            
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
  table-layout: fixed;
  
}

/* Cabecera */
.tabla-intranet thead th {
  background-color: #4f7f8a;   /* teal hospitalario */
  color: #ffffff;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Hover de fila */
.tabla-intranet tbody tr:hover {
  background-color: #e3edef;   /* gris-azulado suave */
}

/* Botón Limpiar filtros */
.filtro-reset {
  display: flex;
  align-items: flex-end;
}

.filtro-reset button {
  padding: 6px 10px;
  font-size: 13px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  cursor: pointer;
}

.filtro-reset button:hover {
  background: #e5e7eb;
}


/* Nombre */
.nombre-cell {
  max-width: 100%;
  overflow: hidden;
}

.nombre-wrapper {
  display: block;          /* ← NO inline-flex */
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nombre-marca {
  font-weight: 700;
  text-transform: uppercase;
}

.nombre-resto {
  font-weight: 400;
  text-transform: lowercase;
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

/* Contenedor filtros */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin-bottom: 20px;
}

/* Grupo */
.filtro-grupo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Título */
.filtro-titulo {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

/* Botones */
.filtro-botones {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filtro-btn {
  min-width: 90px;
  padding: 8px 14px;
  font-size: 14px;
  background: #ffffff;
  color: #374151;
  border: 2px solid #5a7f8a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

/* Hover */
.filtro-btn:hover {
  background: #eef5f7;
}

/* Activo */
.filtro-btn.activo {
  background: #5a7f8a;
  color: #ffffff;
}
/* ===== Anchos de columnas ===== */

/* Nombre (la más ancha) */
.tabla-intranet th:nth-child(1),
.tabla-intranet td:nth-child(1) {
  width: 30%;
  text-align: left;
}

/* Principio activo */
.tabla-intranet th:nth-child(2),
.tabla-intranet td:nth-child(2) {
  width: 20%;
  text-align: left;
  white-space: normal;
  line-height: 1.3;
}

/* Dispositivo */
.tabla-intranet th:nth-child(3),
.tabla-intranet td:nth-child(3) {
  width: 12%;
  text-align: center;
}


/* Indicación */
.tabla-intranet th:nth-child(5),
.tabla-intranet td:nth-child(5) {
  width: 18%;
  text-align: center;
}

/* Tipo tratamiento */
.tabla-intranet th:nth-child(6),
.tabla-intranet td:nth-child(6) {
  width: 8%;
  text-align: center;
}

/* Laboratorio */
.tabla-intranet th:nth-child(7),
.tabla-intranet td:nth-child(7) {
  width: 12%;
  text-align: left;
  line-height: 1.3;
}
/* Indicación: badges siempre visibles */
.tabla-intranet td:nth-child(4) {
  white-space: nowrap;
}

/* ===== Botón BORRAR FILTROS ===== */

.filtro-reset-btn {
  background: #fee2e2;          /* rojo muy suave */
  border-color: #ef4444;
  color: #991b1b;
  font-weight: 600;
}

/* Hover */
.filtro-reset-btn:hover {
  background: #fecaca;
}

/* Activo (click) */
.filtro-reset-btn:active {
  background: #fca5a5;
}

`}</style>
    </main>
  );
  
}