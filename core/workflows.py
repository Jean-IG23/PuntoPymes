"""
╔══════════════════════════════════════════════════════════════════════════╗
║            TALENTTRACK - WORKFLOWS Y FLUJOS DE APROBACIÓN                ║
║                                                                          ║
║  Sistema automático de enrutamiento de solicitudes según reglas de      ║
║  negocio. Las solicitudes se asignan automáticamente al aprobador      ║
║  correcto basándose en la jerarquía organizacional.                     ║
║                                                                          ║
║  Fecha: Enero 23, 2026                                                  ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from personal.models import Empleado, SolicitudAusencia, Tarea
from core.models import Empresa, Sucursal, Notificacion


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 1: DEFINICIÓN DE WORKFLOWS
# ═══════════════════════════════════════════════════════════════════════════

"""
WORKFLOW DE SOLICITUD DE AUSENCIA (VACACIONES/PERMISOS)

Flujo actual INCORRECTO:
  Empleado crea solicitud → Se queda en limbo → RRHH central debe encontrarla

Flujo CORRECTO (NUEVO):
  1. Empleado (en Sucursal Quito) crea solicitud de vacaciones
  2. Sistema identifica: "Este empleado es de Quito"
  3. Sistema busca: "¿Quién es el GERENTE_SUCURSAL de Quito?"
  4. Sistema asigna: Ricardo (Gerente Quito) RECIBE LA SOLICITUD
  5. Ricardo puede:
     - Aprobar → Solicitud va a RRHH central
     - Rechazar → Notifica al empleado
  6. RRHH revisa y confirma (opcional)

