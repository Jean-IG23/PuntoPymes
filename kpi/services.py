from django.db.models import Avg
from django.utils import timezone
from datetime import date
import calendar
from .models import KPI, EvaluacionDesempeno, DetalleEvaluacion, Objetivo
from personal.models import Empleado

class CalculadoraDesempeno:
    
    def __init__(self, empleado_id):
        self.empleado = Empleado.objects.get(id=empleado_id)
        self.empresa = self.empleado.empresa
        
    def calcular_cierre_mensual(self, mes, anio):
        """
        Calcula la nota final del empleado basándose en:
        1. Promedio de Objetivos cumplidos (Categoría DESEMPENO)
        2. Registro de Asistencia (Categoría ASISTENCIA)
        3. Pesos configurados en el modelo KPI
        """
        
        # 1. Definir rango de fechas del mes
        _, last_day = calendar.monthrange(anio, mes)
        fecha_inicio = date(anio, mes, 1)
        fecha_fin = date(anio, mes, last_day)
        nombre_periodo = f"{fecha_inicio.strftime('%B').capitalize()} {anio}"

        # 2. Obtener KPIs activos de la empresa
        kpis_activos = KPI.objects.filter(empresa=self.empresa)
        
        if not kpis_activos.exists():
            return {"error": "No hay KPIs configurados para esta empresa."}

        # 3. Crear o limpiar el borrador de la evaluación
        evaluacion, created = EvaluacionDesempeno.objects.get_or_create(
            empleado=self.empleado,
            periodo=nombre_periodo,
            defaults={'empresa': self.empresa}
        )
        
        # Si ya existía, limpiamos los detalles anteriores para recalcular
        if not created:
            evaluacion.detalles.all().delete()

        puntaje_total_acumulado = 0

        # 4. Iterar sobre cada KPI y calcular su nota
        for kpi in kpis_activos:
            nota_obtenida = 0  # Escala de 0 a 100
            valor_real = 0     # Dato crudo (ej. 5 objetivos, 3 atrasos)

            # --- LÓGICA A: CÁLCULO DE OBJETIVOS ---
            if kpi.categoria == 'DESEMPENO':
                # Buscamos objetivos que vencían en este mes
                objetivos = Objetivo.objects.filter(
                    empleado=self.empleado,
                    fecha_limite__range=[fecha_inicio, fecha_fin]
                )
                
                if objetivos.exists():
                    # Calculamos el promedio de avance de todos los objetivos (0 a 100)
                    promedio_avance = 0
                    total_objs = objetivos.count()
                    
                    for obj in objetivos:
                        promedio_avance += obj.porcentaje_avance()
                    
                    nota_obtenida = promedio_avance / total_objs
                    valor_real = total_objs # Guardamos cuántos objetivos fueron
                else:
                    # Si no tuvo objetivos asignados, ¿le ponemos 100 o 0? 
                    # Política de negocio: Asumimos 100 si no le asignaron trabajo (no es su culpa)
                    # O 0 si queremos obligar a asignar. Usemos 100 por defecto.
                    nota_obtenida = 100 
                    valor_real = 0

            # --- LÓGICA B: CÁLCULO DE ASISTENCIA ---
            elif kpi.categoria == 'ASISTENCIA':
                # TODO: Conectar aquí con tu modelo de 'Marcas' o 'Asistencia'
                # Ejemplo Lógico:
                # total_dias_laborables = 20
                # dias_asistidos = Marcas.objects.filter(...).count()
                # atrasos = Marcas.objects.filter(minutos_atraso__gt=0).count()
                
                # Por ahora, simularemos un cálculo base:
                # Si no hay lógica aún, ponemos 100 (Asistencia Perfecta por defecto)
                nota_obtenida = 100 
                valor_real = 0 # Días asistidos

            # --- LÓGICA C: COMPETENCIAS / MANUAL ---
            else:
                # Estos se llenan manualmente por el jefe después.
                # Lo dejamos en 0 o en la nota base.
                nota_obtenida = 0 
                valor_real = 0

            # 5. Aplicar el PESO (Ponderación)
            # Si la nota es 100 y el peso es 30%, suma 30 puntos al total.
            puntos_ponderados = nota_obtenida * (kpi.peso_porcentaje / 100)
            puntaje_total_acumulado += puntos_ponderados

            # 6. Guardar el detalle (Renglón del boletín)
            DetalleEvaluacion.objects.create(
                evaluacion=evaluacion,
                kpi=kpi,
                valor_obtenido=valor_real,
                calificacion=nota_obtenida,
                comentario=f"Cálculo automático: {kpi.get_categoria_display()}"
            )

        # 7. Actualizar la cabecera con la nota final
        evaluacion.puntaje_total = puntaje_total_acumulado
        evaluacion.estado = 'BORRADOR' # Se deja en borrador para revisión del jefe
        evaluacion.save()

        return evaluacion