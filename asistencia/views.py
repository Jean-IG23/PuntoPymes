from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from math import radians, cos, sin, asin, sqrt

# Modelos
from .models import Jornada
from personal.models import Empleado

# Serializers
from .serializers import JornadaSerializer 

class JornadaViewSet(viewsets.ModelViewSet):
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Jornada.objects.all().order_by('-fecha', '-hora_entrada')
        
        try:
            empleado = Empleado.objects.get(usuario=user)
            # Admin/Gerente ven su empresa, Empleado ve solo lo suyo
            if empleado.rol in ['ADMIN', 'RRHH', 'GERENTE']:
                return Jornada.objects.filter(empresa=empleado.empresa).order_by('-fecha', '-hora_entrada')
            return Jornada.objects.filter(empleado=empleado).order_by('-fecha', '-hora_entrada')
        except Empleado.DoesNotExist:
            return Jornada.objects.none()

class AsistenciaViewSet(viewsets.ViewSet):
    """
    ViewSet lógico para el reloj checador. No necesita queryset base.
    """
    permission_classes = [IsAuthenticated]

    def _haversine(self, lat1, lon1, lat2, lon2):
        """
        Calcula distancia en metros. Convierte inputs a float para evitar errores con Decimal de Django.
        """
        try:
            # CONVERSIÓN CRÍTICA A FLOAT
            lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
            
            R = 6371000 # Radio Tierra en metros
            dLat = radians(lat2 - lat1)
            dLon = radians(lon2 - lon1)
            a = sin(dLat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2)**2
            c = 2 * asin(sqrt(a))
            return R * c
        except (ValueError, TypeError):
            return float('inf') # Si fallan los datos, distancia infinita (bloqueo)

    @action(detail=False, methods=['post'], url_path='marcar')
    def marcar_asistencia(self, request):
        user = request.user
        
        # 1. Identificar Empleado
        try:
            empleado = Empleado.objects.select_related('sucursal', 'empresa').get(usuario=user)
        except Empleado.DoesNotExist:
            return Response({'error': 'No tienes perfil de empleado.'}, status=400)

        # 2. Validar Datos GPS (Frontend envía 'latitud'/'longitud' o 'lat'/'lng')
        lat_user = request.data.get('latitud') or request.data.get('lat')
        lng_user = request.data.get('longitud') or request.data.get('lng')

        if not lat_user or not lng_user:
            return Response({'error': 'Ubicación no detectada. Activa el GPS.'}, status=400)

        # 3. Identificar Sucursal (Lógica robusta)
        # Prioridad: Sucursal asignada directa -> Sucursal del departamento
        sucursal = empleado.sucursal
        if not sucursal and empleado.departamento:
            sucursal = empleado.departamento.sucursal
            
        if not sucursal:
            return Response({'error': 'Error de Configuración: No tienes sucursal asignada.'}, status=400)

        # 4. Validar Geocerca (Solo si la sucursal tiene coordenadas)
        distancia = 0
        if sucursal.latitud and sucursal.longitud:
            distancia = self._haversine(lat_user, lng_user, sucursal.latitud, sucursal.longitud)
            
            # Radio por defecto 100m si no está definido
            radio_max = getattr(sucursal, 'radio_permitido', 100) or 100
            
            print(f"📍 Marcaje: {empleado.nombres} | Distancia: {int(distancia)}m | Max: {radio_max}m") # DEBUG

            if distancia > radio_max:
                return Response({
                    'error': f'Estás fuera de rango ({int(distancia)}m). Acércate a {sucursal.nombre}.'
                }, status=400)
        else:
            print("⚠️ ADVERTENCIA: Sucursal sin coordenadas configuradas. Se permite marcaje libre.")

        # 5. Registrar en Base de Datos
        ahora = timezone.now()
        hoy = ahora.date()
        
        # Buscamos jornada abierta (entrada sin salida)
        jornada = Jornada.objects.filter(
            empleado=empleado, 
            fecha=hoy, 
            hora_salida__isnull=True
        ).first()

        tipo_accion = ""

        if jornada:
            jornada.hora_salida = ahora.time()
            jornada.lat_salida = lat_user
            jornada.lng_salida = lng_user
            jornada.save()
            tipo_accion = "SALIDA"
        else:
            ya_trabajo = Jornada.objects.filter(empleado=empleado, fecha=hoy).exists()
            if ya_trabajo:
                 pass 

            Jornada.objects.create(
                empleado=empleado,
                empresa=empleado.empresa,
                fecha=hoy,
                hora_entrada=ahora.time(),
                # ✅ GUARDAR GPS ENTRADA
                lat_entrada=lat_user,
                lng_entrada=lng_user,
                estado='INCOMPLETA'
            )
            tipo_accion = "ENTRADA"

        return Response({
            'mensaje': f'✅ {tipo_accion} registrada a las {ahora.strftime("%H:%M")}',
            'distancia': f"{int(distancia)} metros",
            'sucursal': sucursal.nombre
        })