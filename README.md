# Ocean Data Explorer — Atlántico Norte

Aplicación web estática para la práctica de Visualización de Datos. Permite explorar la evolución mensual de temperatura y salinidad del Atlántico Norte según cinco rangos de profundidad.

## Estructura

- `index.html` — estructura de la interfaz.
- `style.css` — diseño responsive, tipografía y transiciones.
- `app.js` — carga de datos, mapa, selección, matriz temporal, tooltips y paneles informativos.
- `data/argo_visualizacion_mensual.csv` — datos agregados utilizados por la aplicación.
- `data/argo_visualizacion_mensual.json` — copia JSON del mismo conjunto agregado.
- `data/metadata.json` — metadatos del preprocesado.

## Datos disponibles

El conjunto suministrado para esta web contiene 535 registros agregados por `year`, `month` y `depth_range`. Las variables principales son:

- `temperature_mean`, `temperature_median`, `temperature_std`, `temperature_q25`, `temperature_q75`
- `salinity_mean`, `salinity_median`, `salinity_std`, `salinity_q25`, `salinity_q75`
- `n_observations`, `n_profiles`

El periodo indicado por los metadatos es 2016–2026, con 520.736 observaciones y 4.808 perfiles.

## Importante: selección espacial

La especificación de la práctica pide agregación real por celdas de 5° × 5°. El archivo agregado suministrado no conserva latitud/longitud por observación, por lo que **no sería correcto inventar una distribución espacial**. La aplicación incluye la malla, selección múltiple y regiones Occidental/Central/Oriental como interacción visual, pero mantiene explícita esta limitación.

Para que la selección espacial modifique realmente la matriz, hay que generar un archivo web adicional a partir del dataset georreferenciado original, conservando al menos latitud, longitud, fecha, profundidad, temperatura y salinidad.

## Publicar en GitHub Pages

1. Crea un repositorio.
2. Sube todo el contenido de esta carpeta respetando la estructura.
3. En GitHub: **Settings → Pages → Deploy from a branch → `main` / `root`**.
4. Abre la URL de GitHub Pages.

La aplicación no necesita backend ni Python durante la ejecución.

## Dependencias web

Se cargan D3.js, Leaflet y las fuentes desde CDN. El mapa usa teselas Carto/OSM, por lo que la primera carga requiere conexión a Internet.

## Desarrollo local

Para evitar restricciones del navegador al cargar el CSV, sirve la carpeta con un servidor HTTP, por ejemplo:

```bash
python -m http.server 8000
```

y abre `http://localhost:8000`.
