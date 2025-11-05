import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock functions for testing
function extraerLinksPDF(html: string): Array<{ nombre: string; url: string }> {
  const links: Array<{ nombre: string; url: string }> = []
  const baseUrl = 'https://www.docentemas.cl'
  
  const patrones = [
    /href=["']([^"']*\.pdf)["'][^>]*>([^<]*)<\/a>/gi,
    /href=["']([^"']*\.pdf)["'][^>]*title=["']([^"']*)['"]/gi,
    /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*>.*?<span[^>]*>([^<]*)<\/span>/gi,
    /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*data-title=["']([^"']*)['"]/gi
  ]
  
  for (const patron of patrones) {
    let match
    while ((match = patron.exec(html)) !== null) {
      const url = match[1]
      const nombre = (match[2] || url.split('/').pop() || '').trim()
      
      if (nombre && !links.some(l => l.url === url)) {
        links.push({
          nombre,
          url: url.startsWith('http') ? url : new URL(url, baseUrl).href
        })
      }
    }
  }
  
  return links
}

function parsearNombreArchivo(nombre: string): {
  año: number
  nivel: string
  modalidad: string
} | null {
  
  const nombreLower = nombre.toLowerCase()
  
  const añoMatch = nombre.match(/202[0-9]/) || nombre.match(/\b(2024|2025|2026)\b/)
  if (!añoMatch) return null
  
  const año = parseInt(añoMatch[0])
  
  let nivel = 'regular'
  const patronesNivel = {
    'parvularia': /parvularia|párvulo|pre\s*escolar/,
    'basica_1_6': /1°?\s*a\s*6°?|básica.*1.*6|primero.*sexto/,
    'basica_7_8_media': /7°?.*8°?|séptimo.*octavo|media|secundaria/,
    'media_tp': /técnico\s*profesional|tp|medio.*técnico/,
    'especial_regular': /especial.*regular|integración/,
    'especial_neep': /especial.*neep|escuela.*especial/,
    'hospitalaria': /hospitalaria|hospital/,
    'encierro': /encierro|cárcel|penitenciar/,
    'lengua_indigena': /lengua.*indígena|mapuche|quechua|aymara/,
    'epja': /adultos|jóvenes.*adultas|epja/
  }
  
  for (const [key, patron] of Object.entries(patronesNivel)) {
    if (patron.test(nombreLower)) {
      nivel = key
      break
    }
  }
  
  let modalidad = 'regular'
  if (/especial/.test(nombreLower)) modalidad = 'especial'
  if (/hospitalaria/.test(nombreLower)) modalidad = 'hospitalaria'
  if (/encierro/.test(nombreLower)) modalidad = 'encierro'
  if (/lengua.*indígena/.test(nombreLower)) modalidad = 'lengua_indigena'
  
  return { año, nivel, modalidad }
}

// Tests
Deno.test("extraerLinksPDF - extrae links básicos", () => {
  const html = `<a href="/docs/manual-2025.pdf">Manual Portafolio 2025</a>`
  const links = extraerLinksPDF(html)
  
  assertEquals(links.length, 1)
  assertEquals(links[0].nombre, "Manual Portafolio 2025")
  assertEquals(links[0].url, "https://www.docentemas.cl/docs/manual-2025.pdf")
})

Deno.test("extraerLinksPDF - maneja URLs absolutas", () => {
  const html = `<a href="https://example.com/rubrica.pdf">Rúbrica</a>`
  const links = extraerLinksPDF(html)
  
  assertEquals(links[0].url, "https://example.com/rubrica.pdf")
})

Deno.test("extraerLinksPDF - evita duplicados", () => {
  const html = `
    <a href="/doc.pdf">Documento</a>
    <a href="/doc.pdf" title="Documento">Documento</a>
  `
  const links = extraerLinksPDF(html)
  
  assertEquals(links.length, 1)
})

Deno.test("parsearNombreArchivo - detecta año correctamente", () => {
  const resultado = parsearNombreArchivo("Manual Portafolio 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.año, 2025)
})

Deno.test("parsearNombreArchivo - detecta nivel parvularia", () => {
  const resultado = parsearNombreArchivo("Rúbricas Educación Parvularia 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.nivel, "parvularia")
  assertEquals(resultado.modalidad, "regular")
})

Deno.test("parsearNombreArchivo - detecta básica 1-6", () => {
  const resultado = parsearNombreArchivo("Manual 1° a 6° Básico 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.nivel, "basica_1_6")
})

Deno.test("parsearNombreArchivo - detecta educación especial", () => {
  const resultado = parsearNombreArchivo("Rúbricas Educación Especial Regular 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.nivel, "especial_regular")
  assertEquals(resultado.modalidad, "especial")
})

Deno.test("parsearNombreArchivo - detecta técnico profesional", () => {
  const resultado = parsearNombreArchivo("Manual Técnico Profesional 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.nivel, "media_tp")
})

Deno.test("parsearNombreArchivo - retorna null sin año", () => {
  const resultado = parsearNombreArchivo("Manual sin año.pdf")
  
  assertEquals(resultado, null)
})

Deno.test("parsearNombreArchivo - detecta lengua indígena", () => {
  const resultado = parsearNombreArchivo("Rúbricas Lengua Indígena Mapuche 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.nivel, "lengua_indigena")
  assertEquals(resultado.modalidad, "lengua_indigena")
})

Deno.test("parsearNombreArchivo - detecta hospitalaria", () => {
  const resultado = parsearNombreArchivo("Manual Pedagogía Hospitalaria 2025.pdf")
  
  assertExists(resultado)
  assertEquals(resultado.nivel, "hospitalaria")
  assertEquals(resultado.modalidad, "hospitalaria")
})