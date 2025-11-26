from rest_framework import serializers
from .models import Empleado, Contrato, DocumentoEmpleado, EventoAsistencia, Jornada, SolicitudAusencia, TipoAusencia

class EmpleadoSerializer(serializers.ModelSerializer):
    # --- ESTAS LÍNEAS SON LAS QUE FALTAN ---
    nombre_empresa = serializers.CharField(source='empresa.razon_social', read_only=True)
    nombre_sucursal = serializers.CharField(source='departamento.sucursal.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True)
    nombre_puesto = serializers.CharField(source='puesto.nombre', read_only=True)
    # ---------------------------------------

    class Meta:
        model = Empleado
        fields = '__all__'

# 2. CONTRATO
class ContratoSerializer(serializers.ModelSerializer):
    nombre_empleado = serializers.CharField(source='empleado.__str__', read_only=True)
    
    class Meta:
        model = Contrato
        fields = '__all__'

# 3. DOCUMENTOS (PDFs)
class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoEmpleado
        fields = '__all__'

# 4. ASISTENCIA (Marcaciones)
class EventoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoAsistencia
        fields = '__all__'

# 5. JORNADA (Cálculos Diarios)
class JornadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Jornada
        fields = '__all__'

# 6. CATÁLOGO DE AUSENCIAS
class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAusencia
        fields = '__all__'

# 7. SOLICITUDES DE VACACIONES
class SolicitudSerializer(serializers.ModelSerializer):
    nombre_empleado = serializers.CharField(source='empleado.__str__', read_only=True)
    tipo_nombre = serializers.CharField(source='tipo_ausencia.nombre', read_only=True)

    class Meta:
        model = SolicitudAusencia
        fields = '__all__'