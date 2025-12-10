from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import SolicitudAusencia
from core.models import Notificacion

# Cada vez que se GUARDA una Solicitud de Ausencia...
@receiver(post_save, sender=SolicitudAusencia)
def notificar_solicitud(sender, instance, created, **kwargs):
    if created:
        # CASO 1: Nueva Solicitud -> Avisar al Jefe (o al Admin de la empresa)
        empleado = instance.empleado
        
        # Lógica simplificada: Notificar al usuario dueño de la empresa
        # (Aquí podrías buscar al manager específico si quisieras)
        try:
            # Buscamos al usuario que es Staff y tiene el mismo email que el dueño de la empresa (simplificado)
            # O mejor, buscamos todos los administradores de esa empresa
            admins = User.objects.filter(is_staff=True) 
            # Nota: Esto es un ejemplo, en producción filtrarías por la empresa del empleado
            
            for admin in admins:
                Notificacion.objects.create(
                    usuario_destino=admin,
                    titulo=f"🏖️ Nueva Solicitud: {empleado.nombres}",
                    mensaje=f"{empleado.nombres} ha solicitado vacaciones del {instance.fecha_inicio} al {instance.fecha_fin}.",
                    tipo='VACACION',
                    link_accion='/solicitudes' # Link al panel de aprobación
                )
        except Exception as e:
            print("Error creando notificación:", e)

    else:
        # CASO 2: Se actualizó el estado (Aprobada/Rechazada) -> Avisar al Empleado
        if instance.estado in ['APROBADA', 'RECHAZADA']:
            # Buscamos el usuario del empleado (por email)
            try:
                usuario_empleado = User.objects.get(username=instance.empleado.email)
                Notificacion.objects.create(
                    usuario_destino=usuario_empleado,
                    titulo=f"Respuesta a tu Solicitud: {instance.estado}",
                    mensaje=f"Tu solicitud ha sido {instance.estado.lower()}.",
                    tipo='VACACION',
                    link_accion='/portal'
                )
            except User.DoesNotExist:
                pass