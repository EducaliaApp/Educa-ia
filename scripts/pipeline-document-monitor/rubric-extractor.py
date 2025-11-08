# scripts/pipeline-document-monitor/rubric-extractor.py

from typing import Dict, List, Optional
import re
import json
import os
import requests

try:
    import openai
except ImportError:
    print("⚠️ OpenAI no instalado. Instalar con: pip install openai")
    openai = None

try:
    import google.generativeai as genai
except ImportError:
    print("⚠️ Google Generative AI no instalado. Instalar con: pip install google-generativeai")
    genai = None

try:
    from anthropic import Anthropic
except ImportError:
    print("⚠️ Anthropic no instalado. Instalar con: pip install anthropic")
    Anthropic = None

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
        # Configurar OpenAI como primaria
        self.openai_client = None
        if openai and os.getenv('OPENAI_API_KEY'):
            try:
                self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            except Exception as e:
                print(f"⚠️ Error configurando OpenAI: {e}")
        
        # Configurar Gemini como segunda opción
        self.gemini_client = None
        if genai and os.getenv('GEMINI_API_KEY'):
            try:
                genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
                self.gemini_client = genai.GenerativeModel('gemini-1.5-flash')
            except Exception as e:
                print(f"⚠️ Error configurando Gemini: {e}")
        
        # Configurar Cohere como tercera opción
        self.cohere_key = os.getenv('COHERE_API_KEY')
        if self.cohere_key:
            print("✅ Cohere disponible como fallback")
        
        # Configurar Anthropic como cuarta opción
        self.anthropic = None
        if Anthropic and os.getenv('ANTHROPIC_API_KEY'):
            try:
                self.anthropic = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            except Exception as e:
                print(f"⚠️ Error configurando Anthropic: {e}")
        
        apis_disponibles = sum([bool(self.openai_client), bool(self.gemini_client), bool(self.cohere_key), bool(self.anthropic)])
        print(f"🔧 APIs configuradas: {apis_disponibles}/4")
        
        if apis_disponibles == 0:
            print("⚠️ Ninguna API de IA configurada. Se necesita al menos una de: OPENAI_API_KEY, GEMINI_API_KEY, COHERE_API_KEY, ANTHROPIC_API_KEY")
    
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
        
        # 2. Limitar procesamiento para respetar rate limits
        max_rubricas = 5  # Máximo 5 rúbricas por documento para respetar límites
        if len(secciones_rubricas) > max_rubricas:
            print(f"  ⚠️ Limitando a {max_rubricas} rúbricas para respetar rate limits")
            secciones_rubricas = secciones_rubricas[:max_rubricas]
        
        # 3. Extraer cada rúbrica con delay entre requests
        rubricas = []
        
        for i, seccion in enumerate(secciones_rubricas, 1):
            print(f"  Procesando rúbrica {i}/{len(secciones_rubricas)}...")
            
            rubrica = self._extraer_rubrica_individual(seccion, metadata)
            
            if rubrica:
                rubricas.append(rubrica)
            
            # Delay entre requests para respetar rate limits (4 segundos = 15 req/min)
            if i < len(secciones_rubricas):
                import time
                time.sleep(4)
        
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

        # Intentar con OpenAI primero
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
                if "rate limit" in str(e).lower() or "quota" in str(e).lower():
                    print("  🔄 Intentando con Gemini como fallback...")
        
        # Fallback a Gemini
        if self.gemini_client:
            try:
                rubrica = self._extraer_con_gemini(prompt, metadata)
                if rubrica:
                    print("  ✅ Extraído con Gemini")
                    return rubrica
            except Exception as e:
                print(f"  ⚠️ Error con Gemini: {e}")
                if "quota" in str(e).lower() or "rate limit" in str(e).lower():
                    print("  🔄 Intentando con Cohere como fallback...")
        
        # Fallback a Cohere
        if self.cohere_key:
            try:
                rubrica = self._extraer_con_cohere(prompt, metadata)
                if rubrica:
                    print("  ✅ Extraído con Cohere")
                    return rubrica
            except Exception as e:
                print(f"  ⚠️ Error con Cohere: {e}")
                if "rate limit" in str(e).lower():
                    print("  🔄 Intentando con Anthropic como fallback final...")
        
        # Fallback final a Anthropic
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
                
                print("  ✅ Extraído con Anthropic")
                return rubrica
                
            except Exception as e:
                print(f"  ⚠️ Error con Anthropic: {e}")
        
        print("  ❌ Todas las APIs fallaron")
        return None
    

    
    def _extraer_con_gemini(self, prompt: str, metadata: Dict) -> Optional[Dict]:
        """Extrae rúbrica usando Google Gemini API"""
        
        # Prompt optimizado para Gemini
        prompt_gemini = f"""Extrae la información estructurada de esta rúbrica oficial del MINEDUC chileno.

Texto de la rúbrica:
{prompt[:5000]}

Extrae y estructura la información en formato JSON válido con estos campos exactos:
- indicador_id: identificador único (string)
- nombre_indicador: nombre del indicador (string)
- descripcion_indicador: descripción completa (string)
- evidencia_revisar: lista de evidencias a revisar (array de strings)
- nivel_insatisfactorio: objeto con descripcion, condiciones, operador_logico, puntaje
- nivel_basico: objeto con descripcion, condiciones, operador_logico, puntaje
- nivel_competente: objeto con descripcion, condiciones, operador_logico, puntaje
- nivel_destacado: objeto con descripcion, condiciones, operador_logico, puntaje
- notas_aclaratorias: notas adicionales (array de strings)

IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin texto adicional."""
        
        try:
            response = self.gemini_client.generate_content(
                prompt_gemini,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=4000,
                    response_mime_type="application/json"
                )
            )
            
            content = response.text.strip()
            
            # Limpiar respuesta
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            
            rubrica = json.loads(content)
            
            # Agregar metadata
            rubrica['nivel_educativo'] = metadata['nivel_educativo']
            rubrica['asignatura'] = metadata.get('asignatura') or 'generalista'
            rubrica['año_vigencia'] = metadata['año_vigencia']
            rubrica['modalidad'] = metadata.get('modalidad', 'regular')
            
            return rubrica
            
        except json.JSONDecodeError as e:
            print(f"    ⚠️ Error parseando JSON de Gemini: {e}")
            print(f"    📝 Contenido recibido: {content[:200]}...")
            return None
        except Exception as e:
            if "quota" in str(e).lower() or "rate limit" in str(e).lower():
                raise Exception(f"Gemini quota/rate limit: {e}")
            else:
                print(f"    ⚠️ Error inesperado con Gemini: {e}")
                return None
    
    def _extraer_con_github_models(self, prompt: str, metadata: Dict) -> Optional[Dict]:
        """Extrae rúbrica usando GitHub Models API"""
        
        import requests
        
        # Prompt optimizado para GitHub Models (respetando límites de tokens)
        prompt_simple = f"""Extrae esta rúbrica MINEDUC como JSON:

{prompt[:3000]}

JSON con: indicador_id, nombre_indicador, descripcion_indicador, nivel_insatisfactorio, nivel_basico, nivel_competente, nivel_destacado"""
        
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.github_token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "openai/gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "Eres un experto en rúbricas educativas. Responde SOLO con JSON válido."
                },
                {
                    "role": "user",
                    "content": prompt_simple
                }
            ],
            "temperature": 0.1,
            "max_tokens": 2000  # Reducido para respetar límites
        }
        
        # Intentar con retry para manejar rate limits
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    "https://models.github.ai/inference/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                if response.ok:
                    break
                elif response.status_code == 429:  # Rate limit
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 10  # 10, 20, 30 segundos
                        print(f"    ⏳ Rate limit alcanzado, esperando {wait_time}s...")
                        import time
                        time.sleep(wait_time)
                        continue
                    else:
                        raise Exception(f"Rate limit persistente después de {max_retries} intentos")
                else:
                    raise Exception(f"GitHub Models API error: {response.status_code} - {response.text}")
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    print(f"    ⚠️ Error de conexión, reintentando...")
                    import time
                    time.sleep(5)
                    continue
                else:
                    raise Exception(f"Error de conexión persistente: {e}")
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Limpiar respuesta y extraer JSON
        content_limpio = content.strip()
        if content_limpio.startswith('```json'):
            content_limpio = content_limpio[7:]
        if content_limpio.endswith('```'):
            content_limpio = content_limpio[:-3]
        
        try:
            rubrica = json.loads(content_limpio)
            
            # Agregar metadata
            rubrica['nivel_educativo'] = metadata['nivel_educativo']
            rubrica['asignatura'] = metadata.get('asignatura') or 'generalista'
            rubrica['año_vigencia'] = metadata['año_vigencia']
            rubrica['modalidad'] = metadata.get('modalidad', 'regular')
            
            return rubrica
            
        except json.JSONDecodeError as e:
            print(f"    ⚠️ Error parseando JSON de GitHub Models: {e}")
            print(f"    📝 Contenido recibido: {content_limpio[:200]}...")
            return None
    
    def _extraer_con_cohere(self, prompt: str, metadata: Dict) -> Optional[Dict]:
        """Extrae rúbrica usando Cohere API"""
        
        # Prompt optimizado para Cohere
        prompt_cohere = f"""Extrae la información estructurada de esta rúbrica educativa chilena del MINEDUC.

Texto de la rúbrica:
{prompt[:4000]}

Extrae y estructura la información en formato JSON con estos campos:
- indicador_id: identificador único
- nombre_indicador: nombre del indicador
- descripcion_indicador: descripción completa
- evidencia_revisar: lista de evidencias a revisar
- nivel_insatisfactorio: descripción y condiciones
- nivel_basico: descripción y condiciones
- nivel_competente: descripción y condiciones
- nivel_destacado: descripción y condiciones
- notas_aclaratorias: notas adicionales

Responde SOLO con JSON válido:"""
        
        headers = {
            "Authorization": f"Bearer {self.cohere_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "command-r",
            "message": prompt_cohere,
            "temperature": 0.1,
            "max_tokens": 2000
        }
        
        response = requests.post(
            "https://api.cohere.ai/v1/chat",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if not response.ok:
            raise Exception(f"Cohere API error: {response.status_code} - {response.text}")
        
        result = response.json()
        content = result["text"]
        
        # Limpiar respuesta y extraer JSON
        content_limpio = content.strip()
        if content_limpio.startswith('```json'):
            content_limpio = content_limpio[7:]
        if content_limpio.endswith('```'):
            content_limpio = content_limpio[:-3]
        
        # Buscar JSON en la respuesta
        import re
        json_match = re.search(r'\{.*\}', content_limpio, re.DOTALL)
        if json_match:
            content_limpio = json_match.group(0)
        
        try:
            rubrica = json.loads(content_limpio)
            
            # Agregar metadata
            rubrica['nivel_educativo'] = metadata['nivel_educativo']
            rubrica['asignatura'] = metadata.get('asignatura') or 'generalista'
            rubrica['año_vigencia'] = metadata['año_vigencia']
            rubrica['modalidad'] = metadata.get('modalidad', 'regular')
            
            return rubrica
            
        except json.JSONDecodeError as e:
            print(f"    ⚠️ Error parseando JSON de Cohere: {e}")
            print(f"    📝 Contenido recibido: {content_limpio[:200]}...")
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
        docs_procesados = 0
        max_docs_por_ejecucion = 10  # Limitar documentos para respetar rate limits diarios
        
        for doc in docs.data:
            if docs_procesados >= max_docs_por_ejecucion:
                print(f"⚠️ Limitando a {max_docs_por_ejecucion} documentos para respetar rate limits diarios")
                break
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
            
            docs_procesados += 1
        
        if total_rubricas > 0:
            print(f"✅ Procesamiento completado: {total_rubricas} rúbricas extraídas")
            print(f"📊 Documentos procesados: {docs_procesados}/{len(docs.data)}")
        else:
            # Verificar si había rúbricas potenciales pero fallaron las APIs
            docs_con_rubricas = 0
            for doc in docs.data:
                contenido = doc.get('contenido_texto', '')
                if contenido and any(indicador in contenido.lower() for indicador in 
                    ['insatisfactorio', 'básico', 'competente', 'destacado']):
                    docs_con_rubricas += 1
            
            if docs_con_rubricas > 0:
                print(f"⚠️ Se encontraron {docs_con_rubricas} documentos con rúbricas pero todas las APIs fallaron")
                print(f"ℹ️ APIs probadas: OpenAI → Gemini → Cohere → Anthropic")
                print(f"✅ Procesamiento completado: 0 rúbricas extraídas (todas las APIs no disponibles)")
                print(f"📅 Nota: Cohere tiene límites de 20 req/min y 1,000 req/mes (gratis)")
            else:
                print("📄 No se encontraron documentos de rúbricas para procesar")
                print("✅ Script completado sin errores")
            
            print(f"📊 Documentos procesados: {docs_procesados}/{len(docs.data)}")
            if docs_procesados < len(docs.data):
                print(f"ℹ️ {len(docs.data) - docs_procesados} documentos pendientes (ejecutar nuevamente para continuar)")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        
        # Si el error es por APIs no disponibles, no es crítico
        error_msg = str(e).lower()
        if any(term in error_msg for term in ['credit balance', 'connection error', 'rate limit', 'cohere', 'quota', 'gemini']):
            print("ℹ️ Error relacionado con APIs externas (no crítico para el pipeline)")
            print("✅ Procesamiento completado: 0 rúbricas extraídas (APIs no disponibles)")
        else:
            print("✅ Script completado (con errores)")