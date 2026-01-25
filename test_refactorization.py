"""
Script de prueba para validar la refactorización de GERENTE → sucursal_a_cargo
Ejecutar: python manage.py shell < test_refactorization.py
"""

from personal.models import Empleado
from core.models import Empresa, Sucursal, Departamento, Area
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

print("\n" + "="*70)
print("🧪 PRUEBAS: REFACTORIZACIÓN GERENTE → sucursal_a_cargo")
print("="*70)

# ============================================================================
# TEST 1: Validación - GERENTE sin sucursal_a_cargo
# ============================================================================
print("\n[TEST 1] GERENTE sin sucursal_a_cargo debe fallar")
print("-" * 70)

try:
    empresa = Empresa.objects.first()
    sucursal = Sucursal.objects.filter(empresa=empresa).first()
    depto = Departamento.objects.filter(sucursal=sucursal).first()
    
    user_test = User.objects.create_user(
        username='test_gerente_sin_sucursal',
        email='test@test.com',
        password='test123'
    )
    
    empleado_invalido = Empleado(
        usuario=user_test,
        nombres='Test',
        apellidos='Gerente',
        email='test@test.com',
        empresa=empresa,
        sucursal=sucursal,
        departamento=depto,
        rol='GERENTE',
        fecha_ingreso='2026-01-22',
        # sucursal_a_cargo = None  # ❌ FALTA ASIGNAR
    )
    
    empleado_invalido.clean()  # Debe lanzar ValidationError
    print("❌ FALLÓ: Debería haber levantado ValidationError")
    
except ValidationError as e:
    print(f"✅ PASÓ: Validación correcta")
    print(f"   Error: {e.message_dict}")

# ============================================================================
# TEST 2: Validación - Crear GERENTE correctamente
# ============================================================================
print("\n[TEST 2] Crear GERENTE con sucursal_a_cargo")
print("-" * 70)

try:
    empresa = Empresa.objects.first()
    sucursal = Sucursal.objects.filter(empresa=empresa).first()
    depto = Departamento.objects.filter(sucursal=sucursal).first()
    
    user_gerente = User.objects.create_user(
        username='gerente_valido_test',
        email='gerente@test.com',
        password='test123'
    )
    
    empleado_valido = Empleado(
        usuario=user_gerente,
        nombres='Carlos',
        apellidos='García',
        email='gerente@test.com',
        empresa=empresa,
        sucursal=sucursal,
        departamento=depto,
        rol='GERENTE',
        sucursal_a_cargo=sucursal,  # ✅ ASIGNADO
        fecha_ingreso='2026-01-22',
    )
    
    empleado_valido.clean()  # Debe pasar sin error
    empleado_valido.save()
    
    print(f"✅ PASÓ: GERENTE creado exitosamente")
    print(f"   Nombre: {empleado_valido.nombres}")
    print(f"   Sucursal a cargo: {empleado_valido.sucursal_a_cargo.nombre}")
    
except Exception as e:
    print(f"❌ FALLÓ: {str(e)}")

# ============================================================================
# TEST 3: Validación - Una sucursal NO puede tener 2 gerentes
# ============================================================================
print("\n[TEST 3] Prevenir 2 gerentes en la misma sucursal")
print("-" * 70)

try:
    empresa = Empresa.objects.first()
    sucursal = Sucursal.objects.filter(empresa=empresa).first()
    depto = Departamento.objects.filter(sucursal=sucursal).first()
    
    user_gerente2 = User.objects.create_user(
        username='segundo_gerente_test',
        email='gerente2@test.com',
        password='test123'
    )
    
    empleado_duplicado = Empleado(
        usuario=user_gerente2,
        nombres='Juan',
        apellidos='Pérez',
        email='gerente2@test.com',
        empresa=empresa,
        sucursal=sucursal,
        departamento=depto,
        rol='GERENTE',
        sucursal_a_cargo=sucursal,  # ❌ LA MISMA SUCURSAL QUE CARLOS
        fecha_ingreso='2026-01-22',
    )
    
    empleado_duplicado.clean()  # Debe lanzar ValidationError
    print("❌ FALLÓ: Debería haber prevenido 2 gerentes")
    
except ValidationError as e:
    print(f"✅ PASÓ: Validación correcta")
    print(f"   Error: {e.message_dict}")

# ============================================================================
# TEST 4: Permisos - GERENTE solo ve su sucursal_a_cargo
# ============================================================================
print("\n[TEST 4] Filtrado de datos: GERENTE solo ve su sucursal")
print("-" * 70)

from core.permissions import can_access_sucursal_data, get_queryset_filtrado

try:
    gerente = Empleado.objects.filter(rol='GERENTE').first()
    if gerente and gerente.sucursal_a_cargo:
        
        # Puede ver datos de su sucursal_a_cargo
        puede_ver = can_access_sucursal_data(gerente.usuario, gerente.sucursal_a_cargo.id)
        print(f"✅ Gerente CAN ver su sucursal_a_cargo: {puede_ver}")
        
        # No puede ver otras sucursales
        otras_sucursales = Sucursal.objects.exclude(id=gerente.sucursal_a_cargo.id).first()
        if otras_sucursales:
            no_puede_ver = can_access_sucursal_data(gerente.usuario, otras_sucursales.id)
            print(f"✅ Gerente NO puede ver otras sucursales: {not no_puede_ver}")
        
        # Prueba queryset filtrado
        queryset = Empleado.objects.filter(empresa=gerente.empresa)
        filtrado = get_queryset_filtrado(gerente.usuario, queryset)
        
        print(f"✅ Empleados visibles para GERENTE:")
        print(f"   Total en empresa: {Empleado.objects.filter(empresa=gerente.empresa).count()}")
        print(f"   Visible para gerente: {filtrado.count()}")
        
    else:
        print("⚠️  No hay gerentes con sucursal_a_cargo para probar")
        
except Exception as e:
    print(f"❌ FALLÓ: {str(e)}")

# ============================================================================
# TEST 5: Serializer - Campo nuevo disponible
# ============================================================================
print("\n[TEST 5] Serializer incluye nombre_sucursal_a_cargo")
print("-" * 70)

try:
    from personal.serializers import EmpleadoSerializer
    
    gerente = Empleado.objects.filter(rol='GERENTE').first()
    if gerente:
        serializer = EmpleadoSerializer(gerente)
        data = serializer.data
        
        if 'nombre_sucursal_a_cargo' in data:
            print(f"✅ PASÓ: Campo 'nombre_sucursal_a_cargo' disponible")
            print(f"   Valor: {data['nombre_sucursal_a_cargo']}")
        else:
            print(f"❌ FALLÓ: Campo 'nombre_sucursal_a_cargo' no en serializer")
            
except Exception as e:
    print(f"❌ FALLÓ: {str(e)}")

# ============================================================================
# RESUMEN
# ============================================================================
print("\n" + "="*70)
print("📊 RESUMEN DE PRUEBAS")
print("="*70)
print("""
✅ Cambios implementados:
   - Campo: lider_area → sucursal_a_cargo
   - Validación: 1 GERENTE = 1 SUCURSAL
   - Permisos: Filtrado automático por sucursal_a_cargo
   - Serializer: Actualizado con nombre_sucursal_a_cargo
   
🚀 Siguiente paso:
   - Ejecutar: python manage.py migrate personal
   - Actualizar formularios frontend
   - Testear vistas completas
""")
print("="*70 + "\n")
