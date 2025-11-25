// Configuración del sistema BASADA EN CONDICIONES REALES
const config = {
    // Direcciones de VIENTO NORTE que traen humo a la ciudad
    direccionesRiesgo: {
        'N': { nivel: 'roja', desc: 'ALTO RIESGO - Viento norte directo a ciudad' },
        'NO': { nivel: 'roja', desc: 'ALTO RIESGO - Viento noroeste a ciudad' },
        'NE': { nivel: 'roja', desc: 'ALTO RIESGO - Viento noreste a ciudad' },
        'O': { nivel: 'naranja', desc: 'RIESGO MODERADO - Posible afectación' },
        'E': { nivel: 'naranja', desc: 'RIESGO MODERADO - Dirección desfavorable' },
        'SO': { nivel: 'amarilla', desc: 'ATENCIÓN - Monitorear situación' },
        'SE': { nivel: 'amarilla', desc: 'ATENCIÓN - Monitorear situación' },
        'S': { nivel: 'verde', desc: 'SITUACIÓN FAVORABLE' }
    },
    
    // Umbrales de riesgo
    umbrales: {
        vientoAlerta: 10,        // km/h - mínimo para activar alerta
        vientoExtremo: 25,       // km/h - viento fuerte empeora
        temperaturaAlta: 30,     // °C - aumenta probabilidad incendios
        presionBaja: 1012        // hPa - inestabilidad atmosférica
    }
};

// Estado inicial
let estadoActual = 'verde';

// ===== DATOS METEOROLÓGICOS REALES - COPERNICUS =====
async function cargarDatosReales() {
    try {
        console.log('🌤️ Cargando datos de Copernicus...');
        
        // Usamos Open-Meteo que accede a datos ECMWF/Copernicus GRATIS
        const response = await fetch('https://api.open-meteo.com/v1/ecmwf?latitude=-34.57&longitude=-59.10&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=America%2FSao_Paulo');
        
        if (!response.ok) throw new Error('Error en la API');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('Datos ECMWF recibidos:', current);

        // Actualizar interfaz con datos REALES de ECMWF
        document.getElementById('viento-velocidad-mobile').textContent = 
            `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('viento-direccion-mobile').textContent = 
            gradosADireccion(current.wind_direction_10m);
        document.getElementById('temperatura-mobile').textContent = 
            `${Math.round(current.temperature_2m)}°C`;
        document.getElementById('humedad-mobile').textContent = 
            `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('presion-mobile').textContent = 
            `${Math.round(current.surface_pressure)} hPa`;

        // Actualizar estados individuales
        actualizarEstadosVariablesReales(current);
        
        // Calcular nivel de alerta con todos los factores
        actualizarSemaforoConDatosReales(current);
        
        mostrarMensaje('✅ Datos ECMWF actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos ECMWF:', error);
        mostrarMensaje('❌ Error cargando datos ECMWF', 'error');
        return false;
    }
}

// ===== ALTERNATIVA: OPEN-METEO CON MÚLTIPLES MODELOS =====
async function cargarDatosMultiModelo() {
    try {
        console.log('🌤️ Cargando datos multi-modelo...');
        
        // Open-Meteo con acceso a múltiples modelos incluyendo ECMWF
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.57&longitude=-59.10&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover&wind_speed_unit=km_h&timezone=America%2FSao_Paulo&models=ecmwf_ifs');
        
        if (!response.ok) throw new Error('Error en la API');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('Datos multi-modelo recibidos:', current);

        // Actualizar interfaz
        document.getElementById('viento-velocidad-mobile').textContent = 
            `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('viento-direccion-mobile').textContent = 
            gradosADireccion(current.wind_direction_10m);
        document.getElementById('temperatura-mobile').textContent = 
            `${Math.round(current.temperature_2m)}°C`;
        document.getElementById('humedad-mobile').textContent = 
            `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('presion-mobile').textContent = 
            `${Math.round(current.surface_pressure)} hPa`;

        // Actualizar estados y semáforo
        actualizarEstadosVariablesReales(current);
        actualizarSemaforoConDatosReales(current);
        
        mostrarMensaje('✅ Datos multi-modelo actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos multi-modelo:', error);
        // Fallback a API básica
        return await cargarDatosBasicos();
    }
}

