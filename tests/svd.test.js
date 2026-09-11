'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const bootstrap = read('bootstrap.js');
const shell = read('ui/svd-shell.js');

assert(!index.includes('<aside class="sidebar">'), 'SVD 2.0 no debe mantener un menú lateral visible');
assert(index.includes('id="legacyNav" hidden'), 'La navegación heredada solo puede existir oculta por compatibilidad interna');
assert(index.includes('<h1 id="viewTitle">DocFormación</h1>'), 'La cabecera inicial debe ser documental, no un dashboard Inicio');
assert(bootstrap.includes('ui/svd-shell.js'), 'El runtime debe cargar la capa visual SVD 2.0');

assert(shell.includes('svd-document-panel'), 'Debe existir un panel superior de documentos');
assert(shell.includes('svd-section-tabs'), 'Las secciones deben navegarse mediante pestañas compactas');
assert(shell.includes("{ id:'cover', title:'Portada'"), 'Portada debe tener un apartado propio');
assert(shell.includes("{ id:'header', title:'Cabecera'"), 'Cabecera debe tener un apartado propio');
assert(shell.includes("setView('doc-dnf')"), 'La entrada debe ser directa al primer documento y no al dashboard Inicio');
assert(shell.includes('.status-badge.blocked,.status-badge.pending{background:#fff3d8'), 'Pendiente debe usar amarillo suave y no rojo');
assert(shell.includes('overflow-x:auto'), 'Documentos y pestañas deben poder desplazarse horizontalmente en pantallas reducidas');
assert(shell.includes("regularChildren.forEach(node => setVisible(node, selected === 'info'))"), 'Solo el contenido de la pestaña activa debe permanecer visible');

console.log('SVD 2.0 visual shell checks passed.');