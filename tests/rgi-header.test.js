'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'core/pdf/rgi-header.js'), 'utf8');

const calls = { rect:[], line:[], text:[], image:[] };
const fakeDoc = {
  setFillColor() {},
  setDrawColor() {},
  setLineWidth() {},
  setFont() {},
  setFontSize() {},
  setTextColor() {},
  rect(...args) { calls.rect.push(args); },
  line(...args) { calls.line.push(args); },
  splitTextToSize(value) { return String(value).split('\n'); },
  text(value, x, y, options) { calls.text.push({ value, x, y, options }); },
  addImage(...args) { calls.image.push(args); }
};

const sandbox = { window:{} };
sandbox.window.window = sandbox.window;
vm.runInContext(source, vm.createContext(sandbox), { filename:'core/pdf/rgi-header.js' });

const api = sandbox.window.docformacionRgiHeader;
assert(api, 'Debe exponerse el componente RGI');

const identity = api.identity('ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS');
assert.strictEqual(identity.institution, 'ITSQMET');
assert.strictEqual(identity.unit, 'UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS');

const geometry = api.draw(fakeDoc, 210, {
  organization:'ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',
  title:'Detección de Necesidades de Formación',
  period:'Octubre 2025 - Septiembre 2026',
  code:'UGPA-RGI1-01-PRO-31-2025-10'
});

assert.strictEqual(geometry.x, 15, 'El encabezado debe iniciar después del margen izquierdo de 1,5 cm');
assert.strictEqual(geometry.y, 15, 'El encabezado debe iniciar después del margen superior de 1,5 cm');
assert.strictEqual(geometry.width, 180, 'El encabezado RGI debe medir 18 cm');
assert.deepStrictEqual(Array.from(geometry.columns), [45,90,45], 'Las columnas deben mantener proporción 25/50/25');
assert.deepStrictEqual(Array.from(geometry.rows), [8,20], 'Las dos filas deben mantener la proporción compacta/amplia');
assert.strictEqual(geometry.height, 28, 'La altura del encabezado debe quedar dentro del estándar 2,5-3,1 cm');

assert(calls.rect.some(args => args[0] === 15 && args[1] === 15 && args[2] === 180 && args[3] === 28), 'Debe dibujarse la tabla exterior RGI');
assert(calls.line.some(args => args[0] === 60 && args[1] === 15 && args[2] === 60 && args[3] === 43), 'Debe existir división vertical después de la columna de logo');
assert(calls.line.some(args => args[0] === 150 && args[1] === 15 && args[2] === 150 && args[3] === 43), 'Debe existir división vertical antes de la columna de código');
assert(calls.line.some(args => args[0] === 60 && args[1] === 23 && args[2] === 150 && args[3] === 23), 'La división horizontal debe afectar solo a la columna central');

const text = calls.text.flatMap(item => Array.isArray(item.value) ? item.value : [item.value]).join(' | ');
assert(text.includes('ITSQMET'), 'La zona A1+A2 debe identificar a ITSQMET cuando no exista imagen de logo');
assert(text.includes('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS'), 'B1 debe contener la unidad responsable');
assert(text.includes('Detección de Necesidades de Formación'), 'B2 debe contener el nombre formal del documento');
assert(text.includes('Octubre 2025 - Septiembre 2026'), 'B2 debe contener el período');
assert(text.includes('UGPA-RGI1-01-PRO-31-2025-10'), 'C1+C2 debe contener el código documental');

sandbox.window.DOCFORMACION_LOGO_DATA_URL = 'data:image/jpeg;base64,AAAA';
sandbox.window.DOCFORMACION_LOGO_FORMAT = 'JPEG';
sandbox.window.DOCFORMACION_LOGO_ASPECT_RATIO = 240 / 95;
api.draw(fakeDoc, 210, {
  organization:'ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',
  title:'Detección de Necesidades de Formación',
  period:'Octubre 2025 - Septiembre 2026',
  code:'UGPA-RGI1-01-PRO-31-2025-10'
});

assert.strictEqual(calls.image.length, 1, 'La cabecera debe usar el logo institucional guardado cuando esté precargado');
const [dataUrl, format, , , width, height] = calls.image[0];
assert.strictEqual(dataUrl, sandbox.window.DOCFORMACION_LOGO_DATA_URL, 'Debe usar el logo institucional precargado');
assert.strictEqual(format, 'JPEG', 'Debe respetar el formato del logo guardado');
assert(Math.abs((width / height) - (240 / 95)) < 0.01, 'El logo debe conservar su relación de aspecto');

console.log('RGI header geometry, content and institutional logo checks passed.');
