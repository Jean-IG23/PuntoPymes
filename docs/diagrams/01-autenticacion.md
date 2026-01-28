# Diagrama de Casos de Uso - Autenticación y Autorización

```mermaid
%% Módulo 1: Autenticación y Autorización
usecaseDiagram
actor Empleado
actor Gerente
actor RRHH
actor ADMIN
actor SUPERADMIN
actor Sistema

Empleado --> (Login con email y contraseña)
Empleado --> (Cerrar sesión)
Empleado --> (Recuperar contraseña)
Empleado --> (Renovar sesión con refresh token)

ADMIN --> (Forzar cambio de contraseña)
RRHH --> (Crear/Registrar usuario)
SUPERADMIN --> (Administrar cuentas globales)

Sistema --> (Generar Token JWT)
Sistema --> (Validar Token en peticiones)
```
