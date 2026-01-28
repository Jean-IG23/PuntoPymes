# Diagrama de Casos de Uso - Nómina

```mermaid
%% Módulo 6: Nómina
usecaseDiagram
actor ADMIN
actor RRHH
actor EMPLEADO
actor Sistema
actor Contabilidad

RRHH --> (Crear nómina mensual)
RRHH --> (Aprobar nómina)
ADMIN --> (Configurar conceptos de pago)
Sistema --> (Calcular horas extras)
Sistema --> (Aplicar deducciones y bonificaciones)
EMPLEADO --> (Descargar recibo de nómina)
Contabilidad --> (Exportar reporte nómina para contabilidad)
Sistema --> (Generar archivos PDF/XML de recibos)
```
