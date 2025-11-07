# scripts/document-monitor/rubric-extractor.py

from typing import Dict, List, Optional
import re
import json
from anthropic import Anthropic
import os

class RubricExtractor:
    """
    Extrae rúbricas estructuradas desde documentos PDF
    """
    
    def __init__(self):
        self.anthropic = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
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

        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                temperature=0.1,  # Muy bajo para consistencia
                messages=[{"role": "user", "content": prompt}]
            )
            
            texto_respuesta = response.content[0].text
            texto_limpio = texto_respuesta.replace('```json\n', '').replace('\n```', '').strip()
            
            rubrica = json.loads(texto_limpio)
            
            # Agregar metadata
            rubrica['nivel_educativo'] = metadata['nivel_educativo']
            rubrica['asignatura'] = metadata.get('asignatura')
            rubrica['año_vigencia'] = metadata['año_vigencia']
            rubrica['modalidad'] = metadata.get('modalidad', 'regular')
            
            # Inferir módulo y tarea desde indicador_id
            self._inferir_modulo_tarea(rubrica)
            
            return rubrica
            
        except Exception as e:
            print(f"  ⚠️ Error extrayendo rúbrica: {e}")
            return None
    
    def _inferir_modulo_tarea(self, rubrica: Dict):
        """Infiere módulo y tarea desde el ID del indicador"""
        
        indicador_id = rubrica.get('indicador_id', '')
        
        # Patrón: mod1_tarea2_indicador3
        match = re.match(r'mod(\d+)_tarea(\d+)', indicador_id)
        
        if match:
            rubrica['modulo'] = int(match.group(1))
            rubrica['tarea'] = int(match.group(2))
        else:
            # Valores por defecto
            rubrica['modulo'] = 1
            rubrica['tarea'] = 1
    
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
    from supabase import create_client
    
    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    extractor = RubricExtractor()
    
    # Leer documento ya procesado
    doc = supabase.table('documentos_oficiales')\
        .select('*')\
        .eq('tipo_documento', 'rubrica')\
        .eq('año_vigencia', 2025)\
        .limit(1)\
        .single()\
        .execute()
    
    if doc.data:
        rubricas = extractor.extraer_rubricas(
            doc.data['contenido_texto'],
            {
                'nivel_educativo': doc.data['nivel_educativo'],
                'asignatura': doc.data['asignatura'],
                'año_vigencia': doc.data['año_vigencia']
            }
        )
        
        extractor.guardar_rubricas(rubricas, supabase)