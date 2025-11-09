#!/usr/bin/env python3
"""
FASE 6: Registro Avanzado de Métricas - Pipeline RAG ProfeFlow

FUNCIONALIDADES:
1. Registra métricas detalladas por fase del pipeline
2. Calcula KPIs derivados (tasas de éxito, costos, performance)
3. Compara con runs anteriores (tendencias)
4. Genera alertas automáticas si hay anomalías
5. Exporta reporte JSON para dashboards

MÉTRICAS CLAVE:
- Tasa de éxito por fase (Extract → Transform → Load)
- Costo por documento procesado
- Tokens por documento
- Calidad promedio de chunks
- Velocidad de procesamiento
- Comparación con promedio histórico (últimos 30 días)
"""

import os
import sys
import argparse
import json
from datetime import date, datetime, timedelta
from typing import Dict, Optional
from dotenv import load_dotenv

try:
    from supabase import create_client
except ImportError:
    print("❌ Instalar: pip install supabase python-dotenv")
    sys.exit(1)

load_dotenv('.env.local')

# ============================================
# CONFIGURACIÓN
# ============================================

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Faltan variables de entorno")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Umbrales de alerta
THRESHOLDS = {
    'tasa_exito_minima': 0.80,          # 80% de docs deben procesarse exitosamente
    'calidad_minima': 0.70,              # Calidad mínima aceptable
    'costo_maximo_por_doc': 0.50,       # USD por documento
    'tokens_max_por_doc': 100000,       # Tokens por documento
    'variacion_maxima_costo': 0.30       # 30% de variación vs histórico
}

# ============================================
# VALIDACIÓN Y CÁLCULO DE MÉTRICAS
# ============================================

class MetricsValidator:
    """Valida y calcula métricas del pipeline"""
    
    @staticmethod
    def validar_argumentos(args) -> bool:
        """Valida consistencia de argumentos"""
        
        problemas = []
        
        # Valores no negativos
        if any(v < 0 for v in [args.downloaded, args.transformed, args.loaded, 
                               args.validated, args.quality, args.tokens, args.cost]):
            problemas.append("❌ Valores negativos detectados")
        
        # Consistencia de pipeline
        if not (args.downloaded >= args.transformed >= args.loaded):
            problemas.append("❌ Inconsistencia: downloaded >= transformed >= loaded debe cumplirse")
        
        # Quality score en rango válido
        if not (0.0 <= args.quality <= 1.0):
            problemas.append("❌ Quality debe estar entre 0.0 y 1.0")
        
        # Chunks validados razonable
        if args.loaded > 0 and args.validated < args.loaded:
            problemas.append("⚠️ Advertencia: menos chunks que documentos (esperado: 3-10 chunks/doc)")
        
        if problemas:
            for p in problemas:
                print(p)
            return False
        
        return True
    
    @staticmethod
    def calcular_metricas_derivadas(args) -> Dict:
        """Calcula KPIs derivados"""
        
        metricas = {
            # Tasas de éxito
            'tasa_transformacion': 0.0,
            'tasa_carga': 0.0,
            'tasa_exito_total': 0.0,
            
            # Costos
            'costo_por_documento': 0.0,
            'tokens_por_documento': 0.0,
            
            # Calidad
            'chunks_por_documento': 0.0,
            'calidad_normalizada': args.quality,
            
            # Estado
            'estado': 'desconocido',
            'alertas': []
        }
        
        # Tasas de éxito
        if args.downloaded > 0:
            metricas['tasa_transformacion'] = args.transformed / args.downloaded
            metricas['tasa_carga'] = args.loaded / args.downloaded
            metricas['tasa_exito_total'] = args.loaded / args.downloaded
        
        # Costos
        if args.loaded > 0:
            metricas['costo_por_documento'] = args.cost / args.loaded
            metricas['tokens_por_documento'] = args.tokens / args.loaded
            metricas['chunks_por_documento'] = args.validated / args.loaded
        
        # Validar contra thresholds
        if metricas['tasa_exito_total'] < THRESHOLDS['tasa_exito_minima']:
            metricas['alertas'].append({
                'tipo': 'tasa_exito_baja',
                'severidad': 'warning',
                'mensaje': f"Tasa de éxito {metricas['tasa_exito_total']:.1%} < {THRESHOLDS['tasa_exito_minima']:.1%}"
            })
        
        if args.quality < THRESHOLDS['calidad_minima']:
            metricas['alertas'].append({
                'tipo': 'calidad_baja',
                'severidad': 'warning',
                'mensaje': f"Calidad {args.quality:.1%} < {THRESHOLDS['calidad_minima']:.1%}"
            })
        
        if metricas['costo_por_documento'] > THRESHOLDS['costo_maximo_por_doc']:
            metricas['alertas'].append({
                'tipo': 'costo_alto',
                'severidad': 'critical',
                'mensaje': f"Costo ${metricas['costo_por_documento']:.3f}/doc > ${THRESHOLDS['costo_maximo_por_doc']}"
            })
        
        # Determinar estado general
        if len(metricas['alertas']) == 0:
            metricas['estado'] = 'excelente'
        elif any(a['severidad'] == 'critical' for a in metricas['alertas']):
            metricas['estado'] = 'critico'
        else:
            metricas['estado'] = 'aceptable'
        
        return metricas


