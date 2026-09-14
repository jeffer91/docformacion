'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const validation = read('documents/validation.js');
const manifest = read('documents/manifest.js');
const integration = read('documents/plan/section-integration.js');
const bootstrap = read('bootstrap.js');

assert(validation.includes('function planMatrixRowMissing'), 'La validación debe separar campos por matriz');
assert(validation.includes('function planMatrixState'), 'Debe existir estado independiente por matriz');
assert(validation.includes("planMatriz:"), 'La disponibilidad debe exponer la Matriz del Plan');
assert(validation.includes("planIndicadores:"), 'La disponibilidad debe exponer Indicadores');
assert(validation.includes("planRecursos:"), 'La disponibilidad debe exponer Recursos');

assert(manifest.includes("section('PLAN-04-matriz', 'Matriz del Plan', ['planMatriz']"), 'Matriz debe depender solo de planMatriz');
assert(manifest.includes("section('PLAN-05-indicadores', 'Indicadores y verificación', ['planIndicadores']"), 'Indicadores debe depender solo de planIndicadores');
assert(manifest.includes("section('PLAN-06-recursos', 'Recursos y apoyos', ['planRecursos']"), 'Recursos debe depender solo de planRecursos');

['PLAN-04-matriz','PLAN-05-indicadores','PLAN-06-recursos'].forEach(id => {
  assert(integration.includes("'" + id + "'"), 'La integración SVD debe manejar ' + id);
});
assert(integration.includes('plan-svd-section-data'), 'Las pestañas deben recibir contenido de matrices visible');
assert(integration.includes('groupByCareer'), 'Las matrices deben agruparse por carrera');
assert(integration.includes('Subir Excel'), 'Información debe ofrecer una acción principal compacta');
assert(integration.includes('plan-info-progress'), 'Información debe resumir el progreso de las tres matrices');
assert(!integration.includes('Revisar diagnóstico'), 'El Plan no debe duplicar acciones genéricas de Diagnóstico');
assert(integration.includes('writer.heading(group.name, 2)'), 'El PDF debe agrupar las matrices por carrera');

const sectionsIndex = bootstrap.indexOf('ui/document-sections.js');
const integrationIndex = bootstrap.indexOf('documents/plan/section-integration.js');
const shellIndex = bootstrap.indexOf('ui/svd-shell.js');
assert(integrationIndex > sectionsIndex, 'La integración del Plan debe cargarse después del workspace genérico');
assert(integrationIndex < shellIndex, 'La integración del Plan debe cargarse antes de la navegación SVD final');

console.log('Plan SVD integration checks passed.');