// Configuración del sistema MEJORADA
const config = {
    // Direcciones de VIENTO que traen humo a la ciudad
    direccionesRiesgo: {
        'SE': { nivel: 'roja', desc: 'ALTO RIESGO - Viento directo a ciudad' },
        'SO': { nivel: 'roja', desc: 'ALTO RIESGO - Viento directo a ciudad' },
        'S': { nivel: 'naranja', desc: 'RIESGO MODERADO - Posible afectación' },
        'E': { nivel: 'naranja', desc: 'RIESGO MODERADO - Dirección desfavorable' },
        'NE': { nivel: 'amarilla', desc: 'ATENCIÓN - Monitorear situación' },
        'NO': { nivel: 'amarilla', desc: 'ATENCIÓN - Monitorear situación' },
        'N': { nivel: 'verde', desc: 'SITUACIÓN FAVORABLE' },
        'O': { nivel: 'verde', desc: 'SITUACIÓN FAVORABLE' }
    },
    
    // Umbrales de riesgo
    umbrales: {
        vientoAlerta: 10,
        vientoExtremo: 25,
        temperaturaAlta: 30,
        presionBaja: 1012
    },
    
    // Configuración de APIs
    apis: {
        openMeteo: 'https://api.open-meteo.com/v1/forecast',
        airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        openWeather: 'https://api.openweathermap.org/data/2.5/weather'
    }
};

// Estado inicial
let estadoActual = 'verde';
let ubicacionActual = { lat: -34.57, lon: -59.10 }; // Coordenadas Luján
let pronosticoVisible = false;

// ===== FUNCIONES AUXILIARES =====
function gradosADireccion(grados) {
    if (grados === undefined || grados === null) return '--';
    const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round((grados % 360) / 45) % 8;
    return direcciones[index];
}

function esVientoPeligroso(grados) {
    if (grados === undefined || grados === null) return false;
    const gradosNormalizados = (grados + 360) % 360;
    // SE (135°) a SO (225°) son direcciones peligrosas
    return (gradosNormalizados >= 135 && gradosNormalizados <= 225);
}

