[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/InvitarClienteService](../README.md) / InvitarClienteResultado

# Interface: InvitarClienteResultado

Resultado de la invitación: el usuario creado y el link para fijar su contraseña.

## Properties

### usuario

> **usuario**: [`Usuario`](../../../../core/entities/Usuario/classes/Usuario.md)

***

### urlInvitacion

> **urlInvitacion**: `string` \| `null`

`null` cuando la cuenta ya existía y solo se le sumó la empresa (ya tiene contraseña).
