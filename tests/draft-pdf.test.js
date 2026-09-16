'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const pdf = read('documents/pdf.js');
const ui = read('ui/draft-pdf.js');
const bootstrap = read('bootstrap.js');

assert(pdf.includes("return (draft ? 'BORRADOR - ' : '') + base + '.pdf'"), 'El borrador debe descargarse con un nombre claramente identificado');
assert(pdf.includes("const pdfTitle = draft ? 'BORRADOR · ' + documentTitle : documentTitle"), 'La portada del borrador debe identificarse como BORRADOR');
assert(pdf.includes("footer: (page, pages) => (draft ? 'BORRADOR · ' : '')"), 'Cada página del borrador debe quedar identificada');
assert(pdf.includes('async function generateDraft'), 'Debe existir un generador específico de borradores');
assert(pdf.includes("build(type, { download:true, allowDraft:true, draft:true })"), 'El borrador debe ignorar el bloqueo por información pendiente');
assert(pdf.includes("if (!options.allowDraft) throw error"), 'Una sección incompleta no debe impedir descargar el borrador');

assert(ui.includes("button.textContent = 'Descargar borrador PDF'"), 'La interfaz debe ofrecer Descargar borrador PDF');
assert(ui.includes("if (!status || status.ready)"), 'El botón de borrador debe mostrarse cuando el documento está pendiente');
assert(ui.includes('generateDraft?.(type, button)'), 'El botón debe invocar el generador de borradores');
assert(ui.includes('new MutationObserver(schedule)'), 'El botón debe recuperarse aunque la vista vuelva a renderizarse');

const pdfIndex = bootstrap.indexOf("documents/pdf.js");
const minimalIndex = bootstrap.indexOf("ui/minimal-ui.js");
const draftIndex = bootstrap.indexOf("ui/draft-pdf.js");
assert(pdfIndex >= 0 && draftIndex > pdfIndex, 'La UI de borrador debe cargarse después del motor PDF');
assert(minimalIndex >= 0 && draftIndex > minimalIndex, 'La UI de borrador debe cargarse después de la UI final');

console.log('Draft PDF checks passed.');
