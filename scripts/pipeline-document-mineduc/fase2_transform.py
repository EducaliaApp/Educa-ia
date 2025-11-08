#!/usr/bin/env python3
"""
FASE 2: Transform - Extracción Híbrida de Contenido (Librerías + IA)

Este script procesa documentos PDF con estrategia adaptativa:
- Documentos simples: PyMuPDF + Tesseract OCR (gratis, rápido)
- Rúbricas/tablas complejas: IA Vision (Claude/GPT-4) para mejor estructura

Funcionalidad:
- Descarga PDFs desde Supabase Storage
- Clasifica tipo de documento (nativo, escaneado simple/complejo)
- Extrae con la mejor herramienta según tipo
- Estructura contenido para RAG
- Registra costos de IA

Variables de entorno:
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- AI_EXTRACTION_ENABLED: 'true' para habilitar IA en rúbricas
- ANTHROPIC_API_KEY o OPENAI_API_KEY: Para extracción con IA

Dependencias:
- supabase-py, PyMuPDF, python-dotenv
- pytesseract, pillow (OCR)
- anthropic (opcional, para IA)
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
    print("⚠️  OCR no disponible. Instalar: pip install pytesseract pillow")

# IA Vision opcional
try:
    from anthropic import Anthropic
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("ℹ️  IA no disponible. Instalar: pip install anthropic")

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

# Configuración
AI_EXTRACTION_ENABLED = os.getenv('AI_EXTRACTION_ENABLED', 'false').lower() == 'true'
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

if AI_EXTRACTION_ENABLED and not AI_AVAILABLE:
    print("⚠️  IA habilitada pero anthropic no instalado. Usando solo librerías.")
    AI_EXTRACTION_ENABLED = False

# Buscar documentos ya descargados en Storage
docs = supabase.table('documentos_oficiales')\
    .select('id, storage_path, titulo, tipo_documento')\
    .eq('etapa_actual', 'descargado')\
    .limit(50)\
    .execute().data or []

print(f"📄 Procesando {len(docs)} PDFs...")
print(f"🤖 Extracción con IA: {'✅ Habilitada' if AI_EXTRACTION_ENABLED else '❌ Deshabilitada'}")

if len(docs) == 0:
    print("ℹ️  No hay documentos pendientes de transformación")
    print("\nTransformados: 0")
    sys.exit(0)


# ============================================
# CLASIFICACIÓN DE DOCUMENTOS
# ============================================

def clasificar_tipo_pdf(pdf_bytes):
    """
    Clasifica el tipo de PDF para elegir mejor método de extracción.
    
    Returns:
        - 'texto_nativo': PDF con texto seleccionable (PyMuPDF directo)
        - 'escaneado_simple': PDF escaneado solo texto (Tesseract OCR)
        - 'escaneado_complejo': PDF con tablas/diagramas (IA Vision)
    """
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
            if len(pdf) == 0:
                return 'texto_nativo'
            
            # Analizar primera página
            primera_pagina = pdf[0]
            texto = primera_pagina.get_text().strip()
            
            # Tiene texto nativo suficiente
            if len(texto) > 500:
                return 'texto_nativo'
            
            # Poco texto, verificar si tiene imágenes/tablas
            imagenes = len(primera_pagina.get_images())
            
            if imagenes > 5:  # Muchas imágenes = complejo
                return 'escaneado_complejo'
            elif len(texto) < 50:  # Casi sin texto = escaneado
                return 'escaneado_simple'
            else:
                return 'texto_nativo'
                
    except Exception as e:
        print(f"  ⚠️  Error clasificando PDF: {e}")
        return 'texto_nativo'  # Fallback seguro
    if not OCR_AVAILABLE:
        return ""
    try:
        pix = pagina.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        return pytesseract.image_to_string(img, lang='spa')
    except:
        return ""

transformed = 0
for doc in docs:
    try:
        supabase.table('documentos_oficiales').update({
            'estado_procesamiento': 'procesando'
        }).eq('id', doc['id']).execute()
        
        # Descargar PDF desde Storage
        print(f"  📥 Descargando desde Storage: {doc['storage_path']}")
        pdf_bytes = supabase.storage.from_('documentos-mineduc').download(doc['storage_path'])
        
        texto = []
        es_escaneado = False
        
        # Procesar PDF
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
            for i, p in enumerate(pdf[:50]):
                t = p.get_text("text", sort=True).strip()
                
                if len(t) < 50 and OCR_AVAILABLE:
                    if i == 0:
                        print(f"  🔍 Documento escaneado, usando OCR...")
                        es_escaneado = True
                    t = extraer_texto_con_ocr(p)
                
                if t:
                    texto.append(re.sub(r'[\x00-\x1f\x7f-\x9f]', '', t))
        
        texto_final = "\n\n".join(texto)
        if len(texto_final) > 100:
            supabase.table('documentos_oficiales').update({
                'contenido_texto': texto_final,
                'etapa_actual': 'transformado',
                'progreso_procesamiento': 50,
                'estado_procesamiento': 'transformado'
            }).eq('id', doc['id']).execute()
            transformed += 1
            tipo = "OCR" if es_escaneado else "texto"
            print(f"✅ {doc['titulo']}: {len(texto_final)} chars ({tipo})")
        else:
            supabase.table('documentos_oficiales').update({
                'estado_procesamiento': 'fallido',
                'error_procesamiento': 'Texto insuficiente',
                'etapa_fallida': 'transformacion'
            }).eq('id', doc['id']).execute()
            print(f"⚠️  {doc['titulo']}: Texto insuficiente")
    except Exception as e:
        supabase.table('documentos_oficiales').update({
            'estado_procesamiento': 'fallido',
            'error_procesamiento': str(e),
            'etapa_fallida': 'transformacion'
        }).eq('id', doc['id']).execute()
        print(f"❌ {doc['id']}: {e}")

print(f"\nTransformados: {transformed}")
sys.exit(0)
