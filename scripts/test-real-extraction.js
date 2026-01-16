/**
 * Script de prueba para validar extracción real desde curriculumnacional.cl
 * Prueba con una asignatura específica para validar que captura OA, OAH y OAA
 */

const https = require('https');

// Patrones actualizados
const PATRON_VALIDACION_OA = /^[A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2}$/i;
const PATRON_EXTRACCION_OA = /([A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2})/i;

function validarCodigoOA(codigo) {
  return PATRON_VALIDACION_OA.test(codigo.trim());
}

function obtenerTipoObjetivo(codigo) {
  const codigoLimpio = codigo.trim().toUpperCase();

  if (codigoLimpio.includes(' OAH ')) {
    return 'habilidad';
  } else if (codigoLimpio.includes(' OAA ')) {
    return 'actitud';
  } else {
    return 'contenido';
  }
}

function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
        'Accept': 'text/html',
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function extraerObjetivos(html) {
  const objetivos = [];

  // Extraer usando estructura Tipo B (.item-wrapper)
  const patronItemWrapper = /<div class="item-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;

  let match;
  let contador = 0;

  while ((match = patronItemWrapper.exec(html)) !== null && contador < 50) {
    const itemHtml = match[1];
    contador++;

    try {
      // Extraer código OA
      const codigoMatch = itemHtml.match(/<span[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/span>/i);
      if (!codigoMatch) continue;

      const codigoTexto = limpiarTexto(codigoMatch[1]);
      const codigoExtraido = codigoTexto.match(PATRON_EXTRACCION_OA);

      if (!codigoExtraido) continue;

      const codigo = codigoExtraido[1];

      if (validarCodigoOA(codigo)) {
        const tipo = obtenerTipoObjetivo(codigo);
        const esPriorizado = itemHtml.includes('prioritized');

        objetivos.push({
          codigo,
          tipo,
          priorizado: esPriorizado
        });
      }
    } catch (error) {
      // Ignorar errores de parsing
    }
  }

  return objetivos;
}

async function main() {
  console.log('🌐 Probando extracción real desde curriculumnacional.cl\n');
  console.log('=' .repeat(80));

  // Probar con Matemática 4° Básico (sabemos que tiene OA, OAH y OAA)
  const url = 'https://www.curriculumnacional.cl/curriculum/1o-6o-basico/matematica/4-basico/';

  console.log(`📡 Obteniendo: ${url}`);
  console.log('⏳ Descargando HTML...\n');

  try {
    const html = await fetchUrl(url);
    console.log(`✅ HTML descargado (${Math.round(html.length / 1024)} KB)\n`);

    console.log('🔍 Extrayendo objetivos...\n');
    const objetivos = await extraerObjetivos(html);

    console.log('=' .repeat(80));
    console.log(`\n📊 RESULTADOS DE EXTRACCIÓN\n`);
    console.log('=' .repeat(80));
    console.log(`Total de objetivos extraídos: ${objetivos.length}\n`);

    // Contar por tipo
    const porTipo = {
      contenido: objetivos.filter(o => o.tipo === 'contenido').length,
      habilidad: objetivos.filter(o => o.tipo === 'habilidad').length,
      actitud: objetivos.filter(o => o.tipo === 'actitud').length,
    };

    const priorizados = objetivos.filter(o => o.priorizado).length;

    console.log('Por tipo de objetivo:');
    console.log(`  📘 Contenido (OA):    ${porTipo.contenido}`);
    console.log(`  🎯 Habilidades (OAH): ${porTipo.habilidad}`);
    console.log(`  💡 Actitudes (OAA):   ${porTipo.actitud}`);
    console.log(`\n⭐ Priorizados: ${priorizados}/${objetivos.length}\n`);

    console.log('=' .repeat(80));
    console.log('\nPrimeros 10 objetivos extraídos:\n');

    objetivos.slice(0, 10).forEach((obj, idx) => {
      const emoji = obj.tipo === 'contenido' ? '📘' : obj.tipo === 'habilidad' ? '🎯' : '💡';
      const prioEmoji = obj.priorizado ? '⭐' : '  ';
      console.log(`${prioEmoji} ${emoji} ${idx + 1}. ${obj.codigo} (${obj.tipo})`);
    });

    console.log('\n' + '=' .repeat(80));

    // Validación
    const tieneContenido = porTipo.contenido > 0;
    const tieneHabilidades = porTipo.habilidad > 0;
    const tieneActitudes = porTipo.actitud > 0;

    console.log('\n🧪 VALIDACIÓN:\n');
    console.log(`  ${tieneContenido ? '✅' : '❌'} Extrae objetivos de contenido (OA)`);
    console.log(`  ${tieneHabilidades ? '✅' : '❌'} Extrae objetivos de habilidades (OAH)`);
    console.log(`  ${tieneActitudes ? '✅' : '❌'} Extrae objetivos de actitudes (OAA)`);

    const todosPasaron = tieneContenido && tieneHabilidades && tieneActitudes;

    if (todosPasaron) {
      console.log('\n🎉 ¡ÉXITO! La función ahora extrae los 3 tipos de objetivos');
      console.log(`\n📈 Mejora estimada: De ~218 a ~${Math.round(objetivos.length * 84)} objetivos totales`);
      console.log('   (84 asignaturas × promedio de objetivos por asignatura)');
      process.exit(0);
    } else {
      console.log('\n⚠️  Algunos tipos de objetivos no fueron extraídos');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