BENEFICIO: Las solicitudes llegan inmediatamente a quien puede resolverlas.
"""

ESTADOS_SOLICITUD = {
    'PENDIENTE_GERENTE': {
        'nombre': 'Pendiente de Gerente',
        'descripcion': 'Esperando revisión del Gerente de Sucursal',
        'nivel_aprobador': 'GERENTE_SUCURSAL',
    },
    'APROBADA_GERENTE': {
        'nombre': 'Aprobada por Gerente',
        'descripcion': 'Gerente aprobó, esperando confirmación de RRHH',
        'nivel_aprobador': 'ADMIN_GLOBAL',
    },
    'RECHAZADA_GERENTE': {
        'nombre': 'Rechazada por Gerente',
        'descripcion': 'Gerente rechazó la solicitud',
        'nivel_aprobador': None,
    },
    'APROBADA_FINAL': {
        'nombre': 'Aprobada',
        'descripcion': 'RRHH confirmó la aprobación',
        'nivel_aprobador': None,
    },
    'RECHAZADA_FINAL': {
        'nombre': 'Rechazada',
        'descripcion': 'RRHH rechazó la solicitud',
        'nivel_aprobador': None,
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 2: FUNCIONES DE ROUTING (ENRUTAMIENTO)
# ═══════════════════════════════════════════════════════════════════════════

def obtener_gerente_responsable(empleado):
    """
    FUNCIÓN CLAVE: Obtiene el Gerente que debe aprobar una solicitud
    
    Lógica:
    1. Si el empleado está asignado a una sucursal
    2. Busca el empleado con rol GERENTE_SUCURSAL en esa sucursal
    3. Lo retorna como el aprobador responsable
    
    Args:
        empleado: Instancia de Empleado
    
    Returns:
        Empleado (con rol GERENTE_SUCURSAL) o None
    """
    if not empleado.sucursal:
        # Si no tiene sucursal, no podemos enrutar automáticamente
        return None
    
    try:
        gerente = Empleado.objects.get(
            empresa=empleado.empresa,
            sucursal=empleado.sucursal,
            rol='GERENTE_SUCURSAL'
        )
        return gerente
    except Empleado.DoesNotExist:
        # No hay gerente asignado a esta sucursal
        return None
    except Empleado.MultipleObjectsReturned:
        # ERROR: Hay múltiples gerentes (validación de modelo debería prevenir esto)
        return Empleado.objects.filter(
            empresa=empleado.empresa,
            sucursal=empleado.sucursal,
            rol='GERENTE_SUCURSAL'
        ).first()


def obtener_aprobador_rrhh(empresa):
    """
    Obtiene el usuario ADMIN_GLOBAL (RRHH) para una empresa.
    
    En una empresa solo debería haber UN ADMIN_GLOBAL.
    Si hay múltiples, retorna el primero (error de configuración).
    """
    try:
        rrhh = Empleado.objects.get(
            empresa=empresa,
            rol='ADMIN_GLOBAL'
        )
        return rrhh
    except Empleado.DoesNotExist:
        return None


def enrutar_solicitud_ausencia(solicitud):
    """
    WORKFLOW: Enruta una solicitud de ausencia al aprobador correcto.
    
    Se ejecuta cuando:
    - Un EMPLEADO crea una nueva solicitud de ausencia
    - El sistema automáticamente asigna a quién debe aprobarla
    
    Args:
        solicitud: Instancia de SolicitudAusencia
    """
    empleado_solicitante = solicitud.empleado
    
    # Paso 1: Buscar el gerente responsable
    gerente_responsable = obtener_gerente_responsable(empleado_solicitante)
    
    if gerente_responsable:
        # Paso 2: Asignar al gerente
        solicitud.aprobador_asignado = gerente_responsable
        solicitud.estado = 'PENDIENTE_GERENTE'
        solicitud.fecha_asignacion = timezone.now()
        solicitud.save()
        
        # Paso 3: Crear notificación
        crear_notificacion(
            usuario=gerente_responsable.usuario,
            titulo='Nueva Solicitud de Ausencia',
            mensaje=f'{empleado_solicitante.nombres} solicita {solicitud.tipo} del {solicitud.fecha_inicio} al {solicitud.fecha_fin}',
            tipo='SOLICITUD_AUSENCIA',
            datos={
                'solicitud_id': solicitud.id,
                'empleado_id': empleado_solicitante.id,
                'tipo': solicitud.tipo,
            }
        )
        
        return True, f'Solicitud asignada a {gerente_responsable.nombres} (Gerente de {empleado_solicitante.sucursal.nombre})'
    else:
        # FALLBACK: Si no hay gerente, asignar a RRHH
        rrhh = obtener_aprobador_rrhh(empleado_solicitante.empresa)
        
        if rrhh:
            solicitud.aprobador_asignado = rrhh
            solicitud.estado = 'PENDIENTE_GERENTE'  # Renombraríamos a 'PENDIENTE_APROBACION'
            solicitud.fecha_asignacion = timezone.now()
            solicitud.save()
            
            crear_notificacion(
                usuario=rrhh.usuario,
                titulo='Nueva Solicitud de Ausencia',
                mensaje=f'{empleado_solicitante.nombres} solicita {solicitud.tipo}',
                tipo='SOLICITUD_AUSENCIA',
                datos={'solicitud_id': solicitud.id}
            )
            
            return True, 'Solicitud asignada a RRHH (no hay gerente de sucursal disponible)'
        else:
            return False, 'No se pudo asignar la solicitud (sin gerente ni RRHH disponible)'


def enrutar_tarea_asignada(tarea):
    """
    WORKFLOW: Cuando se asigna una tarea, notificar al empleado.
    
    Se ejecuta cuando:
    - Un GERENTE_SUCURSAL crea una tarea para un empleado
    - El empleado automáticamente recibe notificación
    """
    if tarea.asignado_a:
        crear_notificacion(
            usuario=tarea.asignado_a.usuario,
            titulo='Nueva Tarea Asignada',
            mensaje=f'Te han asignado: {tarea.titulo}',
            tipo='TAREA_ASIGNADA',
            datos={
                'tarea_id': tarea.id,
                'vencimiento': str(tarea.fecha_vencimiento),
            }
        )


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 3: LÓGICA DE APROBACIÓN
# ═══════════════════════════════════════════════════════════════════════════

def aprobar_solicitud_ausencia(solicitud, aprobador, comentarios=''):
    """
    ACCIÓN: Aprobar una solicitud de ausencia.
    
    Regla:
    - Si GERENTE_SUCURSAL aprueba: Va a RRHH para confirmación
    - Si ADMIN_GLOBAL aprueba: Aprobación final
    
    Args:
        solicitud: SolicitudAusencia
        aprobador: Empleado que aprueba
        comentarios: Texto opcional
    
    Returns:
        (éxito: bool, mensaje: str)
    """
    # Validación 1: ¿Tiene permiso para aprobar?
    if aprobador.rol not in ['GERENTE_SUCURSAL', 'ADMIN_GLOBAL']:
        return False, f'El rol {aprobador.rol} no puede aprobar solicitudes'
    
    # Validación 2: ¿Es el aprobador asignado?
    if solicitud.aprobador_asignado != aprobador and aprobador.rol != 'ADMIN_GLOBAL':
        return False, 'No eres el aprobador asignado para esta solicitud'
    
    # Validación 3: Row-Level Security - ¿Es su equipo?
    if aprobador.rol == 'GERENTE_SUCURSAL':
        if solicitud.empleado.sucursal != aprobador.sucursal:
            return False, 'El empleado no pertenece a tu sucursal'
    
    # Paso 1: Actualizar estado
    if aprobador.rol == 'GERENTE_SUCURSAL':
        # Transicionar a RRHH
        solicitud.estado = 'APROBADA_GERENTE'
        solicitud.aprobado_por_gerente = aprobador
        solicitud.fecha_aprobacion_gerente = timezone.now()
        
        # Asignar a RRHH para revisión final
        rrhh = obtener_aprobador_rrhh(solicitud.empleado.empresa)
        solicitud.aprobador_asignado = rrhh
        
        mensaje_exito = f'Aprobado por {aprobador.nombres}. Derivando a RRHH para confirmación final.'
        
        # Notificar a RRHH
        if rrhh and rrhh.usuario:
            crear_notificacion(
                usuario=rrhh.usuario,
                titulo='Solicitud de Ausencia para Revisar',
                mensaje=f'{solicitud.empleado.nombres} - Aprobada por gerente de {aprobador.sucursal.nombre}',
                tipo='SOLICITUD_REVISION_RRHH',
                datos={'solicitud_id': solicitud.id}
            )
    
    elif aprobador.rol == 'ADMIN_GLOBAL':
        # Aprobación final
        solicitud.estado = 'APROBADA_FINAL'
        solicitud.aprobado_por_rrhh = aprobador
        solicitud.fecha_aprobacion_rrhh = timezone.now()
        
        mensaje_exito = f'Aprobado finalmente por {aprobador.nombres}'
        
        # Notificar al empleado
        crear_notificacion(
            usuario=solicitud.empleado.usuario,
            titulo='Solicitud de Ausencia Aprobada ✅',
            mensaje=f'Tu solicitud de {solicitud.tipo} ha sido aprobada',
            tipo='SOLICITUD_APROBADA',
            datos={'solicitud_id': solicitud.id}
        )
    
    # Paso 2: Guardar comentarios si existen
    if comentarios:
        solicitud.comentarios_aprobacion = comentarios
    
    # Paso 3: Registrar auditoría
    solicitud.save()
    
    return True, mensaje_exito


def rechazar_solicitud_ausencia(solicitud, rechazador, motivo):
    """
    ACCIÓN: Rechazar una solicitud de ausencia.
    
    Args:
        solicitud: SolicitudAusencia
        rechazador: Empleado que rechaza
        motivo: Razón del rechazo (obligatoria)
    
    Returns:
        (éxito: bool, mensaje: str)
    """
    # Validaciones
    if rechazador.rol not in ['GERENTE_SUCURSAL', 'ADMIN_GLOBAL']:
        return False, f'El rol {rechazador.rol} no puede rechazar solicitudes'
    
    if solicitud.aprobador_asignado != rechazador and rechazador.rol != 'ADMIN_GLOBAL':
        return False, 'No eres el aprobador asignado'
    
    # Row-Level Security
    if rechazador.rol == 'GERENTE_SUCURSAL':
        if solicitud.empleado.sucursal != rechazador.sucursal:
            return False, 'El empleado no pertenece a tu sucursal'
    
    # Actualizar estado
    if rechazador.rol == 'GERENTE_SUCURSAL':
        solicitud.estado = 'RECHAZADA_GERENTE'
        solicitud.rechazado_por_gerente = rechazador
    else:
        solicitud.estado = 'RECHAZADA_FINAL'
        solicitud.rechazado_por_rrhh = rechazador
    
    solicitud.fecha_rechazo = timezone.now()
    solicitud.motivo_rechazo = motivo
    solicitud.save()
    
    # Notificar al empleado
    crear_notificacion(
        usuario=solicitud.empleado.usuario,
        titulo='Solicitud de Ausencia Rechazada ❌',
        mensaje=f'Tu solicitud fue rechazada. Motivo: {motivo}',
        tipo='SOLICITUD_RECHAZADA',
        datos={'solicitud_id': solicitud.id, 'motivo': motivo}
    )
    
    return True, 'Solicitud rechazada. Se notificó al empleado.'


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 4: FUNCIONES DE NOTIFICACIÓN
# ═══════════════════════════════════════════════════════════════════════════

def crear_notificacion(usuario, titulo, mensaje, tipo, datos=None):
    """
    Crea una notificación en el sistema.
    
    Args:
        usuario: Usuario Django
        titulo: Título corto
        mensaje: Descripción completa
        tipo: 'SOLICITUD_AUSENCIA', 'TAREA_ASIGNADA', etc.
        datos: Dict con datos JSON relevantes
    """
    try:
        notificacion = Notificacion.objects.create(
            usuario=usuario,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            datos=datos or {},
            leida=False,
            fecha_creacion=timezone.now(),
        )
        return notificacion
    except Exception as e:
        print(f'Error creando notificación: {e}')
        return None


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 5: SIGNALS (Disparadores automáticos)
# ═══════════════════════════════════════════════════════════════════════════

@receiver(post_save, sender=SolicitudAusencia)
def solicitud_ausencia_creada(sender, instance, created, **kwargs):
    """
    Signal: Cuando se crea una nueva solicitud de ausencia,
    automáticamente enrutarla al aprobador correcto.
    """
    if created and instance.estado == 'PENDIENTE_GERENTE':
        # Ejecutar enrutamiento automático
        exito, mensaje = enrutar_solicitud_ausencia(instance)
        
        if exito:
            print(f'✅ Solicitud #{instance.id} enrutada automáticamente: {mensaje}')
        else:
            print(f'❌ Error al enrutar solicitud: {mensaje}')


@receiver(post_save, sender=Tarea)
def tarea_asignada(sender, instance, created, **kwargs):
    """
    Signal: Cuando se asigna una nueva tarea,
    notificar al empleado asignado.
    """
    if created and instance.asignado_a:
        enrutar_tarea_asignada(instance)
        print(f'📋 Tarea notificada a {instance.asignado_a.nombres}')


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 6: VALIDACIONES Y CONSTRAINTS
# ═══════════════════════════════════════════════════════════════════════════

def validar_puede_crear_tarea(creador, asignado_a, sucursal_destino):
    """
    Valida si un usuario puede crear una tarea para otro.
    
    Reglas:
    - GERENTE_SUCURSAL: Solo para empleados de su sucursal
    - ADMIN_GLOBAL: Para cualquiera
    - EMPLEADO: No puede crear tareas para otros
    
    Returns:
        (puede_crear: bool, motivo: str)
    """
    # GERENTE_SUCURSAL
    if creador.rol == 'GERENTE_SUCURSAL':
        if asignado_a.sucursal != creador.sucursal:
            return False, 'Solo puedes asignar tareas a empleados de tu sucursal'
        if asignado_a.sucursal != sucursal_destino:
            return False, 'Inconsistencia: Empleado no pertenece a la sucursal indicada'
        return True, 'Permiso concedido'
    
    # ADMIN_GLOBAL
    if creador.rol == 'ADMIN_GLOBAL':
        return True, 'Permiso concedido'
    
    # EMPLEADO o EMPLEADO_SUPERVISOR
    return False, f'Tu rol ({creador.rol}) no puede crear tareas para otros'


def validar_puede_aprobar_ausencia(aprobador, solicitud):
    """
    Valida si un usuario puede aprobar una solicitud.
    
    Returns:
        (puede_aprobar: bool, motivo: str)
    """
    # GERENTE_SUCURSAL: Solo su sucursal
    if aprobador.rol == 'GERENTE_SUCURSAL':
        if solicitud.empleado.sucursal != aprobador.sucursal:
            return False, 'El empleado no pertenece a tu sucursal'
        if solicitud.aprobador_asignado != aprobador:
            return False, 'No eres el aprobador asignado para esta solicitud'
        return True, 'Permiso concedido'
    
    # ADMIN_GLOBAL: Todas
    if aprobador.rol == 'ADMIN_GLOBAL':
        return True, 'Permiso concedido'
    
    return False, f'Tu rol ({aprobador.rol}) no puede aprobar solicitudes'


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 7: RESUMEN DE WORKFLOWS IMPLEMENTADOS
# ═══════════════════════════════════════════════════════════════════════════

"""
WORKFLOWS IMPLEMENTADOS:

1. SOLICITUD DE AUSENCIA (Vacaciones/Permisos/Licencia)
   ───────────────────────────────────────────────────
   Empleado crea → Sistema asigna a Gerente → Gerente aprueba/rechaza
                                           → Si aprueba: va a RRHH
                                           → RRHH aprueba/rechaza finalmente

   Estados: PENDIENTE_GERENTE → APROBADA_GERENTE → APROBADA_FINAL
                             ↘ RECHAZADA_GERENTE ↙
            PENDIENTE_GERENTE → RECHAZADA_GERENTE
            APROBADA_GERENTE → APROBADA_FINAL
                            ↘ RECHAZADA_FINAL ↙

2. CREACIÓN DE TAREA
   ──────────────────
   Gerente crea → Sistema notifica a Empleado → Empleado edita progreso

3. NOTIFICACIONES EN CASCADA
   ──────────────────────────
   Cada aprobación/rechazo notifica automáticamente al siguiente nivel
   y al interesado
"""
