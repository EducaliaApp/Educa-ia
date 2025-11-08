# scripts/pipeline-document-monitor/rubric-extractor.py

from typing import Dict, List, Optional
import re
import json
import os

try:
    from anthropic import Anthropic
except ImportError:
    print("⚠️ Anthropic no instalado. Instalar con: pip install anthropic")
    Anthropic = None

try:
    import openai
except ImportError:
    print("⚠️ OpenAI no instalado. Instalar con: pip install openai")
    openai = None

try:
    from supabase import create_client
except ImportError:
    print("⚠️ Supabase no instalado. Instalar con: pip install supabase")
    create_client = None

class RubricExtractor:
    """
    Extrae rúbricas estructuradas desde documentos PDF
    """
    
    def __init__(self):
        # Configurar Anthropic como primaria
        self.anthropic = None
        if Anthropic and os.getenv('ANTHROPIC_API_KEY'):
            try:
                self.anthropic = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            except Exception as e:
                print(f"⚠️ Error configurando Anthropic: {e}")
        
        # Configurar OpenAI como fallback
        self.openai_client = None
        if openai and os.getenv('OPENAI_API_KEY'):
            try:
                self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            except Exception as e:
                print(f"⚠️ Error configurando OpenAI: {e}")
        
        if not self.anthropic and not self.openai_client:
            raise ValueError("Ni ANTHROPIC_API_KEY ni OPENAI_API_KEY están configuradas")
    
    def extraer_rubricas(self, texto_documento: str, metadata: Dict) -> List[Dict]:
        """
        Extrae todas las rúbricas de un documento
        
        Returns:
            Lista de rúbricas estructuradas
        """
        
        print(f"🔍 Extrayendo rúbricas del documento...")
        
        # 1. Identificar secciones de rúbricas
        secciones_rubricas = self._identificar_secciones_rubricas(texto_documento)
        
        print(f"  Encontradas {len(secciones_rubricas)} posibles rúbricas")
        
        # 2. Extraer cada rúbrica
        rubricas = []
        
        for i, seccion in enumerate(secciones_rubricas, 1):
            print(f"  Procesando rúbrica {i}/{len(secciones_rubricas)}...")
            
            rubrica = self._extraer_rubrica_individual(seccion, metadata)
            
            if rubrica:
                rubricas.append(rubrica)
        
        print(f"  ✅ {len(rubricas)} rúbricas extraídas exitosamente")
        
        return rubricas
    
    def _identificar_secciones_rubricas(self, texto: str) -> List[str]:
        """
        Identifica secciones que contienen rúbricas
        """
        
        # Patrones comunes en documentos de rúbricas
        patrones = [
            r'Rúbrica del indicador:.*?(?=Rúbrica del indicador:|$)',
            r'INSATISFACTORIO.*?BÁSICO.*?COMPETENTE.*?DESTACADO',
        ]
        
        secciones = []
        
        for patron in patrones:
            matches = re.finditer(patron, texto, re.DOTALL | re.IGNORECASE)
            for match in matches:
                seccion = match.group(0)
                if len(seccion) > 200:  # Filtrar muy cortos
                    secciones.append(seccion)
        
        # Eliminar duplicados
        secciones = list(set(secciones))
        
        return secciones
    
    def _extraer_rubrica_individual(
        self, 
        texto_rubrica: str, 
        metadata: Dict
    ) -> Optional[Dict]:
        """
        Extrae una rúbrica individual usando LIA
        """
        
        prompt = f"""Extrae la información estructurada de esta rúbrica oficial del MINEDUC:

{texto_rubrica[:6000]}

Identifica:
1. Nombre del indicador
2. Descripción del indicador
3. Evidencia que se debe revisar
4. Niveles: Insatisfactorio, Básico, Competente, Destacado
5. Condiciones específicas de cada nivel
6. Notas aclaratorias

IMPORTANTE:
- Las condiciones deben ser EXACTAS del texto original
- Identifica operadores lógicos (Y, O)
- Marca cuantificadores (todos, la mayoría, al menos uno)

Responde SOLO con JSON válido:
{{
  "indicador_id": "string (ej: 'mod1_tarea1_indicador1')",
  "nombre_indicador": "string",
  "descripcion_indicador": "string",
  "evidencia_revisar": ["string"],
  "nivel_insatisfactorio": {{
    "descripcion": "string",
    "condiciones": [],
    "operador_logico": "AND|OR",
    "puntaje": 1.0
  }},
  "nivel_basico": {{
    "descripcion": "string",
    "condiciones": [
      {{
        "id": "condicion_1",
        "texto": "string EXACTO del documento",
        "tipo": "cuantitativa|cualitativa|presencia",
        "cuantificador": "todos|mayoria|al_menos_uno|ninguno",
        "verificable_automaticamente": boolean
      }}
    ],
    "operador_logico": "AND|OR",
    "puntaje": 2.0
  }},
  "nivel_competente": {{ ...similar... }},
  "nivel_destacado": {{ ...similar... }},
  "notas_aclaratorias": ["string"]
}}

NO inventes información. Si algo no está claro, déjalo vacío."""

        # Intentar con Anthropic primero
        if self.anthropic:
            try:
                response = self.anthropic.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=4000,
                    temperature=0.1,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                texto_respuesta = response.content[0].text
                texto_limpio = texto_respuesta.replace('```json\n', '').replace('\n```', '').strip()
                
                rubrica = json.loads(texto_limpio)
                
                # Agregar metadata según esquema real
                rubrica['nivel_educativo'] = metadata['nivel_educativo']
                rubrica['asignatura'] = metadata.get('asignatura') or 'generalista'
                rubrica['año_vigencia'] = metadata['año_vigencia']
                rubrica['modalidad'] = metadata.get('modalidad', 'regular')
                
                return rubrica
                
            except Exception as e:
                print(f"  ⚠️ Error con Anthropic: {e}")
                if "credit balance" in str(e).lower() or "insufficient" in str(e).lower():
                    print("  🔄 Intentando con OpenAI como fallback...")
                else:
                    return None
        
        # Fallback a OpenAI
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=4000
                )
                
                texto_respuesta = response.choices[0].message.content
                rubrica = json.loads(texto_respuesta)
                
                # Agregar metadata según esquema real
                rubrica['nivel_educativo'] = metadata['nivel_educativo']
                rubrica['asignatura'] = metadata.get('asignatura') or 'generalista'
                rubrica['año_vigencia'] = metadata['año_vigencia']
                rubrica['modalidad'] = metadata.get('modalidad', 'regular')
                
                print("  ✅ Extraído con OpenAI")
                return rubrica
                
            except Exception as e:
                print(f"  ⚠️ Error con OpenAI: {e}")
                return None
        
        print("  ❌ No hay APIs disponibles")
        return None
    

    
    def guardar_rubricas(self, rubricas: List[Dict], supabase_client):
        """Guarda rúbricas en la base de datos"""
        
        guardadas = 0
        
        for rubrica in rubricas:
            try:
                # Verificar si ya existe
                exists = supabase_client.table('rubricas_mbe')\
                    .select('id')\
                    .eq('indicador_id', rubrica['indicador_id'])\
                    .eq('año_vigencia', rubrica['año_vigencia'])\
                    .execute()
                
                if exists.data:
                    # Actualizar
                    supabase_client.table('rubricas_mbe')\
                        .update(rubrica)\
                        .eq('id', exists.data[0]['id'])\
                        .execute()
                    
                    print(f"  ✓ Actualizada: {rubrica['nombre_indicador']}")
                else:
                    # Insertar
                    supabase_client.table('rubricas_mbe')\
                        .insert(rubrica)\
                        .execute()
                    
                    print(f"  ✓ Guardada: {rubrica['nombre_indicador']}")
                
                guardadas += 1
                
            except Exception as e:
                print(f"  ✗ Error guardando {rubrica.get('nombre_indicador')}: {e}")
        
        print(f"\n✅ {guardadas}/{len(rubricas)} rúbricas guardadas")


