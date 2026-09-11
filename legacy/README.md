# Legacy

Esta carpeta conserva implementaciones históricas durante la migración incremental a la Guía Maestra.

Los archivos de `legacy/patches/` y `legacy/dnf-prototypes/` **no se cargan desde `bootstrap.js`** y no forman parte del runtime activo.

No agregar nuevas correcciones aquí. Las nuevas correcciones deben realizarse en el componente fuente correspondiente dentro de `core/`, `documents/` o `ui/`.

Cuando la equivalencia funcional y visual esté validada, estos archivos podrán eliminarse definitivamente.
