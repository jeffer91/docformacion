const fs = require('fs');
const assert = require('assert');

const priority = fs.readFileSync('documents/dnf/priority-justification.js', 'utf8');
const bootstrap = fs.readFileSync('bootstrap.js', 'utf8');

assert(priority.includes("const HEADER = 'JUSTIFICACION_PRIORIDAD'"), 'La plantilla DNF debe incluir JUSTIFICACION_PRIORIDAD.');
assert(priority.includes('Cada necesidad incorpora una justificación de la prioridad asignada'), 'El documento debe explicar que cada necesidad tiene justificación.');
assert(priority.includes('La brecha afecta directamente la formación académica requerida para las funciones docentes'), 'Debe existir la definición institucional de prioridad Alta.');
assert(priority.includes('puede atenderse de manera progresiva'), 'Debe existir la definición institucional de prioridad Media.');
assert(priority.includes('puede programarse posteriormente'), 'Debe existir la definición institucional de prioridad Baja.');
assert(priority.includes('priorityJustificationState'), 'La justificación debe formar parte de la validación documental.');
assert(priority.includes("section?.id === 'DNF-06-lineas'"), 'Las líneas por carrera deben mostrar la justificación.');
assert(priority.includes("section?.id === 'DNF-12-anexos'"), 'Los anexos deben conservar la justificación.');
assert(bootstrap.includes('documents/dnf/priority-justification.js'), 'Bootstrap debe cargar el módulo de justificación de prioridad.');

console.log('DNF priority justification: OK');
