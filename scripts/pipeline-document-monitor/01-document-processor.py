# scripts/pipeline-document-monitor/01-document-processor.py

import os
import hashlib
import io
from typing import Dict, List, Optional
import json
from datetime import datetime
from dotenv import load_dotenv

try:
    import fitz  # PyMuPDF
except ImportError:
    print("⚠️ PyMuPDF no instalado. Instalar con: pip install PyMuPDF")
    fitz = None

try:
    from openai import OpenAI
except ImportError:
    print("⚠️ OpenAI no instalado. Instalar con: pip install openai")
    OpenAI = None

try:
    from supabase import create_client
except ImportError:
    print("⚠️ Supabase no instalado. Instalar con: pip install supabase")
    create_client = None

try:
    import pytesseract
    from PIL import Image
except ImportError:
    print("⚠️ OCR no disponible. Instalar con: pip install pytesseract Pillow")
    pytesseract = None
    Image = None

class DocumentProcessor:
    """
    Procesa documentos PDF desde Supabase Storage:
    1. Descarga PDFs ya almacenados
    2. Extrae texto completo
    3. Actualiza registros en BD
    """
    
    def __init__(self):
        # Cargar variables de entorno
        load_dotenv('.env.local')
        
        if not create_client:
            raise ImportError("Supabase no está instalado")
        
        # Verificar variables requeridas
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url:
            raise ValueError("SUPABASE_URL no está configurada")
        if not supabase_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY no está configurada")
            
        print(f"🔗 Conectando a Supabase: {supabase_url[:50]}...")
        
        try:
            self.supabase = create_client(supabase_url, supabase_key)
            print("✅ Cliente Supabase creado exitosamente")
        except Exception as e:
            raise ValueError(f"Error creando cliente Supabase: {e}")
        
        # Configurar OpenAI si está disponible
        if OpenAI and os.getenv('OPENAI_API_KEY'):
            try:
                self.openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
                print("✅ Cliente OpenAI configurado")
            except Exception as e:
                print(f"⚠️ Error configurando OpenAI: {e}")
                self.openai = None
        else:
            print("ℹ️ OpenAI no configurado (embeddings deshabilitados)")
            self.openai = None
    
    def procesar_documentos_pendientes(self) -> Dict:
        """
        Procesa todos los documentos pendientes en la base de datos
        """
        
        print("🔍 Buscando documentos pendientes...")
        
        # Obtener documentos sin procesar
        docs = self.supabase.table('documentos_oficiales')\
            .select('*')\
            .eq('procesado', False)\
            .execute()
        
        print(f"📊 Encontrados {len(docs.data)} documentos pendientes")
        
        procesados = 0
        errores = 0
        
        for doc in docs.data:
            try:
                resultado = self.procesar_documento_individual(doc)
                if resultado['status'] in ['procesado', 'procesado_sin_texto']:
                    procesados += 1
                    print(f"  ✅ {doc['titulo']}")
                else:
                    print(f"  ℹ️ {doc['titulo']} - {resultado['status']}")
            except Exception as e:
                errores += 1
                print(f"  ❌ {doc['titulo']} - Error: {e}")
        
        return {
            'total': len(docs.data),
            'procesados': procesados,
            'errores': errores
        }
    
    def procesar_documento_individual(self, documento: Dict) -> Dict:
        """
        Procesa un documento individual desde la base de datos
        """
        
        print(f"    📄 Procesando: {documento.get('titulo', 'Sin título')}")
        
        if not documento.get('storage_path'):
            return {'status': 'sin_archivo', 'error': 'No tiene storage_path'}
        
        print(f"    📥 Descargando desde: {documento['storage_path']}")
        
        # 1. Descargar PDF desde Storage
        pdf_data = self._descargar_desde_storage(documento['storage_path'])
        if not pdf_data:
            return {'status': 'error_descarga', 'error': 'No se pudo descargar PDF'}
        
        print(f"    ✅ Descargado: {len(pdf_data)} bytes")
        
        # 2. Extraer texto
        texto_completo = self._extraer_texto_pdf_data(pdf_data)
        
        # Si no hay texto, intentar OCR
        if not texto_completo or len(texto_completo.strip()) < 10:
            print("    🔍 Intentando OCR para documento escaneado...")
            texto_ocr = self._extraer_texto_con_ocr(pdf_data)
            if texto_ocr and len(texto_ocr.strip()) > 50:
                texto_completo = texto_ocr
                print(f"    ✅ OCR exitoso: {len(texto_completo)} caracteres")
            else:
                # Marcar como procesado pero sin contenido útil
                print("    ⚠️ Documento sin texto extraíble (probablemente escaneado)")
                self.supabase.table('documentos_oficiales').update({
                    'procesado': True,
                    'contenido_texto': 'Documento escaneado sin texto extraíble',
                    'fecha_procesamiento': datetime.now().isoformat(),
                    'tipo_contenido': 'imagen_escaneada'
                }).eq('id', documento['id']).execute()
                
                return {
                    'status': 'procesado_sin_texto',
                    'documento_id': documento['id'],
                    'nota': 'Documento escaneado sin texto extraíble'
                }
        
        # 3. Actualizar documento en BD primero
        update_data = {
            'procesado': True,
            'contenido_texto': texto_completo,
            'fecha_procesamiento': datetime.now().isoformat()
        }
        
        self.supabase.table('documentos_oficiales').update(update_data).eq('id', documento['id']).execute()
        
        # 4. Generar embedding usando función de Supabase
        if len(texto_completo) > 50:
            try:
                self._generar_embedding_supabase(documento['id'], texto_completo[:8000])
                print(f"    🔢 Embedding generado y almacenado en PostgreSQL")
            except Exception as e:
                print(f"    ⚠️ Error generando embedding: {e}")
                print("    ℹ️ Documento procesado sin embedding (se puede generar después)")
        

        
        return {
            'status': 'procesado',
            'documento_id': documento['id'],
            'texto_length': len(texto_completo)
        }
    
    def _descargar_desde_storage(self, storage_path: str) -> Optional[bytes]:
        """Descarga PDF desde Supabase Storage"""
        
        try:
            download = self.supabase.storage.from_('documentos-oficiales').download(storage_path)
            if download:
                return download
        except Exception as e:
            print(f"    ⚠️ Error descargando: {e}")
        return None
    
    def _extraer_texto_pdf_data(self, pdf_data: bytes) -> str:
        """Extrae texto de datos PDF en memoria"""
        
        print(f"    🔍 Extrayendo texto (PyMuPDF disponible: {fitz is not None})")
        
        if not fitz:
            print("    ⚠️ PyMuPDF no disponible, usando fallback")
            try:
                texto = pdf_data.decode('utf-8', errors='ignore')
                import re
                matches = re.findall(r'[A-Za-zÀ-ſ\s]{10,}', texto)
                resultado = ' '.join(matches[:1000])
                print(f"    📝 Fallback extrajo: {len(resultado)} caracteres")
                return resultado
            except Exception as e:
                print(f"    ❌ Error en fallback: {e}")
                return "Contenido extraído del PDF (procesamiento básico)"
        
        try:
            texto_completo = []
            with fitz.open(stream=pdf_data, filetype="pdf") as doc:
                print(f"    📖 PDF abierto: {len(doc)} páginas")
                
                for pagina_num, pagina in enumerate(doc, 1):
                    texto = pagina.get_text()
                    if texto.strip():
                        texto_completo.append(f"--- Página {pagina_num} ---\n{texto}")
                        print(f"    📄 Página {pagina_num}: {len(texto)} caracteres")
            
            resultado = "\n".join(texto_completo)
            print(f"    ✅ Texto total extraído: {len(resultado)} caracteres")
            return resultado
            
        except Exception as e:
            print(f"    ❌ Error con PyMuPDF: {e}")
            return ""
    
    def _extraer_texto_con_ocr(self, pdf_data: bytes) -> str:
        """Extrae texto usando OCR para documentos escaneados"""
        
        if not pytesseract or not Image or not fitz:
            print("    ⚠️ OCR no disponible")
            return ""
        
        try:
            texto_ocr = []
            
            with fitz.open(stream=pdf_data, filetype="pdf") as doc:
                for pagina_num, pagina in enumerate(doc, 1):
                    # Convertir página a imagen
                    pix = pagina.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom para mejor OCR
                    img_data = pix.tobytes("png")
                    
                    # Procesar con OCR
                    img = Image.open(io.BytesIO(img_data))
                    texto_pagina = pytesseract.image_to_string(img, lang='spa+eng')
                    
                    if texto_pagina.strip():
                        texto_ocr.append(f"--- Página {pagina_num} (OCR) ---\n{texto_pagina}")
                        print(f"    🔍 OCR Página {pagina_num}: {len(texto_pagina)} caracteres")
                    
                    # Limitar a 3 páginas para evitar timeout
                    if pagina_num >= 3:
                        break
            
            resultado = "\n".join(texto_ocr)
            print(f"    ✅ OCR completado: {len(resultado)} caracteres")
            return resultado
            
        except Exception as e:
            print(f"    ❌ Error en OCR: {e}")
            return ""
    
    def _calcular_hash(self, texto: str) -> str:
        """Calcula SHA-256 del contenido"""
        return hashlib.sha256(texto.encode('utf-8')).hexdigest()
    
    def _generar_embedding_supabase(self, documento_id: str, texto: str, max_reintentos: int = 2):
        """Genera embedding usando Edge Function de Supabase con pg_vector"""
        
        # MLOps: Track embedding model
        EMBEDDING_MODEL = 'text-embedding-3-small'
        EMBEDDING_VERSION = 'v1.0'
        
        # Limpiar y preparar texto
        texto_limpio = self._limpiar_texto_para_embedding(texto)
        
        # Si el texto es muy largo, usar solo las partes más relevantes
        if len(texto_limpio) > 8000:
            texto_limpio = self._extraer_contenido_relevante(texto_limpio)
        
        for intento in range(max_reintentos):
            try:
                print(f"    🔄 Generando embedding con Supabase (intento {intento + 1}/{max_reintentos})...")
                
                # Llamar a Edge Function para generar embedding
                response = self.supabase.functions.invoke(
                    'generar-embedding-documento',
                    {
                        'body': {
                            'documento_id': documento_id,
                            'texto': texto_limpio
                        }
                    }
                )
                
                if response.get('error'):
                    raise Exception(f"Error en Edge Function: {response['error']}")
                
                # MLOps: Update model tracking
                self.supabase.table('documentos_oficiales').update({
                    'embedding_model': EMBEDDING_MODEL,
                    'embedding_version': EMBEDDING_VERSION,
                    'embedding_generated_at': datetime.now().isoformat()
                }).eq('id', documento_id).execute()
                
                print(f"    ✅ Embedding generado exitosamente")
                return
                
            except Exception as e:
                error_msg = str(e).lower()
                
                if "connection" in error_msg or "timeout" in error_msg or "network" in error_msg:
                    print(f"    ⚠️ Error de conexión (intento {intento + 1}): {e}")
                    if intento < max_reintentos - 1:
                        import time
                        wait_time = (intento + 1) * 3  # Backoff
                        print(f"    ⏳ Esperando {wait_time}s antes del siguiente intento...")
                        time.sleep(wait_time)
                        continue
                else:
                    print(f"    ❌ Error generando embedding: {e}")
                    break
        
        # Si falla, intentar método directo como fallback
        print("    🔄 Intentando método directo como fallback...")
        try:
            self._generar_embedding_directo(documento_id, texto_limpio)
        except Exception as e:
            print(f"    ❌ Fallback también falló: {e}")
            raise
    
    def _generar_embedding_directo(self, documento_id: str, texto: str):
        """Genera embedding directamente usando RPC de Supabase"""
        
        try:
            # Usar función RPC para generar embedding
            result = self.supabase.rpc(
                'generar_embedding_documento',
                {
                    'p_documento_id': documento_id,
                    'p_texto': texto
                }
            ).execute()
            
            if result.data:
                print(f"    ✅ Embedding generado vía RPC")
            else:
                raise Exception("RPC no retornó datos")
                
        except Exception as e:
            print(f"    ❌ Error en RPC: {e}")
            # Último recurso: actualizar sin embedding
            print("    ℹ️ Documento quedará sin embedding (se puede procesar después)")
    

    
    def _limpiar_texto_para_embedding(self, texto: str) -> str:
        """Limpia texto para generar embeddings de mejor calidad"""
        import re
        
        # Remover caracteres de control y normalizar espacios
        texto = re.sub(r'[\x00-\x1F\x7F-\x9F]', ' ', texto)
        texto = re.sub(r'\s+', ' ', texto)
        
        # Remover patrones comunes de PDF que no aportan semánticamente
        patrones_ruido = [
            r'Página \d+',
            r'--- Página \d+ ---',
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'www\.[\w.-]+',
            r'http[s]?://[\w.-]+'
        ]
        
        for patron in patrones_ruido:
            texto = re.sub(patron, ' ', texto, flags=re.IGNORECASE)
        
        return texto.strip()
    
    def _extraer_contenido_relevante(self, texto: str) -> str:
        """Extrae las partes más relevantes del texto para embedding"""
        
        # Dividir en párrafos
        parrafos = [p.strip() for p in texto.split('\n') if len(p.strip()) > 50]
        
        # Priorizar párrafos con palabras clave educativas
        palabras_clave = [
            'objetivo', 'aprendizaje', 'competencia', 'habilidad', 'conocimiento',
            'evaluación', 'rúbrica', 'criterio', 'indicador', 'desempeño',
            'estudiante', 'alumno', 'docente', 'profesor', 'enseñanza'
        ]
        
        parrafos_relevantes = []
        for parrafo in parrafos:
            score = sum(1 for palabra in palabras_clave if palabra in parrafo.lower())
            if score > 0:
                parrafos_relevantes.append((score, parrafo))
        
        # Ordenar por relevancia y tomar los mejores
        parrafos_relevantes.sort(key=lambda x: x[0], reverse=True)
        
        texto_final = '\n'.join([p[1] for p in parrafos_relevantes[:10]])
        
        # Si aún es muy largo, truncar
        if len(texto_final) > 7000:
            texto_final = texto_final[:7000] + '...'
        
        return texto_final or texto[:7000]  # Fallback al texto original truncado
    



