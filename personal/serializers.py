from rest_framework import serializers
from .models import Empleado, Contrato, DocumentoEmpleado, EventoAsistencia, SolicitudAusencia, TipoAusencia, Jornada
from core.models import Departamento, Puesto # Importar modelos necesarios

# 1. EMPLEADO (Con Validación de Áreas)
class EmpleadoSerializer(serializers.ModelSerializer):
    # Campos de lectura para mostrar nombres en el frontend
    nombre_empresa = serializers.CharField(source='empresa.razon_social', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True)
    nombre_puesto = serializers.CharField(source='puesto.nombre', read_only=True)

    class Meta:
        model = Empleado
        fields = '__all__'

    def validate(self, data):
        """
        Validación personalizada para asegurar compatibilidad entre Puesto y Departamento.
        """
        depto = data.get('departamento') # El departamento destino
        puesto = data.get('puesto')      # El cargo a ocupar

        # Solo validamos si ambos campos están presentes
        if depto and puesto:
            
            # CASO 1: Puesto Universal (Comodín)
            # Si el puesto NO tiene área asignada (es None), puede ir a cualquier departamento.
            if not puesto.area:
                return data

            # CASO 2: Validación Estricta
            # Si el puesto TIENE área, el departamento debe tener LA MISMA área.
            if depto.area and puesto.area != depto.area:
                raise serializers.ValidationError({
                    'puesto': f"Error de Área: El cargo '{puesto.nombre}' pertenece al área '{puesto.area.nombre}', "
                              f"pero intentas asignarlo al departamento '{depto.nombre}' ({depto.area.nombre})."
                })
        
        return data

# ... (El resto de serializers: Contrato, Documento, etc. se mantienen igual) ...

class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = '__all__'

class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoEmpleado
        fields = '__all__'

class EventoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoAsistencia
        fields = '__all__'

class SolicitudSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudAusencia
        fields = '__all__'

class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAusencia
        fields = '__all__'

class JornadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Jornada
        fields = '__all__'