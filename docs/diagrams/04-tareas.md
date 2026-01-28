# Diagrama de Casos de Uso - Gestión de Tareas

```mermaid
%% Módulo 4: Gestión de Tareas
usecaseDiagram
actor GERENTE
actor RRHH
actor ADMIN
actor EMPLEADO
actor Sistema

GERENTE --> (Crear tarea)
GERENTE --> (Asignar tarea a empleado)
RRHH --> (Crear/Asignar tarea)
ADMIN --> (Eliminar/Cancelar tarea)
EMPLEADO --> (Ver mis tareas)
EMPLEADO --> (Actualizar estado de tarea)
EMPLEADO --> (Adjuntar archivo a tarea)

Sistema --> (Enviar notificaciones)
Sistema --> (Generar reportes de tareas)
```
