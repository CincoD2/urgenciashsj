import { useState } from 'react';

export default function InformeCopiable({ texto }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    if (!texto) return;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  return (
    <div className="informe-wrapper">
      <div className="informe-label">Texto para informe clínico</div>

      <button
        className={`copy-btn-dark ${copiado ? 'copiado' : ''}`}
        onClick={copiar}
        disabled={!texto}
        title="Copiar al portapapeles"
      >
        {copiado ? (
          <>
            <span className="check">✔</span> Copiado
          </>
        ) : (
          <>
            <svg
              className="copy-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1z" />
              <path d="M20 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
            </svg>
            Copiar
          </>
        )}
      </button>

      <pre className="informe-texto">
{texto || '—'}
      </pre>
    </div>
  );
}