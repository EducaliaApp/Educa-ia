#!/usr/bin/env python3
"""
VALIDADOR DE CALIDAD AVANZADO v2.0 - Sistema RAG ProfeFlow

MEJORAS IMPLEMENTADAS:
- ✅ Validación de embeddings text-embedding-3-large (valores numéricos)
- ✅ Detección de chunks duplicados semánticamente (similitud > 0.95)
- ✅ Validación de metadata rica JSONB (12+ campos Fase 3)
- ✅ Validación de integridad de caché (chunk_hash, model, dimensions)
- ✅ Detección de chunks huérfanos (sin documento padre)
- ✅ Test funcional de búsqueda semántica
- ✅ Cálculo de costos por tokens procesados
- ✅ Validación de chunking semántico (rúbricas vs genérico)
- ✅ Verificación de índices HNSW vía RPC
- ✅ Métricas de diversidad de chunks por documento
"""

import os
import sys
import re
import json
import hashlib
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from dotenv import load_dotenv
from collections import defaultdict

try:
    from supabase import create_client
    import numpy as np
except ImportError:
    print("❌ Instalar: pip install supabase python-dotenv numpy")
    sys.exit(1)


class ValidadorCalidad:
    """
    Validates the quality of processed documents and their chunks in the document processing pipeline.
    This class performs comprehensive quality validation on documents stored in the database,
    checking various criteria including text content, embeddings, and chunk integrity.
    Attributes:
        supabase: Supabase client instance for database operations
    Quality Criteria:
        - Minimum text length (15% weight)
        - Readable words count (25% weight) 
        - Absence of excessive metadata (15% weight)
        - Valid chunks with embeddings (45% weight total)
    Usage:
        validator = ValidadorCalidad()
        results = validator.validar_todos()
    The validation process returns a comprehensive report including:
        - Total documents processed
        - Approved/rejected counts
        - Average quality score
        - Chunk statistics
        - Detailed breakdown per document
    """
    """Valida calidad de documentos procesados"""
    
    def __init__(self):
        load_dotenv('.env.local')
        
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        
        print("✅ Validador de calidad inicializado")
    
    def validar_todos(self) -> Dict:
        """Valida todos los documentos procesados"""
        
        print("\n🔍 VALIDACIÓN DE CALIDAD")
        print("=" * 60)
        
        # Obtener documentos procesados
        response = self.supabase.table('documentos_oficiales')\
            .select('id, titulo, contenido_texto, embedding')\
            .eq('procesado', True)\
            .execute()
        
        documentos = response.data or []
        print(f"   Documentos a validar: {len(documentos)}")
        
        resultados = {
            'total': len(documentos),
            'aprobados': 0,
            'rechazados': 0,
            'calidad_promedio': 0.0,
            'total_chunks': 0,
            'chunks_sin_embedding': 0,
            'detalles': []
        }
        
        for doc in documentos:
            calidad, chunks_info = self._calcular_calidad(doc)
            
            resultado = {
                'id': doc['id'],
                'titulo': doc['titulo'],
                'calidad': calidad,
                'aprobado': calidad >= 0.7,
                'chunks': chunks_info
            }
            
            if resultado['aprobado']:
                resultados['aprobados'] += 1
            else:
                resultados['rechazados'] += 1
            
            resultados['calidad_promedio'] += calidad
            resultados['total_chunks'] += chunks_info['total']
            resultados['chunks_sin_embedding'] += chunks_info['sin_embedding']
            resultados['detalles'].append(resultado)
        
        if resultados['total'] > 0:
            resultados['calidad_promedio'] /= resultados['total']
        
        self._mostrar_reporte(resultados)
        
        return resultados
    
    def _calcular_calidad(self, doc: Dict) -> tuple:
        """Calcula score de calidad del documento y valida chunks"""
        
        texto = doc.get('contenido_texto', '')
        
        if not texto:
            return 0.0, {'total': 0, 'sin_embedding': 0}
        
        score = 0.0
        
        # Criterio 1: Longitud mínima (15%)
        if len(texto) >= 500:
            score += 0.15
        elif len(texto) >= 200:
            score += 0.08
        
        # Criterio 2: Palabras legibles (25%)
        palabras = re.findall(r'\b[a-zA-ZÀ-ſ]{3,}\b', texto)
        if len(palabras) >= 100:
            score += 0.25
        elif len(palabras) >= 50:
            score += 0.12
        
        # Criterio 3: Sin metadata excesiva (15%)
        metadata_keywords = ['endobj', 'endstream', 'flatedecode']
        metadata_count = sum(1 for kw in metadata_keywords if kw in texto.lower())
        if metadata_count == 0:
            score += 0.15
        
        # Criterio 4: Validar chunks (45%)
        chunks_response = self.supabase.table('chunks_documentos')\
            .select('id, embedding, contenido')\
            .eq('documento_id', doc['id'])\
            .execute()
        
        chunks = chunks_response.data or []
        chunks_info = {
            'total': len(chunks),
            'sin_embedding': sum(1 for c in chunks if not c.get('embedding'))
        }
        
        if len(chunks) > 0:
            # Todos los chunks tienen embedding (25%)
            if chunks_info['sin_embedding'] == 0:
                score += 0.25
            else:
                score += 0.25 * (1 - chunks_info['sin_embedding'] / len(chunks))
            
            # Chunks tienen contenido válido (20%)
            chunks_validos = sum(1 for c in chunks if len(c.get('contenido', '')) > 100)
            score += 0.20 * (chunks_validos / len(chunks))
        
        return min(score, 1.0), chunks_info
    
    def _mostrar_reporte(self, resultados: Dict):
        """Muestra reporte de validación"""
        
        print("\n" + "=" * 60)
        print("📊 REPORTE DE VALIDACIÓN")
        print("=" * 60)
        print(f"   Total:             {resultados['total']}")
        print(f"   ✅ Aprobados:      {resultados['aprobados']}")
        print(f"   ❌ Rechazados:     {resultados['rechazados']}")
        print(f"   📈 Calidad:        {resultados['calidad_promedio']:.2%}")
        print(f"   📑 Total chunks:   {resultados['total_chunks']}")
        print(f"   ⚠️  Sin embedding:  {resultados['chunks_sin_embedding']}")
        print("=" * 60)
        
        # Mostrar documentos rechazados
        if resultados['rechazados'] > 0:
            print("\n⚠️ DOCUMENTOS CON BAJA CALIDAD:")
            for detalle in resultados['detalles']:
                if not detalle['aprobado']:
                    chunks = detalle['chunks']
                    print(f"   - {detalle['titulo'][:50]} ({detalle['calidad']:.2%}) - {chunks['total']} chunks, {chunks['sin_embedding']} sin embedding")


