/**
 * SUITE DE PRUEBAS XSS Y SEGURIDAD FRONTEND
 * Talent Track V2.0 - Ejecutar en Console (F12)
 * 
 * Uso: Copiar y pegar cada función en DevTools → Console
 */

// ============================================
// BLOQUE 1: PRUEBAS XSS
// ============================================

/**
 * TEST XSS-001: Verificar sanitización en interpolación
 * Procedimiento:
 * 1. Loguearse en la app
 * 2. Copiar esta función en Console
 * 3. Ejecutar: testXSS_Interpolacion()
 */
function testXSS_Interpolacion() {
    console.log("🧪 TEST XSS-001: Sanitización en Interpolación");
    console.log("=====================================================");
    
    // Buscar elementos que usen interpolación Angular ({{ }})
    const elementos = document.querySelectorAll('[ng-bind], [ng-bind-html], [textContent]');
    
    if (elementos.length === 0) {
        console.warn("⚠️  No se encontraron elementos con binding");
        return;
    }
    
    elementos.forEach((el, index) => {
        const contenido = el.textContent;
        
        // Buscar patrones peligrosos sin sanitizar
        const patronesInseguros = [
            /<script/gi,
            /onerror\s*=/gi,
            /onclick\s*=/gi,
            /onload\s*=/gi,
            /javascript:/gi
        ];
        
        const tienePatron = patronesInseguros.some(patron => patron.test(contenido));
        
        if (tienePatron) {
            console.error(`❌ VULNERABLE en elemento ${index}:`, el);
            console.error("   Contenido:", contenido);
        } else {
            console.log(`✅ SEGURO elemento ${index}: ${contenido.substring(0, 50)}...`);
        }
    });
}

/**
 * TEST XSS-002: Verificar uso de innerHTML vs textContent
 */
function testXSS_InnerHTML() {
    console.log("\n🧪 TEST XSS-002: Uso de innerHTML");
    console.log("=====================================================");
    
    // Buscar componentes Angular que usen [innerHTML]
    const elementosConHTML = document.querySelectorAll('[innerHTML]');
    
    if (elementosConHTML.length === 0) {
        console.log("✅ No hay [innerHTML] en el código (SEGURO)");
        return;
    }
    
    console.warn(`⚠️  Encontrados ${elementosConHTML.length} elementos con [innerHTML]:`);
    elementosConHTML.forEach((el, i) => {
        console.log(`   ${i+1}. ${el.tagName}#${el.id} - Contenido: ${el.innerHTML.substring(0, 50)}...`);
        console.log(`      RECOMENDACIÓN: Usar DomSanitizer.sanitize() o cambiar a {{ }}`);
    });
}

/**
 * TEST XSS-003: Simular inyección en form (si existe)
 */
function testXSS_FormInyeccion() {
    console.log("\n🧪 TEST XSS-003: Inyección en Formulario");
    console.log("=====================================================");
    
    const scriptPayload = "<script>alert('XSS Test')</script>";
    const imgPayload = "<img src=x onerror=\"console.error('XSS ejecutado')\">";
    
    // Buscar campos de texto en formularios
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    
    if (inputs.length === 0) {
        console.warn("⚠️  No hay formularios visibles");
        return;
    }
    
    console.log(`📝 Encontrados ${inputs.length} campos de entrada`);
    console.log("⚠️  PRUEBA MANUAL: Intenta pegar esto en un campo:");
    console.log(`   Payload 1: ${scriptPayload}`);
    console.log(`   Payload 2: ${imgPayload}`);
    console.log("   Resultado esperado: El script NO se ejecuta");
}

/**
 * TEST XSS-004: Revisar encabezados de seguridad
 */
