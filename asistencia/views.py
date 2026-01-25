from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from core.models import ConfiguracionNomina
from .models import Jornada, EventoAsistencia
from personal.models import Empleado
from .serializers import JornadaSerializer, EventoAsistenciaSerializer
from .utils import calcular_distancia, analizar_entrada, analizar_salida
from django.utils import timezone
from datetime import datetime
from asistencia.models import Jornada
from django.db.models import Sum
from rest_framework.decorators import action
import openpyxl
from core.permissions import get_empleado_o_none
# =========================================================================
# 1. VIEWSET DE JORNADAS (NÓMINA)
# =========================================================================
class JornadaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de jornadas/asistencia con Row-Level Security.
    
    REGLAS DE ACCESO:
    - SUPERADMIN: Ve todas las jornadas
    - ADMIN/RRHH: Ven todas las jornadas de su empresa
    - GERENTE: Solo ve jornadas de empleados de su sucursal
    - EMPLEADO: Solo ve sus propias jornadas
    """
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Jornada.objects.all().order_by('-fecha', '-entrada')

        # 1. SEGURIDAD - Row-Level Security
        empleado = get_empleado_o_none(user)
        
        if user.is_superuser:
            # SuperUser obtiene jornadas de su empresa
            from core.views import get_empresa_usuario
            empresa = get_empresa_usuario(user)
            if empresa:
                queryset = queryset.filter(empresa=empresa)
        elif empleado:
            # Filtrar por empresa primero
            queryset = queryset.filter(empresa=empleado.empresa)
            
            # Aplicar Row-Level Security según rol
            if empleado.rol in ['ADMIN', 'RRHH']:
                # ADMIN/RRHH ven todas las jornadas de su empresa
                pass
            elif empleado.rol == 'GERENTE':
                # GERENTE: solo jornadas de empleados de su sucursal
                if empleado.sucursal:
                    queryset = queryset.filter(empleado__sucursal=empleado.sucursal)
                else:
                    return Jornada.objects.none()
            else:
                # EMPLEADO: solo sus propias jornadas
                queryset = queryset.filter(empleado=empleado)
        else:
            return Jornada.objects.none()

        # 2. FILTROS DE FECHA
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')
        empleado_id = self.request.query_params.get('empleado')

        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(fecha__range=[fecha_inicio, fecha_fin])
        
        # Validar que el empleado_id sea accesible para el usuario
        if empleado_id:
            # Si es GERENTE, verificar que el empleado pertenece a su sucursal
            if empleado and empleado.rol == 'GERENTE':
                try:
                    emp_filtro = Empleado.objects.get(id=empleado_id)
                    if emp_filtro.sucursal_id == empleado.sucursal_id:
                        queryset = queryset.filter(empleado_id=empleado_id)
                    # Si no es de su sucursal, ignoramos el filtro
                except Empleado.DoesNotExist:
                    pass
            else:
                queryset = queryset.filter(empleado_id=empleado_id)

        return queryset
    
    @action(detail=False, methods=['get'])
    def exportar_excel(self, request):
        try:
            # 1. Reutilizamos los filtros del get_queryset para que baje LO MISMO que se ve en pantalla
            jornadas = self.filter_queryset(self.get_queryset())

            # 2. Crear el libro de Excel
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Reporte Asistencia"

            # 3. Encabezados
            headers = ["Empleado", "Fecha", "Entrada", "Salida", "Horas Trab.", "Estado", "Nota"]
            ws.append(headers)

            # 4. Llenar filas
            for j in jornadas:
                nombre = f"{j.empleado.nombres} {j.empleado.apellidos}"
                fecha = j.fecha.strftime('%d/%m/%Y')
                entrada = j.entrada.strftime('%H:%M:%S') if j.entrada else '--'
                salida = j.salida.strftime('%H:%M:%S') if j.salida else '--'
                estado = "ATRASO" if j.es_atraso else "PUNTUAL"
                
                ws.append([
                    nombre, 
                    fecha, 
                    entrada, 
                    salida, 
                    j.horas_trabajadas, 
                    estado,
                    f"{j.minutos_atraso} min tarde" if j.es_atraso else ""
                ])

            # 5. Ajustar ancho de columnas (Estético)
            for col in ['A', 'B', 'C', 'D', 'E', 'F']:
                ws.column_dimensions[col].width = 15
            ws.column_dimensions['A'].width = 30

            # 6. Preparar respuesta HTTP como archivo
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = f'attachment; filename=Reporte_Asistencia_{request.user.username}.xlsx'
            
            wb.save(response)
            return response
        except Exception as e:
            import traceback
            print(f"ERROR en exportar_excel: {e}")
            print(traceback.format_exc())
            return Response({'error': f'Error al exportar: {str(e)}'}, status=500)
# =========================================================================
# 2. VIEWSET DE EVENTOS CRUDOS (BITÁCORA) - Antes llamado AsistenciaViewSet
# =========================================================================
class EventoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EventoAsistencia.objects.all()
    serializer_class = EventoAsistenciaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser: return EventoAsistencia.objects.all()

        try:
            empleado = Empleado.objects.get(usuario=user)
            # Solo Admins y RRHH deberían ver la bitácora técnica
            if empleado.rol in ['ADMIN', 'RRHH']:
                return EventoAsistencia.objects.filter(empresa=empleado.empresa).order_by('-timestamp')
            return EventoAsistencia.objects.filter(empleado=empleado).order_by('-timestamp')
        except:
            return EventoAsistencia.objects.none()

# =========================================================================
# 3. API PARA MARCAR (LOGICA GPS)
# =========================================================================
class MarcarAsistenciaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        if not lat or not lng:
            return Response({'error': 'Coordenadas GPS requeridas.'}, status=400)

        try:
            empleado = Empleado.objects.get(usuario=usuario)
        except Empleado.DoesNotExist:
            return Response({'error': 'No tienes perfil de empleado.'}, status=403)

        # 1. VALIDACIÓN GEOCERCA
        sucursal = empleado.sucursal
        if sucursal and sucursal.latitud and sucursal.longitud:
            distancia = calcular_distancia(lat, lng, sucursal.latitud, sucursal.longitud)
            radio = sucursal.radio_metros if sucursal.radio_metros else 50
            
            if distancia > radio:
                EventoAsistencia.objects.create(
                    empresa=empleado.empresa,
                    empleado=empleado,
                    tipo='ENTRADA', 
                    latitud=lat, longitud=lng,
                    exitoso=False,
                    error_motivo=f'Fuera de rango ({int(distancia)}m)'
                )
                return Response({
                    'error': f'Estás fuera del rango permitido ({int(distancia)}m). Acércate a {sucursal.nombre}.'
                }, status=400)

        ahora = timezone.now()
        hoy = ahora.date()

        # 2. LOGICA INTELIGENTE DE MARCAJE
        
        # A) Buscamos si ya tiene una jornada HOY
        jornada_hoy = Jornada.objects.filter(empleado=empleado, fecha=hoy).first()

        # CASO 1: YA MARCÓ ENTRADA PERO NO SALIDA (CERRAR TURNO)
        if jornada_hoy and jornada_hoy.estado == 'ABIERTA':
            # --- ES SALIDA ---
            EventoAsistencia.objects.create(
                empresa=empleado.empresa, empleado=empleado, tipo='SALIDA',
                latitud=lat, longitud=lng, exitoso=True
            )

            trabajadas, extras = analizar_salida(empleado, jornada_hoy, ahora)
            
            jornada_hoy.salida = ahora
            jornada_hoy.horas_trabajadas = trabajadas
            jornada_hoy.horas_extras = extras
            jornada_hoy.estado = 'CERRADA'
            jornada_hoy.save()

            return Response({'mensaje': '¡Jornada finalizada!', 'tipo': 'SALIDA', 'hora': ahora})

        # CASO 2: YA TIENE JORNADA CERRADA HOY (INTENTO DE DOBLE TURNO)
        elif jornada_hoy and jornada_hoy.estado == 'CERRADA':
            return Response({
                'error': 'Ya registraste tu jornada completa el día de hoy.'
            }, status=400)

        # CASO 3: NO TIENE JORNADA HOY (ABRIR TURNO)
        else:
            # --- ES ENTRADA ---
            EventoAsistencia.objects.create(
                empresa=empleado.empresa, empleado=empleado, tipo='ENTRADA',
                latitud=lat, longitud=lng, exitoso=True
            )
            
            es_atraso, minutos = analizar_entrada(empleado, ahora)
            
            try:
                Jornada.objects.create(
                    empresa=empleado.empresa,
                    empleado=empleado,
                    fecha=hoy,
                    entrada=ahora,
                    es_atraso=es_atraso,
                    minutos_atraso=minutos,
                    estado='ABIERTA'
                )
                return Response({'mensaje': '¡Entrada registrada con éxito!', 'tipo': 'ENTRADA', 'hora': ahora})
            except Exception as e:
                # Si por alguna razón de concurrencia falla (race condition)
                return Response({'error': 'Error al crear jornada: Ya existe un registro.'}, status=400)
class CalculoNominaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Obtener Fechas del Rango (Query Params)
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        if not fecha_inicio or not fecha_fin:
            # Por defecto: Mes actual
            hoy = timezone.now()
            fecha_inicio = f"{hoy.year}-{hoy.month:02d}-01"
            # Truco para fin de mes
            import calendar
            last_day = calendar.monthrange(hoy.year, hoy.month)[1]
            fecha_fin = f"{hoy.year}-{hoy.month:02d}-{last_day}"

        # 2. Identificar la Empresa y su Configuración
        try:
            empleado_request = Empleado.objects.get(usuario=user)
            empresa = empleado_request.empresa
            
            # Intentamos obtener la configuración, si no existe, usamos valores default
            config = getattr(empresa, 'config_nomina', None)
            
            # Valores por defecto si no ha configurado nada
            divisor = config.divisor_hora_mensual if config else 240
            factor_he = config.factor_he_diurna if config else 1.5
            descontar_atrasos = config.descontar_atrasos if config else True
            moneda = config.moneda if config else 'USD'

        except Empleado.DoesNotExist:
            return Response({'error': 'Usuario no autorizado'}, status=403)

        # 3. Filtrar Empleados a Calcular
        # (Si es Admin ve todos, si es Gerente ve sus sucursales...)
        empleados = Empleado.objects.filter(empresa=empresa, estado='ACTIVO')

        reporte_nomina = []

        for emp in empleados:
            # A. Obtener Jornadas del periodo
            jornadas = Jornada.objects.filter(
                empleado=emp,
                fecha__range=[fecha_inicio, fecha_fin]
            )

            # B. Sumatorias
            total_horas_trabajadas = jornadas.aggregate(Sum('horas_trabajadas'))['horas_trabajadas__sum'] or 0
            total_horas_extras = jornadas.aggregate(Sum('horas_extras'))['horas_extras__sum'] or 0
            total_minutos_atraso = jornadas.aggregate(Sum('minutos_atraso'))['minutos_atraso__sum'] or 0

            # C. Cálculos Financieros
            sueldo_base = float(emp.sueldo)
            valor_hora = sueldo_base / divisor
            
            # Pago por Extras
            pago_extras = float(total_horas_extras) * valor_hora * float(factor_he)
            
            # Descuento por Atrasos
            descuento_atrasos = 0
            if descontar_atrasos:
                # Convertimos minutos a horas decimales para multiplicar por valor_hora
                horas_perdidas = float(total_minutos_atraso) / 60
                descuento_atrasos = horas_perdidas * valor_hora

            # Total Neto Estimado
            # Nota: Esto es una estimación PRE-Impuestos de ley
            total_pagar = sueldo_base + pago_extras - descuento_atrasos

            reporte_nomina.append({
                'empleado_id': emp.id,
                'nombre': f"{emp.usuario.first_name} {emp.usuario.last_name}",
                'puesto': emp.puesto.nombre if emp.puesto else 'N/A',
                'sueldo_base': round(sueldo_base, 2),
                'horas_trabajadas': round(total_horas_trabajadas, 2),
                'horas_extras': round(total_horas_extras, 2),
                'pago_extras': round(pago_extras, 2),
                'minutos_atraso': total_minutos_atraso,
                'descuento_atrasos': round(descuento_atrasos, 2),
                'total_a_pagar': round(total_pagar, 2),
                'moneda': moneda
            })

        return Response({
            'periodo': {'inicio': fecha_inicio, 'fin': fecha_fin},
            'datos': reporte_nomina
        })

# =========================================================================
# 4. API PARA REPORTES DE ASISTENCIA Y ESTADÍSTICAS
# =========================================================================
class ReportesAsistenciaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Obtener empleado del usuario
        try:
            empleado_request = Empleado.objects.get(usuario=user)
            empresa = empleado_request.empresa
        except Empleado.DoesNotExist:
            return Response({'error': 'Usuario no autorizado'}, status=403)

        # Filtros de fecha
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        if not fecha_inicio or not fecha_fin:
            # Por defecto: Mes actual
            hoy = timezone.now()
            fecha_inicio = f"{hoy.year}-{hoy.month:02d}-01"
            last_day = calendar.monthrange(hoy.year, hoy.month)[1]
            fecha_fin = f"{hoy.year}-{hoy.month:02d}-{last_day}"

        # Estadísticas generales
        jornadas_total = Jornada.objects.filter(
            empresa=empresa,
            fecha__range=[fecha_inicio, fecha_fin]
        )

        # Aplicar filtros de RLS según rol
        if empleado_request.rol in ['ADMIN', 'RRHH']:
            # Pueden ver todo
            pass
        elif empleado_request.rol == 'GERENTE':
            # Solo su sucursal
            if empleado_request.sucursal:
                jornadas_total = jornadas_total.filter(empleado__sucursal=empleado_request.sucursal)
            else:
                jornadas_total = Jornada.objects.none()
        else:
            # Empleado solo ve sus propias jornadas
            jornadas_total = jornadas_total.filter(empleado=empleado_request)

        # Cálculos de estadísticas
        total_jornadas = jornadas_total.count()
        total_atrasos = jornadas_total.filter(es_atraso=True).count()
        total_ausencias = jornadas_total.filter(estado='AUSENTE').count()
        total_justificadas = jornadas_total.filter(estado='JUSTIFICADA').count()

        # Porcentaje de puntualidad
        jornadas_completadas = jornadas_total.exclude(estado__in=['AUSENTE', 'ERROR'])
        puntualidad = 0
        if jornadas_completadas.count() > 0:
            jornadas_puntuales = jornadas_completadas.filter(es_atraso=False).count()
            puntualidad = round((jornadas_puntuales / jornadas_completadas.count()) * 100, 1)

        # Estadísticas por empleado (solo para ADMIN/RRHH)
        empleados_stats = []
        if empleado_request.rol in ['ADMIN', 'RRHH']:
            empleados_activos = Empleado.objects.filter(empresa=empresa, estado='ACTIVO')

            for emp in empleados_activos:
                emp_jornadas = jornadas_total.filter(empleado=emp)
                emp_atrasos = emp_jornadas.filter(es_atraso=True).count()
                emp_ausencias = emp_jornadas.filter(estado='AUSENTE').count()

                empleados_stats.append({
                    'id': emp.id,
                    'nombre': f"{emp.nombres} {emp.apellidos}",
                    'jornadas': emp_jornadas.count(),
                    'atrasos': emp_atrasos,
                    'ausencias': emp_ausencias,
                    'sucursal': emp.sucursal.nombre if emp.sucursal else 'Sin sucursal'
                })

        return Response({
            'periodo': {'inicio': fecha_inicio, 'fin': fecha_fin},
            'estadisticas_generales': {
                'total_jornadas': total_jornadas,
                'total_atrasos': total_atrasos,
                'total_ausencias': total_ausencias,
                'total_justificadas': total_justificadas,
                'porcentaje_puntualidad': puntualidad
            },
            'empleados_stats': empleados_stats
        })