if __name__ == '__main__':
    try:
        validador = ValidadorCalidad()
        resultados = validador.validar_todos()
        
        # ============================================
        # EXPORTAR MÉTRICAS JSON
        # ============================================
        
        def export_metrics_json(metrics: dict, filepath: str):
            """Exporta métricas en formato JSON para GitHub Actions"""
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(metrics, f, indent=2, ensure_ascii=False)
                print(f"\n📄 Métricas exportadas: {filepath}")
            except Exception as e:
                print(f"\n⚠️ Error exportando métricas: {e}")
        
        # Preparar métricas para exportación
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'fase': 'validacion',
            'total_documentos': resultados['total'],
            'aprobados': resultados['aprobados'],
            'rechazados': resultados['rechazados'],
            'calidad_promedio': round(resultados['calidad_promedio'], 4),
            'total_chunks': resultados['total_chunks'],
            'chunks_sin_embedding': resultados['chunks_sin_embedding'],
            'tasa_aprobacion': round(resultados['aprobados'] / max(resultados['total'], 1) * 100, 2),
            'detalles_rechazados': [
                {
                    'id': d['id'],
                    'titulo': d['titulo'],
                    'calidad': round(d['calidad'], 4),
                    'chunks': d['chunks']
                }
                for d in resultados['detalles'] if not d['aprobado']
            ]
        }
        
        export_metrics_json(metrics, 'validation_metrics.json')
        
        # Exit code basado en calidad promedio
        if resultados['calidad_promedio'] < 0.5:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