// ===== API BÁSICA COMO FALLBACK =====
async function cargarDatosBasicos() {
    try {
        console.log('🌤️ Cargando datos básicos...');
        
        // Open-Meteo básico (siempre funciona)
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.57&longitude=-59.10&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=America%2FSao_Paulo');
        
        if (!response.ok) throw new Error('Error en la API');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('Datos básicos recibidos:', current);

        // Actualizar interfaz
        document.getElementById('viento-velocidad-mobile').textContent = 
            `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('viento-direccion-mobile').textContent = 
            gradosADireccion(current.wind_direction_10m);
        document.getElementById('temperatura-mobile').textContent = 
            `${Math.round(current.temperature_2m)}°C`;
        document.getElementById('humedad-mobile').textContent = 
            `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('presion-mobile').textContent = 
            `${Math.round(current.surface_pressure)} hPa`;

        actualizarEstadosVariablesReales(current);
        actualizarSemaforoConDatosReales(current);
        
        mostrarMensaje('✅ Datos básicos actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos básicos:', error);
        mostrarMensaje('❌ Error de conexión', 'error');
        return false;
    }
}

// Convertir grados a dirección cardinal
function gradosADireccion(grados) {
    const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return direcciones[Math.round((grados % 360) / 45) % 8];
}

// Verificar si está en el arco de viento norte peligroso (300° - 45°)
function esVientoNortePeligroso(grados) {
    const gradosNormalizados = (grados + 360) % 360;
    return (gradosNormalizados >= 300 || gradosNormalizados <= 45);
}

// Calcular nivel de riesgo basado en TODOS los factores
function calcularNivelRiesgo(datos) {
    const vientoDireccion = gradosADireccion(datos.wind_direction_10m);
    const vientoVelocidad = datos.wind_speed_10m;
    const temperatura = datos.temperature_2m;
    const presion = datos.surface_pressure;
    
    let nivelBase = 'verde';
    let factores = [];
    
    // FACTOR 1: VIENTO NORTE (principal)
    if (esVientoNortePeligroso(datos.wind_direction_10m)) {
        if (vientoVelocidad > config.umbrales.vientoAlerta) {
            factores.push('viento_norte');
            nivelBase = config.direccionesRiesgo[vientoDireccion].nivel;
            
            // Viento fuerte empeora la situación
            if (vientoVelocidad > config.umbrales.vientoExtremo) {
                factores.push('viento_fuerte');
                if (nivelBase === 'roja') nivelBase = 'negra';
                else if (nivelBase === 'naranja') nivelBase = 'roja';
            }
        }
    }
    
    // FACTOR 2: TEMPERATURA ALTA (aumenta riesgo incendios)
    if (temperatura > config.umbrales.temperaturaAlta) {
        factores.push('temperatura_alta');
        if (nivelBase === 'verde') nivelBase = 'amarilla';
        else if (nivelBase === 'amarilla') nivelBase = 'naranja';
        else if (nivelBase === 'naranja') nivelBase = 'roja';
    }
    
    // FACTOR 3: PRESIÓN BAJA (inestabilidad)
    if (presion < config.umbrales.presionBaja) {
        factores.push('presion_baja');
        if (nivelBase === 'verde') nivelBase = 'amarilla';
        else if (nivelBase === 'amarilla') nivelBase = 'naranja';
    }
    
    console.log(`Factores de riesgo: ${factores.join(', ')} → Nivel: ${nivelBase}`);
    return nivelBase;
}

function actualizarEstadosVariablesReales(datos) {
    const vientoDireccion = gradosADireccion(datos.wind_direction_10m);
    
    // Estado de viento
    let estadoViento = '✅ Normal';
    if (esVientoNortePeligroso(datos.wind_direction_10m) && datos.wind_speed_10m > config.umbrales.vientoAlerta) {
        estadoViento = '🚨 Norte Peligroso';
    } else if (datos.wind_speed_10m > config.umbrales.vientoExtremo) {
        estadoViento = '⚠️ Muy Fuerte';
    } else if (datos.wind_speed_10m > config.umbrales.vientoAlerta) {
        estadoViento = '⚠️ Fuerte';
    }
    document.getElementById('estado-viento-mobile').textContent = estadoViento;

    // Estado de temperatura
    let estadoTemp = '✅ Normal';
    if (datos.temperature_2m > config.umbrales.temperaturaAlta) {
        estadoTemp = '🔥 Alta';
    } else if (datos.temperature_2m > 25) {
        estadoTemp = '⚠️ Elevada';
    }
    document.getElementById('estado-temp-mobile').textContent = estadoTemp;

    // Estado de humedad
    let estadoHumedad = '✅ Normal';
    if (datos.relative_humidity_2m < 30) {
        estadoHumedad = '🌵 Muy Baja';
    } else if (datos.relative_humidity_2m < 40) {
        estadoHumedad = '⚠️ Baja';
    } else if (datos.relative_humidity_2m > 80) {
        estadoHumedad = '💧 Alta';
    }
    document.getElementById('estado-humedad-mobile').textContent = estadoHumedad;

    // Estado de presión
    let estadoPresion = '✅ Estable';
    if (datos.surface_pressure < config.umbrales.presionBaja) {
        estadoPresion = '📉 Baja';
    } else if (datos.surface_pressure > 1020) {
        estadoPresion = '📈 Alta';
    }
    document.getElementById('estado-presion-mobile').textContent = estadoPresion;
}