function testXSS_SecurityHeaders() {
    console.log("\n🧪 TEST XSS-004: Headers de Seguridad");
    console.log("=====================================================");
    
    const headers = {
        'Content-Security-Policy': document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
        'X-Content-Type-Options': document.querySelector('meta[name="X-Content-Type-Options"]'),
        'X-Frame-Options': document.querySelector('meta[name="X-Frame-Options"]'),
        'X-XSS-Protection': document.querySelector('meta[name="X-XSS-Protection"]')
    };
    
    console.log("📋 Headers de seguridad detectados:");
    Object.entries(headers).forEach(([nombre, elemento]) => {
        if (elemento) {
            console.log(`   ✅ ${nombre}: ${elemento.getAttribute('content')}`);
        } else {
            console.warn(`   ⚠️  ${nombre}: No encontrado`);
        }
    });
}

// ============================================
// BLOQUE 2: PRUEBAS CSRF
// ============================================

/**
 * TEST CSRF-001: Verificar CSRF token en cookies y headers
 */
function testCSRF_Token() {
    console.log("\n🧪 TEST CSRF-001: Token Anti-CSRF");
    console.log("=====================================================");
    
    // Método 1: Buscar en meta tags
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        console.log(`✅ CSRF Token en meta tag: ${csrfMeta.content.substring(0, 20)}...`);
    } else {
        console.warn("⚠️  No hay meta[name='csrf-token']");
    }
    
    // Método 2: Buscar en cookies
    const cookies = document.cookie.split(';').map(c => c.trim());
    const csrfCookie = cookies.find(c => c.includes('csrftoken'));
    
    if (csrfCookie) {
        console.log(`✅ CSRF Token en cookie: ${csrfCookie.split('=')[1].substring(0, 20)}...`);
    } else {
        console.warn("⚠️  No hay csrftoken en cookies");
    }
    
    // Método 3: Buscar en localStorage
    const csrfStorage = localStorage.getItem('csrftoken');
    if (csrfStorage) {
        console.log(`✅ CSRF Token en localStorage: ${csrfStorage.substring(0, 20)}...`);
    }
    
    console.log("\n📝 Nota: Al menos uno de estos métodos debe tener el token");
}

/**
 * TEST CSRF-002: Verificar headers en POST requests
 */
function testCSRF_PostHeaders() {
    console.log("\n🧪 TEST CSRF-002: Headers en POST");
    console.log("=====================================================");
    console.log("Abre DevTools → Network → Haz una acción (guardar empleado)");
    console.log("Busca en la petición POST:");
    console.log("   ✅ Header 'X-CSRF-Token' con valor");
    console.log("   ✅ Header 'X-Requested-With: XMLHttpRequest'");
    console.log("   ✅ Cookie 'csrftoken' presente");
    console.log("\nOtro método: Ejecuta en Console después de hacer POST:");
    console.log("   monitorNetworkCSRF()");
}

/**
 * Monitorear requests AJAX para validar CSRF
 */
function monitorNetworkCSRF() {
    console.log("🔍 Monitoreo de CSRF iniciado...");
    
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        const [resource, config] = args;
        
        if (config && config.method && config.method.toUpperCase() === 'POST') {
            console.log(`\n📤 POST Request a: ${resource}`);
            console.log("   Headers:");
            if (config.headers) {
                Object.entries(config.headers).forEach(([k, v]) => {
                    if (k.toLowerCase().includes('csrf') || k.toLowerCase().includes('x-')) {
                        console.log(`      ${k}: ${v.substring(0, 20)}...`);
                    }
                });
            }
        }
        
        return originalFetch.apply(this, args);
    };
}

// ============================================
// BLOQUE 3: PRUEBAS DE SESIÓN
// ============================================

/**
 * TEST SESSION-001: Verificar JWT en localStorage
 */
function testSESSION_JWT() {
    console.log("\n🧪 TEST SESSION-001: Token JWT");
    console.log("=====================================================");
    
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    
    if (!token) {
        console.error("❌ No hay token JWT en localStorage");
        return;
    }
    
    console.log(`✅ Token encontrado: ${token.substring(0, 30)}...`);
    
    // Decodificar JWT (sin validar firma, solo para inspección)
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error("❌ Token no es JWT válido (debe tener 3 partes separadas por '.')");
            return;
        }
        
        const payload = JSON.parse(atob(parts[1]));
        console.log("📋 Payload decodificado:");
        console.log(`   - User ID: ${payload.user_id || payload.sub}`);
        console.log(`   - Expira en: ${new Date(payload.exp * 1000).toLocaleString()}`);
        console.log(`   - Emitido: ${new Date(payload.iat * 1000).toLocaleString()}`);
        
        // Verificar si va a expirar pronto
        const ahora = Math.floor(Date.now() / 1000);
        const tiempoRestante = payload.exp - ahora;
        
        if (tiempoRestante < 300) {
            console.warn(`⚠️  Token expirará en ${tiempoRestante} segundos`);
        } else {
            console.log(`✅ Token válido por ${Math.floor(tiempoRestante / 60)} minutos más`);
        }
    } catch (e) {
        console.error("❌ Error decodificando JWT:", e.message);
    }
}

