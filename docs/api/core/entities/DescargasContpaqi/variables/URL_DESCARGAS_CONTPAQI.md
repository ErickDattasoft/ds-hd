[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/DescargasContpaqi](../README.md) / URL\_DESCARGAS\_CONTPAQI

# Variable: URL\_DESCARGAS\_CONTPAQI

> `const` **URL\_DESCARGAS\_CONTPAQI**: `"https://old.contpaqi.com/descargas"` = `'https://old.contpaqi.com/descargas'`

Lectura de la página pública de descargas de CONTPAQi (https://old.contpaqi.com/descargas)
para proponer las versiones del mercado sin capturarlas a mano.

La página es un solo HTML (Zoho Sites) con un bloque por publicación: un `<h2>` con el
nombre y la versión, "Versión: …", "Publicado: …", el botón de descarga y, en las versiones
normales, la carta técnica. Cada bloque va del `<h2>` al siguiente.
