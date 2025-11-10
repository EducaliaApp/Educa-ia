#!/usr/bin/env node

const https = require('https');

const options = {
  hostname: 'www.docentemas.cl',
  path: '/documentos-descargables/rubricas/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'es-CL,es;q=0.9'
  }
};

console.log('🔍 Analizando página de rúbricas...\n');

https.get(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`✅ HTML descargado: ${(data.length / 1024).toFixed(2)} KB\n`);
    
    // 1. Buscar tabs de Elementor
    const patronTab = /<div[^>]*id="elementor-tab-title-\d+"[^>]*>([^<]+)<\/div>/gi;
    const tabs = [];
    let matchTab;
    
    while ((matchTab = patronTab.exec(data)) !== null) {
      tabs.push(matchTab[1].trim());
    }
    
    console.log(`📑 Tabs encontrados: ${tabs.length}`);
    if (tabs.length > 0) {
      tabs.forEach((tab, i) => console.log(`   ${i + 1}. "${tab}"`));
    }
    console.log();
    
    // 2. Buscar enlaces con data-downloadurl
    const patronDownload = /data-downloadurl=["']([^"']+)["']/gi;
    const downloads = [];
    let matchDownload;
    
    while ((matchDownload = patronDownload.exec(data)) !== null) {
      const url = matchDownload[1].replace(/&amp;/g, '&');
      downloads.push(url);
    }
    
    console.log(`🔗 Enlaces con data-downloadurl: ${downloads.length}`);
    if (downloads.length > 0) {
      downloads.slice(0, 5).forEach((url, i) => {
        const nombre = url.match(/download\/([^/]+)\//)?.[1] || 'desconocido';
        console.log(`   ${i + 1}. ${nombre}`);
      });
      if (downloads.length > 5) {
        console.log(`   ... y ${downloads.length - 5} más`);
      }
    }
    console.log();
    
    // 3. Buscar patrones de año en los enlaces
    const años = {};
    downloads.forEach(url => {
      const añoMatch = url.match(/202[3-9]/);
      if (añoMatch) {
        const año = añoMatch[0];
        años[año] = (años[año] || 0) + 1;
      }
    });
    
    console.log('📅 Distribución por año:');
    Object.entries(años).sort().forEach(([año, count]) => {
      console.log(`   ${año}: ${count} documentos`);
    });
    
    // 4. Resumen
    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Total enlaces descargables: ${downloads.length}`);
    console.log(`   📑 Total tabs: ${tabs.length}`);
    console.log(`   📅 Años detectados: ${Object.keys(años).join(', ')}`);
  });
}).on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});