/**
 * TEST SESSION-002: Simular sesión expirada
 */
function testSESSION_Expirada() {
    console.log("\n🧪 TEST SESSION-002: Sesión Expirada");
    console.log("=====================================================");
    console.log("Para probar sesión expirada:");
    console.log("1. Espera 15+ minutos sin actividad");
    console.log("2. Intenta hacer una acción en la app");
    console.log("3. Resultado esperado: Redirección a login");
    console.log("\nO simula manualmente:");
    console.log("   localStorage.removeItem('token'); location.reload();");
}

// ============================================
// BLOQUE 4: ENMASCARAMIENTO DE DATOS
// ============================================

/**
 * TEST SENSIBLE-001: Verificar enmascaramiento de salarios
 */
function testDATA_SalariosEnmascarados() {
    console.log("\n🧪 TEST SENSIBLE-001: Enmascaramiento de Salarios");
    console.log("=====================================================");
    
    // Buscar elementos con números que podrían ser salarios
    const elementos = document.querySelectorAll('[class*="salary"], [class*="salario"], [data-field*="salary"]');
    
    if (elementos.length === 0) {
        console.log("ℹ️  No se encontraron campos de salario visibles");
        return;
    }
    
    console.log(`📊 Encontrados ${elementos.length} campos de salario:`);
    elementos.forEach((el, i) => {
        const contenido = el.textContent.trim();
        
        // Verificar que sea un asterisco (enmascarado) o número
        if (contenido === '****' || contenido.includes('*')) {
            console.log(`   ✅ Elemento ${i+1}: ${contenido} (ENMASCARADO)`);
        } else if (/\$|\d{4,}/.test(contenido)) {
            console.warn(`   ⚠️  Elemento ${i+1}: ${contenido} (VISIBLE - verificar permisos)`);
        }
    });
}

// ============================================
// BLOQUE 5: UTILIDADES
// ============================================

/**
 * Ejecutar todas las pruebas de seguridad
 */
function ejecutarTodasLasPruebas() {
    console.clear();
    console.log("%c🛡️  SUITE COMPLETA DE PRUEBAS DE SEGURIDAD", "font-size: 16px; font-weight: bold; color: #dc2626;");
    console.log("%cTalent Track V2.0 - " + new Date().toLocaleString(), "font-size: 12px; color: gray;");
    
    testXSS_Interpolacion();
    testXSS_InnerHTML();
    testXSS_SecurityHeaders();
    
    testCSRF_Token();
    
    testSESSION_JWT();
    testDATA_SalariosEnmascarados();
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Suite de pruebas completada");
    console.log("📝 Para más detalles, revisa cada test individual");
}

// ============================================
// INSTRUCCIONES DE USO
// ============================================

console.log("%c🛡️  TEST SUITE DISPONIBLE", "font-size: 14px; font-weight: bold; color: #dc2626;");
console.log("Ejecuta en Console (F12):");
console.log("\nPruebas Individuales:");
console.log("  • testXSS_Interpolacion()");
console.log("  • testXSS_InnerHTML()");
console.log("  • testXSS_SecurityHeaders()");
console.log("  • testCSRF_Token()");
console.log("  • monitorNetworkCSRF()");
console.log("  • testSESSION_JWT()");
console.log("  • testDATA_SalariosEnmascarados()");
console.log("\nEjecución Completa:");
console.log("  • ejecutarTodasLasPruebas()");
