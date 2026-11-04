[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/versiones/VersionesContpaqiService](../README.md) / VersionesContpaqiService

# Class: VersionesContpaqiService

Versiones publicadas en la página de descargas de CONTPAQi: las lee, guarda lo último por
sistema y dice cuáles de las registradas ya tienen versión nueva. Nunca guarda versiones
del mercado por su cuenta: eso lo confirma una persona en "Versiones del mercado".

## Constructors

### Constructor

> **new VersionesContpaqiService**(`configuracion`, `versiones`, `descargas`, `clock`, `logger`): `VersionesContpaqiService`

#### Parameters

##### configuracion

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### versiones

[`IVersionRepository`](../../../../core/ports/repositories/IVersionRepository/interfaces/IVersionRepository.md)

##### descargas

[`IDescargasContpaqi`](../../../../core/ports/services/IDescargasContpaqi/interfaces/IDescargasContpaqi.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`VersionesContpaqiService`

## Methods

### estado()

> **estado**(): `Promise`\<[`EstadoVersionesContpaqi`](../../../../core/entities/DescargasContpaqi/interfaces/EstadoVersionesContpaqi.md)\>

#### Returns

`Promise`\<[`EstadoVersionesContpaqi`](../../../../core/entities/DescargasContpaqi/interfaces/EstadoVersionesContpaqi.md)\>

***

### consultar()

> **consultar**(): `Promise`\<[`EstadoVersionesContpaqi`](../../../../core/entities/DescargasContpaqi/interfaces/EstadoVersionesContpaqi.md)\>

Lee la página ahora mismo y guarda lo último de cada sistema (catálogo + ya registrados).

#### Returns

`Promise`\<[`EstadoVersionesContpaqi`](../../../../core/entities/DescargasContpaqi/interfaces/EstadoVersionesContpaqi.md)\>

***

### revisarSiToca()

> **revisarSiToca**(): `Promise`\<\{ `revisado`: `boolean`; `novedades`: `number`; `error?`: `string`; \}\>

Para el cron: lee la página si pasó un día desde el último intento.

#### Returns

`Promise`\<\{ `revisado`: `boolean`; `novedades`: `number`; `error?`: `string`; \}\>

***

### novedades()

> **novedades**(`estado?`): `Promise`\<[`NovedadVersion`](../interfaces/NovedadVersion.md)[]\>

Sistemas registrados con una versión menor a la última publicada. Los que no tienen versión
registrada no cuentan (si no se lleva ese sistema, el aviso del menú no se quitaría nunca).

#### Parameters

##### estado?

[`EstadoVersionesContpaqi`](../../../../core/entities/DescargasContpaqi/interfaces/EstadoVersionesContpaqi.md)

#### Returns

`Promise`\<[`NovedadVersion`](../interfaces/NovedadVersion.md)[]\>
