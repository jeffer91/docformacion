'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const methodology = read('documents/dnf/methodology.js');
const bootstrap = read('bootstrap.js');

[
  'METODO_RECOLECCION',
  'FECHAS_LEVANTAMIENTO',
  'PARTICIPANTES',
  'FUENTES_DIAGNOSTICO',
  'RESPONSABLE_VALIDACION',
  'MECANISMO_VALIDACION',
  'REFERENCIA_EVIDENCIAS'
].forEach(header => {
  assert(methodology.includes(header), 'La plantilla metodológica debe incluir ' + header);
});

assert(methodology.includes("const SHEET = 'METODOLOGIA'"), 'La metodología debe tener una hoja Excel independiente');
assert(methodology.includes("const SCOPE = 'dnf-metodologia'"), 'La metodología debe tener una carga independiente');
assert(methodology.includes('exactamente una fila'), 'La plantilla metodológica debe representar una sola configuración por período');
assert(methodology.includes('methodologyNeedsFingerprint'), 'La metodología debe invalidarse si cambia la DNF validada');
assert(methodology.includes("section?.id !== 'DNF-04-metodologia'"), 'El nuevo texto debe aplicarse a la sección de metodología');
assert(methodology.includes('El diagnóstico comprende '), 'Debe generarse el nuevo párrafo de cobertura');
assert(methodology.includes('La información se recopiló mediante '), 'Debe documentarse el método de recolección');
assert(methodology.includes('La revisión y validación de las necesidades estuvo a cargo de '), 'Debe documentarse la validación');
assert(methodology.includes('La cobertura reportada corresponde a carreras con necesidades registradas; la participación docente se informa por separado.'), 'Debe diferenciar cobertura de carreras y participación docente');
assert(!methodology.includes('TOTAL_CARRERAS_ACTIVAS'), 'Los totales de carreras deben calcularse automáticamente y no pedirse en Excel');
assert(!methodology.includes('PORCENTAJE_COBERTURA'), 'La cobertura debe calcularse automáticamente y no pedirse en Excel');
assert(methodology.includes('Descargar plantilla'), 'Información debe permitir descargar la plantilla metodológica');
assert(methodology.includes('Subir plantilla'), 'Información debe permitir subir la plantilla metodológica');

const validationIndex = bootstrap.indexOf('documents/validation.js');
const rendererIndex = bootstrap.indexOf('documents/section-renderers.js');
const methodologyIndex = bootstrap.indexOf('documents/dnf/methodology.js');
const pdfIndex = bootstrap.indexOf('documents/pdf.js');
assert(methodologyIndex > validationIndex, 'La metodología debe cargarse después de la validación canónica');
assert(methodologyIndex > rendererIndex, 'La metodología debe cargarse después de los renderizadores base');
assert(methodologyIndex < pdfIndex, 'La metodología debe estar disponible antes de generar el PDF');

console.log('DNF methodology template checks passed.');
