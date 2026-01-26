import { useEffect } from 'react';

const MESES = 5.5;

function eur(n) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default function Calculadora() {
  const lastUpdated = new Date().toLocaleString("es-ES");

  useEffect(() => {
    const tea = document.getElementById('tea');
    const trn = document.getElementById('trn');
    const jfd = document.getElementById('jfd');
    const cards = { TEA: tea, TRN: trn, JFD: jfd };

    const turno = document.getElementById('turno');
    const teaOrd = document.getElementById('tea_ord');
    const teaFes = document.getElementById('tea_fes');
    const teaJl = document.getElementById('tea_jl');
    const teaJf = document.getElementById('tea_jf');
    const trnEsp = document.getElementById('trnEsp');
    const trnJl = document.getElementById('trn_jl');
    const trnJf = document.getElementById('trn_jf');

    const totTea = document.getElementById('totTea');
    const totTrn = document.getElementById('totTrn');
    const totJfd = document.getElementById('totJfd');
    const totalGen = document.getElementById('totalGen');

    function calc() {
      const teaTot =
        (67.42 + 83.33) * MESES +
        Number(teaOrd.value) * 2 +
        Number(teaFes.value) * 5.8 +
        Number(teaJl.value) * 1 +
        Number(teaJf.value) * 2.9;
      const trnTot =
        (67.42 + (trnEsp.checked ? 83.33 : 0) + 83.33) * MESES +
        Number(trnJl.value) * 1 +
        Number(trnJf.value) * 2.9;
      const jfdTot = (67.42 + 83.33) * MESES;

      totTea.textContent = eur(teaTot);
      totTrn.textContent = eur(trnTot);
      totJfd.textContent = eur(jfdTot);
      totalGen.textContent =
        turno.value === 'TEA' ? eur(teaTot) : turno.value === 'TRN' ? eur(trnTot) : eur(jfdTot);
    }

    function lock() {
      Object.keys(cards).forEach((k) => {
        cards[k].classList.toggle('inactive', k !== turno.value);
      });
      calc();
    }

    turno.addEventListener('change', lock);
    document.querySelectorAll('input').forEach((i) => {
      i.addEventListener('input', calc);
    });
    lock();

    return () => {
      turno.removeEventListener('change', lock);
      document.querySelectorAll('input').forEach((i) => {
        i.removeEventListener('input', calc);
      });
    };
  }, []);

  return (
    <div className="container">
      <style>{`
        :root{--naranja:#f97316;--verde:#10b981;--fondo1:#f0fdfa;--fondo2:#fff7ed}
        *{box-sizing:border-box}
        body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto;background:linear-gradient(var(--fondo1),var(--fondo2))}
        .container{max-width:1200px;margin:auto;padding:20px}
        header{text-align:center;margin-bottom:20px}
        header img{max-width:220px;width:100%;height:auto;margin-bottom:10px}
        .card{background:#fff;border-radius:18px;padding:18px;margin-bottom:16px;box-shadow:0 4px 10px rgba(0,0,0,.08)}
        .row3{display:flex;gap:14px}
        .row3 .card{flex:1 1 0;min-width:0;display:flex;flex-direction:column}
        @media(max-width:900px){.row3{flex-direction:column}}
        .borde-tea{background:#fff7ed}
        .borde-trn{background:#ecfdf5}
        .borde-jfd{background:#1f2937;color:#fff}
        .grid{display:grid;grid-template-columns:1fr 140px;gap:10px}
        @media(max-width:720px){.grid{grid-template-columns:1fr}}
        input,select{padding:10px;border-radius:10px;border:1px solid #e5e7eb;min-height:44px}
        input[readonly]{background:#f1f5f9}
        .total{margin-top:12px;padding:14px;border-radius:14px;font-weight:800;display:flex;justify-content:space-between}
        .row3 .total{margin-top:auto}
        .total-tea{border:2px solid var(--naranja);color:var(--naranja)}
        .total-trn{border:2px solid var(--verde);color:var(--verde)}
        .total-jfd{border:2px solid #fff}
        .inactive{opacity:.35;pointer-events:none}
        .total-general{background:#000;color:#fff;border-radius:18px;padding:20px;font-size:22px;font-weight:900;display:flex;justify-content:space-between}
        .calc-list{margin:0;padding-left:18px;line-height:1.5}
        .calc-list li{margin:6px 0}
      `}</style>

      <header>
        <img
          src="/calculadoraTRNConvenio/Logo M SM VS Youtube.png"
          alt="Sindicato Médico Vinalopó"
        />
        <h1>
          ¿Qué importe cobraré de manera retroactiva con la publicación del IV Convenio Colectivo?
        </h1>
        <p>
          <strong>Fecha de firma: 15/07/2025</strong>
        </p>
      </header>

      <div className="card">
        <label>
          <strong>Selecciona el turno de trabajo</strong>
        </label>
        <select id="turno" defaultValue="TEA">
          <option value="TEA">TEA / TEB</option>
          <option value="TRN">TRN / TRD</option>
          <option value="JFD">JFD</option>
        </select>
        <p>
          <strong>Meses computables: 5,5</strong>
        </p>
      </div>

      <div className="row3">
        <div className="card borde-tea" id="tea">
          <h3>TEA / TEB</h3>
          <div className="grid">
            <label>Salario base</label>
            <input readOnly defaultValue="67.42" />
            <label>Especialidad</label>
            <input readOnly defaultValue="83.33" />
            <label>Atención ordinaria (h)</label>
            <input type="number" id="tea_ord" defaultValue="0" />
            <label>Atención festivo (h)</label>
            <input type="number" id="tea_fes" defaultValue="0" />
            <label>Jefatura laborable (h)</label>
            <input type="number" id="tea_jl" defaultValue="0" />
            <label>Jefatura festivo (h)</label>
            <input type="number" id="tea_jf" defaultValue="0" />
          </div>
          <div className="total total-tea">
            <span>Total TEA</span>
            <span id="totTea">—</span>
          </div>
        </div>

        <div className="card borde-trn" id="trn">
          <h3>TRN / TRD</h3>
          <div className="grid">
            <label>Salario base</label>
            <input readOnly defaultValue="67.42" />
            <label>
              <input type="checkbox" id="trnEsp" defaultChecked /> Especialidad
            </label>
            <input readOnly defaultValue="83.33" />
            <label>Turnicidad</label>
            <input readOnly defaultValue="83.33" />
            <label>Jefatura laborable (h)</label>
            <input type="number" id="trn_jl" defaultValue="0" />
            <label>Jefatura festivo (h)</label>
            <input type="number" id="trn_jf" defaultValue="0" />
          </div>
          <div className="total total-trn">
            <span>Total TRN</span>
            <span id="totTrn">—</span>
          </div>
        </div>

        <div className="card borde-jfd" id="jfd">
          <h3>JFD</h3>
          <div className="grid">
            <label>Salario base</label>
            <input readOnly defaultValue="67.42" />
            <label>Especialidad</label>
            <input readOnly defaultValue="83.33" />
          </div>
          <div className="total total-jfd">
            <span>Total JFD</span>
            <span id="totJfd">—</span>
          </div>
        </div>
      </div>

      <div className="total-general">
        <span>TOTAL GENERAL ÚNICO</span>
        <span id="totalGen">—</span>
      </div>

      <div className="card">
        <h3>Cómo se calculan los importes</h3>
        <ul className="calc-list">
          <li>Salario base: +67,42 €/mes</li>
          <li>Especialidad: +83,33 €/mes</li>
          <li>Turnicidad TRN: +83,33 €/mes</li>
          <li>Atención continuada: +2 €/h laborable · +5,8 €/h festivo</li>
          <li>Jefatura: +1 €/h laborable · +2,9 €/h festivo</li>
        </ul>
      </div>

      <p style={{ textAlign: "center", opacity: 0.7, marginTop: 12 }}>
        Última actualización: {lastUpdated}
      </p>
    </div>
  );
}
