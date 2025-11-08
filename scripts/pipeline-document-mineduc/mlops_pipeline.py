#!/usr/bin/env python3
"""
MLOps Pipeline - Procesamiento de Documentos con Métricas
Implementa mejores prácticas MLOps: ETL, validación, optimización y métricas
"""

import os
import sys
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
from dataclasses import dataclass
from dotenv import load_dotenv

try:
    import fitz
    from supabase import create_client
    from openai import OpenAI
    import requests
except ImportError as e:
    print(f"❌ Dependencia faltante: {e}")
    sys.exit(1)


@dataclass
class MetricasETL:
    """Métricas del proceso ETL"""
    documentos_procesados: int = 0
    documentos_fallidos: int = 0
    chunks_validados: int = 0
    errores_criticos: int = 0
    tiempo_total_ms: int = 0
    tiempo_extraccion_ms: int = 0
    tiempo_embedding_ms: int = 0
    tiempo_validacion_ms: int = 0
    tokens_usados: int = 0
    costo_estimado_usd: float = 0.0
    calidad_promedio: float = 0.0


class MLOpsPipeline:
    """Pipeline con mejores prácticas MLOps"""
    
    def __init__(self):
        load_dotenv('.env.local')
        
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        self.openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.metricas = MetricasETL()
        
        print("✅ MLOps Pipeline inicializado")
    
    def ejecutar(self) -> Dict:
        """Ejecuta pipeline completo con métricas"""
        
        inicio = time.time()
        workflow_id = f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        print(f"\n🚀 INICIANDO MLOPS PIPELINE")
        print(f"   Workflow ID: {workflow_id}")
        print("=" * 60)
        
        try:
            # FASE 1: OBTENCIÓN
            documentos = self._fase_obtencion()
            
            if not documentos:
                self._registrar_metricas_pipeline(workflow_id, 0, 0)
                return {'status': 'success', 'procesados': 0}
            
            # FASE 2: PREPARACIÓN Y ETL
            resultados = self._fase_etl(documentos)
            
            # FASE 3: VALIDACIÓN
            self._fase_validacion(resultados)
            
            # FASE 4: OPTIMIZACIÓN
            self._fase_optimizacion()
            
            # FASE 5: MÉTRICAS
            self.metricas.tiempo_total_ms = int((time.time() - inicio) * 1000)
            self._registrar_metricas_procesamiento()
            self._registrar_metricas_pipeline(
                workflow_id,
                len(documentos),
                self.metricas.documentos_procesados
            )
            
            self._mostrar_resumen()
            
            return {
                'status': 'success',
                'procesados': self.metricas.documentos_procesados,
                'fallidos': self.metricas.documentos_fallidos,
                'workflow_id': workflow_id
            }
            
        except Exception as e:
            self.metricas.errores_criticos += 1
            print(f"\n❌ ERROR CRÍTICO: {e}")
            self._registrar_metricas_pipeline(workflow_id, 0, 0, error=str(e))
            raise
    
    def _fase_obtencion(self) -> List[Dict]:
        """FASE 1: Obtención de documentos pendientes"""
        
        print("\n📋 FASE 1: OBTENCIÓN DE DATOS")
        print("-" * 60)
        
        response = self.supabase.table('documentos_oficiales')\
            .select('id, titulo, url_original, tipo_documento, año_vigencia')\
            .eq('procesado', False)\
            .limit(50)\
            .execute()
        
        documentos = response.data or []
        print(f"   ✅ Documentos pendientes: {len(documentos)}")
        
        return documentos
    
    def _fase_etl(self, documentos: List[Dict]) -> List[Dict]:
        """FASE 2: ETL (Extract, Transform, Load)"""
        
        print(f"\n📥 FASE 2: ETL - PROCESAMIENTO")
        print("-" * 60)
        
        resultados = []
        
        for idx, doc in enumerate(documentos, 1):
            print(f"\n[{idx}/{len(documentos)}] {doc['titulo'][:60]}...")
            
            try:
                # EXTRACT
                inicio_extract = time.time()
                pdf_data = self._extraer_pdf(doc['url_original'])
                if not pdf_data:
                    raise Exception("Descarga falló")
                
                # TRANSFORM
                texto = self._transformar_pdf_a_texto(pdf_data)
                if not texto or len(texto.strip()) < 50:
                    raise Exception("Extracción de texto falló")
                
                tiempo_extraccion = int((time.time() - inicio_extract) * 1000)
                self.metricas.tiempo_extraccion_ms += tiempo_extraccion
                
                # EMBEDDING
                inicio_embed = time.time()
                embedding, tokens = self._generar_embedding_optimizado(texto)
                tiempo_embedding = int((time.time() - inicio_embed) * 1000)
                self.metricas.tiempo_embedding_ms += tiempo_embedding
                self.metricas.tokens_usados += tokens
                
                # LOAD
                self._cargar_a_bd(doc['id'], texto, embedding)
                
                self.metricas.documentos_procesados += 1
                resultados.append({
                    'id': doc['id'],
                    'titulo': doc['titulo'],
                    'status': 'success',
                    'texto_length': len(texto),
                    'tokens': tokens,
                    'tiempo_ms': tiempo_extraccion + tiempo_embedding
                })
                
                print(f"   ✅ Procesado ({tiempo_extraccion + tiempo_embedding}ms)")
                
            except Exception as e:
                self.metricas.documentos_fallidos += 1
                resultados.append({
                    'id': doc['id'],
                    'titulo': doc['titulo'],
                    'status': 'error',
                    'error': str(e)
                })
                print(f"   ❌ Error: {e}")
        
        return resultados
    
    def _fase_validacion(self, resultados: List[Dict]):
        """FASE 3: Validación de calidad"""
        
        print(f"\n✓ FASE 3: VALIDACIÓN DE CALIDAD")
        print("-" * 60)
        
        inicio = time.time()
        
        for resultado in resultados:
            if resultado['status'] == 'success':
                # Validar calidad del texto
                calidad = self._validar_calidad_texto(resultado['id'])
                if calidad > 0.7:
                    self.metricas.chunks_validados += 1
                    self.metricas.calidad_promedio += calidad
        
        if self.metricas.chunks_validados > 0:
            self.metricas.calidad_promedio /= self.metricas.chunks_validados
        
        self.metricas.tiempo_validacion_ms = int((time.time() - inicio) * 1000)
        
        print(f"   ✅ Chunks validados: {self.metricas.chunks_validados}")
        print(f"   📊 Calidad promedio: {self.metricas.calidad_promedio:.2%}")
    
    def _fase_optimizacion(self):
        """FASE 4: Optimización de embeddings en BD"""
        
        print(f"\n⚡ FASE 4: OPTIMIZACIÓN DE EMBEDDINGS")
        print("-" * 60)
        
        try:
            # Crear índice HNSW si no existe (más rápido que IVFFlat)
            self.supabase.rpc('optimizar_indices_embeddings').execute()
            print("   ✅ Índices optimizados")
        except Exception as e:
            print(f"   ⚠️ Optimización manual requerida: {e}")
    
    def _extraer_pdf(self, url: str) -> Optional[bytes]:
        """Extrae PDF desde URL"""
        
        try:
            response = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (ProfeFlow-Bot/1.0)'
            })
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"   ❌ Descarga falló: {e}")
            return None
    
    def _transformar_pdf_a_texto(self, pdf_data: bytes) -> str:
        """Transforma PDF a texto limpio"""
        
        texto_completo = []
        
        with fitz.open(stream=pdf_data, filetype="pdf") as doc:
            for pagina_num, pagina in enumerate(doc, 1):
                texto = pagina.get_text("text", sort=True)
                
                if texto and texto.strip():
                    texto_limpio = self._limpiar_texto(texto)
                    if texto_limpio:
                        texto_completo.append(texto_limpio)
                
                if pagina_num >= 50:
                    break
        
        return "\n\n".join(texto_completo)
    
    def _limpiar_texto(self, texto: str) -> str:
        """Limpia y normaliza texto"""
        import re
        
        texto = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', texto)
        texto = re.sub(r'[ \t]+', ' ', texto)
        texto = re.sub(r'\n\s*\n\s*\n+', '\n\n', texto)
        
        return texto.strip()
    
    def _generar_embedding_optimizado(self, texto: str) -> Tuple[List[float], int]:
        """Genera embedding optimizado con conteo de tokens"""
        
        texto_limpio = texto.replace("\n", " ").strip()[:8000]
        
        response = self.openai.embeddings.create(
            model="text-embedding-3-small",
            input=texto_limpio
        )
        
        embedding = response.data[0].embedding
        tokens = response.usage.total_tokens
        
        # Calcular costo (text-embedding-3-small: $0.02 / 1M tokens)
        self.metricas.costo_estimado_usd += (tokens / 1_000_000) * 0.02
        
        return embedding, tokens
    
    def _cargar_a_bd(self, doc_id: str, texto: str, embedding: List[float]):
        """Carga datos procesados a BD"""
        
        self.supabase.table('documentos_oficiales').update({
            'contenido_texto': texto,
            'embedding': embedding,
            'procesado': True,
            'fecha_procesamiento': datetime.now().isoformat(),
            'embedding_model': 'text-embedding-3-small',
            'embedding_version': 'v1.0'
        }).eq('id', doc_id).execute()
    
    def _validar_calidad_texto(self, doc_id: str) -> float:
        """Valida calidad del texto extraído"""
        
        try:
            response = self.supabase.table('documentos_oficiales')\
                .select('contenido_texto')\
                .eq('id', doc_id)\
                .single()\
                .execute()
            
            texto = response.data.get('contenido_texto', '')
            
            if not texto:
                return 0.0
            
            # Métricas de calidad
            import re
            palabras = re.findall(r'\b[a-zA-ZÀ-ſ]{3,}\b', texto)
            
            if len(palabras) < 20:
                return 0.0
            
            # Ratio de palabras legibles vs caracteres totales
            calidad = min(len(palabras) / (len(texto) / 5), 1.0)
            
            return calidad
            
        except Exception:
            return 0.0
    
    def _registrar_metricas_procesamiento(self):
        """Registra métricas en tabla metricas_procesamiento"""
        
        try:
            self.supabase.table('metricas_procesamiento').insert({
                'tipo': 'etl_documentos',
                'documentos_procesados': self.metricas.documentos_procesados,
                'documentos_fallidos': self.metricas.documentos_fallidos,
                'tiempo_total_ms': self.metricas.tiempo_total_ms,
                'concurrencia_usada': 1,
                'metadata': {
                    'tiempo_extraccion_ms': self.metricas.tiempo_extraccion_ms,
                    'tiempo_embedding_ms': self.metricas.tiempo_embedding_ms,
                    'tiempo_validacion_ms': self.metricas.tiempo_validacion_ms,
                    'tokens_usados': self.metricas.tokens_usados,
                    'costo_estimado_usd': round(self.metricas.costo_estimado_usd, 4),
                    'calidad_promedio': round(self.metricas.calidad_promedio, 3),
                    'chunks_validados': self.metricas.chunks_validados
                }
            }).execute()
            
            print("\n   ✅ Métricas de procesamiento registradas")
            
        except Exception as e:
            print(f"\n   ⚠️ Error registrando métricas procesamiento: {e}")
    
    def _registrar_metricas_pipeline(
        self, 
        workflow_id: str, 
        monitoreados: int, 
        procesados: int,
        error: Optional[str] = None
    ):
        """Registra métricas en tabla metricas_pipeline_rag"""
        
        try:
            self.supabase.table('metricas_pipeline_rag').insert({
                'fecha': date.today().isoformat(),
                'documentos_monitoreados': monitoreados,
                'documentos_procesados': procesados,
                'chunks_validados': self.metricas.chunks_validados,
                'errores_criticos': self.metricas.errores_criticos,
                'latencia_monitoreo_ms': 0,
                'latencia_procesamiento_ms': self.metricas.tiempo_total_ms,
                'workflow_run_id': workflow_id
            }).execute()
            
            print("   ✅ Métricas de pipeline registradas")
            
        except Exception as e:
            print(f"   ⚠️ Error registrando métricas pipeline: {e}")
    
    def _mostrar_resumen(self):
        """Muestra resumen de métricas"""
        
        print("\n" + "=" * 60)
        print("📊 RESUMEN MLOPS PIPELINE")
        print("=" * 60)
        print(f"   Procesados:        {self.metricas.documentos_procesados}")
        print(f"   Fallidos:          {self.metricas.documentos_fallidos}")
        print(f"   Chunks validados:  {self.metricas.chunks_validados}")
        print(f"   Calidad promedio:  {self.metricas.calidad_promedio:.2%}")
        print(f"   Tiempo total:      {self.metricas.tiempo_total_ms:,}ms")
        print(f"   Tokens usados:     {self.metricas.tokens_usados:,}")
        print(f"   Costo estimado:    ${self.metricas.costo_estimado_usd:.4f}")
        print("=" * 60)


if __name__ == '__main__':
    try:
        pipeline = MLOpsPipeline()
        resultado = pipeline.ejecutar()
        
        sys.exit(0 if resultado['status'] == 'success' else 1)
        
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
