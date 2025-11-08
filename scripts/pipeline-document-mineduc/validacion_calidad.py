#!/usr/bin/env python3
"""
Validación de Calidad - Documentos Procesados
Valida la calidad de los documentos procesados y genera reportes
"""

import os
import sys
import re
from typing import Dict, List
from datetime import datetime
from dotenv import load_dotenv

try:
    from supabase import create_client
except ImportError:
    print("❌ Instalar: pip install supabase python-dotenv")
    sys.exit(1)


class ValidadorCalidad:
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
            'detalles': []
        }
        
        for doc in documentos:
            calidad = self._calcular_calidad(doc)
            
            resultado = {
                'id': doc['id'],
                'titulo': doc['titulo'],
                'calidad': calidad,
                'aprobado': calidad >= 0.7
            }
            
            if resultado['aprobado']:
                resultados['aprobados'] += 1
            else:
                resultados['rechazados'] += 1
            
            resultados['calidad_promedio'] += calidad
            resultados['detalles'].append(resultado)
        
        if resultados['total'] > 0:
            resultados['calidad_promedio'] /= resultados['total']
        
        self._mostrar_reporte(resultados)
        
        return resultados
    
    def _calcular_calidad(self, doc: Dict) -> float:
        """Calcula score de calidad del documento"""
        
        texto = doc.get('contenido_texto', '')
        embedding = doc.get('embedding')
        
        if not texto:
            return 0.0
        
        score = 0.0
        
        # Criterio 1: Longitud mínima (20%)
        if len(texto) >= 500:
            score += 0.2
        elif len(texto) >= 200:
            score += 0.1
        
        # Criterio 2: Palabras legibles (30%)
        palabras = re.findall(r'\b[a-zA-ZÀ-ſ]{3,}\b', texto)
        if len(palabras) >= 100:
            score += 0.3
        elif len(palabras) >= 50:
            score += 0.15
        
        # Criterio 3: Ratio palabras/caracteres (20%)
        if len(palabras) > 0:
            ratio = len(palabras) / (len(texto) / 5)
            score += min(ratio, 0.2)
        
        # Criterio 4: Sin metadata excesiva (15%)
        metadata_keywords = ['endobj', 'endstream', 'flatedecode']
        metadata_count = sum(1 for kw in metadata_keywords if kw in texto.lower())
        if metadata_count == 0:
            score += 0.15
        
        # Criterio 5: Tiene embedding (15%)
        if embedding and len(embedding) > 0:
            score += 0.15
        
        return min(score, 1.0)
    
    def _mostrar_reporte(self, resultados: Dict):
        """Muestra reporte de validación"""
        
        print("\n" + "=" * 60)
        print("📊 REPORTE DE VALIDACIÓN")
        print("=" * 60)
        print(f"   Total:             {resultados['total']}")
        print(f"   ✅ Aprobados:      {resultados['aprobados']}")
        print(f"   ❌ Rechazados:     {resultados['rechazados']}")
        print(f"   📈 Calidad:        {resultados['calidad_promedio']:.2%}")
        print("=" * 60)
        
        # Mostrar documentos rechazados
        if resultados['rechazados'] > 0:
            print("\n⚠️ DOCUMENTOS CON BAJA CALIDAD:")
            for detalle in resultados['detalles']:
                if not detalle['aprobado']:
                    print(f"   - {detalle['titulo'][:60]} ({detalle['calidad']:.2%})")


if __name__ == '__main__':
    try:
        validador = ValidadorCalidad()
        resultados = validador.validar_todos()
        
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
