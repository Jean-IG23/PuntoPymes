# Diagrama de Casos de Uso - Asistencia

```mermaid
%% Módulo 3: Asistencia
usecaseDiagram
actor EMPLEADO
actor GERENTE
actor RRHH
actor ADMIN
actor Sistema

EMPLEADO --> (Registrar entrada)
EMPLEADO --> (Registrar salida)
EMPLEADO --> (Ver historial de asistencia)
GERENTE --> (Ver asistencia de su sucursal)
RRHH --> (Corregir registros manualmente)
ADMIN --> (Configurar reglas de geolocalización)

Sistema --> (Calcular horas trabajadas)
Sistema --> (Detectar atrasos y ausencias)
Sistema --> (Generar reportes de asistencia)
```
