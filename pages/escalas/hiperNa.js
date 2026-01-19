import { useState, useMemo } from 'react';
import InformeCopiable from '@/components/InformeCopiable';

export default function Hipernatremia() {
  
  
  const [peso, setPeso] = useState('');
  const [na, setNa] = useState('');
  const [glucosa, setGlucosa] = useState('');
  const [urea, setUrea] = useState('');

  const parsed = useMemo(() => {
    return {
      peso: parseFloat(peso),
      na: parseFloat(na),
      glucosa: parseFloat(glucosa),
      urea: parseFloat(urea)
    };
  }, [peso, na, glucosa, urea]);

  const calculo = useMemo(() => {
    const { peso, na, glucosa, urea } = parsed;

    if (
      !peso ||
      !na ||
      isNaN(peso) ||
      isNaN(na) ||
      isNaN(glucosa) ||
      isNaN(urea)
    ) {
      return null;
    }

    const deficit = (0.6 * peso) * ((na / 145) - 1);
    const osmolaridad =
      2 * na + glucosa / 18 + urea / 2.4 / 2.8;

    const ml = ((deficit * 1000) + 1000) / 2;

    return {
      deficit: deficit.toFixed(1),
      osmolaridad: osmolaridad.toFixed(1),
      ml: Math.round(ml),
      mlHora: Math.round(ml / 24),
      ml45: Math.round(ml * 2),
      ml45Hora: Math.round((ml * 2) / 24),
      hayHipernatremia: na > 145
    };
  }, [parsed]);

  const textoInforme = useMemo(() => {
    if (!calculo) return '';

    if (!calculo.hayHipernatremia) {
      return (
`HIPERNATREMIA

No existe hipernatremia.

Osmolaridad plasmática: ${calculo.osmolaridad} mOsm/kg (VN 275–298)`
      );
    }

    return (
`HIPERNATREMIA

Déficit de agua corporal:
- Déficit estimado: ${calculo.deficit} litros

Opciones de reposición:
- SG 5%: ${calculo.ml} ml en 24 h (${calculo.mlHora} ml/h)
- SF 0,45%: ${calculo.ml45} ml en 24 h (${calculo.ml45Hora} ml/h)

Osmolaridad plasmática: ${calculo.osmolaridad} mOsm/kg (VN 275–298)`
    );
  }, [calculo]);

  const reset = () => {
    setPeso('');
    setNa('');
    setGlucosa('');
    setUrea('');
  };


const interpretacionSodio = useMemo(() => {
  const sodio = parsed.na;
  if (!sodio || isNaN(sodio)) return null;

  if (sodio >= 135 && sodio <= 145) {
    return {
      texto: 'Normonatremia',
      color: 'verde',
      esHipernatremia: false
    };
  }

  if (sodio >= 146 && sodio <= 150) {
    return {
      texto: 'Hipernatremia leve',
      color: 'amarillo',
      esHipernatremia: true
    };
  }

  if (sodio >= 151 && sodio <= 159) {
    return {
      texto: 'Hipernatremia moderada',
      color: 'naranja',
      esHipernatremia: true
    };
  }

  if (sodio > 159) {
    return {
      texto: 'Hipernatremia severa',
      color: 'rojo',
      esHipernatremia: true
    };
  }

  if (sodio >= 131 && sodio <= 134) {
    return {
      texto: 'Hiponatremia leve (ver protocolo correspondiente)',
      color: 'amarillo',
      esHipernatremia: false
    };
  }

  if (sodio >= 126 && sodio <= 130) {
    return {
      texto: 'Hiponatremia moderada (ver protocolo correspondiente)',
      color: 'naranja',
      esHipernatremia: false
    };
  }

  if (sodio < 126) {
    return {
      texto: 'Hiponatremia severa (ver protocolo correspondiente)',
      color: 'rojo',
      esHipernatremia: false
    };
  }

  return null;
}, [parsed.na]);

  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
    

      {/* FORMULARIO */}
     <div className="inputs-grid">
  <div className="input-group">
    <label>Sodio plasmático (mEq/L)</label>
    <input
      type="number"
      value={na}
      onChange={e => setNa(e.target.value)}
    />
  </div>

  <div className="input-group">
    <label>Peso (kg)</label>
    <input
      type="number"
      value={peso}
      onChange={e => setPeso(e.target.value)}
    />
  </div>

  <div className="input-group">
    <label>Glucosa (mg/dL)</label>
    <input
      type="number"
      value={glucosa}
      onChange={e => setGlucosa(e.target.value)}
    />
  </div>

  <div className="input-group">
    <label>Urea (mg/dL)</label>
    <input
      type="number"
      value={urea}
      onChange={e => setUrea(e.target.value)}
    />
  </div>
</div>
      <button className="reset-btn" onClick={reset}>
        Reiniciar cálculo
      </button>

      {/* RESULTADO CLÍNICO */}
      {calculo && interpretacionSodio && (
  <div className={`resultado ${interpretacionSodio.color}`}>
    <div className="puntos-total">
      {interpretacionSodio.texto}
    </div>
    <div className="interpretacion">
      Osmolaridad {calculo.osmolaridad} mOsm/kg
    </div>
  </div>
)}

      {/* INFORME COPIABLE */}
      {interpretacionSodio?.esHipernatremia && (
  <InformeCopiable texto={textoInforme} />
)}

    </main>
  );
}