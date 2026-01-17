/**
 * Script de prueba local del scraping (sin Supabase)
 * Ejecutar con: node test-scraping-local.js
 */

const https = require('https');

const CATEGORY_URLS = [
  'https://www.curriculumnacional.cl/curriculum/educacion-parvularia',
  'https://www.curriculumnacional.cl/curriculum/1o-6o-basico',
  'https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio',
  'https://www.curriculumnacional.cl/curriculum/3o-4o-medio',
  'https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional',
  'https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0',
  'https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja',
  'https://www.curriculumnacional.cl/pueblos-originarios-ancestrales',
  'https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena',
];

// ============================================
// FUNCIONES DE EXTRACCIÓN
// ============================================

function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

function extraerAsignaturas(html, baseUrl) {
  const links = [];

  // ESTRUCTURA 1: .subject-grades + .grades-wrapper
  const patron1 = /<div[^>]*class=[^>]*subject-grades[^>]*>[\s\S]*?<span[^>]*class=[^>]*subject-title[^>]*>([^<]*)<\/span>[\s\S]*?<div[^>]*class=[^>]*grades-wrapper[^>]*>([\s\S]*?)<\/div>/gi;

  let match;
  while ((match = patron1.exec(html)) !== null) {
    const asignatura = limpiarTexto(match[1]);
    const gradesWrapper = match[2];

    const patronCurso = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
    let matchCurso;

    while ((matchCurso = patronCurso.exec(gradesWrapper)) !== null) {
      const href = matchCurso[1];
      const curso = limpiarTexto(matchCurso[2]);

      if (curso.length > 0) {
        links.push({
          nombre: `${asignatura} ${curso}`,
          url: href.startsWith('http') ? href : `https://www.curriculumnacional.cl${href}`,
          estructura: 'TIPO 1: .subject-grades'
        });
      }
    }
  }

  // ESTRUCTURA 2: Enlaces directos con niveles
  if (links.length === 0) {
    const patron2 = /<a[^>]*href=["']([^"']*\/curriculum\/[^"']+)["'][^>]*>([^<]+)<\/a>/gi;

    while ((match = patron2.exec(html)) !== null) {
      const href = match[1];
      const texto = limpiarTexto(match[2]);

      const tieneNivel = /\/(1-basico|2-basico|3-basico|4-basico|5-basico|6-basico|7-basico|8-basico|1-medio|2-medio|3-medio|4-medio|sc|nm|nt)/i.test(href);
      const textoValido = texto.length > 3 && texto.length < 100;

      if (tieneNivel && textoValido) {
        links.push({
          nombre: texto,
          url: href.startsWith('http') ? href : `https://www.curriculumnacional.cl${href}`,
          estructura: 'TIPO 2: Enlaces directos con niveles'
        });
      }
    }
  }

  // ESTRUCTURA 3: Fallback genérico
  if (links.length === 0) {
    const patron3 = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;

    while ((match = patron3.exec(html)) !== null) {
      const href = match[1];
      const texto = limpiarTexto(match[2]);

      if (href.includes('/curriculum/') && texto.length > 5 && texto.length < 100) {
        const esNavegacion = /(documentos|recursos|evaluación|inicio|mineduc|ayuda|ver todos|descargar)/i.test(texto);

        if (!esNavegacion) {
          links.push({
            nombre: texto,
            url: href.startsWith('http') ? href : `https://www.curriculumnacional.cl${href}`,
            estructura: 'TIPO 3: Fallback genérico'
          });
        }
      }
    }
  }

  // Eliminar duplicados
  const uniqueLinks = links.filter((link, index, self) =>
    index === self.findIndex(l => l.url === link.url)
  );

  return uniqueLinks;
}

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9',
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test1_ValidarURLs() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Validar URLs de Categorías');
  console.log('='.repeat(60));

  const results = [];

  for (const url of CATEGORY_URLS) {
    try {
      const response = await new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        https.request({
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
          }
        }, res => {
          resolve({ status: res.statusCode, ok: res.statusCode === 200 });
        }).on('error', reject).end();
      });

      const status = response.ok ? '✅' : '❌';
      console.log(`${status} ${url} - Status: ${response.status}`);

      results.push({ url, ...response });
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}`);
      results.push({ url, status: 0, ok: false, error: error.message });
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const exitosas = results.filter(r => r.ok).length;
  const fallidas = results.filter(r => !r.ok).length;

  console.log(`\n📊 Resumen: ${exitosas} exitosas, ${fallidas} fallidas`);

  return { exitosas, fallidas, results };
}

async function test2_ExtraerAsignaturas() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Extraer Asignaturas de Cada Categoría');
  console.log('='.repeat(60));

  const results = [];

  for (const url of CATEGORY_URLS) {
    try {
      console.log(`\n📂 ${url}`);
      const html = await fetchHTML(url);

      const asignaturas = extraerAsignaturas(html, url);

      console.log(`   📚 Asignaturas encontradas: ${asignaturas.length}`);

      if (asignaturas.length > 0) {
        const estructura = asignaturas[0].estructura;
        console.log(`   🔍 Estructura detectada: ${estructura}`);

        console.log(`   📋 Primeras 5 asignaturas:`);
        asignaturas.slice(0, 5).forEach((asig, i) => {
          console.log(`      ${i + 1}. ${asig.nombre}`);
        });

        // Validar que las URLs sean únicas
        const urlsUnicas = new Set(asignaturas.map(a => a.url)).size;
        if (urlsUnicas !== asignaturas.length) {
          console.log(`   ⚠️  Advertencia: Hay ${asignaturas.length - urlsUnicas} URLs duplicadas`);
        }
      } else {
        console.log(`   ❌ NO se encontraron asignaturas - ESTRUCTURA DESCONOCIDA`);

        // Debugging: mostrar patrones HTML encontrados
        console.log(`   🔍 Intentando detectar estructura...`);

        if (html.includes('subject-grades')) {
          console.log(`      ✓ Encontrado: .subject-grades`);
        }
        if (html.includes('grades-wrapper')) {
          console.log(`      ✓ Encontrado: .grades-wrapper`);
        }
        if (html.includes('subject-title')) {
          console.log(`      ✓ Encontrado: .subject-title`);
        }

        // Contar enlaces /curriculum/
        const linksCount = (html.match(/href=["'][^"']*\/curriculum\/[^"']+["']/gi) || []).length;
        console.log(`      ℹ️  Enlaces a /curriculum/ encontrados: ${linksCount}`);
      }

      results.push({
        url,
        count: asignaturas.length,
        estructura: asignaturas.length > 0 ? asignaturas[0].estructura : 'NINGUNA',
        ejemplos: asignaturas.slice(0, 3),
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        url,
        count: 0,
        error: error.message,
      });
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const sinAsignaturas = results.filter(r => r.count === 0);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumen de Extracción');
  console.log('='.repeat(60));
  console.log(`Total asignaturas extraídas: ${total}`);
  console.log(`Categorías exitosas: ${CATEGORY_URLS.length - sinAsignaturas.length}/${CATEGORY_URLS.length}`);

  if (sinAsignaturas.length > 0) {
    console.log(`\n⚠️  Categorías SIN asignaturas extraídas:`);
    sinAsignaturas.forEach(r => {
      console.log(`   - ${r.url}`);
    });
  }

  // Resumen por estructura
  const porEstructura = results.reduce((acc, r) => {
    if (r.estructura) {
      acc[r.estructura] = (acc[r.estructura] || 0) + 1;
    }
    return acc;
  }, {});

  console.log(`\n🔍 Estructuras HTML detectadas:`);
  Object.entries(porEstructura).forEach(([estructura, count]) => {
    console.log(`   - ${estructura}: ${count} categorías`);
  });

  return results;
}

// ============================================
// EJECUTAR PRUEBAS
// ============================================

async function main() {
  console.log('🧪 SUITE DE PRUEBAS LOCAL - Extracción de Currículum');
  console.log('='+ '='.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-CL')}`);
  console.log('='+ '='.repeat(60));

  const resultados = {};

  // Test 1: Validar URLs
  resultados.test1 = await test1_ValidarURLs();

  // Test 2: Extraer asignaturas
  resultados.test2 = await test2_ExtraerAsignaturas();

  console.log('\n' + '='.repeat(60));
  console.log('✅ PRUEBAS COMPLETADAS');
  console.log('='.repeat(60));

  console.log(`\n📊 RESULTADOS FINALES:`);
  console.log(`   ✅ URLs válidas: ${resultados.test1.exitosas}/${CATEGORY_URLS.length}`);
  console.log(`   📚 Asignaturas extraídas: ${resultados.test2.reduce((sum, r) => sum + r.count, 0)}`);

  const categoriasExitosas = resultados.test2.filter(r => r.count > 0).length;
  const porcentajeExito = ((categoriasExitosas / CATEGORY_URLS.length) * 100).toFixed(2);

  console.log(`   🎯 Categorías con extracción exitosa: ${categoriasExitosas}/${CATEGORY_URLS.length} (${porcentajeExito}%)`);

  if (categoriasExitosas < CATEGORY_URLS.length) {
    console.log(`\n⚠️  ATENCIÓN: No todas las categorías extraen asignaturas`);
    console.log(`   Se recomienda revisar la estructura HTML de las categorías fallidas`);
  } else {
    console.log(`\n✨ ¡ÉXITO! Todas las categorías extraen asignaturas correctamente`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, extraerAsignaturas };
