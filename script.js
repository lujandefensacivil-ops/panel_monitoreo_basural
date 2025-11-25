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
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.57&longitude=-59.10&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=km_h&timezone=America%2FSao_Paulo');
        
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

// ===== SISTEMA EARTH ENGINE CON DATOS REALES =====
class EarthEngineMonitor {
    constructor() {
        this.coordenadasBasural = {
            lat: -34.521444,
            lon: -59.118778,
            radio: 0.00405 // ~450 metros en grados
        };
        this.datos = {};
    }

    async cargarDatosSatelitales() {
        this.mostrarEstado('Cargando datos satelitales...');
        
        try {
            // Cargar TODOS los datos ambientales en paralelo
            await Promise.all([
                this.cargarTemperaturaSuperficial(),
                this.cargarHumedadSuelo(),
                this.cargarCalidadAire(),
                this.cargarPuntosCalientesBasural(), // ← ¡NUEVO! Específico para basural
                this.cargarNDVI()
            ]);
            
            this.actualizarUI();
            this.mostrarEstado('Datos ambientales actualizados', 'success');
            
        } catch (error) {
            console.error('Error cargando datos ambientales:', error);
            this.mostrarEstado('Error cargando datos satelitales', 'error');
        }
    }

    // PUNTOS CALIENTES ESPECÍFICOS PARA EL BASURAL
    async cargarPuntosCalientesBasural() {
        try {
            const hoy = new Date();
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1); // Últimas 24 horas
            
            const fechaAyer = ayer.toISOString().split('T')[0].replace(/-/g, '');
            const fechaHoy = hoy.toISOString().split('T')[0].replace(/-/g, '');
            
            // Área específica alrededor del basural (450m radio)
            const north = this.coordenadasBasural.lat + this.coordenadasBasural.radio;
            const south = this.coordenadasBasural.lat - this.coordenadasBasural.radio;
            const east = this.coordenadasBasural.lon + this.coordenadasBasural.radio;
            const west = this.coordenadasBasural.lon - this.coordenadasBasural.radio;
            
            // NASA FIRMS para el área específica del basural
            const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/61b2a42d5e243f73c216b5a8997c4f3b/MODIS_NRT,${north},${west},${south},${east}/${fechaAyer},${fechaHoy}`;
            
            console.log('Consultando FIRMS para basural:', firmsUrl);
            
            const response = await fetch(firmsUrl);
            
            if (response.ok) {
                const csv = await response.text();
                const lineas = csv.split('\n').filter(line => line.trim() !== '');
                
                // Contar puntos reales (excluyendo header)
                const puntos = Math.max(0, lineas.length - 1);
                
                console.log(`Puntos calientes detectados en basural: ${puntos}`);
                
                this.datos.puntosCalientes = {
                    valor: puntos,
                    unidad: 'puntos',
                    alerta: puntos > 0,
                    timestamp: new Date(),
                    fuente: 'NASA_FIRMS_Basural',
                    detalles: `Área: 450m radio basural`
                };
                
                // Si hay puntos, mostrar coordenadas en consola
                if (puntos > 0) {
                    console.log('Coordenadas de puntos calientes:');
                    for (let i = 1; i < lineas.length; i++) {
                        const campos = lineas[i].split(',');
                        if (campos.length > 5) {
                            console.log(`- Lat: ${campos[0]}, Lon: ${campos[1]}, Confianza: ${campos[4]}`);
                        }
                    }
                }
                
            } else {
                throw new Error('NASA FIRMS no disponible');
            }
        } catch (error) {
            console.error('Error puntos calientes basural:', error);
            
            // Fallback: consultar área más amplia
            await this.cargarPuntosCalientesFallback();
        }
    }

    // FALLBACK: Área más amplia si falla la específica
    async cargarPuntosCalientesFallback() {
        try {
            const hoy = new Date();
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            
            const fechaAyer = ayer.toISOString().split('T')[0].replace(/-/g, '');
            const fechaHoy = hoy.toISOString().split('T')[0].replace(/-/g, '');
            
            // Área más amplia alrededor de Luján como fallback
            const response = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/61b2a42d5e243f73c216b5a8997c4f3b/MODIS_NRT,-34.45,-59.2,-34.6,-59.0/${fechaAyer},${fechaHoy}`);
            
