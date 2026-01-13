from datetime import timedelta, datetime, date

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