# Uso
if __name__ == '__main__':
    import argparse
    from dotenv import load_dotenv
    
    # Cargar variables de entorno
    load_dotenv('.env.local')
    
    if create_client is None:
        print("❌ Error: Supabase no está instalado. Ejecutar: pip install supabase")
        exit(1)
    
    parser = argparse.ArgumentParser(description='Extractor de Rúbricas MINEDUC')
    parser.add_argument('--auto', action='store_true', help='Modo automático')
    parser.add_argument('--verbose', action='store_true', help='Modo verbose')
    parser.add_argument('--year', type=int, default=2025, help='Año a procesar')
    
    args = parser.parse_args()
    
    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
    )
    
    extractor = RubricExtractor()
    
    try:
        if args.verbose:
            print(f"🔍 Buscando documentos de rúbricas para el año {args.year}...")
        
        # Primero, ver qué documentos hay en total
        all_docs = supabase.table('documentos_oficiales')\
            .select('tipo_documento, procesado, año_vigencia')\
            .eq('año_vigencia', args.year)\
            .execute()
        
        if args.verbose:
            print(f"📊 Total documentos {args.year}: {len(all_docs.data)}")
            tipos = {}
            for doc in all_docs.data:
                tipo = doc['tipo_documento']
                procesado = doc['procesado']
                key = f"{tipo} (procesado: {procesado})"
                tipos[key] = tipos.get(key, 0) + 1
            
            for tipo, count in tipos.items():
                print(f"  - {tipo}: {count}")
        
        # Buscar documentos que contengan rúbricas (sin filtro de procesado)
        docs = supabase.table('documentos_oficiales')\
            .select('*')\
            .in_('tipo_documento', ['rubricas', 'rubrica', 'instructivo', 'manual_portafolio'])\
            .eq('año_vigencia', args.year)\
            .execute()
        
        if args.verbose:
            print(f"📊 Encontrados {len(docs.data)} documentos candidatos (sin filtro procesado)")
        
        total_rubricas = 0
        
        for doc in docs.data:
            if args.verbose:
                print(f"\n📄 Procesando: {doc['titulo']}")
                print(f"   Tipo: {doc['tipo_documento']}")
                print(f"   Nivel: {doc['nivel_educativo']}")
            
            # Verificar si el contenido contiene rúbricas
            contenido = doc.get('contenido_texto', '')
            if not contenido:
                if args.verbose:
                    print(f"   ⚠️  Sin contenido de texto (procesado: {doc.get('procesado', 'N/A')})")
                continue
            
            # Buscar indicadores de rúbricas en el contenido
            indicadores_rubrica = [
                'insatisfactorio', 'básico', 'competente', 'destacado',
                'rúbrica del indicador', 'nivel de desempeño'
            ]
            
            tiene_rubricas = any(indicador in contenido.lower() for indicador in indicadores_rubrica)
            
            if not tiene_rubricas:
                if args.verbose:
                    print("   ℹ️  No contiene rúbricas")
                continue
            
            if args.verbose:
                print("   🎯 Contiene rúbricas, extrayendo...")
            
            rubricas = extractor.extraer_rubricas(
                contenido,
                {
                    'nivel_educativo': doc['nivel_educativo'],
                    'asignatura': doc.get('asignatura'),
                    'año_vigencia': doc['año_vigencia']
                }
            )
            
            if rubricas:
                extractor.guardar_rubricas(rubricas, supabase)
                total_rubricas += len(rubricas)
                
                if args.verbose:
                    print(f"   ✅ Extraídas {len(rubricas)} rúbricas")
        
        if total_rubricas > 0:
            print(f"✅ Procesamiento completado: {total_rubricas} rúbricas extraídas")
        else:
            print("📄 No se encontraron documentos de rúbricas para procesar")
            print("✅ Script completado sin errores")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        print("✅ Script completado (con errores)")