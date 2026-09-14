'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const bootstrap = read('bootstrap.js');
const minimal = read('ui/minimal-ui.js');

assert(bootstrap.includes("ui/minimal-ui.js"), 'El runtime debe cargar la capa minimalista');
assert(bootstrap.indexOf("ui/minimal-ui.js") > bootstrap.indexOf("ui/svd-shell.js"), 'La capa minimalista debe cargarse después de SVD');
assert(minimal.includes("'Caracterización del Diagnóstico':'Diagnóstico'"), 'Las pestañas largas deben abreviarse');
assert(minimal.includes("'Líneas de Formación por Coordinación Académica':'Líneas'"), 'La navegación debe reducir rótulos extensos');
assert(minimal.includes("setButtonText('[data-v2-import]', 'Subir plantilla')"), 'La acción principal de plantilla debe ser breve');
assert(minimal.includes('Falta confirmar la bibliografía institucional.'), 'El pendiente de bibliografía debe mostrarse sin duplicación');
assert(minimal.includes('.dnf-template-heading p{display:none!important}'), 'La explicación secundaria de plantillas debe ocultarse en la vista cotidiana');
assert(minimal.includes('.svd-document-button{min-width:auto!important'), 'Los documentos deben mostrarse como navegación compacta');
assert(minimal.includes('.canonical-direct-missing{margin-top:4px!important'), 'El estado documental debe ser compacto');

console.log('Minimal UI checks passed.');
