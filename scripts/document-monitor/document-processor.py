# scripts/document-monitor/document-processor.py

import os
import hashlib
import fitz  # PyMuPDF
from openai import OpenAI
from supabase import create_client
from typing import Dict, List, Optional
import json
from datetime import datetime

class DocumentProcessor:
    """
    Procesa documentos PDF oficiales:
    1. Extrae texto completo
    2. Identifica estructura
    3. Genera embeddings
    4. Guarda en Supabase
    """
    
    def __init__(self):
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        self.openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    def procesar_pdf(
        self,
        pdf_path: str,
        metadata: Dict
    ) -> Dict:
        """
        Procesa un PDF completo
        
        Args:
            pdf_path: Ruta al archivo PDF
            metadata: {
                'tipo_documento': 'manual' | 'rubrica' | 'instructivo',
                'año_vigencia': 2025,
                'nivel_educativo': 'basica_1_6',
                'asignatura': 'matematica',
                'url_oficial': 'https://...'
            }
        
        Returns:
            Dict con información del documento procesado
        """
        
        print(f"📄 Procesando: {metadata.get('titulo', 'Sin título')}")
        
        # 1. Extraer texto
        texto_completo = self._extraer_texto_pdf(pdf_path)
        
        # 2. Calcular hash
        hash_contenido = self._calcular_hash(texto_completo)
        
        # 3. Verificar si ya existe
        if self._documento_ya_existe(hash_contenido):
            print(f"  ✓ Documento ya existe (mismo contenido)")
            return {'status': 'ya_existe', 'hash': hash_contenido}
        
        # 4. Estructurar contenido
        estructura = self._estructurar_contenido(texto_completo, metadata)
        
        # 5. Generar embedding
        embedding = self._generar_embedding(texto_completo[:8000])  # Primeros 8k chars
        
        # 6. Subir PDF a Storage
        url_storage = self._subir_a_storage(pdf_path, metadata)
        
        # 7. Guardar en BD
        documento_id = self._guardar_en_bd(
            texto_completo=texto_completo,
            estructura=estructura,
            embedding=embedding,
            hash_contenido=hash_contenido,
            url_storage=url_storage,
            metadata=metadata
        )
        
        print(f"  ✅ Documento procesado: {documento_id}")
        
        return {
            'status': 'procesado',
            'documento_id': documento_id,
            'hash': hash_contenido,
            'url_storage': url_storage
        }
    
    def _extraer_texto_pdf(self, pdf_path: str) -> str:
        """Extrae todo el texto del PDF"""
        
        texto_completo = []
        
        with fitz.open(pdf_path) as doc:
            for pagina_num, pagina in enumerate(doc, 1):
                texto = pagina.get_text()
                texto_completo.append(f"--- Página {pagina_num} ---\n{texto}")
        
        return "\n".join(texto_completo)
    
    def _calcular_hash(self, texto: str) -> str:
        """Calcula SHA-256 del contenido"""
        return hashlib.sha256(texto.encode('utf-8')).hexdigest()
    
    def _documento_ya_existe(self, hash_contenido: str) -> bool:
        """Verifica si ya existe documento con mismo hash"""
        
        result = self.supabase.table('documentos_oficiales')\
            .select('id')\
            .eq('hash_contenido', hash_contenido)\
            .eq('estado', 'activo')\
            .execute()
        
        return len(result.data) > 0
    
    def _estructurar_contenido(
        self, 
        texto: str, 
        metadata: Dict
    ) -> Dict:
        """
        Identifica estructura del documento usando LIA
        """
        
        # Usar Claude para identificar secciones
        from anthropic import Anthropic
        
        client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        
        prompt = f"""Analiza este documento oficial del MINEDUC y extrae su estructura:

TIPO: {metadata['tipo_documento']}
AÑO: {metadata['año_vigencia']}

DOCUMENTO:
{texto[:15000]}  # Primeros 15k caracteres

Identifica:
1. Título y subtítulos principales
2. Secciones numeradas
3. Elementos clave (si es manual: tareas, módulos; si es rúbrica: indicadores)

Responde SOLO con JSON:
{{
  "titulo": "string",
  "secciones": [
    {{
      "numero": "1",
      "titulo": "string",
      "subsecciones": ["1.A", "1.B"]
    }}
  ],
  "elementos_clave": [
    {{"tipo": "tarea", "numero": 1, "nombre": "..."}}
  ]
}}"""
        
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        texto_respuesta = response.content[0].text
        
        # Limpiar JSON
        texto_limpio = texto_respuesta.replace('```json\n', '').replace('\n```', '').strip()
        
        try:
            estructura = json.loads(texto_limpio)
            return estructura
        except json.JSONDecodeError as e:
            print(f"  ⚠️ Error parseando estructura: {e}")
            return {"titulo": metadata.get('titulo', 'Sin título'), "secciones": []}
    
    def _generar_embedding(self, texto: str) -> List[float]:
        """Genera embedding para búsqueda semántica"""
        
        response = self.openai.embeddings.create(
            model="text-embedding-3-small",
            input=texto,
            encoding_format="float"
        )
        
        return response.data[0].embedding
    
    def _subir_a_storage(self, pdf_path: str, metadata: Dict) -> str:
        """Sube PDF a Supabase Storage"""
        
        # Generar nombre único
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        nivel = metadata.get('nivel_educativo', 'general')
        tipo = metadata.get('tipo_documento', 'documento')
        
        filename = f"{nivel}/{tipo}_{timestamp}.pdf"
        
        # Subir
        with open(pdf_path, 'rb') as f:
            self.supabase.storage.from_('documentos-oficiales').upload(
                filename,
                f,
                file_options={"content-type": "application/pdf"}
            )
        
        # Obtener URL pública
        url = self.supabase.storage.from_('documentos-oficiales').get_public_url(filename)
        
        return url
    
    def _guardar_en_bd(
        self,
        texto_completo: str,
        estructura: Dict,
        embedding: List[float],
        hash_contenido: str,
        url_storage: str,
        metadata: Dict
    ) -> str:
        """Guarda documento en la BD"""
        
        data = {
            'tipo_documento': metadata['tipo_documento'],
            'titulo': estructura.get('titulo', metadata.get('titulo', 'Sin título')),
            'año_vigencia': metadata['año_vigencia'],
            'nivel_educativo': metadata['nivel_educativo'],
            'asignatura': metadata.get('asignatura'),
            'url_oficial': metadata['url_oficial'],
            'url_storage': url_storage,
            'hash_contenido': hash_contenido,
            'contenido_texto': texto_completo,
            'contenido_estructurado': estructura,
            'embedding': embedding,
            'version': self._obtener_siguiente_version(metadata),
            'estado': 'activo'
        }
        
        result = self.supabase.table('documentos_oficiales').insert(data).execute()
        
        return result.data[0]['id']
    
    def _obtener_siguiente_version(self, metadata: Dict) -> int:
        """Obtiene el siguiente número de versión"""
        
        result = self.supabase.table('documentos_oficiales')\
            .select('version')\
            .eq('tipo_documento', metadata['tipo_documento'])\
            .eq('año_vigencia', metadata['año_vigencia'])\
            .eq('nivel_educativo', metadata['nivel_educativo'])\
            .order('version', desc=True)\
            .limit(1)\
            .execute()
        
        if result.data:
            return result.data[0]['version'] + 1
        return 1


# Uso
if __name__ == '__main__':
    processor = DocumentProcessor()
    
    resultado = processor.procesar_pdf(
        pdf_path='./downloads/manual_basica_2025.pdf',
        metadata={
            'tipo_documento': 'manual',
            'titulo': 'Manual Portafolio Educación Básica 2025',
            'año_vigencia': 2025,
            'nivel_educativo': 'basica_1_6',
            'asignatura': 'generalista',
            'url_oficial': 'https://www.docentemas.cl/...'
        }
    )
    
    print(f"Resultado: {resultado}")