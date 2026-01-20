import { useEffect, useMemo, useState } from 'react';
import InformeCopiable from '@/components/InformeCopiable';

export default function DepuradorTtos() {
  const [texto, setTexto] = useState('');
  const [variasLineas, setVariasLineas] = useState(false);
  const [resultado, setResultado] = useState('');
  const [medicamentos, setMedicamentos] = useState([]);
  const [seleccion, setSeleccion] = useState({});

  const textoDepurado = useMemo(() => {
    if (!resultado) return '';
    return resultado;
  }, [resultado]);

  function extraerMedicamentos(textoOriginal) {
    const lineas = textoOriginal.split('\n');
    const lista = [];
    for (let i = 0; i < lineas.length; i += 1) {
      const linea = lineas[i];
      if (linea.startsWith('Terapia/Medicamento:')) {
        const nombre = linea.replace('Terapia/Medicamento:', '').trim();
        const bloque = [linea];
        if (lineas[i + 1] && lineas[i + 1].startsWith('Posología/Observaciones:')) {
          bloque.push(lineas[i + 1]);
        }
        lista.push({
          id: `${i}-${nombre}`,
          nombre,
          bloque,
        });
      }
    }
    return lista;
  }

  function filtrarTextoPorSeleccion(textoOriginal) {
    if (!medicamentos.length) return textoOriginal;
    const activos = medicamentos.filter((m) => seleccion[m.id]);
    if (!activos.length) return '';
    return activos.map((m) => m.bloque.join('\n')).join('\n');
  }

  function depurar(textoOriginal, sustituirSaltoLinea) {
    const fechaActual = new Date().toLocaleDateString('es-ES');
    let textoProcesado = textoOriginal;

    const diccionario = {
      'SUSP PARA INHALAC EN ENVASE A PRESION': '',
      '\\d+ COMPRIMIDOS RECUBIERTOS CON PELICULA': '',
      '\\d+ COMPRIMIDOS DE LIBERACION MODIFICADA': '',
      '\\d+ COMPRIMIDOS DE LIBERACION PROLONGADA': '',
      '\\d+ COMPR RECUB': '',
      '\\d+ SOBRES POLVO PARA SUSPENSION ORAL': '',
      '\\d+ AMPOLLAS \\d+ML': '',
      '\\d+ JERINGA PRECARGADA \\d+ML SOLUCION INYECTABLE': '',
      '\\d+ COMPRIMIDOS RECUBIER RANU': '',
      '300 UNIDADES/ML 3 PLUMAS PRECARGADAS 1,5ML SOLUCION INYECT': '',
      '4 PLUMAS PRECARGADAS SOLUCION INYECTABLE': '',
      '\\(\\d+ INHALACIONES\\)': '',
      '\\d+ UNIDADES/ML \\d+ PLUMAS RECARG \\d+ML SOLUC INYEC': '',
      '\\d+ PARCHES TRANSDERMICOS': '',
      '\\d+ INHAL': '',
      '\\d+ INH \\d+ DOSIS POLVO INHALACION \\(UNIDOSIS\\)': '',
      '20 CAPSULAS': '',
      '28cp': '',
      '30cp': '',
      '60cp': '',
      '40cp': '',
      '100cp': '',
      '56cp': '',
      '20cp': '',
      '50cp': '',
      '90cp': '',
      ASPOL: '',
      '\\d+JER PRECARGADA \\d+ML SOLUCION INYECTABLE': '',
      '\\d+ JER PRECARGADA 0,5ML': '',
      'EN \\d+ ML \\d+ AMPOLLAS DE \\d+ML': '',
      '/G ': '/g ',
      '/H ': '/h ',
      'EN \\d+ ML \\d+ COLIRIO DE \\d+ML': '',
      '\\d+MG LIBERACION PROLONGADA': '',
      '\\d+ COM BUCODI EFG': '',
      '\\d+ COMPRIMIDOS EFG': '',
      '\\d+ COMPRIMIDOS': '',
      '\\d+ FRASCO DE \\d+ML SOLUCION ORAL': '',
      '\\d+ DOSIS POLVO PARA INHALAC \\(UNIDOSIS\\)': '',
      '\\d+ INHALAD \\d+ DOSIS POLVO PARA INHAL\\(UNIDOSIS\\)': '',
      'LIBERACION PROLONGADA': '',
      '\\d+ DOSIS SUSP INH ENV  PRES EFG': '',
      'SOLUCION INYECTABLE EN JERINGA PRECARGADA, ': '',
      '\\d+ JERINGAS PRECARGADAS DE ': '',
      'JERINGA PRECARGADA': 'iny',
      MICROGRAMOS: 'mcg',
      COMPRIMIDOS: 'cp',
      COMPRIMIDO: 'cp',
      CRÓNICO: '',
      SANDOZ: '',
      'ALDO-UNION': '',
      '/DOSIS': '/dosis',
      ALTER: '',
      RATIOPHARM: '',
      ALMUS: '',
      DAVUR: '',
      'EN 1 ML 5 AMPOLLAS DE 1 ML': '',
      EFG: '',
      'MG/': 'mg/',
      ' MG': 'mg',
      ' MCG': 'mcg',
      MCG: 'mcg',
      'MG ': 'mg ',
      'MCG ': 'mcg ',
      'ML ': 'mL ',
      ' ML': 'mL',
      'cada día': 'diarios',
      ' horas': 'h',
      AMPOLLAS: 'amp',
      AMPOLLA: 'amp',
      RECUBIERTOS: '',
      ' / ': '',
      ' PULSACION': 'inh',
      ' iny': 'iny',
      ' cada ': '/',
      MEDIO: '1/2',
      ' día/s': 'd',
      ' PARCHE TRANSDERMICO': ' parche',
      'CON PELICULA ': '',
      ' CAPSULAS': 'cp',
      ' CAPSULA': 'cp',
      ' GOTAS ORALES': ' gotas',
      ' cp': 'cp',
      ' SOLUCION INYECTABLE': '',
      RANURADOS: '',
      LIBERACION: '',
      '30 SOBRES': '',
      'SOLUCION ORAL EN SOBRE': '',
      SOBRES: 'sobres',
      ' amp BEBIBLE/': ' amp/',
      SOBRE: 'sobre',
      ' RANU ': '',
      TABLETA: 'cp',
      ' RECUBIER ': '',
      DURAS: '',
      SANOFI: '',
      '\\(NOVARTIS\\)': '',
      '\\(LILLY\\)': '',
      SOLOSTAR: '',
      'GOTA OFTALMICA': 'gota',
      EFERVESCENTES: '',
      EFERVESCENTE: '',
      MASTICABLES: '',
      MASTICABLE: '',
      BUCODISPERSABLES: '',
      BUCODISPERSABLE: '',
      VIATRIS: '',
      ALMIRALL: '',
      GASTRORRESISTENTES: '',
      BUCODISPERS: '',
      'mg\\d+ SOBRES': '',
      'CON PELICULA': '',
      ' PULVERIZACION': 'inh',
      ' CARTUCHO/PLUMA': 'iny',
      NASAL: '',
      PRESION: '',
      POMADA: '',
      MODIFICADA: '',
      'SOLUCION CUTANEA': '',
      '1 FRASCO 200ML JARABE': '',
      '1 FRASCO 10ML GOTAS ORALES EN SOLUCION ': '',
      'FRASCO 40ML SOLUCION ORAL ': '',
      '1 FRASCO': '',
      'EN SOLUCION': '',
      'SOLUCION INYECTABLE EN UNA JERINGA': '',
      'EN 5ML 6 AMPOLLAS DE 5 ML': '',
      '1 INHAL 200 DOSIS SUSP INHALAC ENV A': '',
      'BLISTER PVC/PVDC-ALUMINIO': '',
      'RECUBIERTOS CON PELICULA': '',
      '\\(\\)': '',
      '1cp diarios': '1cp diario',
      'durante \\d+ días': '',
    };

    const numVeces = 5;
    for (let n = 0; n < numVeces; n += 1) {
      Object.keys(diccionario).forEach((clave) => {
        const expresion = new RegExp(clave, 'g');
        textoProcesado = textoProcesado.replace(expresion, diccionario[clave]);
      });
    }

    const lineas = textoProcesado.split('\n');
    const lineasModificadas = [];
    for (let i = 0; i < lineas.length; i += 1) {
      if (
        lineas[i].startsWith('Terapia/Medicamento:') &&
        lineas[i + 1] &&
        lineas[i + 1].startsWith('Posología/Observaciones:')
      ) {
        lineasModificadas.push(
          `${lineas[i]} (${lineas[i + 1].replace('Posología/Observaciones: ', '')})`
        );
        i += 1;
      } else if (lineas[i].startsWith('Posología/Observaciones')) {
        lineasModificadas.push(`(${lineas[i].replace('Posología/Observaciones: ', '')})`);
      } else {
        lineasModificadas.push(lineas[i]);
      }
    }

    const lineasFiltradas = lineasModificadas.filter(
      (linea) =>
        !linea.startsWith('Profesional') &&
        !linea.startsWith('Fecha inicio') &&
        !linea.startsWith('Fecha fin')
    );

    textoProcesado = lineasFiltradas.join('; ').replace(/\n\n/g, '; ');
    textoProcesado = textoProcesado.replace(/; ; /g, '; ');
    textoProcesado = textoProcesado.replace(/Terapia\/Medicamento:/g, '');
    textoProcesado = textoProcesado.replace(/ {2,}/g, ' ');
    textoProcesado = textoProcesado.replace(/ \)/g, ')');

    if (sustituirSaltoLinea) {
      textoProcesado = `Tratamiento crónico (por SIA a fecha ${fechaActual}):\n${textoProcesado}`;
    } else {
      textoProcesado = `Tratamiento crónico (por SIA a fecha ${fechaActual}):${textoProcesado}`;
    }

    if (sustituirSaltoLinea) {
      textoProcesado = textoProcesado.replace(/; /g, '\n');
      textoProcesado = textoProcesado.replace('\n\n', '\n');
      textoProcesado = textoProcesado
        .split('\n')
        .map((linea, index) => {
          if (index === 0) return linea;
          const limpia = linea.trim();
          return limpia ? `- ${limpia}` : linea;
        })
        .join('\n');
    }

    return textoProcesado;
  }

  const onDepurar = (nuevoTexto, nuevoVariasLineas = variasLineas) => {
    const textoFiltrado = filtrarTextoPorSeleccion(nuevoTexto);
    setResultado(depurar(textoFiltrado, nuevoVariasLineas));
  };

  const onLimpiar = () => {
    setTexto('');
    setResultado('');
    setMedicamentos([]);
    setSeleccion({});
  };

  useEffect(() => {
    const lista = extraerMedicamentos(texto);
    setMedicamentos(lista);
    const nuevaSeleccion = {};
    lista.forEach((m) => {
      nuevaSeleccion[m.id] = true;
    });
    setSeleccion(nuevaSeleccion);
  }, [texto]);

  useEffect(() => {
    if (!texto) return;
    onDepurar(texto, variasLineas);
  }, [seleccion, texto, variasLineas]);

  return (
    <main className="escala-wrapper" style={{ padding: 24 }}>
      <div className="input-group">
        <label>Texto original</label>
        <textarea
          className="depurador-textarea"
          value={texto}
          onChange={(e) => {
            const nuevoTexto = e.target.value;
            setTexto(nuevoTexto);
          }}
          placeholder="Pega tu texto aquí"
        />
      </div>

      {medicamentos.length ? (
        <div className="depurador-lista">
          <div className="depurador-lista-titulo">
            Medicamentos detectados ({medicamentos.length})
          </div>
          <div className="depurador-lista-items">
            {medicamentos.map((m) => (
              <label key={m.id} className="depurador-item">
                <input
                  type="checkbox"
                  checked={!!seleccion[m.id]}
                  onChange={() =>
                    setSeleccion((prev) => ({
                      ...prev,
                      [m.id]: !prev[m.id],
                    }))
                  }
                />
                <span>{m.nombre || 'Sin nombre'}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="depurador-acciones">
        <div className="depurador-toggle">
          <span className="depurador-toggle-label">Multilínea</span>
          <div className="selector-botones">
            <button
              type="button"
              className={`selector-btn ${variasLineas ? 'activo' : ''}`}
              onClick={() => {
                const nuevoValor = !variasLineas;
                setVariasLineas(nuevoValor);
                onDepurar(texto, nuevoValor);
              }}
            >
              {variasLineas ? 'Sí' : 'No'}
            </button>
          </div>
        </div>

        <button className="reset-btn depurador-reset" type="button" onClick={onLimpiar}>
          Limpiar texto
        </button>
      </div>

      {textoDepurado ? <InformeCopiable texto={textoDepurado} /> : null}
    </main>
  );
}
