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

// ===== DATOS METEOROLÓGICOS REALES =====
async function cargarDatosReales() {
    try {
        console.log('🌤️ Cargando datos meteorológicos...');
        
        // Open-Meteo con datos ECMWF
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.57&longitude=-59.10&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=America%2FSao_Paulo');
        
        if (!response.ok) throw new Error('Error en la API');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('Datos meteorológicos recibidos:', current);

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

        // Actualizar estados individuales
        actualizarEstadosVariablesReales(current);
        
        // Calcular nivel de alerta
        actualizarSemaforoConDatosReales(current);
        
        mostrarMensaje('✅ Datos meteorológicos actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarMensaje('❌ Error cargando datos meteorológicos', 'error');
        return false;
    }
}

// ===== SISTEMA DE DATOS AMBIENTALES QUE SÍ FUNCIONAN =====
class MonitorAmbiental {
    constructor() {
        this.coordenadasBasural = {
            lat: -34.521444,
            lon: -59.118778
        };
    }

    async cargarTemperaturaSuperficial() {
        try {
            console.log('🌡️ Cargando temperatura superficial...');
            
            // Usamos Open-Meteo pero con parámetros correctos
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=soil_temperature_0cm&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            
            // Tomar la temperatura actual (primer valor del array)
            const temp = data.hourly.soil_temperature_0cm[0];
            
            if (temp && temp !== null) {
                document.getElementById('temp-superficial').textContent = `${Math.round(temp)}°C`;
                document.getElementById('update-temp').textContent = this.formatearHora(new Date());
                
                let riesgo = 'bajo';
                if (temp > 40) riesgo = 'alto';
                else if (temp > 35) riesgo = 'medio';
                
                document.getElementById('status-temp').textContent = this.getTextoRiesgo(riesgo);
                document.getElementById('status-temp').className = `satelite-status riesgo-${riesgo}`;
                
                console.log(`Temperatura superficial: ${temp}°C`);
                return true;
            } else {
                throw new Error('Datos no disponibles');
            }
            
        } catch (error) {
            console.error('Error temperatura superficial:', error);
            document.getElementById('temp-superficial').textContent = '--°C';
            document.getElementById('status-temp').textContent = 'Sin datos';
            return false;
        }
    }

    async cargarHumedadSuelo() {
        try {
            console.log('💧 Cargando humedad del suelo...');
            
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=soil_moisture_0_1cm&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            
            // soil_moisture viene en m³/m³, convertimos a porcentaje
            const humedadRaw = data.hourly.soil_moisture_0_1cm[0];
            const humedadPorcentaje = Math.round(humedadRaw * 100);
            
            if (humedadRaw && humedadRaw !== null) {
                document.getElementById('humedad-suelo').textContent = `${humedadPorcentaje}%`;
                document.getElementById('update-humedad').textContent = this.formatearHora(new Date());
                
                let riesgo = 'bajo';
                if (humedadPorcentaje < 20) riesgo = 'alto';  // Muy seco = más inflamable
                else if (humedadPorcentaje < 30) riesgo = 'medio';
                
                document.getElementById('status-humedad').textContent = this.getTextoRiesgo(riesgo);
                document.getElementById('status-humedad').className = `satelite-status riesgo-${riesgo}`;
                
                console.log(`Humedad suelo: ${humedadPorcentaje}% (raw: ${humedadRaw})`);
                return true;
            } else {
                throw new Error('Datos no disponibles');
            }
            
        } catch (error) {
            console.error('Error humedad suelo:', error);
            document.getElementById('humedad-suelo').textContent = '--%';
            document.getElementById('status-humedad').textContent = 'Sin datos';
            return false;
        }
    }

    async cargarCalidadAire() {
        try {
            console.log('🌫️ Cargando calidad del aire...');
            
            const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=pm2_5&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            const pm25 = data.hourly.pm2_5[0];
            
            let calidad = 'buena';
            if (pm25 > 35) calidad = 'mala';
            else if (pm25 > 20) calidad = 'moderada';
            
            document.getElementById('aerosoles').textContent = `${Math.round(pm25)} μg/m³`;
            document.getElementById('update-aire').textContent = this.formatearHora(new Date());
            document.getElementById('status-aire').textContent = `Calidad ${calidad}`;
            document.getElementById('status-aire').className = `satelite-status calidad-${calidad}`;
            
            console.log(`Calidad aire: PM2.5 = ${pm25}, Calidad = ${calidad}`);
            return true;
            
        } catch (error) {
            console.error('Error calidad aire:', error);
            document.getElementById('aerosoles').textContent = '-- μg/m³';
            document.getElementById('status-aire').textContent = 'Error datos';
            return false;
        }
    }

    async cargarPuntosCalientes() {
        try {
            console.log('🔥 Buscando puntos calientes...');
            
            const hoy = new Date();
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            
            const fechaAyer = ayer.toISOString().split('T')[0].replace(/-/g, '');
            const fechaHoy = hoy.toISOString().split('T')[0].replace(/-/g, '');
            
            const north = this.coordenadasBasural.lat + 0.00405;
            const south = this.coordenadasBasural.lat - 0.00405;
            const east = this.coordenadasBasural.lon + 0.00405;
            const west = this.coordenadasBasural.lon - 0.00405;
            
            const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/61b2a42d5e243f73c216b5a8997c4f3b/MODIS_NRT,${north},${west},${south},${east}/${fechaAyer},${fechaHoy}`;
            
            const response = await fetch(firmsUrl);
            
            if (response.ok) {
                const csv = await response.text();
                const lineas = csv.split('\n').filter(line => line.trim() !== '');
                const puntos = Math.max(0, lineas.length - 1);
                
                document.getElementById('puntos-calientes').textContent = puntos;
                document.getElementById('update-fuego').textContent = this.formatearHora(new Date());
                
                if (puntos > 0) {
                    document.getElementById('status-fuego').textContent = `🚨 ${puntos} puntos en BASURAL`;
                    document.getElementById('status-fuego').className = 'satelite-status alerta-activa';
                    
                    // ACTIVAR ALERTA MÁXIMA
                    actualizarSemaforoMobile('negra');
                    mostrarMensaje('🚨 INCENDIO DETECTADO EN BASURAL', 'emergencia');
                    
                    if ('vibrate' in navigator) {
                        navigator.vibrate([500, 200, 500, 200, 500]);
                    }
                } else {
                    document.getElementById('status-fuego').textContent = 'Sin detecciones';
                    document.getElementById('status-fuego').className = 'satelite-status';
                }
                
                console.log(`Puntos calientes: ${puntos}`);
                return true;
                
            } else {
                document.getElementById('status-fuego').textContent = 'Error NASA FIRMS';
                return false;
            }
            
        } catch (error) {
            console.error('Error FIRMS:', error);
            document.getElementById('status-fuego').textContent = 'Error cargando';
            return false;
        }
    }

    formatearHora(fecha) {
        return fecha.toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    getTextoRiesgo(riesgo) {
        const textos = {
            'alto': '🚨 Riesgo Alto',
            'medio': '⚠️ Riesgo Medio', 
            'bajo': '✅ Riesgo Bajo'
        };
        return textos[riesgo] || 'Desconocido';
    }
}

// ===== FUNCIONES AUXILIARES =====
function gradosADireccion(grados) {
    const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return direcciones[Math.round((grados % 360) / 45) % 8];
}

function esVientoNortePeligroso(grados) {
    const gradosNormalizados = (grados + 360) % 360;
    return (gradosNormalizados >= 300 || gradosNormalizados <= 45);
}

function calcularNivelRiesgo(datos) {
    const vientoDireccion = gradosADireccion(datos.wind_direction_10m);
    const vientoVelocidad = datos.wind_speed_10m;
    const temperatura = datos.temperature_2m;
    const presion = datos.surface_pressure;
    
    let nivelBase = 'verde';
    
    // FACTOR 1: VIENTO NORTE (principal)
    if (esVientoNortePeligroso(datos.wind_direction_10m)) {
        if (vientoVelocidad > config.umbrales.vientoAlerta) {
            nivelBase = config.direccionesRiesgo[vientoDireccion].nivel;
            
            if (vientoVelocidad > config.umbrales.vientoExtremo) {
                if (nivelBase === 'roja') nivelBase = 'negra';
                else if (nivelBase === 'naranja') nivelBase = 'roja';
            }
        }
    }
    
    // FACTOR 2: TEMPERATURA ALTA
    if (temperatura > config.umbrales.temperaturaAlta) {
        if (nivelBase === 'verde') nivelBase = 'amarilla';
        else if (nivelBase === 'amarilla') nivelBase = 'naranja';
        else if (nivelBase === 'naranja') nivelBase = 'roja';
    }
    
    // FACTOR 3: PRESIÓN BAJA
    if (presion < config.umbrales.presionBaja) {
        if (nivelBase === 'verde') nivelBase = 'amarilla';
        else if (nivelBase === 'amarilla') nivelBase = 'naranja';
    }
    
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
    }
    document.getElementById('estado-humedad-mobile').textContent = estadoHumedad;

    // Estado de presión
    let estadoPresion = '✅ Estable';
    if (datos.surface_pressure < config.umbrales.presionBaja) {
        estadoPresion = '📉 Baja';
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
    document.querySelectorAll('.luz-mobile').forEach(luz => {
        luz.classList.remove('activa', 'alerta-activa');
    });
    
    const luzActiva = document.getElementById(`luz-${nivel}-mobile`);
    luzActiva.classList.add('activa');
    
    if (nivel !== 'verde') {
        luzActiva.classList.add('alerta-activa');
    }
    
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
}

function mostrarCamaras() {
    abrirTab('norte');
    document.querySelector('.camaras-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// ===== FUNCIONES GLOBALES =====
async function actualizarDatos() {
    await cargarDatosReales();  // Datos meteorológicos
    await monitorAmbiental.cargarTemperaturaSuperficial();
    await monitorAmbiental.cargarHumedadSuelo(); 
    await monitorAmbiental.cargarCalidadAire();
    await monitorAmbiental.cargarPuntosCalientes();
    
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
const monitorAmbiental = new MonitorAmbiental();

document.addEventListener('DOMContentLoaded', function() {
    actualizarSemaforoMobile('verde');
    actualizarDatos();
    setInterval(actualizarDatos, 600000); // 10 minutos
    
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
});
