#!/usr/bin/env python3
"""
FASE 2: Transform - Extracción Híbrida Multi-Proveedor (Librerías + IA)

Estrategia adaptativa:
- Documentos simples: PyMuPDF + Tesseract OCR (gratis, rápido)
- Rúbricas/documentos complejos: IA Vision con fallback automático

Prioridad de proveedores IA:
1. Gemini 1.5 Flash → Gratis hasta 1500 req/día, contexto 1M tokens
2. GPT-4o → Balance calidad/precio ($2.50/MTok input vs $3 Claude)
3. Claude 3.5 Sonnet → Backup (mejor calidad, más caro)

Variables de entorno:
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- AI_EXTRACTION_ENABLED='true' para habilitar IA
- GEMINI_API_KEY: Prioridad 1 (Google)
- OPENAI_API_KEY: Prioridad 2 (OpenAI)
- ANTHROPIC_API_KEY: Prioridad 3 (Anthropic)
"""
import os, sys, fitz, re, json, base64, time
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
    print("⚠️  pytesseract no disponible")

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

# Determinar proveedores disponibles (orden de prioridad)
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

# Buscar documentos
docs = supabase.table('documentos_oficiales')\
    .select('id, storage_path, titulo, tipo_documento')\
    .eq('etapa_actual', 'descargado')\
    .limit(50)\
    .execute().data or []

print(f"📄 Procesando {len(docs)} PDFs...")
print(f"🤖 IA: {'✅ Habilitada' if AI_EXTRACTION_ENABLED else '❌ Deshabilitada'}")
if AI_EXTRACTION_ENABLED:
    print(f"   Proveedores: {' → '.join([p.upper() for p in AI_PROVIDERS])}")

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
            else:
                return 'escaneado_simple'
    except:
        return 'texto_nativo'


# ============================================
# EXTRACCIÓN CON PYMUPDF + OCR
# ============================================

def extraer_con_pymupdf(pdf_bytes):
    """Extracción rápida con PyMuPDF + OCR fallback"""
    texto_completo = []
    es_escaneado = False
    
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
            for pagina in pdf:
                texto = pagina.get_text().strip()
                
                if len(texto) < 100 and OCR_AVAILABLE:
                    try:
                        pix = pagina.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        texto = pytesseract.image_to_string(img, lang='spa')
                        es_escaneado = True
                    except:
                        pass
                
                if texto:
                    texto_completo.append(texto)
    except Exception as e:
        print(f"  ⚠️  Error PyMuPDF: {e}")
        return "", False
    
    return "\n\n".join(texto_completo), es_escaneado


# ============================================
# EXTRACCIÓN CON IA VISION (MULTI-PROVEEDOR)
# ============================================

def extraer_con_ia_vision(pdf_bytes, tipo_documento):
    """
    Extrae contenido con IA Vision usando fallback automático:
    1. Gemini 1.5 Flash (gratis hasta 1500 req/día)
    2. GPT-4o (balance calidad/precio)
    3. Claude 3.5 Sonnet (mejor calidad, más caro)
    """
    if len(AI_PROVIDERS) == 0:
        print("  ⚠️  No hay proveedores IA, usando PyMuPDF")
        return extraer_con_pymupdf(pdf_bytes)[0], 0, 'pymupdf'
    
    # Preparar imágenes del PDF
    imagenes_base64 = []
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
            for page_num in range(min(10, len(pdf))):  # Máximo 10 páginas
                page = pdf[page_num]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_bytes = pix.tobytes("png")
                img_b64 = base64.b64encode(img_bytes).decode('utf-8')
                imagenes_base64.append(img_b64)
    except Exception as e:
        print(f"  ⚠️  Error renderizando PDF: {e}")
        return extraer_con_pymupdf(pdf_bytes)[0], 0, 'pymupdf'
    
    # Prompt optimizado según tipo de documento
    if tipo_documento == 'rubricas':
        prompt = """Extrae el contenido de esta rúbrica educativa preservando su estructura:

1. **Estructura jerárquica**: Identifica TODOS los niveles (Insatisfactorio, Básico, Competente, Destacado)
2. **Criterios completos**: Para cada criterio, extrae los descriptores de TODOS los niveles
3. **Relaciones**: Mantén la relación entre criterios, niveles y descriptores
4. **Formato Markdown**: Usa ## para niveles, ### para criterios

Ejemplo de salida esperada:

## Nivel 1: Insatisfactorio

### Criterio A1: Conocimiento disciplinar
El profesor evidencia limitado conocimiento...

### Criterio A2: Organización
Las actividades no se articulan...

## Nivel 2: Básico

### Criterio A1: Conocimiento disciplinar
El profesor demuestra conocimiento...
"""
    else:
        prompt = """Extrae TODO el contenido de este documento educativo:

1. **Texto completo**: Transcribe todo preservando estructura
2. **Tablas**: Convierte a formato Markdown
3. **Listas**: Mantén jerarquía con - o numeración
4. **Títulos**: Usa Markdown (## para secciones)

Genera un documento estructurado y limpio."""
    
    # Intentar con cada proveedor en orden de prioridad
    for provider in AI_PROVIDERS:
        try:
            print(f"  🤖 Intentando con {provider.upper()}...", end=" ")
            
            if provider == 'gemini':
                contenido, costo = _extraer_con_gemini(prompt, imagenes_base64)
                print(f"✅ Éxito")
                return contenido, costo, 'gemini'
            
            elif provider == 'openai':
                contenido, costo = _extraer_con_openai(prompt, imagenes_base64)
                print(f"✅ Éxito")
                return contenido, costo, 'openai'
            
            elif provider == 'anthropic':
                contenido, costo = _extraer_con_anthropic(prompt, imagenes_base64)
                print(f"✅ Éxito")
                return contenido, costo, 'anthropic'
        
        except Exception as e:
            print(f"❌ {str(e)[:80]}")
            time.sleep(1)  # Evitar rate limits
            continue
    
    # Si todos fallan, usar PyMuPDF
    print("  ⚠️  Todos los proveedores IA fallaron, usando PyMuPDF")
    return extraer_con_pymupdf(pdf_bytes)[0], 0, 'pymupdf_fallback'


