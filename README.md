# DocFormación

Aplicación de escritorio/web para gestionar el proceso de **Formación Docente de la UGPA** y generar tres documentos institucionales:

1. Detección de Necesidades de Formación (DNF).
2. Plan de Formación Docente.
3. Informe de Cumplimiento del Plan de Formación.

## Principio rector

El **período activo es el contexto global**. Los datos se registran una sola vez dentro del período y se reutilizan en DNF, Plan e Informe.

Flujo principal:

`PERÍODO -> DATOS -> DNF -> PLAN -> INFORME -> PDF`

## Arquitectura

La aplicación inició una migración incremental hacia la Guía Maestra de Aplicaciones Documentales. El runtime activo ya se organiza por responsabilidades:

```text
core/
  data/
  diagnostics/
  periods/
  preview/
documents/
  dnf/
  manifest.js
  workflow.js
ui/
  system-views.js
legacy/
  patches/
```

### Reglas

- `documents/manifest.js` declara documentos y secciones.
- `core/data/model.js` expone el modelo único del período sin duplicar información.
- `core/periods/` administra el contexto temporal y la migración de datos existentes.
- `core/diagnostics/` identifica estado, pendientes y origen registrado de los datos.
- `documents/dnf/` contiene el flujo y generador activo de la DNF.
- `documents/workflow.js` conserva la trazabilidad DNF -> Plan -> Informe.
- `legacy/patches/` contiene archivos históricos que **no forman parte del runtime activo** y quedan aislados mientras se valida la equivalencia antes de su eliminación definitiva.

## Datos compartidos

La base del período reutiliza carreras, docentes, coordinaciones y autoridades. Los datos propios de cada documento permanecen en su ámbito.

## Excel

Excel funciona como fuente de entrada:

`EXCEL -> IMPORTADOR -> VALIDACIÓN -> MODELO DEL PERÍODO -> DOCUMENTOS/PDF`

El PDF no debe leer hojas ni columnas directamente después de la importación.

## Firebase

La integración con Repaso-Fire es de solo lectura. Los datos externos solo completan campos permitidos y no deben mezclar Capacitación con Formación Docente.

## Códigos documentales

- DNF: `UGPA-RGI1-01-PRO-31-AAAA-MM`
- Plan: `UGPA-RGI2-01-PRO-31-AAAA-MM`
- Informe: `UGPA-RGI3-01-PRO-31-AAAA-MM`

## Diagnóstico

La interfaz incluye las vistas **Configuración** y **Diagnóstico**. Diagnóstico muestra:

- período y `periodId`;
- conteos de datos compartidos;
- estado de DNF, Plan e Informe;
- pendientes críticos;
- origen registrado de las cargas;
- secciones declaradas por documento.

## Migración pendiente

La siguiente fase es convertir el generador PDF en un motor plenamente seccionado para que cada sección pueda previsualizarse y descargarse de forma independiente. Hasta completar y validar esa equivalencia, los generadores actuales permanecen funcionales.

## Ejecución

```bash
npm install
npm start
```

Verificación de sintaxis del runtime activo:

```bash
npm run check
```
