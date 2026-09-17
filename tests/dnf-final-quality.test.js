'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const finalQuality = read('documents/dnf/final-quality.js');
const manifest = read('documents/manifest.js');
const components = read('core/pdf/components.js');
const header = read('core/pdf/rgi-header.js');
const pdf = read('documents/pdf.js');
const bootstrap = read('bootstrap.js');

assert(finalQuality.includes('__dnfFinalQuality:true'), 'La capa final debe sobrescribir el renderizador DNF heredado');
assert(finalQuality.includes('finalQualityPreflight'), 'La validación final debe incluir un preflight de calidad');
assert(finalQuality.includes('justificación de prioridad en todas las necesidades'), 'El PDF final debe exigir justificación en todas las necesidades');
assert(finalQuality.includes('Participantes del diagnóstico'), 'La metodología final debe mostrar participantes estructurados');
assert(finalQuality.includes('Técnicas de levantamiento'), 'La metodología final debe mostrar técnicas estructuradas');
assert(finalQuality.includes('Procedimiento de análisis e identificación de necesidades'), 'La metodología final debe incluir análisis');
assert(finalQuality.includes('Procesamiento, consolidación y trazabilidad'), 'La metodología final debe cerrar la trazabilidad institucional');
assert(finalQuality.includes("case 'DNF-06-generica'"), 'La Formación Intelectual Genérica debe renderizarse como sección independiente');
assert(finalQuality.includes('Matriz consolidada de necesidades de formación'), 'Los anexos deben conservar la matriz consolidada');
assert(!finalQuality.includes("writer.paragraph('La aplicación"), 'El PDF DNF no debe redactarse desde la perspectiva del software');

assert(manifest.includes("section('DNF-06-lineas', 'Necesidades de Formación por Carrera'"), 'La sección por carrera debe tener el nombre correcto');
assert(manifest.includes("section('DNF-06-generica', 'Formación Intelectual Genérica'"), 'La Formación Intelectual Genérica debe ser una sección separada');

assert(!components.includes('FIRMA / QR DIGITAL'), 'La portada final no debe imprimir placeholders de firma');
assert(components.includes("doc.text('BORRADOR'"), 'El borrador debe estar marcado visualmente en portada');
assert(components.includes('ensure(titleBlock + chartBlock)'), 'Los gráficos deben mantenerse juntos para evitar barras huérfanas');

assert(header.includes('singleLineFit'), 'El encabezado debe ajustar el código documental a una sola línea');
assert(header.includes("clean(meta.code).replace(/\\s+/g, ' ')"), 'El código documental debe normalizar espacios y saltos');

assert(pdf.includes("return (draft ? 'BORRADOR - ' : '') + base + '.pdf'"), 'El nombre del borrador debe identificarse claramente');
assert(pdf.includes("footer: (page, pages) => (draft ? 'BORRADOR · ' : '') + documentTitle"), 'El pie no debe depender del nombre del software');
assert(pdf.includes('window.docformacionFinalQuality?.preflight'), 'La generación final debe ejecutar el preflight de calidad');
assert(pdf.includes('draft,'), 'La portada debe recibir el estado de borrador');

const traceabilityIndex = bootstrap.indexOf('documents/internal-traceability.js');
const finalQualityIndex = bootstrap.indexOf('documents/dnf/final-quality.js');
const diagnosticsIndex = bootstrap.indexOf('core/diagnostics/index.js');
assert(finalQualityIndex > traceabilityIndex, 'La calidad final debe cargar después de los renderizadores de trazabilidad');
assert(finalQualityIndex < diagnosticsIndex, 'La calidad final debe estar disponible antes de construir la interfaz de diagnóstico');

console.log('DNF final quality checks passed.');
