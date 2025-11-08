#!/usr/bin/env python3
"""
FASE 2: Transform - Extraer texto de PDFs
Este script procesa documentos PDF almacenados en la base de datos Supabase,
extrayendo su contenido textual y almacenándolo para posterior procesamiento.
Funcionalidad:
- Conecta a la base de datos Supabase usando variables de entorno
- Busca documentos no procesados que tengan datos PDF disponibles
- Extrae texto de hasta 50 páginas por PDF usando PyMuPDF (fitz)
- Limpia caracteres de control del texto extraído
- Almacena el texto extraído en la columna 'contenido_texto'
- Procesa hasta 50 documentos por ejecución
Variables de entorno requeridas:
- SUPABASE_URL: URL de la instancia de Supabase
- SUPABASE_SERVICE_ROLE_KEY: Clave de servicio para acceso a Supabase
Dependencias:
- python-dotenv: Para cargar variables de entorno
- supabase: Cliente de Python para Supabase
- PyMuPDF (fitz): Para procesamiento de PDFs
- re: Para limpieza de texto con expresiones regulares
Salida:
- Código de salida 0 si se transformó al menos un documento
- Código de salida 1 si no se transformó ningún documento
- Imprime progreso y estadísticas en la consola
Limitaciones:
- Procesa máximo 50 páginas por PDF
- Procesa máximo 50 documentos por ejecución
- Solo procesa documentos con texto extraíble (no imágenes)
"""
"""FASE 2: Transform - Extraer texto de PDFs con OCR para documentos escaneados"""
import os, sys, fitz, re
from dotenv import load_dotenv
from supabase import create_client
try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️  OCR no disponible. Instalar: pip install pytesseract pillow")

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
# revisar documentos no procesados y con pdf_data en la base de datos llamada documentos_oficiales revisando las columnas procesado y pdf_data
docs = supabase.table('documentos_oficiales').select('id, pdf_data').eq('etapa_actual', 'descargado').not_.is_('pdf_data', 'null').limit(50).execute().data or []
print(f"📄 Extrayendo texto de {len(docs)} PDFs...")

if len(docs) == 0:
    print("ℹ️  No hay documentos pendientes de transformación")
    print("\nTransformados: 0")
    sys.exit(0)

def extraer_texto_con_ocr(pagina):
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
        supabase.table('documentos_oficiales').update({'estado_procesamiento': 'procesando'}).eq('id', doc['id']).execute()
        texto = []
        es_escaneado = False
        
        pdf_data = doc['pdf_data']
        if isinstance(pdf_data, str):
            import base64
            pdf_data = base64.b64decode(pdf_data)
        
        with fitz.open(stream=pdf_data, filetype="pdf") as pdf:
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
                'etapa_actual': 'texto_extraido',
                'progreso_procesamiento': 50
            }).eq('id', doc['id']).execute()
            transformed += 1
            tipo = "OCR" if es_escaneado else "texto"
            print(f"✅ {doc['id']}: {len(texto_final)} chars ({tipo})")
        else:
            supabase.table('documentos_oficiales').update({'estado_procesamiento': 'fallido', 'error_procesamiento': 'Texto insuficiente', 'etapa_fallida': 'extraccion'}).eq('id', doc['id']).execute()
            print(f"⚠️  {doc['id']}: Texto insuficiente")
    except Exception as e:
        supabase.table('documentos_oficiales').update({'estado_procesamiento': 'fallido', 'error_procesamiento': str(e), 'etapa_fallida': 'extraccion'}).eq('id', doc['id']).execute()
        print(f"❌ {doc['id']}: {e}")

print(f"\nTransformados: {transformed}")
sys.exit(0)
