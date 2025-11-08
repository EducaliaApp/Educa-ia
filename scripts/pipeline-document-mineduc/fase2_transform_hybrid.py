#!/usr/bin/env python3
"""
FASE 2: Transform - Extracción Híbrida de Contenido (Librerías + IA)

Estrategia adaptativa:
- Documentos simples: PyMuPDF + Tesseract OCR (gratis, rápido)
- Rúbricas/documentos complejos: IA Vision con fallback automático

Prioridad de proveedores IA:
1. Gemini Flash (gratis hasta 1500 req/día, contexto 1M tokens)
2. GPT-4o (balance calidad/precio: $2.50/MTok input)
3. Claude 3.5 Sonnet (backup: mejor calidad, más caro)

Variables de entorno:
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- AI_EXTRACTION_ENABLED='true' para habilitar IA
- GEMINI_API_KEY: Prioridad 1 (Google AI)
- OPENAI_API_KEY: Prioridad 2 (OpenAI GPT-4o)
- ANTHROPIC_API_KEY: Prioridad 3 (Claude backup)
"""
import os, sys, fitz, re, json, base64
from io import BytesIO
from dotenv import load_dotenv
from supabase import create_client

# OCR opcional
try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# IA Vision - múltiples proveedores
GEMINI_AVAILABLE = False
OPENAI_AVAILABLE = False
ANTHROPIC_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    pass

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    pass

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    pass

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

# Configuración
AI_EXTRACTION_ENABLED = os.getenv('AI_EXTRACTION_ENABLED', 'false').lower() == 'true'
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Determinar proveedores disponibles
AI_PROVIDERS = []
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    AI_PROVIDERS.append('gemini')
if OPENAI_AVAILABLE and OPENAI_API_KEY:
    AI_PROVIDERS.append('openai')
if ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY:
    AI_PROVIDERS.append('anthropic')

if AI_EXTRACTION_ENABLED and len(AI_PROVIDERS) == 0:
    print("⚠️  IA habilitada pero no hay proveedores configurados")
    AI_EXTRACTION_ENABLED = False
else:
    if AI_EXTRACTION_ENABLED:
        print(f"🤖 Proveedores IA disponibles: {', '.join(AI_PROVIDERS).upper()}")

# Buscar documentos
docs = supabase.table('documentos_oficiales')\
    .select('id, storage_path, titulo, tipo_documento')\
    .eq('etapa_actual', 'descargado')\
    .limit(50)\
    .execute().data or []

print(f"📄 Procesando {len(docs)} PDFs...")
print(f"🤖 IA: {'✅ Habilitada' if AI_EXTRACTION_ENABLED else '❌ Deshabilitada'}")

if len(docs) == 0:
    print("\nTransformados: 0")
    sys.exit(0)


# ============================================
# CLASIFICACIÓN DE DOCUMENTOS
# ============================================

def clasificar_tipo_pdf(pdf_bytes):
    """Clasifica PDF: texto_nativo, escaneado_simple, escaneado_complejo"""
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
            if len(pdf) == 0:
                return 'texto_nativo'
            
            primera_pagina = pdf[0]
            texto = primera_pagina.get_text().strip()
            
            if len(texto) > 500:
                return 'texto_nativo'
            
            imagenes = len(primera_pagina.get_images())
            
            if imagenes > 5:
                return 'escaneado_complejo'
            elif len(texto) < 50:
                return 'escaneado_simple'
            else:
                return 'texto_nativo'
    except Exception as e:
        print(f"  ⚠️  Error clasificando: {e}")
        return 'texto_nativo'


# ============================================
# EXTRACCIÓN CON LIBRERÍAS
# ============================================

def extraer_texto_con_ocr(pagina):
    """OCR con Tesseract"""
    if not OCR_AVAILABLE:
        return ""
    try:
        pix = pagina.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        return pytesseract.image_to_string(img, lang='spa')
    except:
        return ""


def extraer_con_pymupdf(pdf_bytes):
    """Extracción rápida con PyMuPDF + OCR fallback"""
    texto_completo = []
    es_escaneado = False
    
    with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
        for i, pagina in enumerate(pdf[:50]):  # Max 50 páginas
            texto = pagina.get_text("text", sort=True).strip()
            
            # Si primera página tiene poco texto, es escaneado
            if i == 0 and len(texto) < 100 and OCR_AVAILABLE:
                es_escaneado = True
            
            # Aplicar OCR si es necesario
            if len(texto) < 50 and OCR_AVAILABLE:
                texto = extraer_texto_con_ocr(pagina)
            
            if texto:
                # Limpiar caracteres de control
                texto_limpio = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', texto)
                texto_completo.append(texto_limpio)
    
    return "\n\n".join(texto_completo), es_escaneado


# ============================================
# EXTRACCIÓN CON IA
# ============================================