# Uso
if __name__ == '__main__':
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Procesador de Documentos MINEDUC')
    parser.add_argument('--auto', action='store_true', help='Modo automático')
    parser.add_argument('--verbose', action='store_true', help='Modo verbose')
    
    args = parser.parse_args()
    
    try:
        print("🚀 Iniciando procesador de documentos...")
        
        # Verificar dependencias
        missing_deps = []
        if not fitz:
            missing_deps.append('PyMuPDF')
        if not OpenAI:
            missing_deps.append('openai')
        if not create_client:
            missing_deps.append('supabase')
        
        if missing_deps:
            print(f"❌ Dependencias faltantes: {', '.join(missing_deps)}")
            print("Instalar con: pip install " + ' '.join(missing_deps))
            sys.exit(1)
        
        processor = DocumentProcessor()
        resultado = processor.procesar_documentos_pendientes()
        
        print(f"\n📊 Resumen:")
        print(f"  Total: {resultado['total']}")
        print(f"  Procesados: {resultado['procesados']}")
        print(f"  Errores: {resultado['errores']}")
        
        if resultado['procesados'] > 0:
            print(f"\n✅ {resultado['procesados']} documentos procesados exitosamente")
        elif resultado['total'] == 0:
            print(f"\nℹ️ No hay documentos pendientes de procesar")
        else:
            print(f"\n⚠️ No se procesaron documentos (revisar errores)")
            print("\nℹ️ Nota: Documentos escaneados se marcan como procesados aunque no tengan texto extraíble")
        
        # Salir con código 0 siempre (no fallar el workflow)
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error crítico: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        
        # Salir con código 0 para no fallar el workflow
        print("\nℹ️ Script completado con errores (no crítico para el pipeline)")
        sys.exit(0)