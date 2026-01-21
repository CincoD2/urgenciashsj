export default function Escalas() {
  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
      <h1>Escalas clínicas</h1>

      <div className="escala-links">
        <a className="escala-link-btn" href="/escalas/wells-tvp">
          <span className="escala-link-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v18" />
              <path d="M12 8l-4 4 4 4" />
              <path d="M12 8l4 4-4 4" />
            </svg>
          </span>
          Wells – TVP
        </a>
        <a className="escala-link-btn" href="/escalas/curb65">
          <span className="escala-link-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="12" r="4" />
              <circle cx="16" cy="12" r="4" />
              <path d="M12 3v6" />
              <path d="M12 15v6" />
            </svg>
          </span>
          CURB-65
        </a>
        <a className="escala-link-btn" href="/escalas/hiperNa">
          <span className="escala-link-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
            </svg>
          </span>
          Hipernatremia
        </a>
        <a className="escala-link-btn" href="/escalas/hiponatremia">
          <span className="escala-link-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
              <path d="M7 14h10" />
            </svg>
          </span>
          Hiponatremia
        </a>
        <a className="escala-link-btn" href="/escalas/depuradorTtos">
          <span className="escala-link-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 7l-4 5 4 5" />
              <path d="M17 7l4 5-4 5" />
              <path d="M10 19l4-14" />
            </svg>
          </span>
          Depurador de tratamiento
        </a>
      </div>
    </main>
  );
}
