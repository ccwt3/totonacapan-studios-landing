# 2026-09-30 · Landing inicial de Totonacapan Digital y Volador

## Qué se hizo

Dos páginas estáticas con HTML, CSS y JavaScript sin dependencias ni paso de compilación:

| Archivo | Contenido |
|---|---|
| `index.html` | La empresa: servicios, quiénes somos, misión y visión, valores, proceso, equipo y contacto |
| `volador.html` | El producto (plataforma de gimnasios): problema, módulos, operación sin internet, simulador de torniquete, privacidad de la huella, dashboard de ejemplo, hoja de ruta y registro al piloto |
| `css/estilos.css` | Tokens de color y tipografía, componentes compartidos (cabecera, tarjetas, sello giratorio, marcos, cinta, formularios, pie) |
| `css/empresa.css`, `css/producto.css` | Secciones propias de cada página |
| `js/main.js` | Menú móvil, aparición al hacer scroll, formularios, interruptor de internet, simulador de acceso y mapa de calor |
| `assets/img/` | Fotos de Wikimedia Commons (créditos en el pie de cada página) |
| `assets/svg/` | Logo y ornamentos: greca, escalonado de El Tajín, nichos, flor de bordado, estrella |

Para verla basta con abrir `index.html` en el navegador. No hace falta servidor.

## Por qué así

- **Estética.** Se combinaron las referencias (tarjetas de borde grueso con sombra dura, tipografía condensada enorme, sello circular giratorio, marcos con muesca, tarjetas de cristal) con elementos del Totonacapan: listones rosa y turquesa de la indumentaria, el azul del cielo de los voladores de Papantla, la greca y los nichos de El Tajín, la flor bordada y el verde de la vainilla. La paleta vive en variables de `:root` para poder ajustarla en un solo lugar.
- **Contenido fiel a los documentos.** Los textos de la empresa salen de `informacion-empresa`. Los del producto salen del documento de trabajo y del plan. Lo que aún no es un hecho se presenta como tal: "< 1 s" y "0 ventas perdidas" se marcan como metas, las fechas de la hoja de ruta como estimadas, y la privacidad biométrica lleva la nota de revisión legal pendiente. No se menciona el plazo de 72 h del SAT porque el plan lo deja por verificar.
- **Formularios sin servidor.** El sitio no tiene backend, así que los formularios arman un `mailto:` con los datos. Es lo más simple que funciona hoy. Cuando exista un servidor o servicio de formularios se cambia solo `iniciarFormularios()`.
- **Accesibilidad.** Con `prefers-reduced-motion` se desactivan las animaciones. El simulador usa `role="radiogroup"`, el interruptor usa `role="switch"` y el veredicto usa `aria-live`.

## Supuestos que hay que confirmar

1. **Nombre del producto: "Volador".** Los documentos no le dan nombre. Se eligió por los voladores de Papantla. Para cambiarlo, busca "Volador" en `volador.html`, `index.html` y `js/main.js`.
2. **Correo de contacto: `contacto@totonacapan.digital`.** Es un marcador. Se cambia en la constante `CORREO_CONTACTO` de `js/main.js`.
3. **Datos del dashboard y del simulador.** Son inventados, y ambas secciones lo dicen en pantalla.

## Verificación

- Capturas con Chrome sin interfaz a 1440 px y 390 px de ancho, en las dos páginas.
- Prueba con clics automáticos sobre una copia temporal: el interruptor cambia los estados y la cola de cambios, y el simulador se detiene en la regla correcta (`MEM_VENCIDA`, `HORARIO_NO_PERMITIDO`).
- `node --check js/main.js` sin errores. Todas las rutas locales referenciadas existen.
- No hay pruebas ni linter configurados en este subproyecto.
