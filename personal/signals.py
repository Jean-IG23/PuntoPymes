from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SolicitudAusencia, Empleado
from core.models import Notificacion

@receiver(post_save, sender=SolicitudAusencia)
def notificar_solicitud(sender, instance, created, **kwargs):
    emp = instance.empleado
    
    if created:
        # --- CASO 1: Nueva Solicitud ---
        # Avisar SOLO a los encargados de SU MISMA EMPRESA
        # Buscamos empleados con rol ADMIN, RRHH o GERENTE de esa empresa
        encargados = Empleado.objects.filter(
            empresa=emp.empresa, 
            rol__in=['ADMIN', 'RRHH', 'GERENTE'],
            estado='ACTIVO'
        ).exclude(id=emp.id) # No notificarse a sí mismo si es gerente

        for jefe in encargados:
            if jefe.usuario: # Solo si tiene usuario de sistema
                Notificacion.objects.create(
                    usuario_destino=jefe.usuario,
                    titulo=f"🏖️ Nueva Solicitud: {emp.nombres}",
                    mensaje=f"Solicitud de vacaciones del {instance.fecha_inicio} al {instance.fecha_fin}.",
                    tipo='VACACION',
                    link_accion='/solicitudes'
                )

    else:
        # --- CASO 2: Cambio de Estado ---
        if instance.estado in ['APROBADA', 'RECHAZADA']:
            # Usamos la relación directa (sin buscar por string)
            if emp.usuario:
                Notificacion.objects.create(
                    usuario_destino=emp.usuario,
                    titulo=f"Solicitud {instance.estado}",
                    mensaje=f"Tu solicitud de vacaciones ha sido {instance.estado.lower()}.",
                    tipo='VACACION',
                    link_accion='/mi-perfil'
                )