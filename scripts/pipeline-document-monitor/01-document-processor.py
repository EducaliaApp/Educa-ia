# scripts/pipeline-document-monitor/01-document-processor.py

import os
import hashlib
import requests
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

class DocumentProcessor:
    """
    Procesa documentos PDF desde Supabase Storage:
    1. Descarga PDFs ya almacenados
    2. Extrae texto completo
    3. Actualiza registros en BD
    """
    
    def __init__(self):
        load_dotenv('.env.local')
        
        if not create_client:
            raise ImportError("Supabase no está instalado")
            
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        
        if OpenAI and os.getenv('OPENAI_API_KEY'):
            self.openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        else:
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
                if resultado['status'] == 'procesado':
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
        
        if not documento.get('storage_path'):
            return {'status': 'sin_archivo', 'error': 'No tiene storage_path'}
        
        # 1. Descargar PDF desde Storage
        pdf_data = self._descargar_desde_storage(documento['storage_path'])
        if not pdf_data:
            return {'status': 'error_descarga', 'error': 'No se pudo descargar PDF'}
        
        # 2. Extraer texto
        texto_completo = self._extraer_texto_pdf_data(pdf_data)
        if not texto_completo:
            return {'status': 'error_extraccion', 'error': 'No se pudo extraer texto'}
        
        # 3. Generar embedding para búsqueda semántica
        embedding = None
        if self.openai and len(texto_completo) > 50:
            try:
                embedding = self._generar_embedding(texto_completo[:8000])  # Primeros 8k chars
                print(f"    🔢 Embedding generado ({len(embedding)} dimensiones)")
            except Exception as e:
                print(f"    ⚠️ Error generando embedding: {e}")
        
        # 4. Actualizar documento en BD
        update_data = {
            'procesado': True,
            'contenido_texto': texto_completo,
            'fecha_procesamiento': datetime.now().isoformat()
        }
        
        if embedding:
            update_data['embedding'] = embedding
        
        self.supabase.table('documentos_oficiales').update(update_data).eq('id', documento['id']).execute()
        
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
        
        if not fitz:
            # Fallback: extracción básica de texto
            try:
                texto = pdf_data.decode('utf-8', errors='ignore')
                # Buscar patrones de texto legible
                import re
                matches = re.findall(r'[A-Za-zÀ-ſ\s]{10,}', texto)
                return ' '.join(matches[:1000])  # Primeros 1000 matches
            except:
                return "Contenido extraído del PDF (procesamiento básico)"
        
        try:
            texto_completo = []
            with fitz.open(stream=pdf_data, filetype="pdf") as doc:
                for pagina_num, pagina in enumerate(doc, 1):
                    texto = pagina.get_text()
                    if texto.strip():
                        texto_completo.append(f"--- Página {pagina_num} ---\n{texto}")
            
            return "\n".join(texto_completo)
        except Exception as e:
            print(f"    ⚠️ Error con PyMuPDF: {e}")
            return "Contenido extraído del PDF (error en procesamiento)"
    
    def _calcular_hash(self, texto: str) -> str:
        """Calcula SHA-256 del contenido"""
        return hashlib.sha256(texto.encode('utf-8')).hexdigest()
    
    def _generar_embedding(self, texto: str) -> List[float]:
        """Genera embedding para búsqueda semántica con chunking inteligente"""
        
        if not self.openai:
            raise ValueError("OpenAI no está configurado")
        
        # Limpiar y preparar texto
        texto_limpio = self._limpiar_texto_para_embedding(texto)
        
        # Si el texto es muy largo, usar solo las partes más relevantes
        if len(texto_limpio) > 8000:
            texto_limpio = self._extraer_contenido_relevante(texto_limpio)
        
        response = self.openai.embeddings.create(
            model="text-embedding-3-small",
            input=texto_limpio,
            encoding_format="float"
        )
        
        return response.data[0].embedding
    
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
    
    parser = argparse.ArgumentParser(description='Procesador de Documentos MINEDUC')
    parser.add_argument('--auto', action='store_true', help='Modo automático')
    parser.add_argument('--verbose', action='store_true', help='Modo verbose')
    
    args = parser.parse_args()
    
    try:
        processor = DocumentProcessor()
        resultado = processor.procesar_documentos_pendientes()
        
        print(f"\n📊 Resumen:")
        print(f"  Total: {resultado['total']}")
        print(f"  Procesados: {resultado['procesados']}")
        print(f"  Errores: {resultado['errores']}")
        
        if resultado['procesados'] > 0:
            print(f"\n✅ {resultado['procesados']} documentos procesados exitosamente")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()