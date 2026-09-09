(() => {
  if (typeof dnfHtml !== 'function') return;

  const previousDnfHtml = dnfHtml;
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  function formatPeriodPart(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const month = MONTHS[Number(match[2]) - 1] || match[2];
      return month + ' ' + match[1];
    }
    if (!raw) return '';
    return raw.charAt(0).toLowerCase() + raw.slice(1);
  }

  function periodText() {
    const start = formatPeriodPart(state?.period?.start);
    const end = formatPeriodPart(state?.period?.end);
    if (start && end) return start + ' a ' + end;
    return start || end || 'período seleccionado';
  }

  function introductionBody() {
    const period = esc(periodText());
    return `
      <div class="h1">1. Introducción</div>
      <p>En el contexto de la educación superior, la calidad académica se encuentra estrechamente relacionada con la formación, cualificación y desarrollo permanente del personal docente. La evolución de los entornos profesionales, los avances tecnológicos, las nuevas metodologías educativas y las transformaciones sociales demandan que las instituciones de educación superior mantengan procesos sistemáticos que permitan identificar las necesidades de formación de su claustro académico y orientar acciones para su fortalecimiento.</p>

      <p>La formación docente debe entenderse como un proceso continuo que permite fortalecer y transformar la práctica académica. Díaz Barriga (2006) plantea la formación docente como un proceso permanente de construcción intencional de saberes que posibilita al profesorado reflexionar y transformar su práctica. Desde esta perspectiva, la formación no se limita a la obtención de nuevas titulaciones, sino que constituye un mecanismo para consolidar capacidades académicas, profesionales, investigativas y pedagógicas que respondan a las necesidades de los estudiantes y de la institución. Esta misma relación entre desarrollo profesional docente y calidad educativa constituye uno de los fundamentos del documento institucional vigente.</p>

      <p>En el ámbito de la educación superior técnica y tecnológica, esta necesidad adquiere especial relevancia debido a la permanente relación entre la oferta académica, el desarrollo tecnológico y las necesidades del entorno productivo. Tünnermann Bernheim (2008) destaca al personal académico como un componente fundamental de las instituciones de educación superior y vincula directamente su desarrollo profesional con la calidad educativa. En concordancia con este enfoque, el Instituto Superior Tecnológico Quito Metropolitano —ITSQMET— orienta sus procesos de formación docente hacia el fortalecimiento de un claustro académico cualificado, pertinente y articulado con las necesidades de las carreras y las exigencias de aseguramiento de la calidad.</p>

      <p>En este marco, el presente documento recoge los resultados del proceso de <strong>Detección de Necesidades de Formación correspondiente al período ${period}</strong>, desarrollado con el personal docente del ITSQMET. Este diagnóstico constituye un instrumento técnico para conocer la situación académica del claustro docente, identificar brechas de formación, reconocer intereses y proyecciones de desarrollo profesional y establecer áreas prioritarias sobre las cuales la institución pueda orientar sus estrategias de formación. Esta finalidad corresponde a la lógica planteada en el documento institucional, en el cual el diagnóstico se concibe como base para la elaboración y actualización del Plan de Formación Docente.</p>

      <p>El proceso de detección permite, además, analizar las necesidades desde diferentes perspectivas, considerando información relacionada con el nivel académico alcanzado por los docentes, sus intereses de formación, las modalidades de estudio, la disponibilidad para iniciar o continuar estudios y sus aspiraciones académicas de corto y mediano plazo. Estas variables forman parte del componente cuantitativo utilizado en el diagnóstico institucional y permiten establecer tendencias y prioridades para la toma de decisiones.</p>

      <p>De manera complementaria, el análisis incorpora información cualitativa obtenida mediante la participación de las coordinaciones académicas, permitiendo validar los resultados obtenidos, identificar necesidades que pueden no encontrarse explícitamente reflejadas en los datos cuantitativos y establecer criterios de priorización de acuerdo con la pertinencia curricular, el perfil docente y las necesidades institucionales. La combinación de ambas fuentes fortalece la comprensión de la realidad del claustro y contribuye a una planificación más contextualizada de la formación docente.</p>

      <p>Por tanto, los resultados obtenidos mediante este proceso constituyen un insumo para la planificación del <strong>Plan de Formación Docente del ITSQMET</strong>, permitiendo definir líneas de formación específicas y transversales, establecer prioridades institucionales y orientar acciones de seguimiento que contribuyan al fortalecimiento progresivo de la cualificación académica del personal docente. De esta manera, la detección de necesidades se integra al ciclo institucional de planificación y mejora continua, procurando que las decisiones relacionadas con la formación docente se encuentren sustentadas en información actualizada y pertinente.</p>
    `;
  }

  dnfHtml = function dnfHtmlWithMasterIntroduction() {
    const html = previousDnfHtml();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sections = [...doc.querySelectorAll('.q-section')];
    const intro = sections.find(section => {
      const heading = section.querySelector(':scope > .h1');
      return String(heading?.textContent || '').trim() === '1. Introducción';
    });

    if (intro) intro.innerHTML = introductionBody();
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  };

  window.__DOCFORMACION_DNF_INTRODUCTION = 'master-v1';
})();