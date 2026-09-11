'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function testArchitecture() {
  const manager = read('core/periods/manager.js');
  const sectionEngine = read('core/preview/section-engine.js');
  const documentElements = read('core/preview/document-elements.js');
  const documentSectionsUi = read('ui/document-sections.js');
  const pdfEngine = read('core/pdf/engine.js');
  const pdfComponents = read('core/pdf/components.js');
  const fullPdf = read('documents/pdf.js');
  const context = read('documents/context.js');
  const bootstrap = read('bootstrap.js');
  const templateView = read('documents/dnf/template-view.js');

  assert(!manager.includes("start + '__' + end"), 'periodId no debe usar doble guion bajo');
  assert(manager.includes("start + '_' + end"), 'periodId canónico debe usar un solo guion bajo');

  ['renderDnf(', 'renderPlan(', 'renderReport('].forEach(signature => {
    assert(!sectionEngine.includes(signature), 'El Core de vista previa no debe contener reglas de documentos: ' + signature);
  });

  const corePdf = pdfEngine + '\n' + pdfComponents;
  ['Detección de Necesidades de Formación', 'Plan de Formación Docente', 'Informe de Cumplimiento'].forEach(text => {
    assert(!corePdf.includes(text), 'El Core PDF no debe contener texto institucional de Formación: ' + text);
  });

  assert(pdfEngine.includes('options.initialHeader !== false'), 'El Core PDF debe permitir una primera página sin encabezado');
  assert(pdfEngine.includes('options.firstPageFooter === false'), 'El Core PDF debe permitir una primera página sin pie');
  assert(fullPdf.includes('initialHeader: false'), 'El PDF completo debe reservar la primera página exclusivamente para portada');
  assert(fullPdf.includes('firstPageFooter: false'), 'El PDF completo no debe insertar pie en la portada');
  assert(context.includes('sourceConfirmations'), 'El contexto documental debe exponer confirmación versionada de fuentes');

  assert(documentElements.includes("id: 'cover'"), 'Debe existir un apartado documental de Portada');
  assert(documentElements.includes("id: 'header'"), 'Debe existir un apartado documental de Cabecera');
  assert(documentSectionsUi.includes('docformacionValidation.documentReadiness'), 'La interfaz documental debe usar la validación canónica del documento');
  assert(documentSectionsUi.includes('Elementos del documento'), 'La interfaz debe mostrar Portada y Cabecera separados de las secciones de contenido');
  assert(documentSectionsUi.includes('normalizePeriodSelectorLabels'), 'La interfaz debe evitar duplicar el estado en el selector del período');

  [
    'core/calculations/base.js',
    'documents/context.js',
    'documents/calculations.js',
    'documents/validation.js',
    'documents/workflow-canonical.js',
    'core/pdf/components.js',
    'core/pdf/engine.js',
    'documents/section-renderers.js',
    'documents/pdf.js',
    'core/preview/document-elements.js',
    'core/preview/section-engine.js'
  ].forEach(file => assert(bootstrap.includes(file), 'bootstrap.js debe cargar ' + file));

  assert(!bootstrap.includes('core/periods/migrate-existing-data.js'), 'La migración histórica no debe formar parte del runtime activo');
  assert(!bootstrap.includes("'documents/workflow.js?v='"), 'El workflow monolítico histórico no debe formar parte del runtime activo');
  assert(!bootstrap.includes('documents/dnf/pdf.js'), 'El generador DNF histórico no debe formar parte del runtime activo');
  assert(!bootstrap.includes('documents/dnf/cover.js'), 'La portada histórica no debe formar parte del runtime activo');
  assert(!templateView.includes('renderDocumentView = function'), 'template-view no debe parchear renderDocumentView');
}

function runInContext(file, context) {
  vm.runInContext(read(file), context, { filename:file });
}

