(() => {
  'use strict';

  const section = (id, title, data = [], calculations = [], components = []) => ({
    id, title, data, calculations, components
  });

  window.DOCFORMACION_MANIFEST = Object.freeze({
    appId: 'formacion',
    version: '1.1.0',
    title: 'DocFormación',
    organization: 'ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',
    author: 'ITSQMET',
    documents: {
      dnf: {
        id: 'formacion-deteccion',
        title: 'Detección de Necesidades de Formación',
        sections: [
          section('DNF-01-introduccion', 'Introducción', ['periodo', 'necesidades'], [], ['titulo', 'parrafo']),
          section('DNF-02-base-legal', 'Base Legal', ['baseLegal'], [], ['titulo', 'parrafo']),
          section('DNF-03-alineacion', 'Alineación Estratégica', ['periodo'], [], ['titulo', 'parrafo', 'lista']),
          section('DNF-04-metodologia', 'Metodología y Enfoque', ['periodo', 'carreras', 'necesidades'], ['coberturaDiagnostica'], ['titulo', 'parrafo', 'lista']),
          section('DNF-05-caracterizacion', 'Caracterización del Diagnóstico', ['carreras', 'necesidades'], ['coberturaDiagnostica', 'prioridadPorNecesidad', 'convergenciaTematica'], ['tabla', 'grafico', 'indicador']),
          section('DNF-06-lineas', 'Líneas de Formación por Coordinación Académica', ['carreras', 'coordinaciones', 'necesidades', 'lineasGenericas'], ['prioridadPorNecesidad'], ['tabla', 'titulo', 'parrafo']),
          section('DNF-07-cobertura', 'Cobertura Institucional', ['carreras', 'necesidades'], ['coberturaDiagnostica'], ['tabla', 'indicador']),
          section('DNF-08-resumen', 'Resumen Ejecutivo', ['carreras', 'necesidades', 'lineasGenericas'], ['coberturaDiagnostica', 'prioridadPorNecesidad', 'convergenciaTematica'], ['tabla', 'indicador', 'parrafo']),
          section('DNF-09-conclusiones', 'Conclusiones', ['carreras', 'necesidades'], ['coberturaDiagnostica', 'prioridadPorNecesidad'], ['titulo', 'parrafo']),
          section('DNF-10-recomendaciones', 'Recomendaciones', ['necesidades'], ['prioridadPorNecesidad'], ['titulo', 'lista']),
          section('DNF-11-bibliografia', 'Bibliografía', ['bibliografia'], [], ['lista']),
          section('DNF-12-anexos', 'Anexos', ['carreras', 'necesidades', 'lineasGenericas'], ['coberturaDiagnostica', 'prioridadPorNecesidad', 'convergenciaTematica'], ['tabla', 'grafico', 'anexo'])
        ]
      },
      plan: {
        id: 'formacion-plan',
        title: 'Plan de Formación Docente',
        sections: [
          section('PLAN-01-introduccion', 'Introducción', ['periodo', 'plan'], [], ['titulo', 'parrafo']),
          section('PLAN-02-objetivo', 'Objetivo General', ['periodo'], [], ['titulo', 'parrafo']),
          section('PLAN-03-diagnostico', 'Diagnóstico y trazabilidad', ['plan', 'necesidades'], ['accionesPorPrioridad', 'accionesPorModalidad'], ['tabla', 'indicador']),
          section('PLAN-04-matriz', 'Matriz del Plan', ['plan'], [], ['tabla']),
          section('PLAN-05-indicadores', 'Indicadores y verificación', ['plan'], [], ['tabla']),
          section('PLAN-06-recursos', 'Recursos y apoyos', ['plan'], ['recursosPlanificados'], ['tabla']),
          section('PLAN-07-seguimiento', 'Seguimiento previsto', ['plan'], [], ['parrafo']),
          section('PLAN-08-conclusiones', 'Conclusiones', ['plan'], ['accionesPorPrioridad'], ['lista'])
        ]
      },
      informe: {
        id: 'formacion-informe',
        title: 'Informe de Cumplimiento del Plan de Formación Docente',
        sections: [
          section('INF-01-objeto', 'Objeto del Informe', ['periodo', 'seguimiento'], [], ['titulo', 'parrafo']),
          section('INF-02-alcance', 'Alcance y trazabilidad', ['plan', 'seguimiento'], [], ['titulo', 'parrafo']),
          section('INF-03-resumen', 'Resumen de Cumplimiento', ['seguimiento'], ['cumplimiento', 'avancePromedio', 'accionesPorEstado'], ['tabla', 'indicador']),
          section('INF-04-seguimiento', 'Seguimiento por necesidad', ['seguimiento'], [], ['tabla']),
          section('INF-05-evidencias', 'Evidencias y resultados', ['seguimiento'], [], ['tabla', 'anexo']),
          section('INF-06-analisis', 'Análisis', ['seguimiento'], ['cumplimiento', 'avancePromedio'], ['parrafo']),
          section('INF-07-conclusiones', 'Conclusiones', ['seguimiento'], ['cumplimiento'], ['lista']),
          section('INF-08-recomendaciones', 'Recomendaciones', ['seguimiento'], ['accionesPorEstado'], ['lista'])
        ]
      }
    }
  });
})();
