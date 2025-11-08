#!/usr/bin/env python3
"""
Pipeline Completo ETL - Documentos MINEDUC
Descarga, procesa, transforma y almacena documentos oficiales
"""

import os
import sys
import hashlib
import io
import requests
from typing import Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

try:
    import fitz  # PyMuPDF
    from supabase import create_client
    from openai import OpenAI
except ImportError as e:
    print(f"❌ Dependencia faltante: {e}")
    print("Instalar con: pip install PyMuPDF supabase openai python-dotenv requests")
    sys.exit(1)

class PipelineCompleto:
    """Pipeline ETL completo para documentos MINEDUC"""
    
    def __init__(self):
        load_dotenv('.env.local')
        
        # Configurar clientes
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        self.openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        print("✅ Pipeline inicializado")
    
    def ejecutar_pipeline_completo(self) -> Dict:
        """Ejecuta el pipeline completo end-to-end"""
        
        print("\n🚀 INICIANDO PIPELINE COMPLETO ETL")
        print("=" * 60)
        
        # PASO 1: Obtener documentos pendientes de la BD
        print("\n📋 PASO 1: Obtener documentos pendientes")
        documentos = self._obtener_documentos_pendientes()
        print(f"   Encontrados: {len(documentos)} documentos")
        
        if not documentos:
            print("✅ No hay documentos pendientes")
            return {'total': 0, 'procesados': 0, 'errores': 0}
        
        # PASO 2: Procesar cada documento
        print(f"\n📥 PASO 2: Procesar {len(documentos)} documentos")
        resultados = {
            'total': len(documentos),
            'procesados': 0,
            'errores': 0,
            'detalles': []
        }
        
        for idx, doc in enumerate(documentos, 1):
            print(f"\n[{idx}/{len(documentos)}] {doc['titulo']}")
            
            try:
                # 2.1 Descargar PDF
                pdf_data = self._descargar_pdf(doc['url_original'])
                if not pdf_data:
                    raise Exception("No se pudo descargar PDF")
                
                # 2.2 Extraer texto
                texto = self._extraer_texto(pdf_data)
                if not texto or len(texto.strip()) < 50:
                    raise Exception("No se pudo extraer texto")
                
                # 2.3 Generar embedding
                embedding = self._generar_embedding(texto[:8000])
                
                # 2.4 Guardar en BD
                self._guardar_documento_procesado(doc['id'], texto, embedding)
                
                resultados['procesados'] += 1
                resultados['detalles'].append({
                    'id': doc['id'],
                    'titulo': doc['titulo'],
                    'status': 'success',
                    'texto_length': len(texto)
                })
                
                print(f"   ✅ Procesado exitosamente")
                
            except Exception as e:
                resultados['errores'] += 1
                resultados['detalles'].append({
                    'id': doc['id'],
                    'titulo': doc['titulo'],
                    'status': 'error',
                    'error': str(e)
                })
                print(f"   ❌ Error: {e}")
        
        # PASO 3: Resumen
        print("\n" + "=" * 60)
        print("📊 RESUMEN DEL PIPELINE")
        print(f"   Total: {resultados['total']}")
        print(f"   ✅ Procesados: {resultados['procesados']}")
        print(f"   ❌ Errores: {resultados['errores']}")
        print("=" * 60)
        
        return resultados
    
    def _obtener_documentos_pendientes(self) -> List[Dict]:
        """Obtiene documentos sin procesar de la BD"""
        
        response = self.supabase.table('documentos_oficiales')\
            .select('id, titulo, url_original, storage_path')\
            .eq('procesado', False)\
            .limit(50)\
            .execute()
        
        return response.data or []
    
    def _descargar_pdf(self, url: str) -> Optional[bytes]:
        """Descarga PDF desde URL original"""
        
        print(f"   📥 Descargando desde: {url[:80]}...")
        
        try:
            response = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (ProfeFlow-Bot/1.0)'
            })
            response.raise_for_status()
            
            pdf_data = response.content
            print(f"   ✅ Descargado: {len(pdf_data):,} bytes")
            return pdf_data
            
        except Exception as e:
            print(f"   ❌ Error descargando: {e}")
            return None
    
    def _extraer_texto(self, pdf_data: bytes) -> str:
        """Extrae texto del PDF"""
        
        print(f"   📄 Extrayendo texto...")
        
        try:
            texto_completo = []
            
            with fitz.open(stream=pdf_data, filetype="pdf") as doc:
                for pagina_num, pagina in enumerate(doc, 1):
                    texto = pagina.get_text()
                    if texto.strip():
                        texto_completo.append(texto)
                    
                    # Limitar a 50 páginas para evitar timeout
                    if pagina_num >= 50:
                        break
            
            resultado = "\n".join(texto_completo)
            print(f"   ✅ Extraído: {len(resultado):,} caracteres")
            return resultado
            
        except Exception as e:
            print(f"   ❌ Error extrayendo texto: {e}")
            return ""
    
    def _generar_embedding(self, texto: str) -> List[float]:
        """Genera embedding con OpenAI"""
        
        print(f"   🔢 Generando embedding...")
        
        try:
            # Limpiar texto
            texto_limpio = texto.replace("\n", " ").strip()[:8000]
            
            response = self.openai.embeddings.create(
                model="text-embedding-3-small",
                input=texto_limpio
            )
            
            embedding = response.data[0].embedding
            print(f"   ✅ Embedding generado: {len(embedding)} dimensiones")
            return embedding
            
        except Exception as e:
            print(f"   ❌ Error generando embedding: {e}")
            raise
    
    def _guardar_documento_procesado(
        self, 
        documento_id: str, 
        texto: str, 
        embedding: List[float]
    ):
        """Guarda documento procesado en BD"""
        
        print(f"   💾 Guardando en BD...")
        
        try:
            # Actualizar documento con texto y embedding
            self.supabase.table('documentos_oficiales').update({
                'contenido_texto': texto,
                'embedding': embedding,
                'procesado': True,
                'fecha_procesamiento': datetime.now().isoformat(),
                'embedding_model': 'text-embedding-3-small',
                'embedding_version': 'v1.0',
                'embedding_generated_at': datetime.now().isoformat()
            }).eq('id', documento_id).execute()
            
            print(f"   ✅ Guardado exitosamente")
            
        except Exception as e:
            print(f"   ❌ Error guardando: {e}")
            raise


if __name__ == '__main__':
    try:
        pipeline = PipelineCompleto()
        resultado = pipeline.ejecutar_pipeline_completo()
        
        # Exit code basado en resultados
        if resultado['errores'] > 0 and resultado['procesados'] == 0:
            sys.exit(1)  # Falló completamente
        else:
            sys.exit(0)  # Éxito parcial o total
            
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
