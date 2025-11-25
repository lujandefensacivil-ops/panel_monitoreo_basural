// Configuración del sistema
const config = {
    direccionesRiesgo: {
        'SE': { nivel: 'roja', desc: 'ALTO RIESGO - Viento directo a ciudad' },
        'SO': { nivel: 'roja', desc: 'ALTO RIESGO - Viento directo a ciudad' },
        'S': { nivel: 'naranja', desc: 'RIESGO MODERADO - Posible afectación' },
        'E': { nivel: 'naranja', desc: 'RIESGO MODERADO - Dirección desfavorable' },
        'NE': { nivel: 'amarilla', desc: 'ATENCIÓN - Monitorear situación' },
        'NO': { nivel: 'amarilla', desc: 'ATENCIÓN - Monitorear situación' },
        'N': { nivel: 'verde', desc: 'SITUACIÓN FAVORABLE' },
        'O': { nivel: 'verde', desc: 'SITUACIÓN FAVORABLE' }
    }
};

// Estado inicial
let estadoActual = 'verde';

// ===== DATOS METEOROLÓGICOS REALES =====
async function cargarDatosReales() {
    try {
        console.log('🌤️ Cargando datos reales...');
        
        // API gratuita para Luján (-34.57, -59.10)
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.57&longitude=-59.10&current=temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,surface_pressure,is_day&wind_speed_unit=km_h&timezone=America%2FSao_Paulo');
        
        if (!response.ok) throw new Error('Error en la API');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('Datos reales recibidos:', current);

        // Actualizar interfaz con datos REALES
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

        // Actualizar estados y semáforo con datos REALES
        actualizarEstadosVariablesReales(current);
        actualizarSemaforoConDatosReales(current);
        
        // Feedback visual
        mostrarMensaje('✅ Datos actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos reales:', error);
        // Fallback a datos simulados
        simularDatosReales();
        mostrarMensaje('⚠️ Usando datos simulados', 'warning');
        return false;
    }
}

function gradosADireccion(grados) {
    const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return direcciones[Math.round(grados / 45) % 8];
}

function actualizarEstadosVariablesReales(datos) {
    // Estado de velocidad de viento
    let estadoViento = 'Normal';
    if (datos.wind_speed_10m > 25) estadoViento = '🚨 Fuerte';
    else if (datos.wind_speed_10m > 15) estadoViento = '⚠️ Moderado';
    document.getElementById('estado-viento-mobile').textContent = estadoViento;

    // Estado de temperatura
    let estadoTemp = 'Normal';
    if (datos.temperature_2m > 35) estadoTemp = '🚨 Alta';
    else if (datos.temperature_2m > 30) estadoTemp = '⚠️ Elevada';
    document.getElementById('estado-temp-mobile').textContent = estadoTemp;

    // Estado de humedad
    let estadoHumedad = 'Normal';
    if (datos.relative_humidity_2m < 30) estadoHumedad = '⚠️ Baja';
    else if (datos.relative_humidity_2m > 80) estadoHumedad = '⚠️ Alta';
    document.getElementById('estado-humedad-mobile').textContent = estadoHumedad;

    // Estado de presión
    let estadoPresion = 'Estable';
    if (datos.surface_pressure < 1000 || datos.surface_pressure > 1020) estadoPresion = '⚠️ Variable';
    document.getElementById('estado-presion-mobile').textContent = estadoPresion;
}

function actualizarSemaforoConDatosReales(datos) {
    const direccion = gradosADireccion(datos.wind_direction_10m);
    const velocidad = datos.wind_speed_10m;
    
    let nivel = 'verde';
    
    // Lógica de riesgo con datos REALES (usa tu configuración existente)
    nivel = config.direccionesRiesgo[direccion].nivel;
    
    // Velocidad empeora el escenario (misma lógica que tenías)
    if (velocidad > 30 && (nivel === 'naranja' || nivel === 'roja')) {
        nivel = 'negra';
    } else if (velocidad > 20 && nivel === 'roja') {
        nivel = 'negra';
    } else if (velocidad > 25) {
        if (nivel === 'verde') nivel = 'amarilla';
        else if (nivel === 'amarilla') nivel = 'naranja';
    }
    
    actualizarSemaforoMobile(nivel);
}

