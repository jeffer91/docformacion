const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('documents/dnf/priority-state.js', 'utf8');
const state = {
  coordinations:[{
    carrera:'Administración',
    needItems:[{text:'Planificación estratégica', priorityOverride:'Alta'}]
  }]
};

const context = {
  state,
  window:{
    docformacionModel:{
      needs:() => [{career:'Administración', need:'Planificación estratégica', priority:'Alta'}]
    }
  },
  applyExcel(sheets) {
    // Simula la reconstrucción canónica de needItems realizada por workflow.js.
    state.coordinations[0].needItems = sheets.NECESIDADES.map(row => ({
      text:row.NECESIDAD,
      priorityOverride:row.PRIORIDAD_MANUAL
    }));
  },
  confirmExcelAnalysis:async () => {},
  toast:() => {},
  console
};
context.window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE = 'dnf';
vm.createContext(context);
vm.runInContext(code, context);

context.applyExcel({
  NECESIDADES:[{
    CARRERA:'Administración',
    NECESIDAD:'Planificación estratégica',
    PRIORIDAD_MANUAL:'Alta',
    JUSTIFICACION_PRIORIDAD:'La brecha requiere atención preferente.'
  }]
});

assert.strictEqual(
  state.coordinations[0].needItems[0].priorityJustification,
  'La brecha requiere atención preferente.',
  'La justificación debe persistir en state.coordinations.needItems después de reconstruir la DNF.'
);

const needs = context.window.docformacionModel.needs();
assert.strictEqual(
  needs[0].priorityJustification,
  'La brecha requiere atención preferente.',
  'El modelo canónico debe exponer priorityJustification a validación, UI y PDF.'
);
assert.strictEqual(context.window.__DOCFORMACION_DNF_PRIORITY_APPLY_RESULT.ready, true, 'La verificación post-importación debe quedar lista.');

console.log('DNF canonical priority state: OK');