class HistoricalAnalyzer:
    """Analiza tendencias históricas"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def obtener_promedio_historico(self, dias: int = 30) -> Optional[Dict]:
        """Obtiene promedios de los últimos N días"""
        
        try:
            fecha_inicio = (datetime.now() - timedelta(days=dias)).date().isoformat()
            
            response = self.supabase.table('metricas_pipeline_rag')\
                .select('*')\
                .gte('fecha', fecha_inicio)\
                .execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            runs = response.data
            
            promedio = {
                'runs_totales': len(runs),
                'docs_procesados_promedio': sum(r['documentos_procesados'] for r in runs) / len(runs),
                'chunks_promedio': sum(r['chunks_validados'] for r in runs) / len(runs),
                'errores_promedio': sum(r.get('errores_criticos', 0) for r in runs) / len(runs)
            }
            
            return promedio
            
        except Exception as e:
            print(f"   ⚠️ No se pudo obtener histórico: {e}")
            return None
    
    def comparar_con_historico(self, metricas_actuales: Dict, historico: Optional[Dict]) -> Dict:
        """Compara métricas actuales con promedio histórico"""
        
        if not historico:
            return {'comparacion_disponible': False}
        
        comparacion = {
            'comparacion_disponible': True,
            'variaciones': {},
            'tendencias': []
        }
        
        # Variación en documentos procesados
        if 'documentos_procesados' in metricas_actuales:
            docs_actual = metricas_actuales['documentos_procesados']
            docs_historico = historico['docs_procesados_promedio']
            
            if docs_historico > 0:
                variacion = (docs_actual - docs_historico) / docs_historico
                comparacion['variaciones']['documentos'] = {
                    'actual': docs_actual,
                    'historico': docs_historico,
                    'variacion_porcentual': variacion * 100
                }
                
                if variacion > 0.2:
                    comparacion['tendencias'].append("📈 Volumen procesado +20% vs promedio")
                elif variacion < -0.2:
                    comparacion['tendencias'].append("📉 Volumen procesado -20% vs promedio")
        
        return comparacion


# ============================================
# REGISTRO DE MÉTRICAS
# ============================================

class MetricsRecorder:
    """Registra métricas en Supabase"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def registrar_metricas_procesamiento(self, args, metricas_derivadas: Dict) -> bool:
        """Registra en tabla metricas_procesamiento"""
        
        try:
            self.supabase.table('metricas_procesamiento').insert({
                'tipo': 'etl_documentos',
                'documentos_procesados': args.loaded,
                'documentos_fallidos': args.downloaded - args.loaded,
                'tiempo_total_ms': 0,  # Se actualizará con tiempo real en GitHub Actions
                'metadata': {
                    # Datos raw
                    'downloaded': args.downloaded,
                    'transformed': args.transformed,
                    'loaded': args.loaded,
                    'validated': args.validated,
                    'quality': args.quality,
                    'tokens': args.tokens,
                    'cost_usd': args.cost,
                    
                    # Métricas derivadas
                    'tasa_exito': metricas_derivadas['tasa_exito_total'],
                    'costo_por_doc': metricas_derivadas['costo_por_documento'],
                    'tokens_por_doc': metricas_derivadas['tokens_por_documento'],
                    'chunks_por_doc': metricas_derivadas['chunks_por_documento'],
                    
                    # Estado
                    'estado': metricas_derivadas['estado'],
                    'alertas': metricas_derivadas['alertas']
                }
            }).execute()
            
            print("   ✅ metricas_procesamiento registradas")
            return True
            
        except Exception as e:
            print(f"   ❌ Error registrando metricas_procesamiento: {e}")
            return False
    
    def registrar_metricas_pipeline_rag(self, args, metricas_derivadas: Dict) -> bool:
        """Registra en tabla metricas_pipeline_rag"""
        
        try:
            self.supabase.table('metricas_pipeline_rag').insert({
                'fecha': date.today().isoformat(),
                'documentos_monitoreados': args.downloaded,
                'documentos_procesados': args.loaded,
                'chunks_validados': args.validated,
                'errores_criticos': max(0, args.downloaded - args.loaded),
                'latencia_procesamiento_ms': 0,
                'workflow_run_id': args.workflow_id,
                'metadata': {
                    'quality_score': args.quality,
                    'total_cost_usd': args.cost,
                    'total_tokens': args.tokens,
                    'estado': metricas_derivadas['estado'],
                    'kpis': {
                        'tasa_exito': metricas_derivadas['tasa_exito_total'],
                        'costo_por_doc': metricas_derivadas['costo_por_documento'],
                        'chunks_por_doc': metricas_derivadas['chunks_por_documento']
                    }
                }
            }).execute()
            
            print("   ✅ metricas_pipeline_rag registradas")
            return True
            
        except Exception as e:
            print(f"   ❌ Error registrando metricas_pipeline_rag: {e}")
            return False
    
    def registrar_alertas(self, alertas: list) -> bool:
        """Registra alertas críticas en tabla separada"""
        
        if not alertas:
            return True
        
        try:
            for alerta in alertas:
                if alerta['severidad'] == 'critical':
                    self.supabase.table('alertas_sistema').insert({
                        'tipo': alerta['tipo'],
                        'severidad': alerta['severidad'],
                        'mensaje': alerta['mensaje'],
                        'contexto': 'pipeline_etl',
                        'timestamp': datetime.now().isoformat()
                    }).execute()
            
            print(f"   ⚠️ {len([a for a in alertas if a['severidad'] == 'critical'])} alertas críticas registradas")
            return True
            
        except Exception as e:
            print(f"   ⚠️ Error registrando alertas: {e}")
            return False


