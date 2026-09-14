const fs = require('fs');
const assert = require('assert');

const coverage = fs.readFileSync('documents/dnf/coverage.js', 'utf8');
const bootstrap = fs.readFileSync('bootstrap.js', 'utf8');

assert(coverage.includes('Cobertura de registro por carreras'), 'La DNF debe usar una sola denominación para la cobertura por carreras.');
assert(coverage.includes('Carreras activas del período'), 'La tabla debe nombrar las carreras activas del período.');
assert(coverage.includes('Carreras con necesidades registradas'), 'La tabla debe nombrar carreras con necesidades registradas.');
assert(coverage.includes('Este resultado no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.'), 'La DNF debe diferenciar cobertura por carreras de participación docente/beneficiarios.');
assert(coverage.includes("text:applicable ? formatPercent(percent) : 'No aplica'"), 'La cobertura debe mostrar No aplica cuando no existan carreras activas.');
assert(coverage.includes("case 'DNF-01-introduccion'"), 'La introducción debe usar la denominación canónica de cobertura.');
assert(coverage.includes("case 'DNF-04-metodologia'"), 'La metodología debe explicar la cobertura por carreras.');
assert(coverage.includes("case 'DNF-05-caracterizacion'"), 'La caracterización debe usar la denominación canónica.');
assert(coverage.includes("case 'DNF-07-cobertura'"), 'La sección de cobertura debe usar el nuevo texto y tabla.');
assert(coverage.includes("case 'DNF-08-resumen'"), 'El resumen ejecutivo debe usar la denominación canónica.');
assert(coverage.includes("case 'DNF-09-conclusiones'"), 'Las conclusiones deben usar la denominación canónica.');
assert(bootstrap.includes('documents/dnf/coverage.js'), 'Bootstrap debe cargar el módulo de cobertura DNF.');

console.log('DNF coverage by career: OK');
