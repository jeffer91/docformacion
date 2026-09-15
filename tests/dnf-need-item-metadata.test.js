const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'documents', 'dnf', 'need-item-metadata.js'),
  'utf8'
);

// Simula el estado en memoria DESPUÉS del primer render antiguo: la necesidad existe,
// pero app.js ya eliminó justificación, código y metadatos.
const state = {
  coordinations: [{
    carrera: 'Administración',
    coordinador: '',
    priorityOverride: '',
    needsOverride: '',
    needItems: [{
      id: 'need-1',
      text: 'Gestión por procesos',
      priorityOverride: 'Alta'
    }]
  }]
};

// Simula la copia correcta que ya había sido persistida antes del render destructivo.
const persisted = {
  coordinations: [{
    carrera: 'Administración',
    needItems: [{
      id: 'need-1',
      text: 'Gestión por procesos',
      priorityOverride: 'Alta',
      priorityJustification: 'Sustento diagnóstico',
      dnfCode: 'DNF-01-01',
      customMetadata: 'conservar'
    }]
  }]
};

const context = {
  state,
  window: {
    docformacion: {
      async loadData() { return persisted; }
    }
  },
  ensureNeedItems() { throw new Error('La implementación anterior no debe usarse'); },
  ensureCoordination(career) {
    return state.coordinations.find(item => item.carrera === career) || null;
  },
  needId(career, index) {
    return `need-${career}-${index}`;
  },
  console
};

vm.createContext(context);
vm.runInContext(source, context, { filename: 'need-item-metadata.js' });

(async () => {
  const restoration = await context.window.docformacionDnfNeedItemMetadata.ready;
  assert.strictEqual(restoration.available, true);
  assert.ok(restoration.restored >= 3);

  const rows = context.ensureNeedItems('Administración');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].text, 'Gestión por procesos');
  assert.strictEqual(rows[0].priorityOverride, 'Alta');
  assert.strictEqual(rows[0].priorityJustification, 'Sustento diagnóstico');
  assert.strictEqual(rows[0].dnfCode, 'DNF-01-01');
  assert.strictEqual(rows[0].customMetadata, 'conservar');

  // La normalización repetida tampoco debe volver a destruir los metadatos.
  const secondPass = context.ensureNeedItems('Administración');
  assert.strictEqual(secondPass[0].priorityJustification, 'Sustento diagnóstico');
  assert.strictEqual(secondPass[0].dnfCode, 'DNF-01-01');
  assert.strictEqual(secondPass[0].customMetadata, 'conservar');

  console.log('dnf-need-item-metadata.test.js: ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
