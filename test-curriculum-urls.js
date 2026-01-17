/**
 * Script de prueba para verificar URLs del currículum nacional
 * Ejecutar con: node test-curriculum-urls.js
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

async function testURL(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${url} - Status: ${res.statusCode}`);
        resolve({ url, status: res.statusCode, ok: true });
      } else {
        console.log(`❌ ${url} - Status: ${res.statusCode}`);
        resolve({ url, status: res.statusCode, ok: false });
      }
    });

    req.on('error', (error) => {
      console.log(`❌ ${url} - Error: ${error.message}`);
      resolve({ url, status: 0, ok: false, error: error.message });
    });

    req.end();
  });
}

async function main() {
  console.log('🚀 Iniciando prueba de URLs del Currículum Nacional\n');
  console.log(`Total de URLs a probar: ${CATEGORY_URLS.length}\n`);

  const results = [];

  for (const url of CATEGORY_URLS) {
    const result = await testURL(url);
    results.push(result);
    // Pequeño delay para no saturar el servidor
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE RESULTADOS');
  console.log('='.repeat(60));

  const exitosas = results.filter(r => r.ok).length;
  const fallidas = results.filter(r => !r.ok).length;

  console.log(`✅ URLs exitosas: ${exitosas}`);
  console.log(`❌ URLs fallidas: ${fallidas}`);

  if (fallidas > 0) {
    console.log('\n❌ URLs que fallaron:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  - ${r.url} (Status: ${r.status}${r.error ? ', Error: ' + r.error : ''})`);
    });
  }

  console.log('\n✅ URLs exitosas:');
  results.filter(r => r.ok).forEach(r => {
    console.log(`  - ${r.url}`);
  });
}

main().catch(console.error);
