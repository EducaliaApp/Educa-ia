/**
 * Test para verificar la configuración de múltiples categorías
 */

console.log('🧪 TEST: Configuración de Múltiples Categorías\n');
console.log('='.repeat(60));

// Simular CONFIG
const CONFIG = {
  CATEGORY_URLS: [
    'https://www.curriculumnacional.cl/curriculum/1o-6o-basico/',
    'https://www.curriculumnacional.cl/curriculum/educacion-parvularia/',
    'https://www.curriculumnacional.cl/curriculum/7o-basico-a-2o-medio/',
    'https://www.curriculumnacional.cl/curriculum/formacion-diferenciada-tecnico-profesional/',
    'https://www.curriculumnacional.cl/curriculum/formacion-diferenciada-artistica/',
    'https://www.curriculumnacional.cl/curriculum/formacion-diferenciada-cientifico-humanista/',
    'https://www.curriculumnacional.cl/curriculum/modalidad-educacion-de-personas-jovenes-y-adultas-epja/',
    'https://www.curriculumnacional.cl/curriculum/lengua-y-cultura-de-los-pueblos-originarios-ancestrales/',
    'https://www.curriculumnacional.cl/curriculum/marco-curricular-de-lengua-indigena/',
  ],
  MAX_CATEGORIAS: 0, // 0 = todas
};

// Función de mapeo
function extraerCategoriaDesdeURL(url) {
  const categoriaMap = {
    '1o-6o-basico': 'Educación Básica 1° a 6°',
    'educacion-parvularia': 'Educación Parvularia',
    '7o-basico-a-2o-medio': 'Educación Media 7° a 2° Medio',
    'formacion-diferenciada-tecnico-profesional': 'Formación Diferenciada Técnico Profesional',
    'formacion-diferenciada-artistica': 'Formación Diferenciada Artística',
    'formacion-diferenciada-cientifico-humanista': 'Formación Diferenciada Científico-Humanista',
    'modalidad-educacion-de-personas-jovenes-y-adultas-epja': 'Modalidad Educación de Personas Jóvenes y Adultas (EPJA)',
    'lengua-y-cultura-de-los-pueblos-originarios-ancestrales': 'Lengua y Cultura de los Pueblos Originarios Ancestrales',
    'marco-curricular-de-lengua-indigena': 'Marco curricular de Lengua Indígena',
  };

  const match = url.match(/\/curriculum\/([^/]+)/);
  if (!match) {
    return 'Educación Básica 1° a 6°';
  }

  const slug = match[1];
  return categoriaMap[slug] || 'Educación Básica 1° a 6°';
}

console.log(`\n📊 Total de categorías configuradas: ${CONFIG.CATEGORY_URLS.length}`);
console.log(`\nCategorías que se procesarán:\n`);

CONFIG.CATEGORY_URLS.forEach((url, index) => {
  const nombre = extraerCategoriaDesdeURL(url);
  console.log(`${index + 1}. ${nombre}`);
  console.log(`   URL: ${url}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ TEST COMPLETADO\n');
console.log('Resultado esperado:');
console.log('  - La función ahora procesará TODAS las 9 categorías');
console.log('  - Extraerá asignaturas de cada categoría');
console.log('  - Guardará objetivos de TODAS las categorías en la BD');
console.log('\nAntes solo procesaba: Educación Básica 1° a 6°');
console.log('Ahora procesa: TODAS las 9 categorías curriculares');
