from django.core.mail import send_mail
from django.conf import settings
import threading

# Enviamos correos en segundo plano para no "congelar" la pantalla del usuario
class EmailThread(threading.Thread):
    def __init__(self, subject, message, recipient_list):
        self.subject = subject
        self.message = message
        self.recipient_list = recipient_list
        threading.Thread.__init__(self)

    def run(self):
        try:
            send_mail(
                self.subject,
                self.message,
                settings.DEFAULT_FROM_EMAIL,
                self.recipient_list,
                fail_silently=True # Si falla, no rompe la app
            )
        except Exception as e:
            print(f"Error enviando correo: {e}")

def notificar_solicitud(solicitud, tipo='NUEVA'):
    empleado = solicitud.empleado
    subject = ""
    msg = ""
    destinatarios = []

    if tipo == 'NUEVA':
        subject = f"📢 Nueva Solicitud: {empleado.nombres} {empleado.apellidos}"
        msg = f"""
        El colaborador {empleado.nombres} ha solicitado: {solicitud.tipo_ausencia.nombre}
        Desde: {solicitud.fecha_inicio}
        Hasta: {solicitud.fecha_fin}
        
        Por favor ingrese al sistema para aprobar o rechazar.
        """
        # BUSCAR A LOS JEFES (Gerente del Depto + RRHH)
        from .models import Empleado
        
        # 1. Jefes de Departamento
        jefes = Empleado.objects.filter(
            departamento=empleado.departamento, 
            rol='GERENTE', 
            estado='ACTIVO'
        ).exclude(id=empleado.id) # Que no se notifique a sí mismo si es gerente
        
        # 2. RRHH (Siempre recibe copia)
        rrhh = Empleado.objects.filter(rol__in=['ADMIN', 'RRHH'], estado='ACTIVO')
        
        destinatarios = [j.email for j in jefes] + [r.email for r in rrhh]

    elif tipo == 'RESPUESTA':
        subject = f"Tu solicitud ha sido {solicitud.estado}"
        msg = f"""
        Hola {empleado.nombres},
        
        Tu solicitud de vacaciones/permiso ha sido {solicitud.estado}.
        
        Comentario del supervisor: {solicitud.comentario_jefe or 'Sin comentarios'}
        """
        destinatarios = [empleado.email]

    # Enviar solo si hay destinatarios y tienen email válido
    destinatarios = list(set([d for d in destinatarios if d and '@' in d]))
    
    if destinatarios:
        EmailThread(subject, msg, destinatarios).start()