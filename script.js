// Configuración del sistema MEJORADA
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
        vientoAlerta: 10,
        vientoExtremo: 25,
        temperaturaAlta: 30,
        presionBaja: 1012
    },
    
    // Configuración de APIs (MÁS ROBUSTA)
    apis: {
        openMeteo: 'https://api.open-meteo.com/v1/forecast',
        airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        // Removemos OpenWeatherMap que requiere API key
    }
};

// Estado inicial
let estadoActual = 'verde';
let ubicacionActual = { lat: -34.57, lon: -59.10 }; // Coordenadas por defecto

// ===== FUNCIONES AUXILIARES (MANTENER IGUAL) =====
function gradosADireccion(grados) {
    if (grados === undefined || grados === null) return '--';
    const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round((grados % 360) / 45) % 8;
    return direcciones[index];
}

function esVientoNortePeligroso(grados) {
    if (grados === undefined || grados === null) return false;
    const gradosNormalizados = (grados + 360) % 360;
    return (gradosNormalizados >= 300 || gradosNormalizados <= 45);
}

function calcularNivelRiesgo(datos) {
    if (!datos) return 'verde';
    
    const vientoDireccion = gradosADireccion(datos.wind_direction_10m);
    const vientoVelocidad = datos.wind_speed_10m || 0;
    const temperatura = datos.temperature_2m || 0;
    const presion = datos.surface_pressure || 1013;
    
    let nivelBase = 'verde';
    
    // FACTOR 1: VIENTO NORTE (principal)
    if (esVientoNortePeligroso(datos.wind_direction_10m)) {
        if (vientoVelocidad > config.umbrales.vientoAlerta) {
            nivelBase = config.direccionesRiesgo[vientoDireccion]?.nivel || 'roja';
            
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

// ===== SISTEMA DE DATOS METEOROLÓGICOS CORREGIDO =====
async function cargarDatosMeteorologicos() {
    try {
        console.log('🌤️ Cargando datos meteorológicos...');
        
        // USAMOS SOLO OPEN-METEO (más confiable y sin API key)
        const response = await fetch(
            `${config.apis.openMeteo}?latitude=${ubicacionActual.lat}&longitude=${ubicacionActual.lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=America%2FSao_Paulo`
        );
        
        if (!response.ok) throw new Error('Error en API meteorológica');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('Datos meteorológicos recibidos:', current);

        // Actualizar interfaz
        document.getElementById('viento-velocidad-mobile').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('viento-direccion-mobile').textContent = gradosADireccion(current.wind_direction_10m);
        document.getElementById('temperatura-mobile').textContent = `${Math.round(current.temperature_2m)}°C`;
        document.getElementById('humedad-mobile').textContent = `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('presion-mobile').textContent = `${Math.round(current.surface_pressure)} hPa`;

        actualizarEstadosVariablesReales(current);
        const nivel = calcularNivelRiesgo(current);
        actualizarSemaforoMobile(nivel);
        
        mostrarMensaje('✅ Datos meteorológicos actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos meteorológicos:', error);
        
        // Datos de ejemplo como último recurso
        document.getElementById('viento-velocidad-mobile').textContent = '-- km/h';
        document.getElementById('viento-direccion-mobile').textContent = '--';
        document.getElementById('temperatura-mobile').textContent = '--°C';
        document.getElementById('humedad-mobile').textContent = '--%';
        document.getElementById('presion-mobile').textContent = '-- hPa';
        
        mostrarMensaje('❌ Error cargando datos meteorológicos', 'error');
        return false;
    }
}

// ===== SISTEMA DE DATOS AMBIENTALES CORREGIDO =====
class MonitorAmbiental {
    constructor() {
        this.coordenadasBasural = {
            lat: -34.521444,
            lon: -59.118778
        };
        this.ultimaActualizacion = null;
    }

    async cargarTodosLosDatos() {
        try {
            console.log('🛰️ Cargando todos los datos ambientales...');
            
            // Cargamos todo en una sola llamada para mayor eficiencia
            const urls = [
                `${config.apis.openMeteo}?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=soil_temperature_0cm,soil_moisture_0_1cm&timezone=America%2FSao_Paulo`,
                `${config.apis.airQuality}?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=pm2_5&timezone=America%2FSao_Paulo`
            ];

            const [meteoResponse, aireResponse] = await Promise.allSettled([
                fetch(urls[0]),
                fetch(urls[1])
            ]);

            let tempSuperficial = null;
            let humedadSuelo = null;
            let calidadAire = null;

            // Procesar temperatura y humedad
            if (meteoResponse.status === 'fulfilled' && meteoResponse.value.ok) {
                const data = await meteoResponse.value.json();
                tempSuperficial = data.hourly.soil_temperature_0cm[0];
                humedadSuelo = data.hourly.soil_moisture_0_1cm[0];
            }

            // Procesar calidad del aire
            if (aireResponse.status === 'fulfilled' && aireResponse.value.ok) {
                const data = await aireResponse.value.json();
                calidadAire = data.hourly.pm2_5[0];
            }

            // Actualizar interfaz
            this.actualizarInterfazAmbiental(tempSuperficial, humedadSuelo, calidadAire);
            
            // Cargar puntos calientes por separado
            await this.cargarPuntosCalientes();
            
            this.ultimaActualizacion = new Date();
            return true;
            
        } catch (error) {
            console.error('Error cargando datos ambientales:', error);
            return false;
        }
    }

    actualizarInterfazAmbiental(temp, humedad, aire) {
        const timestamp = this.formatearHora(new Date());
        
        // Temperatura superficial
        if (temp !== null) {
            document.getElementById('temp-superficial').textContent = `${Math.round(temp)}°C`;
            document.getElementById('update-temp').textContent = timestamp;
            
            let riesgo = 'bajo';
            if (temp > 40) riesgo = 'alto';
            else if (temp > 35) riesgo = 'medio';
            
            document.getElementById('status-temp').textContent = this.getTextoRiesgo(riesgo);
            document.getElementById('status-temp').className = `satelite-status riesgo-${riesgo}`;
        } else {
            document.getElementById('temp-superficial').textContent = '--°C';
            document.getElementById('status-temp').textContent = 'Sin datos';
        }

        // Humedad del suelo
        if (humedad !== null) {
            const humedadPorcentaje = Math.round(humedad * 100);
            document.getElementById('humedad-suelo').textContent = `${humedadPorcentaje}%`;
            document.getElementById('update-humedad').textContent = timestamp;
            
            let riesgo = 'bajo';
            if (humedadPorcentaje < 20) riesgo = 'alto';
            else if (humedadPorcentaje < 30) riesgo = 'medio';
            
            document.getElementById('status-humedad').textContent = this.getTextoRiesgo(riesgo);
            document.getElementById('status-humedad').className = `satelite-status riesgo-${riesgo}`;
        } else {
            document.getElementById('humedad-suelo').textContent = '--%';
            document.getElementById('status-humedad').textContent = 'Sin datos';
        }

        // Calidad del aire
        if (aire !== null) {
            document.getElementById('aerosoles').textContent = `${Math.round(aire)} μg/m³`;
            document.getElementById('update-aire').textContent = timestamp;
            
            let calidad = 'buena';
            if (aire > 35) calidad = 'mala';
            else if (aire > 20) calidad = 'moderada';
            
            document.getElementById('status-aire').textContent = `Calidad ${calidad}`;
            document.getElementById('status-aire').className = `satelite-status calidad-${calidad}`;
        } else {
            document.getElementById('aerosoles').textContent = '-- μg/m³';
            document.getElementById('status-aire').textContent = 'Error datos';
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
            
            const north = this.coordenadasBasural.lat + 0.1; // Área más amplia
            const south = this.coordenadasBasural.lat - 0.1;
            const east = this.coordenadasBasural.lon + 0.1;
            const west = this.coordenadasBasural.lon - 0.1;
            
            // URL de FIRMS con área más amplia
            const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/61b2a42d5e243f73c216b5a8997c4f3b/MODIS_NRT/${north},${west},${south},${east}/1/${fechaAyer},${fechaHoy}`;
            
            const response = await fetch(firmsUrl);
            
            if (response.ok) {
                const csv = await response.text();
                const lineas = csv.split('\n').filter(line => line.trim() !== '');
                const puntos = Math.max(0, lineas.length - 1);
                
                document.getElementById('puntos-calientes').textContent = puntos;
                document.getElementById('update-fuego').textContent = this.formatearHora(new Date());
                
                if (puntos > 0) {
                    document.getElementById('status-fuego').textContent = `🚨 ${puntos} puntos detectados`;
                    document.getElementById('status-fuego').className = 'satelite-status alerta-activa';
                    
                    // ACTIVAR ALERTA MÁXIMA
                    actualizarSemaforoMobile('negra');
                    mostrarMensaje('🚨 INCENDIO DETECTADO EN ZONA', 'emergencia');
                    
                    if ('vibrate' in navigator) {
                        navigator.vibrate([500, 200, 500, 200, 500]);
                    }
                } else {
                    document.getElementById('status-fuego').textContent = 'Sin detecciones';
                    document.getElementById('status-fuego').className = 'satelite-status';
                }
                
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

// ===== SISTEMA DE CÁMARAS MEJORADO =====
function abrirCamara(tipo) {
    const links = {
        'norte': '#', // ❌ Reemplaza con URLs reales accesibles desde internet
        'sur': '#',
        'este': '#', 
        'oeste': '#'
    };
    
    const url = links[tipo];
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        alert('Cámara no configurada para acceso remoto');
    }
}

// ===== FUNCIONES GLOBALES =====
async function actualizarDatos() {
    console.log('🔄 Actualizando todos los datos...');
    
    await cargarDatosMeteorologicos();
    await monitorAmbiental.cargarTodosLosDatos();
    
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
    
    actualizarTimestamp();
}

// ===== INICIALIZACIÓN =====
const monitorAmbiental = new MonitorAmbiental();

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de monitoreo...');
    actualizarSemaforoMobile('verde');
    actualizarDatos();
    
    // Actualizar cada 10 minutos
    setInterval(actualizarDatos, 600000);
    
    // Prevenir zoom con doble toque
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
});

// Mantener las funciones que no mostré aquí (actualizarEstadosVariablesReales, 
// actualizarSemaforoMobile, mostrarMensaje, etc.) ya que están correctas en tu código original.

