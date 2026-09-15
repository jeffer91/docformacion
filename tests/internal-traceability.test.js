const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('documents/internal-traceability.js', 'utf8');

const plan = [{
  dnfCode:'DNF-01-01',
  career:'Administración',
  needText:'Maestría en Gestión Educativa',
  priority:'Alta',
  action:'',
  formationLevel:'',
  projectedProgram:''
}];
const report = [{
  dnfCode:'DNF-01-01',
  career:'Administración',
  needText:'Maestría en Gestión Educativa',
  action:'Maestría en Gestión Educativa',
  status:'',progress:0
}];
const flow = {};
const root = { querySelectorAll:() => [] };

const context = {
  state:{ needPlan:plan, needFollowup:report },
  window:{
    docformacionModel:{
      periodId:'2025-10_2026-09',
      needs:() => [{ code:'DNF-01-01', career:'Administración', need:'Maestría en Gestión Educativa', priority:'Alta' }],
      planRows:() => plan,
      reportRows:() => report
    },
    docformacionWorkflow:{
      syncPlanRows:() => plan,
      syncReportRows:() => report,
      needsFingerprint:() => 'needs-fp',
      planFingerprint:() => 'plan-fp',
      state:() => flow
    },
    docformacionPlanPolicy:{
      normalizeLevel:value => value === 'Maestría' ? 'Maestría' : '',
      applyDefaults:row => ({ ...row, durationYears:2.5, targetPercent:10 }),
      durationForLevel:() => 2.5,
      targetPercent:10
    },
    docformacionValidation:{ documentReadiness:() => ({ ready:true }) },
    docformacionSectionRenderers:{ render() {} }
  },
  excelTemplatePayload(scope) {
    if (scope !== 'dnf') return { sheets:[] };
    return {
      filename:'dnf.xlsx',
      sheets:[{
        name:'NECESIDADES',
        headers:['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD_MANUAL','JUSTIFICACION_PRIORIDAD'],
        descriptions:['Código','Carrera','Necesidad','Prioridad','Justificación'],
        rows:[['DNF-01-01','Administración','Maestría en Gestión Educativa','Alta','Brecha prioritaria']],
        widths:[18,30,50,18,50]
      }]
    };
  },
  analyzeExcelImport() {
    return {
      safeSheets:{ NECESIDADES:[{ CODIGO_DNF:'', CARRERA:'Administración', NECESIDAD:'Maestría en Gestión Educativa' }] },
      preview:[{ row:{ CODIGO_DNF:'', CARRERA:'Administración', NECESIDAD:'Maestría en Gestión Educativa' } }]
    };
  },
  applyExcel() {},
  renderDNF() {},
  renderPlan() {},
  document:{ getElementById:() => root },
  MutationObserver:class { observe() {} },
  console,
  Date,
  Object,
  String,
  Number,
  Map,
  Set,
  Math
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);

const dnf = context.excelTemplatePayload('dnf', true).sheets[0];
assert.deepStrictEqual(Array.from(dnf.headers), ['CARRERA','NECESIDAD','PRIORIDAD_MANUAL','JUSTIFICACION_PRIORIDAD']);
assert.strictEqual(dnf.rows[0].length, 4);

const planTemplate = context.excelTemplatePayload('plan', false).sheets[0];
assert.deepStrictEqual(Array.from(planTemplate.headers), ['CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','NIVEL_FORMACION','PROGRAMA_TITULO']);
assert.ok(!planTemplate.headers.includes('CODIGO_DNF'));

const reportTemplate = context.excelTemplatePayload('informe', false).sheets[0];
assert.deepStrictEqual(Array.from(reportTemplate.headers), ['CARRERA','NECESIDAD','ACCION_FORMACION','ESTADO','FECHA_INICIO_REAL','AVANCE_PORCENTAJE','EVIDENCIA','ARCHIVO_EVIDENCIA','RESULTADO_OBSERVACION']);
assert.ok(!reportTemplate.headers.includes('CODIGO_DNF'));

const dnfAnalysis = context.analyzeExcelImport('dnf', { sheets:{} });
assert.ok(!Object.prototype.hasOwnProperty.call(dnfAnalysis.safeSheets.NECESIDADES[0], 'CODIGO_DNF'));
assert.ok(!Object.prototype.hasOwnProperty.call(dnfAnalysis.preview[0].row, 'CODIGO_DNF'));

const planResult = context.analyzeExcelImport('plan', {
  sheets:{ MATRIZ:[{
    CARRERA:'Administración',
    NECESIDAD:'Maestría en Gestión Educativa',
    PRIORIDAD:'Alta',
    ACCION_FORMACION:'Cursar programa de maestría',
    NIVEL_FORMACION:'Maestría',
    PROGRAMA_TITULO:'Maestría en Gestión Educativa'
  }] }
});
assert.strictEqual(planResult.errors.length, 0);
assert.strictEqual(planResult.validRows, 1);
assert.ok(!Object.prototype.hasOwnProperty.call(planResult.safeSheets.MATRIZ[0], 'CODIGO_DNF'));

context.window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE = 'plan';
context.applyExcel(planResult.safeSheets);
assert.strictEqual(context.state.needPlan[0].action, 'Cursar programa de maestría');
assert.ok(context.state.needPlan[0].needId.startsWith('need_'));

console.log('internal-traceability.test.js OK');
