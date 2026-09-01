# DocFormación

Aplicación de escritorio en Electron para gestionar el proceso de **Formación Docente de la UGPA** y generar tres documentos en PDF:

1. Detección de Necesidades de Formación.
2. Plan de Formación Docente.
3. Informe de Cumplimiento del Plan de Formación.

## Principios de la app

- Una sola base de datos para los tres documentos.
- Carga mediante formulario o Excel global.
- Los datos se reutilizan entre DNF, Plan y Seguimiento.
- Los porcentajes y resultados se calculan automáticamente.
- Los valores por defecto pueden ser modificados.
- Los documentos se generan directamente en PDF A4.
- Los datos se guardan localmente en el equipo.

## Campos definidos para la DNF

- Cédula.
- Nombre completo.
- Carrera principal.
- Dedicación: Tiempo Completo / Medio Tiempo / Tiempo Parcial.
- Nivel académico actual.
- Título académico actual.
- Afinidad del título con la carrera: Sí / No.
- Si estudia actualmente: Sí / No.
- Nivel de formación en curso.
- Programa en curso.
- Institución de estudio, solo cuando corresponda.
- Nivel que desea alcanzar.
- Área o programa de interés.
- Disposición para iniciar o continuar estudios.
- Tipo de formación: Específica / Genérica.
- Modalidad preferida: Presencial / Virtual / Híbrida.
- Inicio tentativo: mes/año.
- Barrera principal.
- Actualización reciente: Sí / No.

## Formación genérica por defecto

La app precarga seis líneas editables:

- Educación Superior, Pedagogía y Didáctica.
- Evaluación del Aprendizaje y Formación por Competencias.
- Investigación e Innovación Educativa.
- Tecnología Educativa e Inteligencia Artificial.
- Currículo y Gestión Académica.
- Inclusión, Diversidad y Atención Educativa.

## Excel global

La app genera una plantilla con las hojas:

- `CARRERAS`
- `PERIODO`
- `DOCENTES`
- `COORDINACIONES` — únicamente carrera y coordinador.
- `NECESIDADES` — una fila por necesidad de formación, con prioridad propia.
- `PLAN`
- `SEGUIMIENTO`

La importación actualiza la misma base que utilizan los formularios.

## Ejecución

Requiere Node.js instalado.

```bash
npm install
npm start
```

## Verificación rápida

```bash
npm run check
```

## Estado actual

Versión inicial funcional con:

- gestión del período;
- formulario de docentes;
- importación y plantilla Excel global;
- diagnóstico automático;
- necesidades específicas separadas de los coordinadores;
- prioridad independiente por cada necesidad de formación;
- líneas genéricas editables;
- selección de docentes para el Plan;
- seguimiento con estado, avance y evidencias;
- generación PDF de DNF, Plan e Informe.


## Integración Firebase

DocFormación puede consultar la base Realtime Database del proyecto Repaso-Fire en modo estrictamente de solo lectura.

- La integración usa únicamente solicitudes GET.
- Los registros de capacitación, talleres, seminarios, webinars y ramas como `capacitacionesGenericas` se excluyen del análisis.
- Firebase solo completa campos vacíos de DocFormación.
- Un dato local existente nunca se reemplaza silenciosamente; las diferencias se registran como conflictos.
- La cédula funciona como llave principal para evitar duplicar docentes.
- Firebase no crea necesidades de formación ni prioridades: esas siguen siendo calculadas por DocFormación.
- Se conserva trazabilidad interna de los campos completados desde Firebase y la fecha de lectura.


## Códigos documentales

Los códigos documentales se generan automáticamente a partir de la fecha de elaboración y no se editan manualmente:

- DNF: `UGPA-RGI1-01-PRO-31-AAAA-MM`
- Plan: `UGPA-RGI2-01-PRO-31-AAAA-MM`
- Informe: `UGPA-RGI3-01-PRO-31-AAAA-MM`

El año y mes corresponden a la fecha de elaboración del documento.
