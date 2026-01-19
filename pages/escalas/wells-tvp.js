import { useState, useMemo } from 'react';
import InformeCopiable from '../../components/InformeCopiable';

const reset = () => {
  setSeleccion({});
};


const CRITERIOS = [
  { id: 'cancer', label: 'Cáncer activo', puntos: 1 },
  { id: 'paralisis', label: 'Parálisis, paresia o inmovilización EEII', puntos: 1 },
  { id: 'encamado', label: 'Encamado >3 días o cirugía mayor <12 semanas', puntos: 1 },
  { id: 'dolor', label: 'Dolor localizado en trayecto venoso profundo', puntos: 1 },
  { id: 'edema_total', label: 'Edema de toda la pierna', puntos: 1 },
  { id: 'pantorrilla', label: 'Aumento pantorrilla ≥3 cm', puntos: 1 },
  { id: 'fovea', label: 'Edema con fóvea (solo pierna afecta)', puntos: 1 },
  { id: 'venas', label: 'Venas superficiales colaterales', puntos: 1 },
  {
    id: 'dx_alternativo',
    label: 'Diagnóstico alternativo igual o más probable',
    puntos: -2,
    negativo: true
  }
];



export default function WellsTVP() {
  const [seleccion, setSeleccion] = useState({});
  const haySeleccion = Object.values(seleccion).some(Boolean);
  const toggle = id => {
    setSeleccion(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const puntuacion = useMemo(() => {
    return CRITERIOS.reduce((total, c) => {
      return seleccion[c.id] ? total + c.puntos : total;
    }, 0);
  }, [seleccion]);

  const interpretacion = useMemo(() => {
    if (puntuacion <= 0) {
      return {
        texto: 'TVP probabilidad baja',
        color: 'verde'
      };
    }
    if (puntuacion <= 2) {
      return {
        texto: 'TVP probabilidad intermedia',
        color: 'amarillo'
      };
    }
    return {
      texto: 'TVP probabilidad alta',
      color: 'rojo'
    };
  }, [puntuacion]);

function resetEscala() {
  setSeleccion({});
}
const textoInforme = useMemo(() => {
  if (!haySeleccion) return null;

  const criteriosSeleccionados = CRITERIOS
    .filter(c => seleccion[c.id])
    .map(c => `- ${c.label}`)
    .join('\n');

  let recomendacion = '';

  if (puntuacion < 1) {
    recomendacion =
      '\nSolicitar analítica con Dímero-D. Si resultado elevado, recomendable solicitar ecografía urgente; si resultado normal, reevaluación clínica.';
  } else {
    recomendacion = '\nSolicitar Ecografía urgente.';
  }

  return `ESCALA DE WELLS (TVP)
${criteriosSeleccionados}

Puntuación: ${puntuacion}
${interpretacion.texto.toUpperCase()}${recomendacion}`;
}, [haySeleccion, seleccion, puntuacion, interpretacion]);




  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
    

      <div className="criterios">
        {CRITERIOS.map(c => (
          <button
            key={c.id}
            className={`criterio-btn
  ${seleccion[c.id] ? (c.negativo ? 'activo-verde' : 'activo-rojo') : ''}
`}
            onClick={() => toggle(c.id)}
          >
            <span>{c.label}</span>
            <span className="puntos">
              {c.puntos > 0 ? `+${c.puntos}` : c.puntos}
            </span>
          </button>
        ))}
      </div>
<div className="escala-footer">
  <div className="acciones-escala">
    <button className="reset-btn" onClick={resetEscala}>
      Reiniciar escala
    </button>
  </div>

  <div className={`resultado ${interpretacion.color}`}>
    <div className="puntos-total">{puntuacion} puntos</div>
    <div className="interpretacion">{interpretacion.texto}</div>
  </div>
</div>

{textoInforme && (
  <InformeCopiable texto={textoInforme} />
)}


 </main>
  );
}