def _extraer_con_gemini(prompt, imagenes_base64):
    """Extrae con Gemini 1.5 Flash (prioridad 1: gratis + rápido)"""
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Convertir imágenes base64 a formato Gemini
    partes = [prompt]
    for img_b64 in imagenes_base64:
        img_bytes = base64.b64decode(img_b64)
        partes.append({
            'mime_type': 'image/png',
            'data': img_bytes
        })
    
    response = model.generate_content(partes)
    contenido = response.text
    
    # Gemini Flash: Gratis hasta 1500 req/día
    # Después: $0.075/1M tokens input, $0.30/1M output
    costo = 0.0  # Asumimos quota gratuita
    
    return contenido, costo


def _extraer_con_openai(prompt, imagenes_base64):
    """Extrae con GPT-4o (prioridad 2: mejor balance calidad/precio)"""
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    # Preparar mensajes con imágenes
    mensaje_contenido = [{"type": "text", "text": prompt}]
    
    for img_b64 in imagenes_base64:
        mensaje_contenido.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{img_b64}",
                "detail": "high"
            }
        })
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": mensaje_contenido
        }],
        max_tokens=4096
    )
    
    contenido = response.choices[0].message.content
    
    # GPT-4o: $2.50/1M tokens input, $10/1M output
    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens
    costo = (input_tokens / 1_000_000 * 2.5) + (output_tokens / 1_000_000 * 10)
    
    return contenido, costo


def _extraer_con_anthropic(prompt, imagenes_base64):
    """Extrae con Claude 3.5 Sonnet (prioridad 3: mejor calidad, más caro)"""
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    
    # Preparar mensajes con imágenes
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
    
    # Claude 3.5 Sonnet: $3/1M tokens input, $15/1M output
    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    costo = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)
    
    return contenido, costo


# ============================================
# ESTRUCTURACIÓN PARA RAG
# ============================================

def estructurar_para_rag(contenido, tipo_documento):
    """Post-procesa contenido para optimizar búsqueda vectorial"""
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
stats_proveedores = {}

for doc in docs:
    try:
        print(f"\n📄 {doc['titulo']}")
        
        # Descargar PDF desde Storage
        res = supabase.storage.from_('documentos-mineduc').download(doc['storage_path'])
        pdf_bytes = res
        
        # Clasificar tipo de PDF
        tipo_pdf = clasificar_tipo_pdf(pdf_bytes)
        print(f"  📋 Tipo: {tipo_pdf}")
        
        # Decidir método de extracción
        usar_ia = AI_EXTRACTION_ENABLED and (
            doc['tipo_documento'] == 'rubricas' or 
            tipo_pdf == 'escaneado_complejo'
        )
        
        if usar_ia:
            print(f"  🤖 Extrayendo con IA...")
            contenido, costo, proveedor = extraer_con_ia_vision(pdf_bytes, doc['tipo_documento'])
            metodo = f'ia_{proveedor}'
            stats_proveedores[proveedor] = stats_proveedores.get(proveedor, 0) + 1
        else:
            print(f"  📚 Extrayendo con PyMuPDF + OCR...")
            contenido, es_escaneado = extraer_con_pymupdf(pdf_bytes)
            costo = 0
            metodo = 'tesseract_ocr' if es_escaneado else 'pymupdf'
            stats_proveedores['pymupdf'] = stats_proveedores.get('pymupdf', 0) + 1
        
        # Estructurar para RAG
        contenido_final = estructurar_para_rag(contenido, doc['tipo_documento'])
        
        # Guardar en BD
        supabase.table('documentos_oficiales').update({
            'contenido_markdown': contenido_final,
            'etapa_actual': 'transformado',
            'metadata': {
                'metodo_extraccion': metodo,
                'tipo_pdf': tipo_pdf,
                'costo_extraccion_usd': round(costo, 4),
                'longitud_chars': len(contenido_final)
            }
        }).eq('id', doc['id']).execute()
        
        total_costo_ia += costo
        transformed += 1
        
        print(f"  ✅ {len(contenido_final):,} chars ({metodo}) ${costo:.4f}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        continue

print("\n" + "="*50)
print(f"✅ Transformados: {transformed}/{len(docs)}")
if total_costo_ia > 0:
    print(f"💰 Costo total IA: ${total_costo_ia:.4f} USD")
print(f"📊 Proveedores usados: {json.dumps(stats_proveedores, indent=2)}")
