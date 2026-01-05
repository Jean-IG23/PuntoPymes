from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from math import radians, cos, sin, asin, sqrt

# Modelos
from .models import Jornada
from personal.models import Empleado

# Serializers (Asegúrate de que existan en asistencia/serializers.py)
from .serializers import JornadaSerializer 

# ==================================================
# 1. VIEWSET PARA VER HISTORIAL (JornadaViewSet)
# ==================================================
class JornadaViewSet(viewsets.ModelViewSet):
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Si es superusuario, ve todo
        if user.is_superuser:
            return Jornada.objects.all()
        
        try:
            # Empleado normal: Ve solo SUS marcas
            empleado = Empleado.objects.get(email=user.email)
            
            # Si es Gerente/Admin de empresa, podría ver las de su empresa
            if empleado.rol in ['ADMIN', 'SUPERVISOR']:
                return Jornada.objects.filter(empleado__empresa=empleado.empresa)
            
            # Empleado raso: Solo las suyas
            return Jornada.objects.filter(empleado=empleado)
            
        except Empleado.DoesNotExist:
            return Jornada.objects.none()

# ==================================================
# 2. VIEWSET PARA MARCAR (AsistenciaViewSet)
# ==================================================
class AsistenciaViewSet(viewsets.ModelViewSet):
    """
    Este ViewSet se encarga de la lógica de negocio del reloj:
    Cálculo de distancias, validación de geocerca y registro de entrada/salida.
    """
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer
    permission_classes = [IsAuthenticated]

    # Función auxiliar: Calcular distancia en metros (Haversine)
    def calcular_distancia(self, lat1, lon1, lat2, lon2):
        R = 6371000 # Radio de la Tierra en metros
        dLat = radians(lat2 - lat1)
        dLon = radians(lon2 - lon1)
        a = sin(dLat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2)**2
        c = 2 * asin(sqrt(a))
        return R * c

    @action(detail=False, methods=['post'], url_path='marcar')
    def marcar_asistencia(self, request):
        user = request.user
        
        # 1. Identificar Empleado
        try:
            empleado = Empleado.objects.get(email=user.email)
        except Empleado.DoesNotExist:
            return Response({'error': 'No eres un empleado activo.'}, status=400)

        # 2. Obtener datos del GPS del celular
        lat_usuario = request.data.get('lat')
        lng_usuario = request.data.get('lng')

        if not lat_usuario or not lng_usuario:
            return Response({'error': 'Ubicación no detectada. Activa el GPS.'}, status=400)

        # 3. Obtener ubicación de la Sucursal
        if not empleado.departamento or not empleado.departamento.sucursal:
            return Response({'error': 'No tienes una sucursal asignada.'}, status=400)
            
        sucursal = empleado.departamento.sucursal
        
        # 4. Validar Geocerca (Si la sucursal tiene coordenadas)
        if sucursal.latitud and sucursal.longitud:
            try:
                distancia = self.calcular_distancia(
                    float(lat_usuario), float(lng_usuario),
                    float(sucursal.latitud), float(sucursal.longitud)
                )
                
                radio_permitido = sucursal.radio_metros or 50
                
                if distancia > radio_permitido:
                    return Response({
                        'error': f'Estás fuera de rango ({int(distancia)}m). Acércate a la oficina.'
                    }, status=400)
            except Exception as e:
                print(f"Error calculando distancia: {e}")
                # Si falla el cálculo, permitimos marcar por seguridad (fail-open) o bloqueamos
                pass

        # 5. REGISTRAR LA MARCACIÓN
        ahora = timezone.now()
        fecha_hoy = ahora.date()
        hora_actual = ahora.time()

        # Buscamos si ya marcó entrada hoy
        jornada, created = Jornada.objects.get_or_create(
            empleado=empleado,
            fecha=fecha_hoy,
            defaults={'hora_entrada': hora_actual}
        )

        if not created:
            # Si ya existe entrada, marcamos salida
            if not jornada.hora_salida:
                jornada.hora_salida = hora_actual
                jornada.save()
                tipo = 'SALIDA'
            else:
                return Response({'error': 'Ya marcaste salida hoy.'}, status=400)
        else:
            tipo = 'ENTRADA'

        return Response({
            'status': 'OK',
            'tipo': tipo,
            'hora': hora_actual.strftime("%H:%M"),
            'mensaje': f'Marcación de {tipo} exitosa'
        })