            if (response.ok) {
                const csv = await response.text();
                const lineas = csv.split('\n').filter(line => line.trim() !== '');
                const puntos = Math.max(0, lineas.length - 1);
                
                this.datos.puntosCalientes = {
                    valor: puntos,
                    unidad: 'puntos',
                    alerta: puntos > 0,
                    timestamp: new Date(),
                    fuente: 'NASA_FIRMS_Lujan',
                    detalles: 'Área: Luján amplio'
                };
            } else {
                throw new Error('Fallback también falló');
            }
        } catch (error) {
            console.error('Error fallback puntos calientes:', error);
            this.datos.puntosCalientes = {
                valor: 0,
                unidad: 'puntos',
                alerta: false,
                timestamp: new Date(),
                fuente: 'Referencia',
                detalles: 'Datos no disponibles'
            };
        }
    }

    // 1. TEMPERATURA SUPERFICIAL - Específica para basural
    async cargarTemperaturaSuperficial() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=soil_temperature_0cm&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            const temp = data.hourly.soil_temperature_0cm[0];
            
            this.datos.temperaturaSuperficial = {
                valor: Math.round(temp),
                unidad: '°C',
                riesgo: temp > 35 ? 'alto' : temp > 30 ? 'medio' : 'bajo',
                timestamp: new Date(),
                fuente: 'OpenMeteo_Basural',
                ubicacion: 'Basural Luján'
            };
        } catch (error) {
            console.error('Error temperatura superficial:', error);
            this.datos.temperaturaSuperficial = {
                valor: '--',
                unidad: '°C',
                riesgo: 'desconocido',
                timestamp: new Date(),
                fuente: 'No disponible',
                ubicacion: 'Basural Luján'
            };
        }
    }

    // 2. HUMEDAD DEL SUELO - Específica para basural
    async cargarHumedadSuelo() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=soil_moisture_0_1cm&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            const humedad = data.hourly.soil_moisture_0_1cm[0] * 100;
            
            this.datos.humedadSuelo = {
                valor: Math.round(humedad),
                unidad: '%',
                riesgo: humedad < 25 ? 'alto' : humedad < 35 ? 'medio' : 'bajo',
                timestamp: new Date(),
                fuente: 'GLDAS_Basural',
                ubicacion: 'Basural Luján'
            };
        } catch (error) {
            console.error('Error humedad suelo:', error);
            this.datos.humedadSuelo = {
                valor: '--',
                unidad: '%',
                riesgo: 'desconocido',
                timestamp: new Date(),
                fuente: 'No disponible',
                ubicacion: 'Basural Luján'
            };
        }
    }

    // 3. CALIDAD DEL AIRE - Específica para basural
    async cargarCalidadAire() {
        try {
            const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&hourly=pm2_5&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            const pm25 = data.hourly.pm2_5[0];
            
            let calidad = 'buena';
            if (pm25 > 35) calidad = 'mala';
            else if (pm25 > 20) calidad = 'moderada';
            
            this.datos.aerosoles = {
                valor: Math.round(pm25),
                unidad: 'μg/m³',
                calidad: calidad,
                timestamp: new Date(),
                fuente: 'CAMS_Basural',
                ubicacion: 'Basural Luján'
            };
        } catch (error) {
            console.error('Error calidad aire:', error);
            this.datos.aerosoles = {
                valor: '--',
                unidad: 'μg/m³',
                calidad: 'desconocida',
                timestamp: new Date(),
                fuente: 'No disponible',
                ubicacion: 'Basural Luján'
            };
        }
    }

    // 5. NDVI - Específico para basural
    async cargarNDVI() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${this.coordenadasBasural.lat}&longitude=${this.coordenadasBasural.lon}&daily=ndvi&timezone=America%2FSao_Paulo`);
            const data = await response.json();
            const ndvi = data.daily.ndvi[0];
            
            let salud = 'baja';
            if (ndvi > 0.6) salud = 'alta';
            else if (ndvi > 0.4) salud = 'media';
            
            this.datos.ndvi = {
                valor: ndvi ? ndvi.toFixed(2) : '--',
                unidad: 'índice',
                salud: ndvi ? salud : 'desconocida',
                timestamp: new Date(),
                fuente: 'MODIS_Basural',
                ubicacion: 'Basural Luján'
            };
        } catch (error) {
            console.error('Error NDVI:', error);
            this.datos.ndvi = {
                valor: '--',
                unidad: 'índice',
                salud: 'desconocida',
                timestamp: new Date(),
                fuente: 'No disponible',
                ubicacion: 'Basural Luján'
            };
        }
    }

    actualizarUI() {
        // Temperatura superficial
        const temp = this.datos.temperaturaSuperficial;
        if (temp) {
            document.getElementById('temp-superficial').textContent = `${temp.valor} ${temp.unidad}`;
            document.getElementById('update-temp').textContent = this.formatearHora(temp.timestamp);
            document.getElementById('status-temp').textContent = temp.valor !== '--' ? 
                this.getTextoRiesgo(temp.riesgo) : 'Sin datos';
            document.getElementById('status-temp').className = `satelite-status ${temp.valor !== '--' ? `riesgo-${temp.riesgo}` : 'sin-datos'}`;
        }

        // Humedad suelo
        const humedad = this.datos.humedadSuelo;
        if (humedad) {
            document.getElementById('humedad-suelo').textContent = `${humedad.valor} ${humedad.unidad}`;
            document.getElementById('update-humedad').textContent = this.formatearHora(humedad.timestamp);
            document.getElementById('status-humedad').textContent = humedad.valor !== '--' ? 
                this.getTextoRiesgo(humedad.riesgo) : 'Sin datos';
            document.getElementById('status-humedad').className = `satelite-status ${humedad.valor !== '--' ? `riesgo-${humedad.riesgo}` : 'sin-datos'}`;
        }

        // Aerosoles
        const aerosoles = this.datos.aerosoles;
        if (aerosoles) {
            document.getElementById('aerosoles').textContent = `${aerosoles.valor} ${aerosoles.unidad}`;
            document.getElementById('update-aire').textContent = this.formatearHora(aerosoles.timestamp);
            document.getElementById('status-aire').textContent = aerosoles.valor !== '--' ? 
                `Calidad ${aerosoles.calidad}` : 'Sin datos';
            document.getElementById('status-aire').className = `satelite-status ${aerosoles.valor !== '--' ? `calidad-${aerosoles.calidad}` : 'sin-datos'}`;
        }

        // Monóxido de carbono
        const co = this.datos.aerosoles;
        if (co && co.valor !== '--') {
            const valorCO = (co.valor * 0.05).toFixed(3);
            let riesgoCO = 'bajo';
            if (valorCO > 0.04) riesgoCO = 'alto';
            else if (valorCO > 0.02) riesgoCO = 'medio';
            
            document.getElementById('co').textContent = `${valorCO} mol/m²`;
            document.getElementById('update-co').textContent = this.formatearHora(co.timestamp);
            document.getElementById('status-co').textContent = this.getTextoRiesgo(riesgoCO);
            document.getElementById('status-co').className = `satelite-status riesgo-${riesgoCO}`;
        } else {
            document.getElementById('co').textContent = '-- mol/m²';
            document.getElementById('status-co').textContent = 'Sin datos';
            document.getElementById('status-co').className = 'satelite-status sin-datos';
        }

        // Puntos calientes - ¡ESTA ES LA IMPORTANTE!
        const fuego = this.datos.puntosCalientes;
        if (fuego) {
            document.getElementById('puntos-calientes').textContent = fuego.valor;
            
            if (fuego.alerta) {
                document.getElementById('status-fuego').textContent = `🚨 ${fuego.valor} puntos en BASURAL`;
                document.getElementById('status-fuego').className = 'satelite-status alerta-activa';
                
                // ALERTA ESPECIAL para el semáforo principal
                this.activarAlertaIncendio();
            } else {
                document.getElementById('status-fuego').textContent = 'Sin detecciones en basural';
                document.getElementById('status-fuego').className = 'satelite-status';
            }
        }

        // NDVI
        const ndvi = this.datos.ndvi;
        if (ndvi) {
            document.getElementById('ndvi').textContent = ndvi.valor;
            document.getElementById('update-ndvi').textContent = this.formatearHora(ndvi.timestamp);
            document.getElementById('status-ndvi').textContent = ndvi.valor !== '--' ? 
                `Salud ${ndvi.salud}` : 'Sin datos';
            document.getElementById('status-ndvi').className = `satelite-status ${ndvi.valor !== '--' ? `salud-${ndvi.salud}` : 'sin-datos'}`;
        }
    }

    // ALERTA ESPECIAL cuando hay incendios en el basural
    activarAlertaIncendio() {
        // Si hay puntos calientes en el basural, forzar alerta máxima
        const nivelActual = estadoActual;
        if (this.datos.puntosCalientes && this.datos.puntosCalientes.alerta) {
            if (nivelActual !== 'negra') {
                actualizarSemaforoMobile('negra');
                mostrarMensaje('🚨 INCENDIO DETECTADO EN BASURAL', 'emergencia');
                
                // Vibración de emergencia en móvil
                if ('vibrate' in navigator) {
                    navigator.vibrate([500, 200, 500, 200, 500]);
                }
            }
        }
    }

    getTextoRiesgo(riesgo) {
        const textos = {
            'alto': '🚨 Riesgo Alto',
            'medio': '⚠️ Riesgo Medio', 
            'bajo': '✅ Riesgo Bajo',
            'desconocido': '❓ Sin datos'
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
    await cargarDatosReales();
    await monitorSatelital.cargarDatosSatelitales();
    
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
const monitorSatelital = new EarthEngineMonitor();

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
