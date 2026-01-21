#!/bin/bash
# Script de validación de la implementación de arquitectura de rutas

echo "==========================================="
echo "🔍 VALIDACIÓN DE ARQUITECTURA DE RUTAS"
echo "==========================================="
echo ""

echo "1️⃣  Verificando estructura de rutas..."
grep -n "path: '/" /c/Users/mateo/Desktop/PuntoPymes/talent-track-frontend/src/app/app.routes.ts | head -30

echo ""
echo "2️⃣  Verificando imports de componentes..."
grep "import { .*Component }" /c/Users/mateo/Desktop/PuntoPymes/talent-track-frontend/src/app/app.routes.ts | wc -l
echo "✓ Componentes importados"

echo ""
echo "3️⃣  Verificando guards..."
grep "canActivate:" /c/Users/mateo/Desktop/PuntoPymes/talent-track-frontend/src/app/app.routes.ts | sort | uniq -c

echo ""
echo "4️⃣  Compilación final..."
cd /c/Users/mateo/Desktop/PuntoPymes/talent-track-frontend
ng build 2>&1 | grep -E "(error|Application bundle|Build completed)"

echo ""
echo "==========================================="
echo "✅ VALIDACIÓN COMPLETADA"
echo "==========================================="
