[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/AdjuntoTicket](../README.md) / MAX\_ADJUNTO\_BYTES

# Variable: MAX\_ADJUNTO\_BYTES

> `const` **MAX\_ADJUNTO\_BYTES**: `number`

Tope de tamaño por archivo. Un doc de Firestore no puede pasar de 1 MiB y base64 infla ~33 %,
así que 700 KiB de archivo original deja margen para el prefijo y los metadatos.
