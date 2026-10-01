# 2026-09-30 · Ajustes de alcance y estética de gimnasio

Segunda pasada sobre la landing, a pedido del usuario.

## Qué se quitó y por qué

- **Tarjeta RFID y lo que se deriva de ella.** El acceso será solo con huella. Se quitaron las menciones a tarjetas, el antipassback y el caso "tarjeta prestada" del simulador. El simulador ahora revisa: huella reconocida, membresía vigente, horario y sucursal, y adeudo. El caso de una huella desconocida usa el código `BIO_SIN_COINCIDENCIA`.
- **Torniquete.** El mecanismo físico de entrada lo resuelve cada gimnasio con su proveedor, así que la página ya no lo nombra. Se habla de "la entrada" y del "lector de huella". Las clases CSS `torniquete__*` pasaron a llamarse `lector__*`.
- **Facturación.** Se quitaron CFDI, PAC, timbrado y factura global. Su lugar en los módulos lo ocupa **Tienda e inventario**, que ya estaba en el alcance del punto de venta. En el diagrama sin internet, "Timbrar facturas" se cambió por "Inscribir socios nuevos", y la nube muestra "Planes y precios".
- **Hoja de ruta.** Ya no menciona RFID ni QR. La app de socios se describe como renovaciones y avisos.

## Conflicto con el plan

El plan (`docs/contexto/04-huella.md`) dice que la huella es opcional, solo para adultos y **nunca el único método**. También usa tarjeta en la primera visita a otra sucursal. La landing ahora presenta la huella como el método de acceso, y deja el **acceso manual en recepción** como alternativa para menores y para quien no dé su consentimiento. Mientras el plan no se actualice, las dos cosas no coinciden.

## Estética más cercana a un gimnasio

- **Fotos de gimnasio** (Wikimedia Commons, créditos en el pie): una en el héroe y otra en la sección del problema. La tarjeta del producto en `index.html` también cambió de foto. Se borró `voladores-palo.jpg`, que ya no se usaba. Los voladores siguen en la hoja de ruta.
- **Nueva sección "Hecho para tu gimnasio"**: tres fotos (sala de pesas, box y funcional, gimnasio de barrio).
- **Adornos de gimnasio en clave folclórica** (`assets/svg/`): `mancuerna.svg`, `pesa-rusa.svg` (con banda escalonada) y `disco.svg`. La mancuerna aparece dentro del título del héroe y reemplaza a las estrellas en la cinta. El sello del héroe ahora parece un disco de pesas.
- **Nuevo icono de huella** en la tarjeta de acceso.

## Verificación

- Capturas a 1440 px y 390 px.
- El simulador calcula los estilos correctos: veredicto rojo y botón seleccionado en amarillo.
- `node --check js/main.js` sin errores.
- Una búsqueda de "torniquete", "rfid", "antipassback", "factura", "cfdi", "timbr", "PAC" y "qr" no encuentra nada en HTML, CSS ni JS. La única "tarjeta" que queda es el cobro con tarjeta bancaria, que es un método de pago.