def extraer_con_ia_vision(pdf_bytes, tipo_documento):
    """
    Extracción estructurada con Claude 3.5 Sonnet Vision
    Optimizado para rúbricas y documentos complejos
    """
    if not AI_AVAILABLE or not ANTHROPIC_API_KEY:
        print("  ⚠️  IA no disponible, usando fallback")
        return extraer_con_pymupdf(pdf_bytes)[0], 0
    
    try:
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Convertir PDF a imágenes (solo primeras 10 páginas para controlar costo)
        imagenes_base64 = []
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
            for i, pagina in enumerate(pdf[:10]):  # Límite de páginas
                pix = pagina.get_pixmap(dpi=150)  # DPI reducido para menor costo
                img_bytes = pix.tobytes("png")
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                imagenes_base64.append(img_base64)
        
        # Prompt especializado según tipo de documento
        if tipo_documento == 'rubricas':
            prompt = """Extrae el contenido de esta rúbrica educativa preservando su estructura:

1. **Estructura jerárquica**: Identifica niveles (Insatisfactorio, Básico, Competente, Destacado)
2. **Criterios y descriptores**: Extrae cada criterio con sus descriptores completos
3. **Relaciones**: Mantén la relación entre criterios, niveles y descriptores
4. **Formato**: Usa Markdown para facilitar búsqueda (## para niveles, ### para criterios)

Genera un documento estructurado que preserve la lógica de evaluación."""
        else:
            prompt = """Extrae TODO el contenido de este documento educativo:

1. **Texto completo**: Transcribe todo el texto preservando párrafos y estructura
2. **Tablas**: Convierte tablas a formato Markdown
3. **Listas y numeración**: Mantén la jerarquía
4. **Títulos y secciones**: Usa Markdown (## para secciones principales)

Genera un documento limpio y bien estructurado."""
        
        # Llamada a Claude Vision
        mensaje_contenido = [{"type": "text", "text": prompt}]
        
        for img_b64 in imagenes_base64:
            mensaje_contenido.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": img_b64
                }
            })
        
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": mensaje_contenido
            }]
        )
        
        contenido = response.content[0].text
        
        # Calcular costo aproximado
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        # Claude 3.5 Sonnet: $3/MTok input, $15/MTok output
        costo = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)
        
        return contenido, costo
        
    except Exception as e:
        print(f"  ⚠️  Error con IA: {e}")
        # Fallback a PyMuPDF
        return extraer_con_pymupdf(pdf_bytes)[0], 0


# ============================================
# ESTRUCTURACIÓN PARA RAG
# ============================================

def estructurar_para_rag(contenido, tipo_documento):
    """
    Post-procesa contenido para optimizar búsqueda vectorial
    """
    # Agregar metadatos de contexto
    header = f"# Documento: {tipo_documento.upper()}\n\n"
    
    # Normalizar espacios
    contenido_limpio = re.sub(r'\n{3,}', '\n\n', contenido)
    contenido_limpio = re.sub(r' {2,}', ' ', contenido_limpio)
    
    # Agregar estructura si no existe
    if '##' not in contenido_limpio and len(contenido_limpio) > 1000:
        # Dividir en secciones por longitud
        parrafos = contenido_limpio.split('\n\n')
        contenido_estructurado = []
        for i, parrafo in enumerate(parrafos, 1):
            if len(parrafo) > 100:
                contenido_estructurado.append(f"## Sección {i}\n\n{parrafo}")
        contenido_limpio = '\n\n'.join(contenido_estructurado)
    
    return header + contenido_limpio


# ============================================
# PROCESAMIENTO PRINCIPAL
# ============================================

transformed = 0
total_costo_ia = 0.0

for doc in docs:
    try:
        print(f"\n📄 {doc['titulo']}")
        
        supabase.table('documentos_oficiales').update({
            'estado_procesamiento': 'procesando'
        }).eq('id', doc['id']).execute()
        
        # Descargar PDF desde Storage
        pdf_bytes = supabase.storage.from_('documentos-mineduc').download(doc['storage_path'])
        
        # Clasificar tipo
        tipo_pdf = clasificar_tipo_pdf(pdf_bytes)
        print(f"  📋 Tipo: {tipo_pdf}")
        
        # Decidir método de extracción
        usar_ia = (
            AI_EXTRACTION_ENABLED and 
            (doc['tipo_documento'] == 'rubricas' or tipo_pdf == 'escaneado_complejo')
        )
        
        if usar_ia:
            print(f"  🤖 Extrayendo con IA (Claude Vision)...")
            contenido, costo = extraer_con_ia_vision(pdf_bytes, doc['tipo_documento'])
            total_costo_ia += costo
            metodo = "ia_vision"
        else:
            print(f"  📚 Extrayendo con PyMuPDF + OCR...")
            contenido, es_escaneado = extraer_con_pymupdf(pdf_bytes)
            costo = 0
            metodo = "ocr" if es_escaneado else "pymupdf"
        
        # Estructurar para RAG
        contenido_final = estructurar_para_rag(contenido, doc['tipo_documento'])
        
        # Validar calidad
        if len(contenido_final) < 200:
            raise ValueError(f"Contenido insuficiente ({len(contenido_final)} chars)")
        
        # Guardar en BD
        supabase.table('documentos_oficiales').update({
            'contenido_texto': contenido_final,
            'etapa_actual': 'transformado',
            'progreso_procesamiento': 50,
            'estado_procesamiento': 'transformado',
            'metadata': {
                **doc.get('metadata', {}),
                'metodo_extraccion': metodo,
                'costo_extraccion_usd': round(costo, 4),
                'tipo_pdf': tipo_pdf
            }
        }).eq('id', doc['id']).execute()
        
        transformed += 1
        print(f"  ✅ {len(contenido_final)} chars ({metodo}) ${costo:.4f}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        supabase.table('documentos_oficiales').update({
            'estado_procesamiento': 'fallido',
            'error_procesamiento': str(e),
            'etapa_fallida': 'transformacion'
        }).eq('id', doc['id']).execute()

print(f"\n{'='*50}")
print(f"✅ Transformados: {transformed}/{len(docs)}")
print(f"💰 Costo total IA: ${total_costo_ia:.2f} USD")
print(f"\nTransformados: {transformed}")

sys.exit(0 if transformed > 0 else 1)
