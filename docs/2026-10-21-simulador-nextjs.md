# 2026-10-21 · Simulador del sistema en Next.js

La landing solo describía el producto. Para la entrega preliminar se agregó una **simulación interactiva y guiada** del sistema de gestión, en la subcarpeta `simulador/`, que se despliega sola en Vercel.

## Qué hay

Un gimnasio ficticio, **Gimnasio Halcón**, con tres sucursales: Poza Rica Centro, Papantla y Tuxpan. Se entra con `jefe` / `123456789`. El botón **Modo de visión** cambia entre tres vistas:

| Modo | Pantallas | Base en el plan |
|---|---|---|
| Vista del jefe | Resumen (indicadores, ingresos diarios, mapa de calor, socios en riesgo, comparativo por sucursal) y Gastos (ingresos, gastos y utilidad por mes cerrado, gastos por categoría, diferencias de corte por cajero) | Figura 7 y sección 4.5 |
| Punto de venta | Recepción (lector de huella simulado con foto en blanco, ficha, acciones, últimos accesos), Socios (búsqueda y alta), Ventas y Corte de caja | Figura 6, secciones 4.2 a 4.4 |
| Soporte Totonacapan | Gimnasios atendidos, respaldos, versiones e incidencias | Figuras 8 y 10 |

Una **guía** arriba a la derecha acompaña al revisor pantalla por pantalla, resalta el elemento del que habla y se puede minimizar. Se coloca justo debajo de la barra superior (mide su alto, que cambia con el ancho de la pantalla) para no tapar "Sucursal" ni "Modo de visión", y al bajar sube hasta la esquina. En pantallas de 900 px o menos va abajo, porque arriba taparía el menú. Una franja fija avisa que es un proyecto escolar con datos ficticios.

## Cómo está hecho

- **Next.js 16 con App Router, renderizado en el servidor.** Todas las páginas son componentes de servidor. Solo son de cliente el lector de huella (animación de lectura), el ticket del punto de venta, la captura de huella en el alta, el menú lateral (enlace activo) y la guía.
- **Datos deterministas.** `lib/datos.ts` genera socios, pagos, accesos, gastos y cortes con una semilla fija, y la simulación vive en un día fijo (miércoles 21 de octubre de 2026, 18:40). Así las cifras no cambian con la fecha real ni entre visitas.
- **Reglas de negocio puras** en `lib/dominio.ts`, sin dependencias: la vigencia se **deriva de los pagos y del congelamiento** y no se guarda; el acceso revisa huella, membresía, horario y adeudo **en ese orden** y se detiene en la primera que falla (figura 4). Los códigos de regla (`BIO_SIN_COINCIDENCIA`, `MEM_VENCIDA`, `HORARIO_NO_PERMITIDO`, `ADEUDO_PENDIENTE`) son los mismos que usaba el simulador de la landing. Dinero en centavos enteros.
- **Lo que hace el visitante persiste en cookies.** Ventas, accesos, socios nuevos, congelamientos, cortes e incidencias resueltas se guardan con acciones de servidor en cookies (una por colección). Por eso una venta en el punto de venta aparece en los ingresos de la vista del jefe, y un socio renovado pasa la siguiente vez que pone la huella. Cada cookie conserva solo los últimos registros por el límite de ~4 KB; "Reiniciar simulación" las borra. Vercel no tiene memoria entre peticiones, así que la cookie es lo más simple que funciona sin base de datos.
- **El servidor valida todo.** El navegador manda solo identificadores y cantidades; precios, descuentos (tope de 20 % y motivo obligatorio), folios y reglas se calculan en el servidor.
- **Gráficas en HTML y CSS**, sin bibliotecas. El detalle aparece al pasar el cursor (`title`). Ingresos en añil y gastos en rosa; la paleta pasó la prueba de daltonismo.
- **Estética sobria con los colores de la empresa**: superficies claras, barra lateral añil, listones rosa, turquesa y cempasúchil como acento, tipografía Space Grotesk. No se llevaron los títulos gigantes ni las sombras duras de la landing.

## Botón en la landing

`volador.html` tiene en el héroe el botón **Probar el sistema (simulación)**. La dirección vive en una sola constante, `URL_SIMULADOR` en `js/main.js`. Apunta al despliegue de Vercel: `https://volador-simulado.vercel.app/login`.

## Cómo correrlo y desplegarlo

```bash
cd simulador
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # reglas de vigencia y acceso
pnpm build
```

En Vercel: importar el repositorio y en **Root Directory** poner `simulador`. El framework se detecta solo. No necesita variables de entorno.

## En qué se aparta del plan

- **Reporte de gastos.** El plan no lo contempla (la contabilidad general queda fuera de la primera versión). Se agregó porque se pidió que cada sucursal tenga su reporte de gastos.
- **Vista "Todas" del jefe.** El plan deja el tablero consolidado para cadenas en una fase posterior; el plan Varias sucursales es sin sincronización entre ellas. En la simulación el dueño puede ver las tres juntas.
- **Torniquete.** Como en el plan, la primera versión no lo controla: la recepción ve el resultado y deja pasar.
- **Huella opcional**, con consentimiento expreso y sin captura para menores. Quien no la registra entra con su número de socio y la recepción compara la foto.

## Qué no se incluyó

Inventario, configuración, facturación, app de socios y modo oscuro. Se agregan si la demo los necesita.

## Verificación

- `pnpm test`: 4 pruebas de vigencia, estados y orden de las reglas de acceso, en verde.
- `pnpm build` sin errores de tipos.
- Recorrido completo con Chrome sin interfaz: login correcto e incorrecto; cambio de sucursal; reporte de gastos por mes; huella con socio activo, vencido, en tolerancia, plan matutino fuera de horario y persona sin registro; renovación y nueva lectura permitida; búsqueda por número inexistente; alta con captura de huella, cobro con descuento (sin motivo no deja cobrar) y entrada del socio nuevo; corte ciego con faltante; ingresos del jefe actualizados; incidencia resuelta en soporte; reiniciar y cerrar sesión. Sin errores en la consola.
- Sin desplazamiento horizontal a 390 px en las siete pantallas.
- No hay linter configurado en este subproyecto.
