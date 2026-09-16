'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const methodology = read('documents/dnf/methodology.js');
const bootstrap = read('bootstrap.js');

[
  'BLOQUE',
  'CAMPO',
  'SELECCION',
  'PORCENTAJE',
  'VALOR_DETALLE',
  'DESCRIPCION_APLICACION',
  'ENFOQUE_METODOLOGICO',
  'FECHA_INICIO_LEVANTAMIENTO',
  'FECHA_FIN_LEVANTAMIENTO',
  'INSTRUMENTOS_UTILIZADOS',
  'PROCEDIMIENTO_LEVANTAMIENTO',
  'PROCEDIMIENTO_ANALISIS',
  'RESPONSABLE_VALIDACION',
  'MECANISMO_VALIDACION',
  'EVIDENCIAS_DIAGNOSTICO'
].forEach(token => assert(methodology.includes(token), 'La metodología debe incluir ' + token));

['Docentes','Coordinadores','Autoridades','UGPA'].forEach(actor => {
  assert(methodology.includes(actor), 'Debe existir el participante precargado ' + actor);
});
['Encuesta','Reuniones académicas','Focus group','Entrevistas','Revisión documental','Mesa técnica'].forEach(name => {
  assert(methodology.includes(name), 'Debe existir la técnica precargada ' + name);
});

assert(methodology.includes('Deben sumar exactamente 100%'), 'La participación porcentual debe validar un total exacto de 100%');
assert(methodology.includes('falta describir cómo se aplicó'), 'Cada técnica seleccionada debe exigir descripción');
assert(methodology.includes('DETECTION_CRITERIA'), 'El criterio de detección debe ser institucional y automático');
assert(methodology.includes('PRIORITY_CRITERIA'), 'El criterio de prioridad debe ser institucional y automático');
assert(methodology.includes('Esta es una versión anterior de la plantilla metodológica'), 'La app debe rechazar la plantilla metodológica antigua');
assert(!methodology.includes('TOTAL_CARRERAS_ACTIVAS'), 'Los totales de carreras no deben pedirse en Excel');
assert(!methodology.includes('PORCENTAJE_COBERTURA'), 'La cobertura no debe pedirse en Excel');

const state = {
  period:{start:'2025-10-01', end:'2026-09-30'},
  dnfTemplateFlow:{},
  dnfMethodology:{}
};
const fakeDocument = {
  getElementById(){ return null; },
  querySelectorAll(){ return []; },
  head:{ appendChild(){} },
  createElement(){ return { id:'', textContent:'', dataset:{}, querySelectorAll(){return [];}, appendChild(){} }; }
};
const context = {
  state,
  document:fakeDocument,
  console,
  Date,
  Map,
  Set,
  Object,
  Array,
  Number,
  String,
  Math,
  Intl,
  setTimeout,
  excelTemplatePayload(){ return {}; },
  analyzeExcelImport(){ return {}; },
  applyExcel(){},
  documentStatus(){ return {ready:true, issues:[], missing:[]}; },
  renderDocumentView(){},
  exportTemplate(){},
  importExcel(){},
  window:{
    docformacionDocumentContext:{
      build(){
        return {
          needs:[{career:'Administración', need:'Gestión por procesos'}],
          methodology:state.dnfMethodology,
          careers:[{name:'Administración'}],
          period:{label:'Octubre 2025 a Septiembre 2026'}
        };
      }
    },
    docformacionValidation:{
      needsFingerprint(){ return 'fingerprint'; },
      dnfCore(){ return {ready:true}; },
      sectionReadiness(){ return {ready:true, missing:[]}; },
      documentReadiness(){ return {ready:true, missing:[], sections:[{id:'DNF-04-metodologia', ready:true, missing:[]}]}; }
    },
    docformacionDocumentCalculations:{ dnf(){ return {diagnosed:1, coverage:100}; } },
    docformacionSectionRenderers:{ render(){} }
  }
};
vm.createContext(context);
vm.runInContext(methodology, context, { filename:'documents/dnf/methodology.js' });

