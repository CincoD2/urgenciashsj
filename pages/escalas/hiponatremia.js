import { useEffect, useMemo, useState } from 'react';
import InformeCopiable from '@/components/InformeCopiable';

const SUEROS = [
  { id: 'ssf', label: 'SSF 0,9%', mEqPorLitro: 154 },
  { id: 'ssh3', label: 'SSH 3%', mEqPorLitro: 494 },
  { id: 'ssh5', label: 'SSH 5%', mEqPorLitro: 834 },
];

export default function Hiponatremia() {
  const [sexo, setSexo] = useState('');
  const [peso, setPeso] = useState('');
  const [naActual, setNaActual] = useState('');
  const [naDeseado, setNaDeseado] = useState('');
  const [horas, setHoras] = useState('');
  const [sintomasGraves, setSintomasGraves] = useState(false);
  const [sueroId, setSueroId] = useState('');

  const parsed = useMemo(() => {
    return {
      peso: parseFloat(peso),
      naActual: parseFloat(naActual),
      naDeseado: parseFloat(naDeseado),
      horas: parseFloat(horas),
    };
  }, [peso, naActual, naDeseado, horas]);

  const gravedad = useMemo(() => {
    const na = parsed.naActual;
    if (!na || isNaN(na)) return null;
    return na < 115 || sintomasGraves;
  }, [parsed.naActual, sintomasGraves]);

  const suero = useMemo(() => {
    return SUEROS.find((s) => s.id === sueroId) || null;
  }, [sueroId]);

  const calculo = useMemo(() => {
    const { peso, naActual, naDeseado, horas } = parsed;
    if (
      !peso ||
      !naActual ||
      !naDeseado ||
      !horas ||
      !suero ||
      isNaN(peso) ||
      isNaN(naActual) ||
      isNaN(naDeseado) ||
      isNaN(horas)
    ) {
      return null;
    }

    if (!sexo) {
      return null;
    }
    const factor = sexo === 'mujer' ? 0.5 : 0.6;
    const deficitNa = Math.round(factor * peso * (naDeseado - naActual));
    if (deficitNa <= 0) {
      return {
        factor,
        deficitNa,
        volumenMl: 0,
        velocidadMlH: 0,
      };
    }

    const volumenMl = (deficitNa * 1000) / suero.mEqPorLitro;
    const velocidadMlH = volumenMl / horas;

    return {
      factor,
      deficitNa,
      volumenMl: Math.round(volumenMl),
      velocidadMlH: Math.round(velocidadMlH),
    };
  }, [parsed, sexo, suero]);

  useEffect(() => {
    const na = parsed.naActual;
    const aplicarAjuste = sintomasGraves && na && !isNaN(na) && na <= 115;
    if (!aplicarAjuste) return;

    const nuevoNaDeseado = String(na + 4);
    if (!naDeseado) {
      setNaDeseado(nuevoNaDeseado);
    }
    if (!horas) {
      setHoras('4');
    }
    if (!sueroId) {
      setSueroId('ssh3');
    }
  }, [parsed.naActual, sintomasGraves, naDeseado, horas, sueroId]);

  const textoInforme = useMemo(() => {
    const faltantes = [];
    if (!sexo) {
      faltantes.push('Sexo');
    }
    if (!parsed.peso || isNaN(parsed.peso)) {
      faltantes.push('peso');
    }
    const alertaPesoBajo =
      parsed.peso && !isNaN(parsed.peso) && parsed.peso < 40
        ? `¿Seguro que el peso del paciente es ${parsed.peso}? ¡¡Revisa el Peso!!`
        : '';
    const diffNa = parsed.naDeseado - parsed.naActual;
    const tasaCorreccion = parsed.horas ? diffNa / parsed.horas : null;
    const esSevera =
      parsed.naActual && !isNaN(parsed.naActual) && parsed.naActual <= 115 && sintomasGraves;
    const avisoCorreccionSevera =
      esSevera && parsed.horas && diffNa && parsed.horas < diffNa
        ? `Has especificado Na actual de ${parsed.naActual} mEq/L y un Na deseado de ${parsed.naDeseado} mEq/L y un tiempo de corrección de ${parsed.horas} horas. Eso supone una corrección de ${diffNa} mEq/L de Na en ${parsed.horas} horas, es decir, ${tasaCorreccion?.toFixed(2)} mEq/L/h, lo que supera la recomendación de reposición agresiva para hiponatremia severa de 1mEq/L/h). Riesgo de Mielinolisis central pontina (disartria, paresia fláccida, disfagia y coma) por deshidratación neuronal.`
        : '';
    const avisoCorreccionGeneral =
      !esSevera && parsed.horas && diffNa && parsed.horas * 2 < diffNa
        ? `Has especificado Na actual de ${parsed.naActual} mEq/L y un Na deseado de ${parsed.naDeseado} mEq/L y un tiempo de corrección de ${parsed.horas} horas. Eso supone una corrección de ${diffNa} mEq/L de Na en ${parsed.horas} horas, es decir, ${tasaCorreccion?.toFixed(2)} mEq/L/h, lo que supera la recomendación de reposición para hiponatremia de 0,5mEq/L/h). Riesgo de Mielinolisis central pontina (disartria, paresia fláccida, disfagia y coma) por deshidratación neuronal.`
        : '';
    const avisoNaDeseadoInvalido =
      parsed.naActual &&
      parsed.naDeseado &&
      !isNaN(parsed.naActual) &&
      !isNaN(parsed.naDeseado) &&
      parsed.naDeseado < parsed.naActual
        ? `El Na deseado (${parsed.naDeseado} mEq/L) no puede ser menor que el Na actual (${parsed.naActual} mEq/L).`
        : '';

    if (!calculo) {
      if (avisoNaDeseadoInvalido) return avisoNaDeseadoInvalido;
      if (!faltantes.length) return '';
      return `Especifica el ${faltantes.join(' / ')} del paciente`;
    }

    const { factor, deficitNa, volumenMl, velocidadMlH } = calculo;
    const razonamiento = `Se inicia reposición de sodio con ${volumenMl}mL de ${suero.label} en ${parsed.horas} horas en perfusión continua a ${velocidadMlH} mL/h. Natremia esperable en ${parsed.horas} horas: ${parsed.naDeseado} mEq/L.`;

    const avisoCorreccion = avisoCorreccionSevera || avisoCorreccionGeneral;
    const avisoNaDeseadoLinea = avisoNaDeseadoInvalido ? `${avisoNaDeseadoInvalido}\n` : '';
    const bloqueAvisos = avisoCorreccion
      ? `${avisoCorreccion}\n${avisoNaDeseadoLinea}`
      : avisoNaDeseadoLinea;
    const prefijoAvisos = bloqueAvisos ? `${bloqueAvisos}\n` : '';

    const tipoNatremia = (() => {
      const na = parsed.naActual;
      if (!na || isNaN(na)) return 'Natremia';
      if (na > 145) return 'Hipernatremia';
      if (na >= 135) return 'Natremia';
      if (na >= 131) return 'Hiponatremia leve';
      if (na >= 126) return 'Hiponatremia moderada';
      return 'Hiponatremia severa';
    })();
    const sintomasTexto = sintomasGraves ? 'con' : 'sin';

    return `${prefijoAvisos}Na actual: ${parsed.naActual} mEq/L (${tipoNatremia}) ${sintomasTexto} síntomas graves.

Cálculo del déficit de Na:
- Sodio deseado: ${parsed.naDeseado} mEq/L
- Constante: ${factor} (${sexo})
- Peso: ${parsed.peso} Kg 
- NaCl a infundir: ${deficitNa}mEq de NaCl

Suero seleccionado:
- ${suero.label} (${suero.mEqPorLitro} mEq de NaCL en 1000mL)
${(() => {
  if (suero.id !== 'ssh3' && suero.id !== 'ssh5') return '';
  const ampollas =
    suero.id === 'ssh3'
      ? '10 ampollas de 10 mL de NaCl 20% (34 mEq NaCl x10)'
      : '20 ampollas de 10 mL de NaCl 20% (34 mEq NaCl x20)';
  return `  Preparación aproximada: 1000 mL SSF 0,9% (154 mEq NaCl/L) + ${ampollas}\n`;
})()}
Reposición:
- Volumen a infundir: ${volumenMl} mL
- Tiempo de infusión: ${parsed.horas}h
- Velocidad de infusión: ${velocidadMlH}mL/h


${razonamiento}
${faltantes.length ? `\nEspecifica el ${faltantes.join(' / ')} del paciente` : ''}${alertaPesoBajo ? `\n${alertaPesoBajo}` : ''}`;
  }, [calculo, gravedad, parsed, sexo, sintomasGraves, suero]);

  const pesoClass = useMemo(() => {
    if (!parsed.peso || isNaN(parsed.peso)) return '';
    if (parsed.peso < 40) return 'campo-rojo';
    if (parsed.peso <= 50) return 'campo-amarillo';
    return 'campo-verde';
  }, [parsed.peso]);

  const naActualClass = useMemo(() => {
    const na = parsed.naActual;
    if (!na || isNaN(na)) return '';
    if (na >= 135 && na <= 145) return 'campo-verde';
    if (na >= 131 && na <= 134) return 'campo-amarillo';
    if (na >= 126 && na <= 130) return 'campo-naranja';
    if (na < 126) return 'campo-rojo';
    return '';
  }, [parsed.naActual]);

  const naDeseadoInvalido =
    parsed.naActual &&
    parsed.naDeseado &&
    !isNaN(parsed.naActual) &&
    !isNaN(parsed.naDeseado) &&
    parsed.naDeseado < parsed.naActual;

  const tiempoClass = useMemo(() => {
    const naAct = parsed.naActual;
    const naDes = parsed.naDeseado;
    const horasNum = parsed.horas;
    if (!naAct || !naDes || !horasNum) return '';
    if (isNaN(naAct) || isNaN(naDes) || isNaN(horasNum)) return '';
    const diff = naDes - naAct;
    if (diff <= 0) return '';
    if (horasNum < diff) return 'campo-rojo';
    if (horasNum < diff * 2) return 'campo-amarillo';
    return '';
  }, [parsed.naActual, parsed.naDeseado, parsed.horas]);

  const interpretacion = useMemo(() => {
    const na = parsed.naActual;
    if (!na || isNaN(na)) return null;

    if (na > 145) {
      return {
        texto: 'Hipernatremia',
        color: 'rojo',
        recomendacion: 'Valorar protocolo correspondiente',
      };
    }
    if (na >= 135 && na <= 145) {
      return {
        texto: 'Normonatremia',
        color: 'verde',
        recomendacion: 'No precisa corrección',
      };
    }
    if (na >= 131 && na <= 134) {
      return { texto: 'Hiponatremia leve', color: 'amarillo', recomendacion: 'Corrección lenta' };
    }
    if (na >= 126 && na <= 130) {
      return {
        texto: 'Hiponatremia moderada',
        color: 'naranja',
        recomendacion: 'Corrección lenta',
      };
    }
    return { texto: 'Hiponatremia severa', color: 'rojo', recomendacion: 'Corrección rápida' };
  }, [parsed.naActual]);

  const reset = () => {
    setSexo('');
    setPeso('');
    setNaActual('');
    setNaDeseado('');
    setHoras('');
    setSintomasGraves(false);
    setSueroId('');
  };

  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
      <div className="inputs-row inputs-row-3 inputs-row-3-mobile">
        <div className="input-group">
          <label>Sexo</label>
          <div className="selector-botones selector-botones-inline selector-botones-compact">
            {[
              { value: 'mujer', label: 'Mujer' },
              { value: 'hombre', label: 'Hombre' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`selector-btn selector-btn-compact ${sexo === opt.value ? 'activo' : ''}`}
                onClick={() => setSexo(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="label-inline">
            Síntomas graves
            <span className="tooltip">
              ?<span className="tooltip-text">Letargia, obnubilación, convulsiones, coma.</span>
            </span>
          </label>
          <div className="selector-botones">
            <button
              type="button"
              className={`selector-btn ${sintomasGraves ? 'activo' : ''}`}
              onClick={() => setSintomasGraves((v) => !v)}
            >
              {sintomasGraves ? 'Sí' : 'No'}
            </button>
          </div>
        </div>
      </div>

      <div className="inputs-row inputs-row-3 inputs-row-3-mobile">
        <div className="input-group">
          <label>Peso</label>
          <div className={`input-con-unidad ${pesoClass}`}>
            <input type="number" min="0" value={peso} onChange={(e) => setPeso(e.target.value)} />
            <span className="input-unidad">kg</span>
          </div>
        </div>

        <div className="input-group">
          <label>Na actual</label>
          <div className={`input-con-unidad ${naActualClass}`}>
            <input
              type="number"
              min="0"
              value={naActual}
              onChange={(e) => setNaActual(e.target.value)}
            />
            <span className="input-unidad">mEq/L</span>
          </div>
        </div>

        <div className="input-group">
          <label>Na deseado</label>
          <div className={`input-con-unidad ${naDeseadoInvalido ? 'campo-rojo' : ''}`}>
            <input
              type="number"
              min="0"
              value={naDeseado}
              onChange={(e) => setNaDeseado(e.target.value)}
            />
            <span className="input-unidad">mEq/L</span>
          </div>
        </div>
      </div>

      <div className="inputs-grid">
        <div className="input-group">
          <label>Suero para reponer</label>
          <div className="selector-botones selector-botones-suero">
            {SUEROS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`selector-btn ${sueroId === s.id ? 'activo' : ''}`}
                onClick={() => setSueroId(s.id)}
              >
                {s.label} <span className="selector-subtexto">({s.mEqPorLitro} mEq/L)</span>
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Tiempo de infusión</label>
          <div className={`input-con-unidad ${tiempoClass}`}>
            <input type="number" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} />
            <span className="input-unidad">h</span>
          </div>
        </div>
      </div>

      {interpretacion && (
        <div
          className={`resultado ${
            interpretacion.texto === 'Hiponatremia severa' || sintomasGraves
              ? 'rojo'
              : interpretacion.color
          }`}
        >
          <div className="puntos-total">
            {interpretacion.texto}
            {interpretacion.texto === 'Hiponatremia severa' &&
            sintomasGraves &&
            parsed.naActual <= 115 ? (
              <div className="resultado-subtexto">
                Paciente grave. Se recomienda reposición de Na agresiva con incremento de 1mEq/L/h
                durante las primeras 4 horas. Considerar Na objetivo inicial{' '}
                {(parsed.naActual + 4).toFixed(0)} mEq/L las primeras 4 horas. Valorar natremia tras
                la corrección inicial para decidir cambios en el ritmo de infusión.
              </div>
            ) : null}
          </div>
          <div className="interpretacion">Recomendación: {interpretacion.recomendacion}</div>
        </div>
      )}

      <button className="reset-btn" onClick={reset}>
        Reiniciar cálculo
      </button>

      {textoInforme && interpretacion && interpretacion.texto.startsWith('Hiponatremia') && (
        <InformeCopiable texto={textoInforme} />
      )}
    </main>
  );
}
