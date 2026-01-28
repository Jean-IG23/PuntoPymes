# Diagrama de Casos de Uso - Gestión de Empleados

```mermaid
%% Módulo 2: Gestión de Empleados
usecaseDiagram
actor ADMIN
actor RRHH
actor GERENTE
actor EMPLEADO
actor Sistema

ADMIN --> (Crear empleado)
ADMIN --> (Editar empleado)
ADMIN --> (Eliminar empleado - soft delete)
ADMIN --> (Asignar rol)
RRHH --> (Editar datos laborales)
RRHH --> (Ver historial de roles)
GERENTE --> (Ver empleados sucursal)
EMPLEADO --> (Ver/Editar su perfil)
EMPLEADO --> (Subir foto de perfil)

Sistema --> (Validar unicidad email/documento)
Sistema --> (Generar notificación bienvenida)
```
