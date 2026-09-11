(() => {
  'use strict';

  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const ENGINE = 'dnf-vector-jspdf-v3';
  const CM = 72 / 2.54;
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const BODY = { left:72, right:72, top:150, bottom:72, fontSize:12, lineHeight:24, paragraphIndent:36 };

  const INTRODUCTION = [
    'En el contexto de la educación superior, la calidad académica se encuentra estrechamente relacionada con la formación, cualificación y desarrollo permanente del personal docente. La evolución de los entornos profesionales, los avances tecnológicos, las nuevas metodologías educativas y las transformaciones sociales demandan que las instituciones de educación superior mantengan procesos sistemáticos que permitan identificar las necesidades de formación de su claustro académico y orientar acciones para su fortalecimiento.',
    'La formación docente debe entenderse como un proceso continuo que permite fortalecer y transformar la práctica académica. Díaz Barriga (2006) plantea la formación docente como un proceso permanente de construcción intencional de saberes que posibilita al profesorado reflexionar y transformar su práctica. Desde esta perspectiva, la formación no se limita a la obtención de nuevas titulaciones, sino que constituye un mecanismo para consolidar capacidades académicas, profesionales, investigativas y pedagógicas que respondan a las necesidades de los estudiantes y de la institución. Esta misma relación entre desarrollo profesional docente y calidad educativa constituye uno de los fundamentos del documento institucional vigente.',
    'En el ámbito de la educación superior técnica y tecnológica, esta necesidad adquiere especial relevancia debido a la permanente relación entre la oferta académica, el desarrollo tecnológico y las necesidades del entorno productivo. Tünnermann Bernheim (2008) destaca al personal académico como un componente fundamental de las instituciones de educación superior y vincula directamente su desarrollo profesional con la calidad educativa. En concordancia con este enfoque, el Instituto Superior Tecnológico Quito Metropolitano —ITSQMET— orienta sus procesos de formación docente hacia el fortalecimiento de un claustro académico cualificado, pertinente y articulado con las necesidades de las carreras y las exigencias de aseguramiento de la calidad.',
    '__PERIOD__',
    'El proceso de detección permite, además, analizar las necesidades desde diferentes perspectivas, considerando información relacionada con el nivel académico alcanzado por los docentes, sus intereses de formación, las modalidades de estudio, la disponibilidad para iniciar o continuar estudios y sus aspiraciones académicas de corto y mediano plazo. Estas variables forman parte del componente cuantitativo utilizado en el diagnóstico institucional y permiten establecer tendencias y prioridades para la toma de decisiones.',
    'De manera complementaria, el análisis incorpora información cualitativa obtenida mediante la participación de las coordinaciones académicas, permitiendo validar los resultados obtenidos, identificar necesidades que pueden no encontrarse explícitamente reflejadas en los datos cuantitativos y establecer criterios de priorización de acuerdo con la pertinencia curricular, el perfil docente y las necesidades institucionales. La combinación de ambas fuentes fortalece la comprensión de la realidad del claustro y contribuye a una planificación más contextualizada de la formación docente.',
    'Por tanto, los resultados obtenidos mediante este proceso constituyen un insumo para la planificación del Plan de Formación Docente del ITSQMET, permitiendo definir líneas de formación específicas y transversales, establecer prioridades institucionales y orientar acciones de seguimiento que contribuyan al fortalecimiento progresivo de la cualificación académica del personal docente. De esta manera, la detección de necesidades se integra al ciclo institucional de planificación y mejora continua, procurando que las decisiones relacionadas con la formación docente se encuentren sustentadas en información actualizada y pertinente.'
  ];

  const BASE_LEGAL = [
    { title:'2.1. Normativa Constitucional, Legal y Reglamentaria Nacional', items:[
      {text:'el Artículo 349 de la Constitución de la República del Ecuador establece: “El Estado garantizará al personal docente, en todos los niveles y modalidades, estabilidad, actualización, formación continua y mejoramiento pedagógico y académico”; y además que “la ley regulará la carrera docente y el escalafón; establecerá un sistema nacional de evaluación del desempeño y la política salarial en todos los niveles”.', bold:['Artículo 349 de la Constitución de la República del Ecuador']},
      {text:'el Artículo 26 de la Constitución de la República del Ecuador declara a la educación como un derecho de las personas y un deber ineludible del Estado, y garantiza que el acceso, permanencia, calidad y culminación de los procesos formativos estén bajo su responsabilidad directa, lo cual incluye la calidad del personal docente como condición esencial.', bold:['Artículo 26 de la Constitución de la República del Ecuador']},
      {text:'el Artículo 118 de la Ley Orgánica de Educación Superior (LOES) establece: “Las instituciones del Sistema de Educación Superior implementarán políticas de formación y capacitación permanentes para su personal académico. Estas políticas deberán considerar el fortalecimiento de capacidades profesionales, académicas, investigativas y de vinculación con la sociedad”.', bold:['Artículo 118 de la Ley Orgánica de Educación Superior (LOES)']},
      {text:'el Artículo 9 de la LOES determina que el Estado, a través de sus instituciones, debe garantizar la calidad de la educación superior, estableciendo estándares para los procesos académicos, incluidos los de formación del talento humano docente.', bold:['Artículo 9 de la LOES']},
      {text:'el Artículo 96 de la LOES, sobre requisitos del personal académico, señala que los docentes deberán poseer títulos de tercer y cuarto nivel de conformidad con los niveles de la oferta académica impartida, promoviendo la formación continua como criterio de habilitación.', bold:['Artículo 96 de la LOES']},
      {text:'el Artículo 2 del Reglamento de Carrera y Escalafón del Profesor del Sistema de Educación Superior (Acuerdo No. SENESCYT-2019-023) dispone: “La carrera académica se sustentará en criterios técnicos y objetivos relacionados con la formación académica, producción científica, innovación, vinculación con la sociedad y desempeño institucional”. Asimismo, exige procesos de formación planificados y pertinentes para la mejora continua.', bold:['Artículo 2 del Reglamento de Carrera y Escalafón del Profesor del Sistema de Educación Superior (Acuerdo No. SENESCYT-2019-023)']}
    ]},
    { title:'2.2. Normativa del Modelo de Evaluación Externa del CACES', items:[
      {text:'el Indicador 3.2.4 del Modelo de Evaluación Externa de Institutos Superiores Técnicos y Tecnológicos (CACES, 2021) establece que: “La institución evidencia la existencia de un plan de formación continua y pertinente del personal académico, que responde a un diagnóstico de necesidades, se encuentra alineado a su planificación institucional y se ejecuta de manera sistemática, con evaluación de resultados”.', bold:['Indicador 3.2.4 del Modelo de Evaluación Externa de Institutos Superiores Técnicos y Tecnológicos (CACES, 2021)']},
      {text:'el Criterio 3.2 del mismo modelo señala: “La gestión del personal académico se orienta a garantizar su cualificación, estabilidad, desarrollo profesional y desempeño docente”. En este sentido, se considera obligatoria la existencia de políticas institucionales de formación fundamentadas en evidencia diagnóstica.', bold:['Criterio 3.2 del mismo modelo']},
      {text:'el Anexo Técnico del Modelo de Evaluación Externa (CACES, 2021) indica como evidencia requerida para el indicador 3.2.4: “Diagnóstico institucional actualizado de necesidades de formación académica del personal docente, desagregado por carrera, modalidad, nivel de formación y afinidad con la oferta académica”. Además, requiere: “Resultados de la ejecución del plan de formación y mecanismos de seguimiento”.', bold:['Anexo Técnico del Modelo de Evaluación Externa (CACES, 2021)']},
      {text:'el documento metodológico del CACES sobre evaluación institucional establece que los procesos de cualificación docente deben guardar pertinencia con el perfil profesional y el plan estratégico de desarrollo institucional, y que dicha formación debe formar parte de una cultura institucional de mejora continua (CACES, 2020, Guía metodológica para la autoevaluación).', bold:['documento metodológico del CACES sobre evaluación institucional']}
    ]},
    { title:'2.3. Normativa Institucional del ITSQMET', items:[
      {text:'el Reglamento de Formación y Capacitación de los Docentes del ITSQMET, aprobado mediante resolución institucional en octubre de 2023, establece en su Artículo 6 que: “Todos los docentes del Instituto deberán contar con un Plan de Formación Individual alineado a su perfil profesional, a las necesidades de la carrera en la que se desempeña, y a los lineamientos institucionales de mejora de la calidad académica”.', bold:['Reglamento de Formación y Capacitación de los Docentes del ITSQMET','Artículo 6']},
      {text:'el mismo reglamento dispone en su Artículo 7 que: “La elaboración del Plan de Formación Institucional se sustentará en un diagnóstico sistemático de necesidades formativas, basado en datos cuantitativos y cualitativos, alineado al Plan Estratégico de Desarrollo Institucional (PEDI) y al Modelo de Evaluación Externa del CACES”.', bold:['Artículo 7']},
      {text:'el Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET, aprobado en sesión de Consejo Directivo, establece como uno de sus objetivos estratégicos: “Fortalecer las competencias del talento humano docente mediante procesos de formación planificada, pertinente y sostenible, orientados a la excelencia académica y alineados a la planificación institucional”.', bold:['Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET']},
      {text:'el PEDI, en su Eje Estratégico 2: Gestión Académica, incluye como meta operativa 2.2.3: “Implementar un sistema institucional de formación docente con base en diagnósticos anuales y estrategias de acompañamiento profesional y académico”.', bold:['PEDI, en su Eje Estratégico 2: Gestión Académica','meta operativa 2.2.3']},
      {text:'la Política Institucional de Formación Docente del ITSQMET, también aprobada en 2023, señala como principio rector que: “La formación docente deberá articularse con las necesidades institucionales, los perfiles de egreso de las carreras y las exigencias del entorno profesional y académico”. Esta política establece que la formación debe ser obligatoria, progresiva y compatible con la planificación docente individual.', bold:['Política Institucional de Formación Docente del ITSQMET']},
      {text:'el Manual del Proceso de Formación Académica del ITSQMET determina en su fase inicial que la detección de necesidades de formación debe contemplar cinco dimensiones: nivel académico, afinidad con la carrera, trayectoria profesional, requerimientos de acreditación y metas del plan institucional, como condición para elaborar el Plan de Formación Institucional.', bold:['Manual del Proceso de Formación Académica del ITSQMET']}
    ]}
  ];

  const ALIGNMENT = [
    {type:'p', text:'La detección de necesidades de formación docente no constituye un proceso aislado, sino que responde a una lógica de integración con los principales instrumentos de planificación y aseguramiento de la calidad institucional. En este marco, se articula de manera directa con el Plan Estratégico de Desarrollo Institucional (PEDI), con el Plan Operativo Anual (POA), con los procesos académicos sustantivos y con los requerimientos establecidos por el modelo de evaluación externa del CACES. Esta alineación garantiza que las acciones de formación docente no solo respondan a brechas individuales, sino que se conviertan en una herramienta estratégica para fortalecer el desempeño institucional.', bold:['Plan Estratégico de Desarrollo Institucional (PEDI)','Plan Operativo Anual (POA)','CACES']},
    {type:'p', text:'Desde esta perspectiva, el diagnóstico de necesidades constituye el punto de partida para diseñar planes de formación que impacten en la mejora continua del perfil del docente, el cumplimiento del modelo educativo institucional, y la consolidación de estándares de calidad. Asimismo, permite priorizar las acciones formativas según la planificación anual, coordinar recursos de forma eficiente y responder a los compromisos de autoevaluación y evaluación externa. La coherencia entre diagnóstico, planificación y evaluación es lo que permite a la institución consolidar una cultura formativa centrada en la excelencia.'},

    {type:'h2', text:'3.1. Vinculación con el PEDI – Plan Estratégico de Desarrollo Institucional'},
    {type:'p', text:'La detección de necesidades de formación docente responde directamente a los objetivos del Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET, específicamente dentro del Eje 2: Fortalecimiento del Talento Humano. Esta vinculación se detalla a continuación:', bold:['Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET','Eje 2: Fortalecimiento del Talento Humano']},
    {type:'h3', text:'a) Alineación con el Eje 2: Fortalecimiento del Talento Humano'},
    {type:'p', text:'Este eje establece como prioridad la consolidación de un cuerpo docente calificado, actualizado y alineado al modelo educativo institucional. La detección de necesidades es la primera etapa para alcanzar dicho objetivo, ya que permite:'},
    {type:'bullet', text:'Identificar brechas formativas reales.'},
    {type:'bullet', text:'Definir trayectorias de formación compatibles con las carreras.'},
    {type:'bullet', text:'Garantizar coherencia entre perfiles profesionales y la oferta académica.'},
    {type:'h3', text:'b) Objetivo Estratégico 2.1: Desarrollo Profesional Docente'},
    {type:'quote', text:'“Fortalecer el desarrollo profesional de los docentes y personal académico, asegurando su actualización continua y su formación acorde a los requerimientos de las carreras”.'},
    {type:'p', text:'Este objetivo demanda contar con un diagnóstico sistemático que permita planificar la formación con base en evidencias. La presente detección cumple con este propósito, orientando las decisiones institucionales sobre:'},
    {type:'bullet', text:'Apoyo a formación de tercer y cuarto nivel.'},
    {type:'bullet', text:'Programas internos o convenios para formación externa.'},
    {type:'bullet', text:'Actualización de planes individuales de formación.'},
    {type:'h3', text:'c) Objetivo Estratégico 2.2: Mejora Continua de Procesos Académicos'},
    {type:'quote', text:'“Promover una cultura de mejora continua a través de la evaluación y retroalimentación de los procesos académicos”.'},
    {type:'p', text:'Aquí, el diagnóstico de necesidades de formación se convierte en un insumo fundamental para:'},
    {type:'bullet', text:'Articular la formación docente con los resultados de evaluación institucional.'},
    {type:'bullet', text:'Incorporar la retroalimentación de auditorías, autoevaluaciones y procesos de acreditación.'},
    {type:'bullet', text:'Responder proactivamente a debilidades detectadas en prácticas académicas.'},
    {type:'h3', text:'d) Vinculación con otros ejes del PEDI'},
    {type:'p', text:'Además del Eje 2, este proceso se conecta con:'},
    {type:'bullet', text:'Eje 3: Pertinencia Académica – Al asegurar que el cuerpo docente tenga formación afín a las carreras y demandas del entorno.', bold:['Eje 3: Pertinencia Académica']},
    {type:'bullet', text:'Eje 4: Calidad Académica y Evaluación – Al permitir que la planificación formativa derive de indicadores de calidad y análisis institucional.', bold:['Eje 4: Calidad Académica y Evaluación']},
    {type:'h3', text:'e) Enfoque estratégico'},
    {type:'p', text:'El PEDI considera la formación docente como un factor transversal. Por ello, esta detección:'},
    {type:'bullet', text:'Permite establecer indicadores de seguimiento.'},
    {type:'bullet', text:'Alimenta el sistema de planificación institucional.'},
    {type:'bullet', text:'Fortalece la toma de decisiones basada en evidencia.'},

    {type:'h2', text:'3.2. Vinculación con el POA – Plan Operativo Anual'},
    {type:'p', text:'El proceso de detección de necesidades de formación docente se articula directamente con actividades previstas en los Planes Operativos Anuales (POA) de varias unidades institucionales. Esta vinculación permite convertir el diagnóstico formativo en acciones concretas y medibles dentro de la planificación anual. A continuación, se detalla la relación con los POA de las unidades involucradas:', bold:['Planes Operativos Anuales (POA)']},
    {type:'h3', text:'a) Unidad de Gestión Pedagógica Académica (UGPA)'},
    {type:'label', text:'Rol principal: Liderar la planificación y seguimiento del proceso formativo docente.', bold:['Rol principal:']},
    {type:'label', text:'Actividades POA relacionadas:', bold:['Actividades POA relacionadas:']},
    {type:'bullet', text:'Sistematización del diagnóstico de necesidades formativas.'},
    {type:'bullet', text:'Elaboración del Plan Institucional de Formación Docente.'},
    {type:'bullet', text:'Evaluación de impacto de las acciones formativas.'},
    {type:'label', text:'Aporte al proceso: Permite transformar el diagnóstico en planificación estratégica, garantizando que los resultados se incorporen al ciclo de mejora académica.', bold:['Aporte al proceso:']},
    {type:'h3', text:'b) Coordinación General de Carreras (CGC)'},
    {type:'label', text:'Rol principal: Territorializar las necesidades formativas según la estructura académica del instituto.', bold:['Rol principal:']},
    {type:'label', text:'Actividades POA relacionadas:', bold:['Actividades POA relacionadas:']},
    {type:'bullet', text:'Revisión del cumplimiento del perfil profesional docente por carrera.'},
    {type:'bullet', text:'Identificación de requerimientos de formación por área de conocimiento.'},
    {type:'bullet', text:'Coordinación entre carreras y UGPA para implementar el plan de formación.'},
    {type:'label', text:'Aporte al proceso: Asegura que la formación responda a necesidades reales y contextualizadas por carrera, fortaleciendo la pertinencia académica.', bold:['Aporte al proceso:']},
    {type:'h3', text:'c) Unidad de Talento Humano (UTH)'},
    {type:'label', text:'Rol principal: Administrar el desarrollo profesional y registro formal de la formación docente.', bold:['Rol principal:']},
    {type:'label', text:'Actividades POA relacionadas:', bold:['Actividades POA relacionadas:']},
    {type:'bullet', text:'Registro y seguimiento de convenios de estudio y títulos en curso.'},
    {type:'bullet', text:'Actualización de legajos académicos.'},
    {type:'bullet', text:'Apoyo en procesos de evaluación y escalafón.'},
    {type:'label', text:'Aporte al proceso: Garantiza la trazabilidad administrativa del proceso formativo y su incorporación en los sistemas institucionales de gestión.', bold:['Aporte al proceso:']},
    {type:'h3', text:'d) Integración operativa'},
    {type:'p', text:'El trabajo coordinado entre UGPA, CGC y UTH permite:'},
    {type:'bullet', text:'Evitar duplicidad de esfuerzos.'},
    {type:'bullet', text:'Optimizar recursos formativos.'},
    {type:'bullet', text:'Consolidar una cultura institucional de mejora continua con base en evidencia.'},
    {type:'p', text:'Esta sinergia asegura que el diagnóstico de necesidades no solo sea un insumo técnico, sino también un instrumento de acción efectiva dentro del marco del POA institucional.'},

    {type:'h2', text:'3.3. Alineación con los Procesos Institucionales'},
    {type:'p', text:'La detección de necesidades de formación docente no se constituye únicamente como una actividad de diagnóstico, sino como un instrumento articulador de los procesos institucionales que orientan la mejora continua del quehacer académico. En el ITSQMET, esta articulación se evidencia particularmente en los procesos de construcción curricular y aseguramiento de la calidad pedagógica, lo cual refuerza la pertinencia y aplicabilidad de las acciones formativas. A continuación, se describe cómo se integra este diagnóstico con dos procesos fundamentales:'},
    {type:'h3', text:'a) Proceso de Seguimiento, Control y Evaluación de la Elaboración de la Matriz del CCC'},
    {type:'p', text:'Este proceso está diseñado para garantizar que todas las asignaturas del Instituto cuenten con una matriz de Construcción Curricular Continua (CCC) técnicamente válida y registrada en el sistema SISACAD. Aplica especialmente cuando se detectan asignaturas sin matriz cargada o con deficiencias técnicas.', bold:['Construcción Curricular Continua (CCC)','SISACAD']},
    {type:'p', text:'La detección de necesidades de formación fortalece este proceso al identificar debilidades recurrentes en los docentes, como:'},
    {type:'bullet', text:'Redacción imprecisa de competencias.'},
    {type:'bullet', text:'Desarticulación entre resultados de aprendizaje y contenidos temáticos.'},
    {type:'bullet', text:'Uso inadecuado de la Taxonomía de Bloom.'},
    {type:'bullet', text:'Desconocimiento del perfil de egreso de la carrera.'},
    {type:'p', text:'A partir de estos hallazgos, se planifican acciones formativas dirigidas a mejorar la capacidad técnica de los docentes para construir matrices pedagógicas, lo cual previene observaciones posteriores, optimiza tiempos de validación y asegura un diseño curricular coherente y sostenible.'},
    {type:'h3', text:'b) Proceso de Construcción Curricular Continua (CCC)'},
    {type:'p', text:'El proceso de Construcción Curricular Continua constituye uno de los pilares del sistema de aseguramiento de la calidad académica. Involucra la participación de colectivos docentes por áreas, quienes, con base en informes institucionales (egresados, titulados, empleadores, etc.), revisan y ajustan las descripciones de asignaturas, resultados de aprendizaje, contenidos y enfoques metodológicos.', bold:['Construcción Curricular Continua']},
    {type:'p', text:'La articulación con la detección de necesidades permite que las acciones de formación docente se alineen a los retos identificados en el proceso curricular, tales como:'},
    {type:'bullet', text:'Interpretación y análisis de los informes de retroalimentación externa.'},
    {type:'bullet', text:'Dominio de técnicas de rediseño microcurricular.'},
    {type:'bullet', text:'Fortalecimiento del enfoque por competencias.'},
    {type:'bullet', text:'Aplicación de metodologías activas y evaluación auténtica.'},
    {type:'p', text:'La participación en este proceso permite retroalimentar el propio diagnóstico, al identificar nuevas brechas formativas emergentes en el ejercicio de revisión curricular.'},

    {type:'h2', text:'3.4. Coherencia con el Modelo de Acreditación de IES Técnicas y Tecnológicas'},
    {type:'p', text:'La detección de necesidades de formación docente guarda una relación directa con el Modelo de Acreditación 2024 para Instituciones de Educación Superior Técnicas y Tecnológicas, aprobado por el CACES, ya que contribuye a asegurar el cumplimiento de estándares e indicadores de calidad académica, organizativa y de vinculación social.', bold:['Modelo de Acreditación 2024 para Instituciones de Educación Superior Técnicas y Tecnológicas','CACES']},
    {type:'p', text:'Esta coherencia se expresa en varios dominios clave del modelo, como se detalla a continuación:'},
    {type:'h3', text:'a) Dominio 1: Proyecto Institucional'},
    {type:'p', text:'La formación docente refuerza la implementación efectiva del Proyecto Educativo Institucional (PEI), al garantizar que los equipos académicos cuenten con capacidades actualizadas para ejecutar el modelo pedagógico, los enfoques curriculares y la propuesta académica institucional. De este modo, se consolida la identidad institucional y se fortalece el direccionamiento estratégico.', bold:['Proyecto Educativo Institucional (PEI)']},
    {type:'h3', text:'b) Dominio 2: Oferta Académica Pertinente y de Calidad'},
    {type:'p', text:'Dentro de este dominio, la capacitación y formación continua del cuerpo docente se vincula principalmente con los estándares 2.2 (Relevancia Curricular) y 2.3 (Desempeño Docente). A través del diagnóstico y posterior formación, se asegura que los docentes:', bold:['2.2 (Relevancia Curricular)','2.3 (Desempeño Docente)']},
    {type:'bullet', text:'Dominen el enfoque por competencias.'},
    {type:'bullet', text:'Apliquen metodologías activas e inclusivas.'},
    {type:'bullet', text:'Evalúen de forma pertinente y coherente.'},
    {type:'bullet', text:'Participen en procesos de rediseño curricular basados en evidencias.'},
    {type:'h3', text:'c) Dominio 3: Comunidad Académica'},
    {type:'p', text:'Este dominio resalta la importancia del talento humano como pilar de la calidad institucional. El plan de formación docente es una acción directa para el fortalecimiento profesional, en especial en los indicadores relacionados con la cualificación del personal académico, la permanencia y desarrollo profesional, y la capacidad de innovación pedagógica.'},
    {type:'h3', text:'d) Dominio 4: Condiciones Institucionales para el Aprendizaje'},
    {type:'p', text:'Una formación docente efectiva impacta en la capacidad institucional de generar ambientes de aprendizaje inclusivos, adaptativos y de calidad. Se relaciona directamente con la provisión de recursos humanos capacitados y comprometidos, así como con la mejora de los procesos de acompañamiento pedagógico.'},
    {type:'h3', text:'e) Dominio 5: Resultados del Proceso Formativo'},
    {type:'p', text:'La mejora en las capacidades docentes incide de manera indirecta pero significativa en los resultados de aprendizaje de los estudiantes, en su desempeño en entornos laborales y en su nivel de satisfacción. Así, el fortalecimiento docente actúa como un factor estratégico para alcanzar los niveles de logro esperados en los egresados, uno de los indicadores más relevantes en la evaluación de resultados institucionales.'},
    {type:'p', text:'La coherencia con el modelo de acreditación no se limita al cumplimiento formal de estándares, sino que se expresa en la integración sistémica entre formación docente, gestión académica y mejora continua, garantizando que la calidad educativa en el ITSQMET esté alineada con los referentes nacionales de excelencia para las IES técnicas y tecnológicas.'}
  ];

  function isDnf(payload={}) { return !!payload?.exactPages || /necesidades/i.test(String(payload?.filename||'')); }
  function emit(percent,phase='render',extra={}) { window.dispatchEvent(new CustomEvent('docformacion-pdf-progress',{detail:{type:'dnf',engine:ENGINE,build:window.DOCFORMACION_BUILD||'',percent:Math.max(0,Math.min(100,Math.round(Number(percent)||0))),phase,...extra}})); }
  function getPeriod(){ return (typeof state!=='undefined' && state?.period)?state.period:{}; }
  function formatPeriodPart(value,capitalize=false){ const raw=String(value||'').trim(); const m=raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/); if(!m)return raw; const t=(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]; return capitalize?t.charAt(0).toUpperCase()+t.slice(1):t; }
  function periodText(capitalize=false){ const p=getPeriod(),a=formatPeriodPart(p.start,capitalize),b=formatPeriodPart(p.end,capitalize); return a&&b?a+' a '+b:(a||b||(capitalize?'Período seleccionado':'período seleccionado')); }
  function documentCode(){ return String(getPeriod().dnfCode||'').trim(); }
  function documentTitle(){ return 'Detección de Necesidades de Formación'; }
  function responsibleData(){ const p=getPeriod(); return [
    {label:'ELABORADO POR:',name:String(p.preparedBy||'MSc. Jefferson Villarreal'),role:String(p.preparedRole||'Gestor de Procesos Académicos')},
    {label:'REVISADO POR:',name:String(p.reviewedBy||'Ing. Martha Tomalá'),role:String(p.reviewedRole||'Coordinación General de Carreras')},
    {label:'APROBADO POR:',name:String(p.approvedBy||'Dr. Alex León T.'),role:String(p.approvedRole||'Vicerrector')}
  ]; }
  function imageFormat(d=''){ if(/^data:image\/png/i.test(d))return'PNG'; if(/^data:image\/webp/i.test(d))return'WEBP'; return'JPEG'; }
  function getLogoData(){ try{ if(typeof INSTITUTION_LOGO_DATA!=='undefined'&&typeof INSTITUTION_LOGO_DATA==='string')return INSTITUTION_LOGO_DATA; }catch(_e){} return''; }
  function fitImage(doc,data,maxW,maxH){ try{const p=doc.getImageProperties(data),r=p.width/p.height;let w=maxW,h=w/r;if(h>maxH){h=maxH;w=h*r;}return{w,h};}catch(_e){return{w:maxW,h:maxH};} }

  function drawHeader(doc,pageNo){
    doc.setPage(pageNo); const pageW=doc.internal.pageSize.getWidth(), totalW=18*CM, x=(pageW-totalW)/2, top=1.5*CM, h=2.8*CM;
    const colA=totalW*.25,colB=totalW*.5,colC=totalW*.25,row1=.8*CM,row2=h-row1,bx=x+colA,cx=bx+colB;
    doc.setDrawColor(70);doc.setLineWidth(.65);doc.rect(x,top,totalW,h);doc.line(bx,top,bx,top+h);doc.line(cx,top,cx,top+h);doc.line(bx,top+row1,cx,top+row1);
    const logo=getLogoData(); if(logo){try{const f=fitImage(doc,logo,Math.min(colA-12,3.8*CM),Math.min(h-12,1.8*CM));doc.addImage(logo,imageFormat(logo),x+(colA-f.w)/2,top+(h-f.h)/2,f.w,f.h,undefined,'FAST');}catch(_e){}} else {doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ITSQMET',x+colA/2,top+h/2,{align:'center'});}
    doc.setTextColor(30);doc.setFont('helvetica','normal');doc.setFontSize(8.5);const unit=doc.splitTextToSize('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',colB-12);doc.text(unit,bx+colB/2,top+(row1-unit.length*9.2)/2+7.2,{align:'center',lineHeightFactor:1.02});
    const title=doc.splitTextToSize(documentTitle(),colB-18),period=doc.splitTextToSize(periodText(true),colB-18);let gy=top+row1+(row2-(title.length*9.3+3+period.length*9.1))/2+7.2;
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(title,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});gy+=title.length*9.3+3;doc.setFontSize(8.2);doc.text(period,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});
    doc.setFont('helvetica','bold');doc.setFontSize(8.2);doc.text('Código:',cx+colC/2,top+h/2-8,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(8.1);doc.text(doc.splitTextToSize(documentCode(),colC-14),cx+colC/2,top+h/2+5,{align:'center',lineHeightFactor:1.05});
  }

  function drawCover(doc){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(); drawHeader(doc,1);
    doc.setTextColor(38);doc.setFont('helvetica','bold');doc.setFontSize(18);const tl=doc.splitTextToSize(documentTitle(),390),ty=300;doc.text(tl,pageW/2,ty,{align:'center',lineHeightFactor:1.12});doc.setFontSize(15);doc.text(periodText(true),pageW/2,ty+tl.length*22+8,{align:'center'});
    const totalW=18*CM,x=(pageW-totalW)/2,colW=totalW/3,y=pageH-195,row1=70,row2=25,row3=35,totalH=row1+row2+row3;doc.setDrawColor(95);doc.setLineWidth(.55);doc.rect(x,y,totalW,totalH);doc.line(x,y+row1,x+totalW,y+row1);doc.line(x,y+row1+row2,x+totalW,y+row1+row2);doc.line(x+colW,y,x+colW,y+totalH);doc.line(x+colW*2,y,x+colW*2,y+totalH);
    responsibleData().forEach((p,i)=>{const cellX=x+i*colW,pad=5;doc.setTextColor(35);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text(p.label,cellX+pad,y+12);doc.setFont('helvetica','bold');doc.setFontSize(6.8);doc.text('NOMBRE:',cellX+pad,y+row1+15);doc.setFont('helvetica','normal');doc.setFontSize(6.7);doc.text(doc.splitTextToSize(p.name,colW-44),cellX+42,y+row1+15,{lineHeightFactor:1.02});doc.setFont('helvetica','bold');doc.setFontSize(6.8);doc.text('CARGO:',cellX+pad,y+row1+row2+15);doc.setFont('helvetica','normal');doc.setFontSize(6.7);doc.text(doc.splitTextToSize(p.role,colW-40),cellX+38,y+row1+row2+15,{lineHeightFactor:1.02});});
  }

  function introductionParagraphs(){ const period=periodText(false); return INTRODUCTION.map(t=>t==='__PERIOD__'?'En este marco, el presente documento recoge los resultados del proceso de Detección de Necesidades de Formación correspondiente al período '+period+', desarrollado con el personal docente del ITSQMET. Este diagnóstico constituye un instrumento técnico para conocer la situación académica del claustro docente, identificar brechas de formación, reconocer intereses y proyecciones de desarrollo profesional y establecer áreas prioritarias sobre las cuales la institución pueda orientar sus estrategias de formación. Esta finalidad corresponde a la lógica planteada en el documento institucional, en el cual el diagnóstico se concibe como base para la elaboración y actualización del Plan de Formación Docente.':t); }

  function createWriter(doc){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),bodyW=pageW-BODY.left-BODY.right; let y=BODY.top;
    function font(style='normal',size=BODY.fontSize){doc.setFont('times',style);doc.setFontSize(size);doc.setTextColor(0);}
    function newPage(){doc.addPage();drawHeader(doc,doc.getNumberOfPages());font();y=BODY.top;}
    function ensureSpace(h){if(y+h>pageH-BODY.bottom)newPage();}
    function heading(text,level=1){font('bold',12);const lines=doc.splitTextToSize(String(text||''),bodyW),before=level===1?0:12,after=level===1?18:12;ensureSpace(before+lines.length*BODY.lineHeight+after+BODY.lineHeight*2);y+=before;doc.text(lines,BODY.left,y,{align:'left',lineHeightFactor:2});y+=lines.length*BODY.lineHeight+after;}
    function styleMap(text,bold=[],italic=[]){const src=String(text||''),flags=new Uint8Array(src.length);const mark=(phrases,bit)=>{(phrases||[]).filter(Boolean).forEach(ph=>{let pos=0;while(pos<src.length){const i=src.indexOf(ph,pos);if(i<0)break;for(let k=i;k<i+ph.length;k++)flags[k]|=bit;pos=i+ph.length;}});};mark(bold,1);mark(italic,2);const spans=[];let s=0,flag=flags[0]||0;for(let i=1;i<=src.length;i++){const f=i<src.length?flags[i]:-1;if(f!==flag){spans.push({text:src.slice(s,i),style:flag===3?'bolditalic':flag===1?'bold':flag===2?'italic':'normal'});s=i;flag=f;}}return spans;}
    function wordsFromSpans(spans){const out=[];spans.forEach(sp=>String(sp.text||'').trim().split(/\s+/).filter(Boolean).forEach(w=>out.push({word:w,style:sp.style||'normal'})));return out;}
    function wordWidth(it){font(it.style||'normal');return doc.getTextWidth(it.word);}
    function layout(spans,firstWidth,otherWidth){const words=wordsFromSpans(spans),lines=[];let line=[],w=0,max=firstWidth;font();const space=doc.getTextWidth(' ');words.forEach(it=>{const ww=wordWidth(it),cand=line.length?w+space+ww:ww;if(line.length&&cand>max){lines.push({items:line,width:max});line=[it];w=ww;max=otherWidth;}else{line.push(it);w=cand;}});if(line.length)lines.push({items:line,width:max});return lines;}
    function drawLine(line,x,justify){const items=line.items;if(!items.length)return;let wordsW=0;items.forEach(it=>wordsW+=wordWidth(it));font();const normal=doc.getTextWidth(' '),gap=justify&&items.length>1?Math.max(normal,(line.width-wordsW)/(items.length-1)):normal;let cur=x;items.forEach((it,i)=>{font(it.style||'normal');doc.text(it.word,cur,y);cur+=doc.getTextWidth(it.word)+(i<items.length-1?gap:0);});}
    function rich(text,opts={}){const firstIndent=opts.firstIndent==null?BODY.paragraphIndent:opts.firstIndent,leftExtra=opts.leftExtra||0,firstW=bodyW-leftExtra-firstIndent,otherW=bodyW-leftExtra,spans=styleMap(text,opts.bold||[],opts.italic||[]),lines=layout(spans,firstW,otherW);let idx=0;while(idx<lines.length){let avail=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(avail<2&&lines.length-idx>1){newPage();avail=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}let take=Math.min(Math.max(avail,1),lines.length-idx);const rem=lines.length-idx-take;if(rem===1&&take>2)take--;if(take<=0){newPage();continue;}for(let o=0;o<take;o++){const abs=idx+o,x=BODY.left+leftExtra+(abs===0?firstIndent:0),isLast=abs===lines.length-1;drawLine(lines[abs],x,opts.justify!==false&&!isLast);y+=BODY.lineHeight;}idx+=take;if(idx<lines.length)newPage();}y+=opts.after==null?8:opts.after;}
    function legal(text,bold=[]){const indent=BODY.paragraphIndent;const spans=styleMap(text,bold,[]),lines=layout(spans,bodyW-indent,bodyW-indent);let idx=0;while(idx<lines.length){let avail=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(avail<2&&lines.length-idx>1){newPage();avail=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}let take=Math.min(Math.max(avail,1),lines.length-idx);const rem=lines.length-idx-take;if(rem===1&&take>2)take--;if(take<=0){newPage();continue;}for(let o=0;o<take;o++){const abs=idx+o;if(abs===0){font('bold');doc.text('Que',BODY.left,y);}drawLine(lines[abs],BODY.left+indent,abs!==lines.length-1);y+=BODY.lineHeight;}idx+=take;if(idx<lines.length)newPage();}y+=8;}
    function bullet(text,bold=[]){const leftExtra=30;ensureSpace(BODY.lineHeight*2);font();doc.text('•',BODY.left+8,y);rich(text,{bold,firstIndent:0,leftExtra,justify:false,after:2});}
    function quote(text){rich(text,{italic:[text],firstIndent:BODY.paragraphIndent,justify:false,after:8});}
    newPage();return{heading,rich,legal,bullet,quote,newPage,ensureSpace};
  }

  function drawApprovedBody(doc){
    const w=createWriter(doc);w.heading('1. Introducción',1);introductionParagraphs().forEach((t,i)=>{emit(18+(i/7)*12,'render',{stage:'introduction'});w.rich(t,{justify:false});});
    w.heading('2. Base Legal',1);BASE_LEGAL.forEach((s,si)=>{w.heading(s.title,2);s.items.forEach((it,ii)=>{emit(32+((si+ii/Math.max(1,s.items.length))/BASE_LEGAL.length)*22,'render',{stage:'base-legal'});w.legal(it.text,it.bold);});});
    w.heading('3. Alineación Estratégica',1);ALIGNMENT.forEach((b,i)=>{emit(58+(i/ALIGNMENT.length)*28,'render',{stage:'alignment',current:i+1,total:ALIGNMENT.length});if(b.type==='h2')w.heading(b.text,2);else if(b.type==='h3')w.heading(b.text,3);else if(b.type==='bullet')w.bullet(b.text,b.bold||[]);else if(b.type==='quote')w.quote(b.text);else w.rich(b.text,{bold:b.bold||[],firstIndent:b.type==='label'?0:BODY.paragraphIndent,justify:true});});
  }

  function drawFooters(doc){const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),period=periodText(true);for(let n=1;n<=total;n++){doc.setPage(n);doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+period+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}}

  async function generateDnf(payload={}){if(!window.jspdf?.jsPDF)throw new Error('No se pudo cargar jsPDF. Recarga la aplicación e intenta nuevamente.');emit(5,'start',{stage:'vector-v3'});const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:'pt',format:'a4',orientation:'portrait',compress:true,putOnlyUsedFonts:true});doc.setProperties({title:documentTitle(),subject:periodText(true),author:'Instituto Superior Tecnológico Quito Metropolitano - ITSQMET',keywords:'ITSQMET, formación docente, DNF, alineación estratégica'});drawCover(doc);drawApprovedBody(doc);emit(90,'render',{stage:'footer'});drawFooters(doc);const filename=String(payload.filename||(documentCode()||'DNF')+' - Detección de Necesidades de Formación.pdf');emit(96,'save',{stage:'download'});doc.save(filename);emit(100,'done',{stage:'complete',pages:doc.getNumberOfPages()});window.__DOCFORMACION_DNF_RENDERER=ENGINE;return{ok:true,filePath:filename,renderer:ENGINE,pages:doc.getNumberOfPages(),scope:'cover+introduction+base-legal+alignment'};}

  api.generatePDF=async function vectorDnfRouterV3(payload={}){const isWeb=location.protocol==='http:'||location.protocol==='https:';if(isWeb&&isDnf(payload)){try{return await generateDnf(payload);}catch(error){const message=error?.message||String(error);emit(0,'error',{message});return{ok:false,error:message,renderer:ENGINE};}}return previousGeneratePDF(payload);};
  window.__DOCFORMACION_DNF_RENDERER=ENGINE;
  window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment';
})();
