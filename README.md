# DocFormación

Aplicación de escritorio/web para gestionar el proceso de **Formación Docente de la UGPA** y generar tres documentos institucionales:

1. Detección de Necesidades de Formación (DNF).
2. Plan de Formación Docente.
3. Informe de Cumplimiento del Plan de Formación.

## Principio rector

El **período activo es el contexto global**. Los datos se registran una sola vez dentro del período y se reutilizan en DNF, Plan e Informe.

Flujo principal:

`PERÍODO -> DATOS -> DNF -> PLAN -> INFORME -> SECCIONES/PDF`

El identificador canónico del período usa el formato:

`YYYY-MM_YYYY-MM`

Ejemplo: `2026-04_2026-09`.

## Arquitectura activa

```text
core/
  calculations/
  data/
  diagnostics/
  pdf/
    components.js
    engine.js
  periods/
  preview/
documents/
  dnf/
  manifest.js
  context.js
  calculations.js
  validation.js
  section-renderers.js
  pdf.js
  workflow.js
ui/
  document-sections.js
  system-views.js
legacy/
  patches/
tests/
```

### Responsabilidades

- `core/data/model.js`: acceso canónico a los datos del período.
- `core/calculations/base.js`: cálculos genéricos reutilizables.
- `core/pdf/`: componentes y motor PDF sin reglas propias de Formación.
- `documents/context.js`: contexto institucional y valores de plantilla.
- `documents/calculations.js`: cálculos propios de DNF, Plan e Informe.
- `documents/validation.js`: reglas canónicas de completitud de documentos y secciones.
- `documents/section-renderers.js`: textos y reglas propias de cada documento.
- `documents/pdf.js`: PDF completo construido con los mismos renderizadores usados por las secciones.
- `core/preview/section-engine.js`: orquestación genérica para vista previa/PDF individual.
- `core/diagnostics/`: diagnóstico de período, datos, documentos, secciones, orígenes y versiones.

## Períodos

El gestor de períodos mantiene snapshots separados y estados de ciclo de vida:

- **Activo:** edición normal.
- **Cerrado:** consulta/PDF y edición protegida con confirmación por sesión.
- **Archivado:** solo consulta y generación de documentos.

Al cerrar o archivar un período se registra la versión del build y del manifiesto documental utilizada.

Sin período activo, las áreas de datos/documentos quedan bloqueadas hasta crear o seleccionar uno.

## Fuente única y validación

La aplicación no debe asumir silenciosamente datos faltantes. En particular:

- una carrera sin estado explícito no se considera Activa;
- una necesidad sin prioridad no se convierte automáticamente en Media;
- una sección del Plan solo puede mostrarse como completa si todas las filas requeridas del Plan son válidas;
- una sección del Informe solo puede mostrarse como completa si el seguimiento requerido es válido.

La vista previa por sección, el PDF por sección y el PDF completo utilizan el mismo modelo, cálculos, validaciones y renderizadores.

## Excel

Excel funciona como fuente de entrada:

`EXCEL -> IMPORTADOR -> VALIDACIÓN -> NORMALIZACIÓN -> MODELO DEL PERÍODO -> DOCUMENTOS/PDF`

El PDF no lee directamente hojas ni columnas una vez finalizada la importación.

## Diagnóstico

La vista **Diagnóstico** muestra:

- período, `periodId` y estado;
- conteos de carreras, docentes, coordinaciones, necesidades, Plan y seguimiento;
- estado canónico de DNF, Plan e Informe;
- estado de cada sección;
- origen registrado de los datos;
- disponibilidad del Core PDF;
- build y versión del manifiesto;
- versiones congeladas cuando el período fue cerrado/archivado.

## Verificación automática

```bash
npm run ci
```

Ejecuta:

1. comprobación de sintaxis del runtime activo;
2. pruebas de arquitectura;
3. pruebas de validación canónica para DNF, Plan e Informe.

Entre otras reglas, CI verifica que el `periodId` no vuelva al formato con doble guion bajo, que el Core PDF no contenga textos propios de Formación y que no se asignen prioridades por defecto a necesidades incompletas.

## Ejecución

```bash
npm install
npm start
```
