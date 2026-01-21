import math
from datetime import datetime, timedelta
from django.utils import timezone

def calcular_distancia(lat1, lon1, lat2, lon2):
    """
    Fórmula de Haversine para calcular distancia en metros entre dos coordenadas.
    """
    if not lat1 or not lat2: return 999999 

    R = 6371000 # Radio de la Tierra en metros
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c 

def analizar_entrada(empleado, hora_real_entrada):
    """
    Determina si hay atraso basándose en el Turno del empleado.
    """
    turno = empleado.turno_asignado
    atraso_minutos = 0
    es_atraso = False

    # Si no tiene turno (es directivo o freelance), no hay atraso
    if not turno or turno.tipo_jornada == 'FLEXIBLE':
        return False, 0

    # Lógica para Horario RÍGIDO
    if turno.hora_entrada:
        # Combinamos la fecha de hoy con la hora del turno
        entrada_esperada = datetime.combine(hora_real_entrada.date(), turno.hora_entrada)
        
        # --- CORRECCIÓN DE ZONA HORARIA ---
        # Si la hora real tiene zona horaria, le ponemos zona horaria a la esperada
        if timezone.is_aware(hora_real_entrada) and timezone.is_naive(entrada_esperada):
            entrada_esperada = timezone.make_aware(entrada_esperada)
        # ----------------------------------

        # Le sumamos la tolerancia (Ej: 10 mins)
        limite_tolerancia = entrada_esperada + timedelta(minutes=turno.min_tolerancia if hasattr(turno, 'min_tolerancia') else 0)
        
        if hora_real_entrada > limite_tolerancia:
            es_atraso = True
            # Ahora sí podemos restar porque ambos tienen zona horaria
            delta = hora_real_entrada - entrada_esperada
            atraso_minutos = int(delta.total_seconds() / 60)

    return es_atraso, atraso_minutos

def analizar_salida(empleado, jornada, hora_real_salida):
    """
    Calcula horas trabajadas y extras.
    """
    # 1. Horas Trabajadas (Brutas)
    hora_entrada = jornada.entrada
    
    # Aseguramos compatibilidad de zonas horarias para la entrada
    if timezone.is_aware(hora_real_salida) and timezone.is_naive(hora_entrada):
        hora_entrada = timezone.make_aware(hora_entrada)
    elif timezone.is_naive(hora_real_salida) and timezone.is_aware(hora_entrada):
        hora_real_salida = timezone.make_aware(hora_real_salida)

    tiempo_total = hora_real_salida - hora_entrada
    horas_trabajadas = round(tiempo_total.total_seconds() / 3600, 2)
    
    horas_extras = 0
    turno = empleado.turno_asignado

    # 2. Horas Extras (Solo si es RÍGIDO y supera la hora de salida)
    if turno and turno.tipo_jornada == 'RIGIDO' and turno.hora_salida:
        salida_esperada = datetime.combine(hora_real_salida.date(), turno.hora_salida)
        
        # --- CORRECCIÓN DE ZONA HORARIA ---
        if timezone.is_aware(hora_real_salida) and timezone.is_naive(salida_esperada):
            salida_esperada = timezone.make_aware(salida_esperada)
        # ----------------------------------
        
        if hora_real_salida > salida_esperada:
            delta_extra = hora_real_salida - salida_esperada
            horas_extras = round(delta_extra.total_seconds() / 3600, 2)

    # Caso FLEXIBLE o SIN TURNO: Si trabaja más de 9 horas (ejemplo), es extra
    elif horas_trabajadas > 9: 
        horas_extras = horas_trabajadas - 9

    return horas_trabajadas, horas_extras