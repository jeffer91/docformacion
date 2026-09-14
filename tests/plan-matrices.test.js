'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const matrices = read('documents/plan/matrices.js');
const bootstrap = read('bootstrap.js');

['MATRIZ', 'INDICADORES', 'RECURSOS'].forEach(name => {
  assert(matrices.includes("'" + name + "'"), 'La plantilla del Plan debe declarar la matriz ' + name);
});

assert(matrices.includes('ACCION_FORMACION'), 'MATRIZ debe contener la acción de formación');
assert(matrices.includes('INICIO_PLANIFICADO'), 'MATRIZ debe contener el cronograma');
assert(matrices.includes('INDICADOR'), 'INDICADORES debe contener el indicador');
assert(matrices.includes('META_PORCENTAJE'), 'INDICADORES debe contener la meta');
assert(matrices.includes('MEDIO_VERIFICACION'), 'INDICADORES debe contener el medio de verificación');
assert(matrices.includes('RESPONSABLE_INSTITUCIONAL'), 'INDICADORES debe contener el responsable');
assert(matrices.includes('TIPO_APOYO'), 'RECURSOS debe contener el tipo de apoyo');
assert(matrices.includes('MONTO_APOYO'), 'RECURSOS debe contener el monto');
assert(matrices.includes('OBSERVACIONES'), 'RECURSOS debe contener observaciones');

assert(matrices.includes('groupByCareer'), 'La vista del Plan debe agrupar la información por carrera');
assert(matrices.includes('Matriz del Plan'), 'La vista debe mostrar la matriz principal separada');
assert(matrices.includes('Indicadores y verificación'), 'La vista debe mostrar la matriz de indicadores separada');
assert(matrices.includes('Recursos y apoyos'), 'La vista debe mostrar la matriz de recursos separada');
assert(matrices.includes("section?.id === 'PLAN-04-matriz'"), 'El PDF debe redefinir la Matriz del Plan');
assert(matrices.includes("section?.id === 'PLAN-05-indicadores'"), 'El PDF debe redefinir Indicadores');

const moduleIndex = bootstrap.indexOf('documents/plan/matrices.js');
assert(moduleIndex > bootstrap.indexOf('documents/section-renderers.js'), 'Las matrices del Plan deben cargarse después de los renderizadores base');
assert(moduleIndex < bootstrap.indexOf('documents/pdf.js'), 'Las matrices del Plan deben cargarse antes del generador PDF');

console.log('Plan matrices split checks passed.');
