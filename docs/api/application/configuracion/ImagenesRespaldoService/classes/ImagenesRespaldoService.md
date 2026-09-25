[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ImagenesRespaldoService](../README.md) / ImagenesRespaldoService

# Class: ImagenesRespaldoService

Las imágenes de los tickets (pegadas en la descripción o adjuntas) no van en el JSON del
respaldo: viven aparte, en `tickets_adjuntos`. Al respaldar se avisa qué tickets tienen y se
pueden bajar en un .zip, cada una nombrada con el folio de su ticket (`ticket-1059-1.png`).

## Constructors

### Constructor

> **new ImagenesRespaldoService**(`adjuntos`, `tickets`): `ImagenesRespaldoService`

#### Parameters

##### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

##### tickets

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

#### Returns

`ImagenesRespaldoService`

## Methods

### resumen()

> **resumen**(`actor`): `Promise`\<[`ResumenImagenes`](../interfaces/ResumenImagenes.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`ResumenImagenes`](../interfaces/ResumenImagenes.md)\>

***

### zip()

> **zip**(`actor`, `soloFolios?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Zip con las imágenes de los folios indicados (todos, si no se indica ninguno).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### soloFolios?

readonly `number`[]

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>
