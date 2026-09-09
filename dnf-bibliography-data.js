(() => {
  'use strict';

  const SOURCES = [
    {id:'constitucion-ecuador-2008',author:'Asamblea Nacional del Ecuador',year:'2008',title:'Constitución de la República del Ecuador',publisher:'Registro Oficial Suplemento 449',type:'Normativa nacional',usedIn:['2']},
    {id:'caces-modelo-2024',author:'Consejo de Aseguramiento de la Calidad de la Educación Superior',year:'2024',title:'Modelo de evaluación externa con fines de acreditación para instituciones de educación superior técnicas y tecnológicas',publisher:'CACES',type:'CACES',usedIn:[]},
    {id:'itsqmet-pedi-2023-2028',author:'Instituto Superior Tecnológico Quito Metropolitano',year:'2023',title:'Plan Estratégico de Desarrollo Institucional 2023–2028',publisher:'ITSQMET',type:'Documento institucional ITSQMET',usedIn:[]},
    {id:'itsqmet-plan-formacion-2023-2030',author:'Instituto Superior Tecnológico Quito Metropolitano',year:'2023',title:'Plan de Formación Docente 2023–2030',publisher:'ITSQMET',type:'Documento institucional ITSQMET',usedIn:['1','3','8','9','10']},
    {id:'itsqmet-reglamento-formacion-2024',author:'Instituto Superior Tecnológico Quito Metropolitano',year:'2024',title:'Reglamento de Formación Docente – Versión 1.0',publisher:'ITSQMET',type:'Documento institucional ITSQMET',usedIn:[]},
    {id:'oei-formacion-docente-2020',author:'Organización de Estados Iberoamericanos para la Educación, la Ciencia y la Cultura',year:'2020',title:'Formación docente en Iberoamérica: claves para una estrategia regional',publisher:'OEI',type:'Organismo internacional',usedIn:[]},
    {id:'tenti-fanfani-2007',author:'Tenti Fanfani, E.',year:'2007',title:'El oficio de docente: vocación, trabajo y profesión en el siglo XXI',publisher:'Siglo XXI Editores',type:'Libro',usedIn:[]},
    {id:'unesco-tic-2019',author:'UNESCO',year:'2019',title:'Marco de competencias de los docentes en materia de TIC',publisher:'Organización de las Naciones Unidas para la Educación, la Ciencia y la Cultura',type:'Organismo internacional',usedIn:[]},
    {id:'vaillant-2015',author:'Vaillant, D.',year:'2015',title:'La formación de docentes en América Latina: repensar el desarrollo profesional en clave de aprendizaje',publisher:'Fondo de Cultura Económica',type:'Libro',usedIn:[]},
    {id:'murillo-2017',author:'Murillo, F. J.',year:'2017',title:'La mejora de la educación: una cuestión de justicia social',publisher:'Narcea Ediciones',type:'Libro',usedIn:[]},
    {id:'vaillant-marcelo-2015',author:'Vaillant, D., & Marcelo, C.',year:'2015',title:'Desarrollo profesional docente: ¿cómo se aprende a enseñar?',publisher:'Narcea Ediciones',type:'Libro',usedIn:[]},
    {id:'zabalza-2007',author:'Zabalza, M. A.',year:'2007',title:'Competencias docentes del profesorado universitario: calidad y desarrollo profesional',publisher:'Narcea Ediciones',type:'Libro',usedIn:[]},
    {id:'marcelo-2009',author:'Marcelo, C.',year:'2009',title:'La profesionalización docente y su impacto en la mejora de la educación',publisher:'Revista de Educación, 349, 79–108',type:'Artículo',usedIn:[]},
    {id:'tobon-2013',author:'Tobón, S.',year:'2013',title:'Formación basada en competencias: pensamiento complejo, currículo, didáctica y evaluación',publisher:'Ecoe Ediciones',type:'Libro',usedIn:[]}
  ];

  // Citas que sí aparecen en las secciones actuales, pero cuya ficha bibliográfica completa
  // no fue suministrada en la biblioteca entregada. No se inventan datos bibliográficos.
  const UNRESOLVED = [
    'Díaz Barriga (2006)',
    'Tünnermann Bernheim (2008)',
    'Ley Orgánica de Educación Superior (LOES)',
    'Reglamento de Carrera y Escalafón del Profesor del Sistema de Educación Superior (Acuerdo No. SENESCYT-2019-023)',
    'Modelo de Evaluación Externa de Institutos Superiores Técnicos y Tecnológicos (CACES, 2021)',
    'CACES (2020), Guía metodológica para la autoevaluación',
    'Reglamento de Formación y Capacitación de los Docentes del ITSQMET (2023)',
    'Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET',
    'Política Institucional de Formación Docente del ITSQMET (2023)',
    'Manual del Proceso de Formación Académica del ITSQMET'
  ];

  function usedSources() {
    return SOURCES.filter(source => Array.isArray(source.usedIn) && source.usedIn.length);
  }

  function bibliographyState() {
    return {
      all:SOURCES.map(source => ({...source,usedIn:[...(source.usedIn||[])]})),
      used:usedSources().map(source => ({...source,usedIn:[...(source.usedIn||[])]})),
      unresolved:[...UNRESOLVED]
    };
  }

  if (typeof renderDNF === 'function') {
    const previousRenderDNF = renderDNF;
    renderDNF = function renderDNFSections10And11() {
      previousRenderDNF();
      const root=document.getElementById('content');
      if(!root || root.querySelector('#section10And11Automatic')) return;
      const bib=bibliographyState();
      root.insertAdjacentHTML('beforeend',`
        <div id="section10And11Automatic" class="section-title" style="margin-top:30px"><div><h2>10. Recomendaciones</h2><p>Generación automática a partir de brechas, áreas prioritarias y resultados consolidados. Campos manuales: 0.</p></div></div>
        <div class="card"><p class="small muted">Las carreras prioritarias se determinan con la proporción real de docentes sin cuarto nivel; las áreas estratégicas se toman de los intereses registrados en el período.</p></div>
        <div class="section-title" style="margin-top:26px"><div><h2>11. Bibliografía</h2><p>Generada automáticamente desde la biblioteca de fuentes asociadas al documento.</p></div></div>
        <div class="grid cards">
          ${metric('Fuentes registradas',bib.all.length)}
          ${metric('Fuentes completas utilizadas',bib.used.length)}
          ${metric('Citas pendientes de ficha completa',bib.unresolved.length)}
        </div>
        <div class="card"><p class="small muted">La app no inventa datos bibliográficos. Las citas cuya ficha completa no está registrada se mantienen en el control de consistencia para su actualización en la biblioteca maestra.</p></div>`);
    };
  }

  window.__DOCFORMACION_DNF_BIBLIOGRAPHY = bibliographyState;
  window.__DOCFORMACION_DNF_BIBLIOGRAPHY_READY = true;
})();