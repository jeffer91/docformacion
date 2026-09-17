'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const inline = read('ui/inline-previews.js');
const sectionEngine = read('core/preview/section-engine.js');
const bootstrap = read('bootstrap.js');

assert(inline.includes('inline-preview-frame'), 'Debe existir un iframe de vista previa directa');
assert(inline.includes('IntersectionObserver'), 'Las vistas directas deben cargarse de forma diferida');
assert(inline.includes('docformacionSectionPdf?.build?.'), 'Las secciones deben reutilizar el motor PDF real');
assert(inline.includes('docformacionDocumentElements?.build?.'), 'Portada y cabecera deben reutilizar el motor PDF real');
assert(inline.includes("card.querySelector('.preview-section')?.remove()"), 'El botón Vista previa debe desaparecer cuando la vista se muestra directamente');
assert(inline.includes("card.querySelector('.preview-doc-element')?.remove()"), 'Portada y cabecera no deben requerir un botón Vista previa');
assert(!sectionEngine.includes('Sección independiente'), 'La vista previa no debe añadir texto técnico que no pertenece al documento final');

const finalQualityIndex = bootstrap.indexOf('documents/dnf/final-quality.js');
const inlineIndex = bootstrap.indexOf('ui/inline-previews.js');
assert(finalQualityIndex >= 0 && inlineIndex > finalQualityIndex, 'La vista previa directa debe cargarse después de la capa final de calidad');

console.log('Inline document preview checks passed.');