function actualizarSemaforoConDatosReales(datos) {
    const nivel = calcularNivelRiesgo(datos);
    actualizarSemaforoMobile(nivel);
}

function mostrarMensaje(texto, tipo) {
    console.log(`[${tipo}] ${texto}`);
}

// ===== SISTEMA DE SEMÁFORO =====
function actualizarSemaforoMobile(nivel) {
    // Apagar todas las luces
    document.querySelectorAll('.luz-mobile').forEach(luz => {
        luz.classList.remove('activa', 'alerta-activa');
    });
    
    // Encender luz actual
    const luzActiva = document.getElementById(`luz-${nivel}-mobile`);
    luzActiva.classList.add('activa');
    
    if (nivel !== 'verde') {
        luzActiva.classList.add('alerta-activa');
    }
    
    // Actualizar texto
    const textoEstado = document.getElementById('texto-estado-mobile');
    const descripcionEstado = document.getElementById('descripcion-estado-mobile');
    
    textoEstado.textContent = obtenerTextoEstadoMobile(nivel);
    textoEstado.className = `estado-${nivel}`;
    descripcionEstado.textContent = obtenerDescripcionEstado(nivel);
    
    estadoActual = nivel;
    actualizarTimestamp();
}

function obtenerTextoEstadoMobile(nivel) {
    const estados = {
        'verde': 'NORMAL',
        'amarilla': 'PRECAUCIÓN', 
        'naranja': 'ALERTA',
        'roja': 'ALTA ALERTA',
        'negra': 'EMERGENCIA'
    };
    return estados[nivel] || '--';
}

function obtenerDescripcionEstado(nivel) {
    const descripciones = {
        'verde': 'Condiciones favorables. Bajo riesgo de humo.',
        'amarilla': 'Monitorear condiciones. Factores de riesgo presentes.',
        'naranja': 'Alerta. Posible afectación por humo.',
        'roja': 'Alta alerta. Viento norte con probabilidad de humo en ciudad.',
        'negra': 'Emergencia. Condiciones extremas. Alto riesgo de humo.'
    };
    return descripciones[nivel] || '';
}

// ===== SISTEMA DE CÁMARAS =====
function abrirTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

function abrirCamara(tipo) {
    const links = {
        'norte': 'http://192.168.1.100/camara-norte',
        'sur': 'http://192.168.1.101/camara-sur',
        'este': 'http://192.168.1.102/camara-este', 
        'oeste': 'http://192.168.1.103/camara-oeste'
    };
    
    const url = links[tipo] || '#';
    window.open(url, '_blank');
    
    // Feedback táctil
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

function mostrarCamaras() {
    abrirTab('norte');
    document.querySelector('.camaras-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// ===== FUNCIONES GLOBALES =====
async function actualizarDatos() {
    // Intentar con ECMWF primero, luego fallback
    const exito = await cargarDatosMultiModelo();
    if (!exito) {
        await cargarDatosBasicos();
    }
    
    // Feedback visual
    const btn = event?.target;
    if (btn) {
        btn.style.background = '#2ecc71';
        setTimeout(() => {
            btn.style.background = '';
        }, 1000);
    }
    
    if ('vibrate' in navigator) {
        navigator.vibrate(100);
    }
}

function actualizarTimestamp() {
    const now = new Date();
    document.getElementById('update-time').textContent = 
        now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar semáforo
    actualizarSemaforoMobile('verde');
    
    // Cargar datos iniciales
    actualizarDatos();
    
    // Actualizar cada 10 minutos
    setInterval(actualizarDatos, 600000);
    
    // Prevenir zoom no deseado
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
});
