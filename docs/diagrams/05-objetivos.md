# Diagrama de Casos de Uso - Gestión de Objetivos

```mermaid
%% Módulo 5: Gestión de Objetivos
usecaseDiagram
actor ADMIN
actor RRHH
actor GERENTE
actor EMPLEADO
actor Sistema

ADMIN --> (Crear objetivo global)
RRHH --> (Asignar objetivo a empleado/departamento)
GERENTE --> (Revisar progreso de su equipo)
EMPLEADO --> (Reportar progreso)
EMPLEADO --> (Solicitar retroalimentación)
RRHH --> (Evaluar desempeño y generar score)

Sistema --> (Calcular % cumplimiento)
Sistema --> (Generar reportes de objetivos)
```