function testCanonicalValidation() {
  const sandbox = {
    console,
    window: {},
    state: {
      period: {
        start:'2026-04',
        end:'2026-09',
        version:'1.0',
        preparedBy:'Responsable',
        preparedRole:'Cargo',
        reviewedBy:'Revisor',
        reviewedRole:'Cargo',
        approvedBy:'Aprobador',
        approvedRole:'Cargo'
      },
      careers:[{ name:'Enfermería', program:'Técnico Superior' }],
      teachers:[],
      coordinations:[{
        carrera:'Enfermería',
        coordinador:'',
        needItems:[{ dnfCode:'DNF-01-01', text:'Necesidad A', priorityOverride:'' }]
      }],
      settings:{ genericLines:['Educación Superior'] },
      section7:{ careerStatus:{} },
      dnfTemplateFlow:{ careersImported:true, dnfImported:true },
      workflowV3:{ planImported:false, reportImported:false, planSourceFingerprint:'', reportSourceFingerprint:'' },
      needPlan:[],
      needFollowup:[]
    },
    syncPeriodCodes(period) {
      period.dnfCode = 'DNF-CODE';
      period.planCode = 'PLAN-CODE';
      period.reportCode = 'INF-CODE';
    }
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);

  runInContext('documents/manifest.js', context);
  runInContext('core/calculations/base.js', context);
  runInContext('core/data/model.js', context);
  runInContext('documents/context.js', context);
  runInContext('documents/calculations.js', context);
  runInContext('documents/validation.js', context);

  assert.strictEqual(sandbox.docformacionModel.periodId, '2026-04_2026-09', 'periodId debe ser canónico');
  assert.strictEqual(sandbox.docformacionModel.activeCareers().length, 0, 'Una carrera sin estado no debe asumirse Activa');
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('dnf').ready, false, 'DNF no debe estar lista sin estado de carrera');

  sandbox.state.section7.careerStatus.enfermeria = { status:'Activa' };
  assert.strictEqual(sandbox.docformacionModel.needs()[0].priority, '', 'Una prioridad vacía no debe convertirse silenciosamente a Media');
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('dnf').ready, false, 'DNF no debe estar lista sin prioridad válida');

  sandbox.state.coordinations[0].needItems[0].priorityOverride = 'Alta';
  assert.strictEqual(
    sandbox.docformacionValidation.documentReadiness('dnf').ready,
    false,
    'DNF no debe quedar lista usando Base Legal/Bibliografía predeterminadas sin confirmación'
  );

  const sourceCatalog = sandbox.docformacionDocumentContext.sourceCatalog;
  sandbox.state.period.sourceConfirmations = {
    legalVersion: sourceCatalog.legal.version,
    bibliographyVersion: sourceCatalog.bibliography.version
  };
  assert.strictEqual(
    sandbox.docformacionValidation.documentReadiness('dnf').ready,
    true,
    'DNF debe quedar lista con catálogo, necesidad, prioridad y fuentes institucionales confirmadas'
  );

  sandbox.state.needPlan = [{
    dnfCode:'DNF-01-01', career:'Enfermería', needText:'Necesidad A', priority:'Alta',
    action:'', modality:'', plannedStart:'', plannedEnd:'', indicator:'', targetPercent:0,
    evidence:'', responsibleRole:'', supportType:'', supportAmount:0, observations:''
  }];
  sandbox.state.workflowV3.planImported = true;
  sandbox.state.workflowV3.planSourceFingerprint = sandbox.docformacionValidation.needsFingerprint(sandbox.docformacionModel.needs());
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('plan').ready, false, 'Plan no debe estar listo con filas incompletas');

  Object.assign(sandbox.state.needPlan[0], {
    action:'Curso', modality:'Virtual', plannedStart:'2026-04', plannedEnd:'2026-06',
    indicator:'Participación', targetPercent:100, evidence:'Certificado',
    responsibleRole:'UGPA', supportType:'Sin apoyo económico'
  });
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('plan').ready, true, 'Plan debe quedar listo cuando todos sus campos son válidos y corresponde a la DNF vigente');

  sandbox.state.coordinations[0].needItems[0].text = 'Necesidad modificada';
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('plan').ready, false, 'Un cambio posterior en DNF debe invalidar el Plan importado');
  sandbox.state.coordinations[0].needItems[0].text = 'Necesidad A';

  sandbox.state.needFollowup = [{
    dnfCode:'DNF-01-01', career:'Enfermería', action:'Curso', status:'Finalizado',
    realStart:'2026-05-01', progress:90, evidenceTitle:'Certificado', evidencePath:'cert.pdf', observation:''
  }];
  sandbox.state.workflowV3.reportImported = true;
  sandbox.state.workflowV3.reportSourceFingerprint = sandbox.docformacionValidation.planFingerprint(sandbox.docformacionModel.planRows());
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('informe').ready, false, 'Informe Finalizado debe exigir 100%');

  sandbox.state.needFollowup[0].progress = 100;
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('informe').ready, true, 'Informe debe quedar listo con seguimiento válido y Plan vigente');

  sandbox.state.needPlan[0].indicator = 'Indicador modificado';
  assert.strictEqual(sandbox.docformacionValidation.documentReadiness('informe').ready, false, 'Un cambio posterior en el Plan debe invalidar el Informe importado');
}

function testPdfCoverIsolation() {
  const calls = [];
  let pages = 1;
  let currentPage = 1;
  class FakePdf {
    setDrawColor() {}
    setLineWidth() {}
    rect() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setFillColor() {}
    text(value) { calls.push({ page:currentPage, value:String(value) }); }
    addPage() { pages += 1; currentPage = pages; }
    getNumberOfPages() { return pages; }
    setPage(page) { currentPage = page; }
    setProperties() {}
    output() { return { size:1 }; }
  }

  const sandbox = {
    console,
    window: {
      jspdf:{ jsPDF:FakePdf },
      docformacionPdfComponents:{ create(){ return {}; } }
    }
  };
  sandbox.window.window = sandbox.window;
  const context = vm.createContext(sandbox);
  runInContext('core/pdf/engine.js', context);

  const writer = sandbox.window.docformacionPdfCore.createWriter({
    initialHeader:false,
    firstPageFooter:false,
    header:{ organization:'ORG', title:'TITLE', period:'PERIOD', code:'CODE' },
    footer:(page, total) => 'Página ' + page + ' de ' + total
  });
  writer.finish({ title:'Prueba' });
  assert.strictEqual(calls.length, 0, 'La portada aislada no debe recibir encabezado ni pie');

  writer.newPage();
  writer.finish({ title:'Prueba' });
  assert(calls.some(call => call.page === 2 && call.value === 'ORG'), 'Las páginas interiores deben conservar encabezado');
  assert(calls.some(call => call.page === 2 && call.value.includes('Página 2 de 2')), 'Las páginas interiores deben conservar pie');
  assert(!calls.some(call => call.page === 1), 'La página 1 debe permanecer limpia después de terminar el PDF');
}

testArchitecture();
testCanonicalValidation();
testPdfCoverIsolation();
console.log('Architecture, canonical validation, document elements and PDF cover checks passed.');
