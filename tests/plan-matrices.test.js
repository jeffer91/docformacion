'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const matrices = read('documents/plan/matrices.js');
const workflow = read('documents/workflow-canonical.js');
const validation = read('documents/validation.js');
const bootstrap = read('bootstrap.js');

assert(matrices.includes("const SHEET = 'MATRIZ'"), 'El Plan debe usar una sola hoja MATRIZ');
['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','NIVEL_FORMACION','PROGRAMA_TITULO'].forEach(field => {
  assert(matrices.includes(field), 'La matriz debe contener ' + field);
});

['MODALIDAD','INICIO_PLANIFICADO','FIN_PLANIFICADO','INDICADOR','META_PORCENTAJE','RESPONSABLE_INSTITUCIONAL','TIPO_APOYO','MONTO_APOYO','OBSERVACIONES'].forEach(field => {
  assert(!matrices.includes("'" + field + "'"), 'La plantilla nueva no debe solicitar ' + field);
});

assert(workflow.includes("'Tecnología Superior':2.5"), 'Tecnología Superior debe durar 2,5 años');
assert(workflow.includes("'Tecnología Universitaria':2.5"), 'Tecnología Universitaria debe durar 2,5 años');
assert(workflow.includes("'Ingeniería':5.5"), 'Ingeniería debe durar 5,5 años');
assert(workflow.includes("'Licenciatura':5.5"), 'Licenciatura debe durar 5,5 años');
assert(workflow.includes("'Maestría':2.5"), 'Maestría debe durar 2,5 años');
assert(workflow.includes("'Doctorado':4"), 'Doctorado debe durar 4 años');
assert(workflow.includes('TARGET_PERCENT = 10'), 'La meta institucional debe ser 10%');
assert(workflow.includes('Coordinador de Gestión de Procesos Académicos'), 'El responsable debe ser institucional y automático');
assert(workflow.includes('Financiamiento total del costo de la formación'), 'El apoyo debe ser institucional y automático');
assert(workflow.includes('reconocida u homologable en Ecuador'), 'Debe existir el criterio de validez en Ecuador');

assert(validation.includes("if (kind !== 'matrix') return []"), 'Indicadores y Recursos no deben exigir campos por fila');
assert(validation.includes('programa o título proyectado'), 'La validación debe exigir el programa o título proyectado');
assert(validation.includes('nivel de formación'), 'La validación debe exigir el nivel de formación');

const moduleIndex = bootstrap.indexOf('documents/plan/matrices.js');
assert(moduleIndex > bootstrap.indexOf('documents/workflow-canonical.js'), 'La matriz debe cargarse después del flujo canónico y su política institucional');
assert(moduleIndex < bootstrap.indexOf('documents/pdf.js'), 'La matriz debe cargarse antes del generador PDF');

console.log('Simplified academic Plan matrix checks passed.');