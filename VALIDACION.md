# Validación del paquete

- Estructura estática: OK
- `index.html`: HTML autocontenido y referencias relativas a `style.css`, `app.js` y `data/`
- `app.js`: sintaxis JavaScript validada con Node.js
- CSV: 535 filas y 16 columnas; sin columnas faltantes respecto a la aplicación
- JSON: 535 registros
- Metadatos: periodo 2016–2026, 5 rangos de profundidad, 520736 observaciones y 4808 perfiles
- Dependencias externas: D3 7, Leaflet 1.9.4, fuentes Google, teselas Carto

## Limitación conocida y controlada

Los datos agregados disponibles no contienen latitud/longitud. La aplicación no asigna valores ficticios a celdas espaciales. La malla 5° × 5° es interactiva y la selección queda reflejada en la interfaz, pero la matriz temporal sigue representando el agregado disponible.