function calcularNivelRiesgo(datos) {
    if (!datos) return 'verde';
    
    const vientoDireccion = gradosADireccion(datos.wind_direction_10m);
    const vientoVelocidad = datos.wind_speed_10m || 0;
    const temperatura = datos.temperature_2m || 0;
    const presion = datos.surface_pressure || 1013;
    
    let nivelBase = 'verde';
    
    // FACTOR 1: VIENTO PELIGROSO (principal)
    if (esVientoPeligroso(datos.wind_direction_10m)) {
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

function actualizarEstadosVariablesReales(datos) {
    if (!datos) return;
    
    const vientoDireccion = gradosADireccion(datos.wind_direction_10m);
    
    // Estado de viento
    let estadoViento = '✅ Normal';
    if (esVientoPeligroso(datos.wind_direction_10m) && datos.wind_speed_10m > config.umbrales.vientoAlerta) {
        estadoViento = '🚨 Peligroso';
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

function mostrarMensaje(texto, tipo) {
    console.log(`[${tipo}] ${texto}`);
}

// ===== SISTEMA DE PRONÓSTICO INTEGRADO =====
function togglePronostico() {
    const panel = document.getElementById('panel-pronostico-integrado');
    const boton = event.target;
    
    if (!pronosticoVisible) {
        panel.style.display = 'block';
        boton.textContent = '📅 Ocultar Pronóstico';
        cargarPronosticoIntegrado();
        pronosticoVisible = true;
    } else {
        panel.style.display = 'none';
        boton.textContent = '📅 Ver Pronóstico 48hs';
        pronosticoVisible = false;
    }
}

async function cargarPronosticoIntegrado() {
    try {
        const contenido = document.getElementById('contenido-pronostico-integrado');
        contenido.innerHTML = '<div class="loading">🔄 Cargando pronóstico...</div>';
        
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${ubicacionActual.lat}&longitude=${ubicacionActual.lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&forecast_days=3&timezone=America%2FSao_Paulo`
        );
        
        if (!response.ok) throw new Error('Error en pronóstico');
        
        const data = await response.json();
        mostrarPronosticoIntegrado(data);
        
    } catch (error) {
        console.error('Error cargando pronóstico:', error);
        document.getElementById('contenido-pronostico-integrado').innerHTML = 
            '<div class="error">❌ Error cargando pronóstico</div>';
    }
}

function mostrarPronosticoIntegrado(data) {
    const contenido = document.getElementById('contenido-pronostico-integrado');
    const horas = data.hourly.time;
    
    const pronosticoPorDia = {};
    
    horas.forEach((hora, index) => {
        if (index >= 48) return;
        
        const fecha = new Date(hora);
        const diaKey = fecha.toLocaleDateString('es-AR');
        const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit' });
        
        if (!pronosticoPorDia[diaKey]) {
            pronosticoPorDia[diaKey] = [];
        }
        
        const temp = data.hourly.temperature_2m[index];
        const vientoVel = data.hourly.wind_speed_10m[index];
        const vientoDir = data.hourly.wind_direction_10m[index];
        const humedad = data.hourly.relative_humidity_2m[index];
        
        const direccionViento = gradosADireccion(vientoDir);
        const esRiesgoso = esVientoPeligroso(vientoDir) && vientoVel > config.umbrales.vientoAlerta;
        const esAlerta = esVientoPeligroso(vientoDir);
        
        pronosticoPorDia[diaKey].push({
            hora: horaStr,
            temp,
            vientoVel,
            vientoDir: direccionViento,
            humedad,
            esRiesgoso,
            esAlerta
        });
    });
    
    let html = '';
    
    Object.keys(pronosticoPorDia).forEach(dia => {
        const datosDia = pronosticoPorDia[dia];
        const fecha = new Date(dia);
        const diaSemana = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
        
        html += `<div class="dia-pronostico">
                    <h5>${diaSemana} (${dia})</h5>
                    <div class="grid-pronostico">`;
        
        const horasClave = datosDia.filter((dato, index) => 
            index % 6 === 0 || dato.esRiesgoso
        ).slice(0, 8);
        
        horasClave.forEach(dato => {
            const claseRiesgo = dato.esRiesgoso ? 'riesgo' : dato.esAlerta ? 'alerta' : '';
            
            html += `
                <div class="item-pronostico ${claseRiesgo}">
                    <div class="hora-pronostico">${dato.hora}hs</div>
                    <div class="datos-pronostico">
                        <div class="dato-pronostico">🌡️ ${dato.temp}°C</div>
                        <div class="dato-pronostico">🌬️ ${dato.vientoVel} km/h</div>
                        <div class="dato-pronostico">💧 ${dato.humedad}%</div>
                        <div class="dato-pronostico">🧭 ${dato.vientoDir}</div>
                    </div>
                    ${dato.esRiesgoso ? '<div class="riesgo-badge">RIESGO HUMO</div>' : ''}
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    contenido.innerHTML = html;
}

// ===== SISTEMA DE DATOS METEOROLÓGICOS CON FALLBACK =====
async function cargarDatosMeteorologicos() {
    try {
        console.log('🌤️ Cargando datos meteorológicos...');
        
        // INTENTO 1: Open-Meteo (principal)
        const response = await fetch(
            `${config.apis.openMeteo}?latitude=${ubicacionActual.lat}&longitude=${ubicacionActual.lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=America%2FSao_Paulo`
        );
        
        if (!response.ok) throw new Error('Error en Open-Meteo');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('✅ Datos Open-Meteo recibidos:', current);

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
        console.error('❌ Error Open-Meteo:', error);
        return await cargarDatosMeteorologicosFallback();
    }
}

async function cargarDatosMeteorologicosFallback() {
    try {
        console.log('🔄 Intentando con API alternativa...');
        
        // INTENTO 2: WeatherAPI alternativa (ejemplo con otra API)
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${ubicacionActual.lat}&longitude=${ubicacionActual.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Error en API alternativa');
        
        const data = await response.json();
        const current = data.current;
        
        console.log('✅ Datos alternativa recibidos:', current);

        // Actualizar interfaz
        document.getElementById('viento-velocidad-mobile').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('viento-direccion-mobile').textContent = gradosADireccion(current.wind_direction_10m);
        document.getElementById('temperatura-mobile').textContent = `${Math.round(current.temperature_2m)}°C`;
        document.getElementById('humedad-mobile').textContent = `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('presion-mobile').textContent = '1013 hPa'; // Valor por defecto

        actualizarEstadosVariablesReales(current);
        const nivel = calcularNivelRiesgo(current);
        actualizarSemaforoMobile(nivel);
        
        mostrarMensaje('✅ Datos alternativos actualizados', 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Error API alternativa:', error);
        
        // Último recurso: datos simulados
        document.getElementById('viento-velocidad-mobile').textContent = '-- km/h';
        document.getElementById('viento-direccion-mobile').textContent = '--';
        document.getElementById('temperatura-mobile').textContent = '--°C';
        document.getElementById('humedad-mobile').textContent = '--%';
        document.getElementById('presion-mobile').textContent = '-- hPa';
        
        mostrarMensaje('❌ Error cargando datos meteorológicos', 'error');
        return false;
    }
}

// ===== SISTEMA DE DATOS AMBIENTALES CON FIRMS REAL =====
class MonitorAmbiental {
    constructor() {
        this.coordenadasBasural = {
            lat: -34.521444,
            lon: -59.118778
        };
        this.API_KEY_FIRMS = 'f3c02b9c0577f6717ec51986ba53164c'; // Tu API key
    }

    async cargarTodosLosDatos() {
        try {
            console.log('🛰️ Cargando datos ambientales...');
            
            // Cargar datos de suelo y aire
            await this.cargarDatosSueloYAire();
            
            // Cargar puntos calientes FIRMS
            await this.cargarPuntosCalientes();
            
            return true;
            
        } catch (error) {
            console.error('Error cargando datos ambientales:', error);
            return false;
        }
    }

    async cargarDatosSueloYAire() {
        try {
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

            if (meteoResponse.status === 'fulfilled' && meteoResponse.value.ok) {
                const data = await meteoResponse.value.json();
                tempSuperficial = data.hourly.soil_temperature_0cm[0];
                humedadSuelo = data.hourly.soil_moisture_0_1cm[0];
            }

            if (aireResponse.status === 'fulfilled' && aireResponse.value.ok) {
                const data = await aireResponse.value.json();
                calidadAire = data.hourly.pm2_5[0];
            }

            this.actualizarInterfazAmbiental(tempSuperficial, humedadSuelo, calidadAire);
            return true;
            
        } catch (error) {
            console.error('Error en datos suelo/aire:', error);
            return false;
        }
    }

    async cargarPuntosCalientes() {
        try {
            console.log('🔥 Buscando puntos calientes FIRMS...');
            
            const hoy = new Date();
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            
            const fechaAyer = ayer.toISOString().split('T')[0].replace(/-/g, '');
            const fechaHoy = hoy.toISOString().split('T')[0].replace(/-/g, '');
            
            // Radio de 600 metros alrededor del basural (0.0054 grados ≈ 600m)
            const radioGrados = 0.0054;
            const north = this.coordenadasBasural.lat + radioGrados;
            const south = this.coordenadasBasural.lat - radioGrados;
            const east = this.coordenadasBasural.lon + radioGrados;
            const west = this.coordenadasBasural.lon - radioGrados;
            
            const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${this.API_KEY_FIRMS}/MODIS_NRT/${north},${west},${south},${east}/1/${fechaAyer},${fechaHoy}`;
            
            console.log('📍 Buscando en radio 600m alrededor del basural');
            
            const response = await fetch(firmsUrl);
            
            if (response.ok) {
                const csv = await response.text();
                const lineas = csv.split('\n').filter(line => 
                    line.trim() !== '' && !line.includes('latitude') && line.trim() !== ''
                );
                const puntos = Math.max(0, lineas.length - 1);
                
                document.getElementById('puntos-calientes').textContent = puntos;
                document.getElementById('update-fuego').textContent = this.formatearHora(new Date());
                
                if (puntos > 0) {
                    document.getElementById('status-fuego').textContent = `🚨 ${puntos} puntos detectados`;
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
                
                console.log(`✅ FIRMS: ${puntos} puntos calientes detectados`);
                return true;
                
            } else {
                document.getElementById('status-fuego').textContent = 'Error API FIRMS';
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error FIRMS:', error);
            document.getElementById('status-fuego').textContent = 'Error conexión';
            document.getElementById('puntos-calientes').textContent = '--';
            return false;
        }
    }

    actualizarInterfazAmbiental(temp, humedad, aire) {
        const timestamp = this.formatearHora(new Date());
        
        // Temperatura superficial
        if (temp !== null && temp !== undefined) {
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
        if (humedad !== null && humedad !== undefined) {
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
        if (aire !== null && aire !== undefined) {
            document.getElementById('aerosoles').textContent = `${Math.round(aire)} μg/m³`;
            document.getElementById('update-aire').textContent = timestamp;
            
            let calidad = 'buena';
            if (aire > 35) calidad = 'mala';
            else if (aire > 20) calidad = 'moderada';
            
            document.getElementById('status-aire').textContent = `Calidad ${calidad}`;
            document.getElementById('status-aire').className = `satelite-status calidad-${calidad}`;
        } else {
            document.getElementById('aerosoles').textContent = '-- μg/m³';
            document.getElementById('status-aire').textContent = 'Sin datos';
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
        'roja': 'Alta alerta. Viento con probabilidad de humo en ciudad.',
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
        'norte': '#',
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

function mostrarCamaras() {
    abrirTab('norte');
    document.querySelector('.camaras-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// ===== FUNCIONES GLOBALES =====
async function actualizarDatos() {
    console.log('🔄 Actualizando todos los datos...');
    
    await cargarDatosMeteorologicos();
    await monitorAmbiental.cargarTodosLosDatos();
    
    // Si el pronóstico está visible, actualizarlo también
    if (pronosticoVisible) {
        await cargarPronosticoIntegrado();
    }
    
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

function cargarDatosSatelitales() {
    monitorAmbiental.cargarTodosLosDatos();
    
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
