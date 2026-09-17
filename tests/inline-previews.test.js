'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const inline = read('ui/inline-previews.js');
const sectionEngine = read('core/preview/section-engine.js');
const bootstrap = read('bootstrap.js');

assert(inline.includes('writerFactory'), 'La vista previa directa debe tener un writer HTML ligero');
assert(inline.includes('docformacionSectionRenderers?.render?.'), 'La vista previa debe reutilizar el mismo renderizador de contenido');
assert(inline.includes('docformacionDocumentContext?.build?.'), 'La vista previa debe usar el contexto documental canónico');
assert(inline.includes('IntersectionObserver'), 'Las vistas directas deben cargarse de forma diferida');
assert(inline.includes("card.querySelector('.preview-section')?.remove()"), 'El botón Vista previa debe desaparecer cuando el contenido ya se muestra directamente');
assert(inline.includes("card.querySelector('.preview-doc-element')?.remove()"), 'Portada y cabecera no deben requerir un botón Vista previa');
assert(!inline.includes('<iframe'), 'La vista previa directa no debe usar iframes PDF pesados que bloqueen la interfaz');
assert(!inline.includes('URL.createObjectURL'), 'La vista previa directa no debe crear visores PDF por sección');
assert(!inline.includes('docformacionSectionPdf?.build?.'), 'La vista previa no debe regenerar un PDF pesado para cada sección');
assert(inline.includes("mutationObserver.observe(content, { childList:true })"), 'El observador no debe vigilar todo el subárbol y entrar en ciclos de render');
assert(!sectionEngine.includes('Sección independiente'), 'La vista previa no debe añadir texto técnico que no pertenece al documento final');

const finalQualityIndex = bootstrap.indexOf('documents/dnf/final-quality.js');
const inlineIndex = bootstrap.indexOf('ui/inline-previews.js');
assert(finalQualityIndex >= 0 && inlineIndex > finalQualityIndex, 'La vista previa directa debe cargarse después de la capa final de calidad');

console.log('Lightweight inline document preview checks passed.');
