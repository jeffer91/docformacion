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

assert(validation.includes('function planMatrixRowMissing'), 'Debe existir validación específica de la formación proyectada');
assert(validation.includes("if (kind !== 'matrix') return []"), 'Indicadores y Recursos deben ser automáticos');
assert(validation.includes("planIndicadores: { ready:true"), 'La disponibilidad debe marcar Indicadores como automáticos');
assert(validation.includes("planRecursos: { ready:true"), 'La disponibilidad debe marcar Recursos como automáticos');

assert(manifest.includes("section('PLAN-04-matriz', 'Matriz del Plan', ['planMatriz']"), 'Matriz debe depender de la formación proyectada');
assert(manifest.includes("section('PLAN-05-indicadores', 'Indicadores y verificación', ['periodo']"), 'Indicadores no debe exigir otra matriz');
assert(manifest.includes("section('PLAN-06-recursos', 'Recursos y apoyos', ['periodo']"), 'Recursos no debe exigir otra matriz');

['PLAN-04-matriz','PLAN-05-indicadores','PLAN-06-recursos'].forEach(id => {
  assert(integration.includes("'" + id + "'"), 'La integración SVD debe manejar ' + id);
});
assert(integration.includes('Formación proyectada'), 'Información debe mostrar la única carga manual del Plan');
assert(integration.includes('Descargar plantilla'), 'La carga manual debe permitir descargar plantilla');
assert(integration.includes('Subir plantilla'), 'La carga manual debe permitir subir plantilla');
assert(integration.includes('Automático'), 'Los criterios institucionales deben mostrarse como automáticos');
assert(integration.includes('Duración por nivel'), 'Información debe explicar la duración automática');
assert(integration.includes('Indicador y meta'), 'Información debe mostrar indicador y meta automáticos');
assert(integration.includes('Recursos institucionales'), 'Información debe mostrar recursos automáticos');
assert(integration.includes('Validez de la formación'), 'Información debe mostrar el criterio de homologación/reconocimiento');
assert(integration.includes('card.style.display = \'none\''), 'La tarjeta duplicada de estado debe ocultarse en Plan');
assert(integration.includes('writer.heading(group.name, 2)'), 'El PDF debe agrupar la matriz por carrera');
assert(integration.includes("case 'PLAN-05-indicadores'"), 'El PDF debe generar Indicadores institucionales');
assert(integration.includes("case 'PLAN-06-recursos'"), 'El PDF debe generar Recursos institucionales');
assert(!integration.includes('Revisar diagnóstico'), 'El Plan no debe duplicar acciones genéricas de Diagnóstico');

const sectionsIndex = bootstrap.indexOf('ui/document-sections.js');
const integrationIndex = bootstrap.indexOf('documents/plan/section-integration.js');
const shellIndex = bootstrap.indexOf('ui/svd-shell.js');
assert(integrationIndex > sectionsIndex, 'La integración del Plan debe cargarse después del workspace genérico');
assert(integrationIndex < shellIndex, 'La integración del Plan debe cargarse antes de la navegación SVD final');

console.log('Simplified Plan SVD integration checks passed.');