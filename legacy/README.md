# Legacy

Esta carpeta conserva implementaciones históricas durante la migración incremental a la Guía Maestra.

Los archivos de `legacy/patches/`, `legacy/dnf-prototypes/` y `legacy/migrations/` **no se cargan desde `bootstrap.js`** y no forman parte del runtime activo.

No agregar nuevas correcciones aquí. Las nuevas correcciones deben realizarse en el componente fuente correspondiente dentro de `core/`, `documents/` o `ui/`.

Las migraciones históricas se conservan únicamente como referencia y no pueden modificar períodos, datos ni documentos en ejecuciones actuales.

Cuando la equivalencia funcional y visual esté validada, estos archivos podrán eliminarse definitivamente.