const api = context.window.docformacionDnfMethodology;
assert(api, 'Debe exponerse la API de metodología DNF');
assert.strictEqual(api.headers.length, 6, 'La plantilla debe usar una sola hoja estructurada en seis columnas funcionales');
const rows = api.templateRows(false).map(row => [...row]);
assert(rows.length > 20, 'La hoja debe venir precargada por bloques metodológicos');

const findRow = (block, field) => rows.find(row => row[0] === block && row[1] === field);
findRow('GENERAL','ENFOQUE_METODOLOGICO')[4] = 'Descriptivo y participativo';
findRow('GENERAL','FECHA_INICIO_LEVANTAMIENTO')[4] = '2026-08-01';
findRow('GENERAL','FECHA_FIN_LEVANTAMIENTO')[4] = '2026-08-31';
findRow('GENERAL','INSTRUMENTOS_UTILIZADOS')[4] = 'Matriz DNF y guía de reunión';
findRow('PARTICIPANTE','Docentes')[3] = 60;
findRow('PARTICIPANTE','Coordinadores')[3] = 25;
findRow('PARTICIPANTE','Autoridades')[3] = 10;
findRow('PARTICIPANTE','UGPA')[3] = 5;
findRow('TECNICA','Reuniones académicas')[2] = 'SI';
findRow('TECNICA','Reuniones académicas')[5] = 'Reuniones de análisis por carrera';
findRow('FUENTE','Documentos curriculares')[2] = 'SI';
findRow('PROCEDIMIENTO','PROCEDIMIENTO_LEVANTAMIENTO')[4] = 'Levantamiento con coordinaciones académicas.';
findRow('PROCEDIMIENTO','PROCEDIMIENTO_ANALISIS')[4] = 'Depuración, contraste y consolidación de necesidades.';
findRow('VALIDACION','RESPONSABLE_VALIDACION')[4] = 'UGPA';
findRow('VALIDACION','MECANISMO_VALIDACION')[4] = 'Revisión técnica conjunta';
findRow('EVIDENCIA','EVIDENCIAS_DIAGNOSTICO')[4] = 'Actas, matrices y resultados institucionales';

const rawRows = rows.map(row => Object.fromEntries(api.headers.map((header, index) => [header, row[index]])));
const parsed = api.parseRows(rawRows);
assert.strictEqual(parsed.errors.length, 0, parsed.errors.join(' | '));
assert.strictEqual(parsed.participantTotal, 100, 'La suma porcentual debe ser 100');
assert.strictEqual(parsed.data.techniques.length, 1, 'Debe reconocer técnicas seleccionadas');
assert.strictEqual(parsed.data.sources.length, 1, 'Debe reconocer fuentes seleccionadas');
assert.strictEqual(api.validate(parsed.data).ready, true, 'La metodología completa debe quedar lista');

const invalid = JSON.parse(JSON.stringify(parsed.data));
invalid.participants[0].percentage = 50;
assert(api.validate(invalid).errors.some(error => error.includes('Deben sumar exactamente 100%')), 'Debe rechazar porcentajes que no sumen 100%');
invalid.participants = parsed.data.participants.map(item => ({...item}));
invalid.techniques[0].description = '';
assert(api.validate(invalid).errors.some(error => error.includes('falta describir cómo se aplicó')), 'Debe rechazar una técnica seleccionada sin descripción');

const validationIndex = bootstrap.indexOf('documents/validation.js');
const rendererIndex = bootstrap.indexOf('documents/section-renderers.js');
const methodologyIndex = bootstrap.indexOf('documents/dnf/methodology.js');
const pdfIndex = bootstrap.indexOf('documents/pdf.js');
assert(methodologyIndex > validationIndex, 'La metodología debe cargarse después de la validación canónica');
assert(methodologyIndex > rendererIndex, 'La metodología debe cargarse después de los renderizadores base');
assert(methodologyIndex < pdfIndex, 'La metodología debe estar disponible antes de generar el PDF');

console.log('DNF methodology structured template checks passed.');