function mostrarMensaje(texto, tipo) {
    console.log(`[${tipo}] ${texto}`);
    // Podés agregar un toast notification aquí después
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
    descripcionEstado.textContent = obtenerDescripcionEstadoMobile(nivel);
    
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

function obtenerDescripcionEstadoMobile(nivel) {
    const descripciones = {
        'verde': 'Sin riesgo de humo',
        'amarilla': 'Monitorear condiciones',
        'naranja': 'Posible afectación',
        'roja': 'Alta probabilidad humo',
        'negra': 'EMERGENCIA ACTIVA'
    };
    return descripciones[nivel] || '';
}

// ===== SISTEMA DE DATOS METEOROLÓGICOS (SIMULADOS COMO FALLBACK) =====
function simularDatosReales() {
    // Velocidad de viento aleatoria
    const velocidad = 10 + Math.random() * 35;
    const direcciones = ['SE', 'SO', 'S', 'E', 'NE', 'NO', 'N', 'O'];
    const direccion = direcciones[Math.floor(Math.random() * direcciones.length)];
    
    // Actualizar displays móviles
    document.getElementById('viento-velocidad-mobile').textContent = `${Math.round(velocidad)} km/h`;
    document.getElementById('viento-direccion-mobile').textContent = direccion;
    
    document.getElementById('temperatura-mobile').textContent = `${Math.round(20 + Math.random() * 15)}°C`;
    document.getElementById('humedad-mobile').textContent = `${Math.round(40 + Math.random() * 40)}%`;
    document.getElementById('presion-mobile').textContent = `${Math.round(1000 + Math.random() * 30)} hPa`;
    
    // Actualizar estados individuales
    actualizarEstadosVariables(velocidad, direccion);
    
    // Actualizar semáforo basado en condiciones
    actualizarSemaforoAutomatico(velocidad, direccion);
    
    actualizarTimestamp();
}

function actualizarEstadosVariables(velocidad, direccion) {
    // Estado de velocidad de viento
    let estadoVientoVel = 'Normal';
    if (velocidad > 30) estadoVientoVel = '🚨 Alto';
    else if (velocidad > 20) estadoVientoVel = '⚠️ Moderado';
    document.getElementById('estado-viento-mobile').textContent = estadoVientoVel;
    
    // Estado de dirección de viento
    const estadoDir = config.direccionesRiesgo[direccion];
    document.getElementById('estado-viento-mobile').textContent = estadoDir.desc.split(' - ')[0];
    
    // Simular otros estados
    document.getElementById('estado-temp-mobile').textContent = 'Normal';
    document.getElementById('estado-humedad-mobile').textContent = 'Normal';
    document.getElementById('estado-presion-mobile').textContent = 'Estable';
}

function actualizarSemaforoAutomatico(velocidad, direccion) {
    let nivel = 'verde';
    
    // Dirección es el factor principal
    nivel = config.direccionesRiesgo[direccion].nivel;
    
    // Velocidad empeora el escenario
    if (velocidad > 30 && (nivel === 'naranja' || nivel === 'roja')) {
        nivel = 'negra';
    } else if (velocidad > 20 && nivel === 'roja') {
        nivel = 'negra';
    } else if (velocidad > 25) {
        if (nivel === 'verde') nivel = 'amarilla';
        else if (nivel === 'amarilla') nivel = 'naranja';
    }
    
    actualizarSemaforoMobile(nivel);
}

// ===== SISTEMA EARTH ENGINE (SIMULADO) =====
class EarthEngineMonitor {
    constructor() {
        this.coordenadasLujan = [-59.105, -34.570];
        this.datos = {};
    }

    async cargarDatosSatelitales() {
        this.mostrarEstado('Cargando datos satelitales...');
        
        try {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.datos.temperaturaSuperficial = this.simularTemperatura();
            this.datos.humedadSuelo = this.simularHumedad();
            this.datos.aerosoles = this.simularAerosoles();
            this.datos.co = this.simularCO();
            this.datos.puntosCalientes = this.simularPuntosCalientes();
            this.datos.ndvi = this.simularNDVI();
            
            this.actualizarUI();
            this.mostrarEstado('Datos actualizados correctamente');
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.mostrarEstado('Error cargando datos satelitales', 'error');
        }
    }

    simularTemperatura() {
        const base = 25;
        const variacion = (Math.random() - 0.5) * 15;
        const temperatura = base + variacion;
        
        return {
            valor: Math.round(temperatura * 10) / 10,
            unidad: '°C',
            riesgo: temperatura > 35 ? 'alto' : temperatura > 30 ? 'medio' : 'bajo',
            timestamp: new Date()
        };
    }

    simularHumedad() {
        const humedad = 20 + Math.random() * 40;
        
        return {
            valor: Math.round(humedad),
            unidad: '%',
            riesgo: humedad < 25 ? 'alto' : humedad < 35 ? 'medio' : 'bajo',
            timestamp: new Date()
        };
    }

    simularAerosoles() {
        const base = 15;
        const variacion = Math.random() * 30;
        
        return {
            valor: Math.round(base + variacion),
            unidad: 'μg/m³',
            calidad: base + variacion > 35 ? 'mala' : base + variacion > 20 ? 'moderada' : 'buena',
            timestamp: new Date()
        };
    }

    simularCO() {
        const co = 0.01 + Math.random() * 0.05;
        
        return {
            valor: co.toFixed(4),
            unidad: 'mol/m²',
            riesgo: co > 0.04 ? 'alto' : co > 0.02 ? 'medio' : 'bajo',
            timestamp: new Date()
        };
    }

    simularPuntosCalientes() {
        const probabilidadIncendio = 0.1;
        const puntos = Math.random() < probabilidadIncendio ? Math.floor(Math.random() * 5) + 1 : 0;
        
        return {
            valor: puntos,
            unidad: 'puntos',
            alerta: puntos > 0,
            timestamp: new Date()
        };
    }

    simularNDVI() {
        const ndvi = 0.3 + Math.random() * 0.5;
        
        return {
            valor: ndvi.toFixed(2),
            unidad: 'índice',
            salud: ndvi > 0.6 ? 'alta' : ndvi > 0.4 ? 'media' : 'baja',
            timestamp: new Date()
        };
    }

    actualizarUI() {
        // Temperatura superficial
        const temp = this.datos.temperaturaSuperficial;
        document.getElementById('temp-superficial').textContent = `${temp.valor} ${temp.unidad}`;
        document.getElementById('update-temp').textContent = this.formatearHora(temp.timestamp);
        document.getElementById('status-temp').textContent = this.getTextoRiesgo(temp.riesgo);
        document.getElementById('status-temp').className = `satelite-status riesgo-${temp.riesgo}`;

        // Humedad suelo
        const humedad = this.datos.humedadSuelo;
        document.getElementById('humedad-suelo').textContent = `${humedad.valor} ${humedad.unidad}`;
        document.getElementById('update-humedad').textContent = this.formatearHora(humedad.timestamp);
        document.getElementById('status-humedad').textContent = this.getTextoRiesgo(humedad.riesgo);
        document.getElementById('status-humedad').className = `satelite-status riesgo-${humedad.riesgo}`;

        // Aerosoles
        const aerosoles = this.datos.aerosoles;
        document.getElementById('aerosoles').textContent = `${aerosoles.valor} ${aerosoles.unidad}`;
        document.getElementById('update-aire').textContent = this.formatearHora(aerosoles.timestamp);
        document.getElementById('status-aire').textContent = `Calidad ${aerosoles.calidad}`;
        document.getElementById('status-aire').className = `satelite-status calidad-${aerosoles.calidad}`;

        // Monóxido de carbono
        const co = this.datos.co;
        document.getElementById('co').textContent = `${co.valor} ${co.unidad}`;
        document.getElementById('update-co').textContent = this.formatearHora(co.timestamp);
        document.getElementById('status-co').textContent = this.getTextoRiesgo(co.riesgo);
        document.getElementById('status-co').className = `satelite-status riesgo-${co.riesgo}`;

        // Puntos calientes
        const fuego = this.datos.puntosCalientes;
        document.getElementById('puntos-calientes').textContent = fuego.valor;
        document.getElementById('status-fuego').textContent = 
            fuego.alerta ? `🚨 ${fuego.valor} puntos detectados` : 'Sin detecciones';
        document.getElementById('status-fuego').className = `satelite-status ${fuego.alerta ? 'alerta-activa' : ''}`;

        // NDVI
        const ndvi = this.datos.ndvi;
        document.getElementById('ndvi').textContent = ndvi.valor;
        document.getElementById('update-ndvi').textContent = this.formatearHora(ndvi.timestamp);
        document.getElementById('status-ndvi').textContent = `Salud ${ndvi.salud}`;
        document.getElementById('status-ndvi').className = `satelite-status salud-${ndvi.salud}`;
    }

    getTextoRiesgo(riesgo) {
        const textos = {
            'alto': '🚨 Riesgo Alto',
            'medio': '⚠️ Riesgo Medio', 
            'bajo': '✅ Riesgo Bajo'
        };
        return textos[riesgo] || 'Desconocido';
    }

    formatearHora(fecha) {
        return fecha.toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    mostrarEstado(mensaje, tipo = 'info') {
        console.log(`[EarthEngine] ${mensaje}`);
    }
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
    const exito = await cargarDatosReales();  // ← Usar datos REALES primero
    if (!exito) {
        simularDatosReales();  // ← Fallback a simulados si falla
    }
    cargarDatosSatelitales();
    
    // Feedback visual
    const btn = event.target;
    btn.style.background = '#2ecc71';
    setTimeout(() => {
        btn.style.background = '';
    }, 1000);
    
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
const monitorSatelital = new EarthEngineMonitor();

// Función global para cargar datos satelitales
function cargarDatosSatelitales() {
    monitorSatelital.cargarDatosSatelitales();
    
    if ('vibrate' in navigator) {
        navigator.vibrate(100);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar semáforo
    actualizarSemaforoMobile('verde');
    
    // Cargar datos iniciales - PRIMERO datos REALES
    cargarDatosReales().then(exito => {
        if (!exito) {
            simularDatosReales();  // Fallback si fallan los datos reales
        }
    });
    cargarDatosSatelitales();
    
    // Actualizar cada 5 minutos (datos reales)
    setInterval(() => {
        cargarDatosReales().then(exito => {
            if (!exito) {
                simularDatosReales();
            }
        });
    }, 300000);  // 5 minutos
    
    // Actualizar datos satelitales cada minuto
    setInterval(() => monitorSatelital.cargarDatosSatelitales(), 60000);
    
    // Prevenir zoom no deseado
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
});
