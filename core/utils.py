from datetime import timedelta, datetime, date
import math
def calcular_dias_habiles(fecha_inicio, fecha_fin):
    """
    Calcula días hábiles excluyendo sábados y domingos.
    """
    dias_habiles = 0
    
    # Asegurar que trabajamos con objetos date puros
    if isinstance(fecha_inicio, datetime): fecha_inicio = fecha_inicio.date()
    if isinstance(fecha_fin, datetime): fecha_fin = fecha_fin.date()
    
    fecha_actual = fecha_inicio
    
    while fecha_actual <= fecha_fin:
        # 0=Lunes, 4=Viernes, 5=Sábado, 6=Domingo
        if fecha_actual.weekday() < 5: 
            dias_habiles += 1
        fecha_actual += timedelta(days=1)
        
    return dias_habiles
def calcular_distancia(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia en metros entre dos coordenadas usando la fórmula de Haversine.
    """
    if not lat1 or not lon1 or not lat2 or not lon2:
        return float('inf') # Distancia infinita si faltan datos

    R = 6371000  # Radio de la Tierra en metros
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distancia = R * c
    return round(distancia, 2) # Devuelve metros