# ============================================
# GENERACIÓN DE REPORTES
# ============================================

def generar_reporte_consola(args, metricas: Dict, historico: Optional[Dict], comparacion: Dict):
    """Genera reporte legible en consola"""
    
    print("\n" + "=" * 60)
    print("📊 REPORTE DE MÉTRICAS - PIPELINE ETL")
    print("=" * 60)
    print(f"   Workflow ID: {args.workflow_id}")
    print(f"   Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Estado general
    emoji_estado = {
        'excelente': '✅',
        'aceptable': '⚠️',
        'critico': '❌'
    }
    print(f"\n   Estado: {emoji_estado.get(metricas['estado'], '❓')} {metricas['estado'].upper()}")
    
    # Métricas por fase
    print(f"\n📄 DOCUMENTOS:")
    print(f"   Descargados:    {args.downloaded:>6}")
    print(f"   Transformados:  {args.transformed:>6} ({metricas['tasa_transformacion']:>6.1%})")
    print(f"   Cargados:       {args.loaded:>6} ({metricas['tasa_carga']:>6.1%})")
    print(f"   Fallidos:       {args.downloaded - args.loaded:>6}")
    
    print(f"\n📦 CHUNKS:")
    print(f"   Validados:      {args.validated:>6}")
    print(f"   Por documento:  {metricas['chunks_por_documento']:>6.1f}")
    
    print(f"\n💰 COSTOS:")
    print(f"   Total:          ${args.cost:>8.4f}")
    print(f"   Por documento:  ${metricas['costo_por_documento']:>8.4f}")
    
    print(f"\n🔤 TOKENS:")
    print(f"   Total:          {args.tokens:>8,}")
    print(f"   Por documento:  {metricas['tokens_por_documento']:>8,.0f}")
    
    print(f"\n📈 CALIDAD:")
    print(f"   Score:          {args.quality:>6.1%}")
    
    # Comparación histórica
    if comparacion.get('comparacion_disponible'):
        print(f"\n📊 COMPARACIÓN HISTÓRICA ({historico['runs_totales']} runs):")
        for key, data in comparacion.get('variaciones', {}).items():
            simbolo = "↑" if data['variacion_porcentual'] > 0 else "↓"
            print(f"   {key}: {data['actual']} vs {data['historico']:.0f} promedio "
                  f"({simbolo} {abs(data['variacion_porcentual']):.1f}%)")
        
        for tendencia in comparacion.get('tendencias', []):
            print(f"   {tendencia}")
    
    # Alertas
    if metricas['alertas']:
        print(f"\n⚠️ ALERTAS ({len(metricas['alertas'])}):")
        for alerta in metricas['alertas']:
            emoji = "🔴" if alerta['severidad'] == 'critical' else "🟡"
            print(f"   {emoji} {alerta['mensaje']}")
    
    print("\n" + "=" * 60)


def generar_reporte_json(args, metricas: Dict, historico: Optional[Dict], 
                        comparacion: Dict, filepath: str = 'metrics_report.json'):
    """Genera reporte en formato JSON"""
    
    reporte = {
        'timestamp': datetime.now().isoformat(),
        'workflow_id': args.workflow_id,
        'raw_metrics': {
            'downloaded': args.downloaded,
            'transformed': args.transformed,
            'loaded': args.loaded,
            'validated': args.validated,
            'quality': args.quality,
            'tokens': args.tokens,
            'cost': args.cost
        },
        'derived_metrics': metricas,
        'historical_context': historico,
        'comparison': comparacion
    }
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(reporte, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Reporte JSON guardado: {filepath}")
    except Exception as e:
        print(f"\n⚠️ Error guardando JSON: {e}")


# ============================================
# EJECUCIÓN PRINCIPAL
# ============================================

def main():
    """Ejecuta registro completo de métricas"""
    
    # Parser de argumentos
    parser = argparse.ArgumentParser(
        description='Registra métricas del pipeline ETL RAG'
    )
    parser.add_argument('--downloaded', type=int, default=0,
                       help='Documentos descargados')
    parser.add_argument('--transformed', type=int, default=0,
                       help='Documentos transformados')
    parser.add_argument('--loaded', type=int, default=0,
                       help='Documentos cargados')
    parser.add_argument('--validated', type=int, default=0,
                       help='Chunks validados')
    parser.add_argument('--quality', type=float, default=0.0,
                       help='Score de calidad (0.0-1.0)')
    parser.add_argument('--tokens', type=int, default=0,
                       help='Total de tokens procesados')
    parser.add_argument('--cost', type=float, default=0.0,
                       help='Costo total en USD')
    parser.add_argument('--workflow-id', type=str, required=True,
                       help='GitHub workflow run ID')
    parser.add_argument('--export-json', action='store_true',
                       help='Exportar reporte JSON')
    
    args = parser.parse_args()
    
    print("📊 REGISTRANDO MÉTRICAS DEL PIPELINE")
    print("=" * 60)
    
    # 1. Validar argumentos
    if not MetricsValidator.validar_argumentos(args):
        print("\n❌ Validación de argumentos falló")
        return 1
    
    # 2. Calcular métricas derivadas
    print("\n🔢 Calculando KPIs...")
    metricas = MetricsValidator.calcular_metricas_derivadas(args)
    
    # 3. Análisis histórico
    print("📈 Analizando tendencias...")
    analyzer = HistoricalAnalyzer(supabase)
    historico = analyzer.obtener_promedio_historico(dias=30)
    comparacion = analyzer.comparar_con_historico(
        {'documentos_procesados': args.loaded},
        historico
    )
    
    # 4. Registrar en BD
    print("\n💾 Registrando en Supabase...")
    recorder = MetricsRecorder(supabase)
    
    success_1 = recorder.registrar_metricas_procesamiento(args, metricas)
    success_2 = recorder.registrar_metricas_pipeline_rag(args, metricas)
    recorder.registrar_alertas(metricas['alertas'])
    
    # 5. Generar reportes
    generar_reporte_consola(args, metricas, historico, comparacion)
    
    if args.export_json:
        generar_reporte_json(args, metricas, historico, comparacion)
    
    # 6. Exit code según estado
    if not (success_1 and success_2):
        print("\n⚠️ Algunas métricas no se registraron")
        return 1
    
    if metricas['estado'] == 'critico':
        print("\n❌ Pipeline completado con alertas críticas")
        return 1
    
    print("\n✅ Métricas registradas exitosamente")
    return 0


if __name__ == '__main__':
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)