# Apiario

Cuaderno de explotación apícola. Se instala en el teléfono y los datos se quedan en ese dispositivo: no hay cuenta ni servidor.

Sitio: https://ttttooonni.github.io/Apiario/

## Qué guarda

- Ficha de la explotación (REGA, tipo, clase), si quieres rellenarla
- Apiarios, colmenas y núcleos
- Reinas, con el color del año
- Acciones: inspección, cosecha, cambio de reina, cuadros, alzas, tratamiento, división, núcleo, traslado y notas
- Sanidad: varroa, nosema, loque, pollo escayolado, avispa asiática, vigilancia y muestreos. En un tratamiento puedes anotar fin, dosis y días de supresión
- Producción y lote, con apiario opcional
- Cierre anual

Borrar un traslado o un cambio de reina deshace el efecto en la colonia.

## Copia de seguridad

En Datos, descarga el JSON. Si venías de [mi-cuaderno](https://github.com/ttttooonni/mi-cuaderno), exporta allí e impórtalo aquí: son orígenes distintos y el navegador no comparte el cuaderno.

El archivo antiguo (`app: mi-apiario`) se importa igual.

## En local

```bash
npm ci
npm run dev
```

`npm test` comprueba la copia JSON. `PAGES=1 npm run build` genera el sitio de GitHub Pages.
