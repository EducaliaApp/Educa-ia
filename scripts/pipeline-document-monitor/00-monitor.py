# scripts/pipeline-document-monitor/00-monitor.py

import os
import sys
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
from pathlib import Path
from supabase import create_client
import argparse

from document_processor import DocumentProcessor
from rubric_extractor import RubricExtractor

class DocumentMonitor:
    """
    Monitorea sitios oficiales en busca de nuevos documentos
    """
    
    def __init__(self, interactive: bool = False):
        self.interactive = interactive
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        self.processor = DocumentProcessor()
        self.rubric_extractor = RubricExtractor()
        
        # URLs a monitorear
        self.urls_monitoreo = {
            'docentemas_rubricas': 'https://www.docentemas.cl/documentos-descargables/rubricas/',
            'docentemas_manuales': 'https://www.docentemas.cl/documentos-descargables/manuales-de-instrumentos/',
            'docentemas_curriculares': 'https://www.docentemas.cl/documentos-descargables/documentos-curriculares/',
            'cpeip': 'https://www.cpeip.cl/evaluacion-docente/'
        }
        
        # Directorio temporal
        self.download_dir = Path('./downloads')
        self.download_dir.mkdir(exist_ok=True)
    
    def ejecutar_monitoreo_completo(self):
        """
        Ejecuta monitoreo completo de todos los sitios
        """
        
        print("=" * 60)
        print("🔍 INICIANDO MONITOREO DE DOCUMENTOS OFICIALES")
        print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        resultados = {
            'documentos_nuevos': 0,
            'documentos_actualizados': 0,
            'rubricas_extraidas': 0,
            'errores': []
        }
        
        # 1. Monitorear DocenteMás - Rúbricas
        print("\n📍 Monitoreando DocenteMás - Rúbricas...")
        docs_rubricas = self._monitorear_docentemas_seccion('docentemas_rubricas', 'rubrica')
        
        # 2. Monitorear DocenteMás - Manuales
        print("\n📍 Monitoreando DocenteMás - Manuales...")
        docs_manuales = self._monitorear_docentemas_seccion('docentemas_manuales', 'manual_portafolio')
        
        # 3. Monitorear DocenteMás - Documentos Curriculares
        print("\n📍 Monitoreando DocenteMás - Bases Curriculares...")
        docs_curriculares = self._monitorear_docentemas_seccion('docentemas_curriculares', 'base_curricular')
        
        # 4. Monitorear CPEIP
        print("\n📍 Monitoreando CPEIP...")
        docs_cpeip = self._monitorear_cpeip()
        
        # 5. Combinar documentos encontrados
        todos_docs = docs_rubricas + docs_manuales + docs_curriculares + docs_cpeip
        
        print(f"\n📊 Encontrados {len(todos_docs)} documentos potenciales")
        
        # 4. Procesar cada documento
        for i, doc_info in enumerate(todos_docs, 1):
            print(f"\n[{i}/{len(todos_docs)}] Procesando: {doc_info['titulo']}")
            
            try:
                # Descargar
                pdf_path = self._descargar_pdf(doc_info['url'], doc_info['titulo'])
                
                if not pdf_path:
                    continue
                
                # Procesar directamente en memoria (sin guardar en Storage)
                resultado = self._procesar_pdf_directo(
                    pdf_data=pdf_path.read_bytes(),
                    metadata=doc_info['metadata'],
                    url=doc_info['url']
                )
                
                if resultado['status'] == 'procesado':
                    resultados['documentos_nuevos'] += 1
                    
                    # Si es rúbrica, extraer
                    if doc_info['metadata']['tipo_documento'] == 'rubrica':
                        print("  🔍 Extrayendo rúbricas...")
                        
                        # Leer documento de BD
                        doc = self.supabase.table('documentos_oficiales')\
                            .select('contenido_texto')\
                            .eq('id', resultado['documento_id'])\
                            .single()\
                            .execute()
                        
                        if doc.data:
                            rubricas = self.rubric_extractor.extraer_rubricas(
                                doc.data['contenido_texto'],
                                doc_info['metadata']
                            )
                            
                            if rubricas:
                                self.rubric_extractor.guardar_rubricas(rubricas, self.supabase)
                                resultados['rubricas_extraidas'] += len(rubricas)
                
                elif resultado['status'] == 'ya_existe':
                    print("  ℹ️  Documento ya existe (sin cambios)")
                
                # Limpiar archivo temporal
                if pdf_path and os.path.exists(pdf_path):
                    os.remove(pdf_path)
                
            except Exception as e:
                error_msg = f"Error procesando {doc_info['titulo']}: {str(e)}"
                print(f"  ❌ {error_msg}")
                resultados['errores'].append(error_msg)
        
        # 5. Resumen final
        self._imprimir_resumen(resultados)
        
        # 6. Notificar si hay cambios importantes
        if resultados['documentos_nuevos'] > 0 or resultados['documentos_actualizados'] > 0:
            self._enviar_notificacion(resultados)
        
        return resultados
    
    def _monitorear_docentemas_seccion(self, seccion_key: str, tipo_documento: str) -> List[Dict]:
        """
        Escanea una sección específica de www.docentemas.cl
        """
        
        documentos = []
        
        try:
            response = requests.get(
                self.urls_monitoreo[seccion_key],
                timeout=30,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            
            if response.status_code != 200:
                print(f"  ⚠️  Error HTTP {response.status_code}")
                return documentos
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Buscar enlaces con data-downloadurl (WordPress Download Manager)
            for link in soup.find_all('a', {'data-downloadurl': True}):
                href = link.get('data-downloadurl') or link.get('href')
                
                if not href or '.pdf' not in href.lower():
                    continue
                
                # Construir URL completa
                if not href.startswith('http'):
                    href = f"https://www.docentemas.cl{href}"
                
                # Extraer información
                texto = link.get_text(strip=True)
                info = self._extraer_info_nombre_archivo(href, texto, tipo_documento)
                
                if info:
                    documentos.append({
                        'url': href,
                        'titulo': info['titulo'],
                        'metadata': info['metadata']
                    })
            
            print(f"  ✓ Encontrados {len(documentos)} documentos")
            
        except Exception as e:
            print(f"  ❌ Error monitoreando {seccion_key}: {e}")
        
        return documentos
    
    def _monitorear_cpeip(self) -> List[Dict]:
        """
        Escanea www.cpeip.cl
        """
        
        documentos = []
        
        try:
            response = requests.get(
                self.urls_monitoreo['cpeip'],
                timeout=30,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    
                    if '.pdf' in href.lower() and ('portafolio' in href.lower() or 'rubrica' in href.lower()):
                        
                        if not href.startswith('http'):
                            href = f"https://www.cpeip.cl{href}"
                        
                        info = self._extraer_info_nombre_archivo(href, link.get_text())
                        
                        if info:
                            documentos.append({
                                'url': href,
                                'titulo': info['titulo'],
                                'metadata': info['metadata']
                            })
                
                print(f"  ✓ Encontrados {len(documentos)} documentos en CPEIP")
        
        except Exception as e:
            print(f"  ❌ Error monitoreando CPEIP: {e}")
        
        return documentos
    
    def _extraer_info_nombre_archivo(self, url: str, texto: str, tipo_forzado: str = None) -> Optional[Dict]:
        """
        Extrae información estructurada del nombre del archivo
        """
        
        filename = url.split('/')[-1].lower()
        texto_completo = (filename + ' ' + texto).lower()
        
        # Usar tipo forzado o detectar
        tipo = tipo_forzado
        if not tipo:
            if 'manual' in texto_completo and 'portafolio' in texto_completo:
                tipo = 'manual_portafolio'
            elif 'rubrica' in texto_completo or 'rúbrica' in texto_completo:
                tipo = 'rubrica'
            elif 'instructivo' in texto_completo:
                tipo = 'instructivo'
            elif 'base' in texto_completo and 'curricular' in texto_completo:
                tipo = 'base_curricular'
        
        if not tipo:
            return None
        
        # Detectar nivel educativo
        nivel = self._detectar_nivel_educativo(texto_completo)
        
        # Detectar asignatura
        asignatura = self._detectar_asignatura(texto_completo)
        
        # Detectar modalidad
        modalidad = self._detectar_modalidad(texto_completo)
        
    
    def _imprimir_resumen(self, resultados: Dict):
        """
        Imprime resumen de resultados
        """
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE MONITOREO")
        print("=" * 60)
        print(f"✅ Documentos nuevos: {resultados['documentos_nuevos']}")
        print(f"🔄 Documentos actualizados: {resultados['documentos_actualizados']}")
        print(f"📋 Rúbricas extraídas: {resultados['rubricas_extraidas']}")
        print(f"❌ Errores: {len(resultados['errores'])}")
        
        if resultados['errores']:
            print("\n⚠️  Errores encontrados:")
            for error in resultados['errores'][:5]:
                print(f"  - {error}")
    
    def _enviar_notificacion(self, resultados: Dict):
        """
        Envía notificación de cambios
        """
        # TODO: Implementar notificaciones (email, Slack, etc)
        pass
    
    def _descargar_pdf(self, url: str, titulo: str) -> Optional[Path]:
        """
        Descarga PDF temporal (solo para procesamiento, no se guarda en Storage)
        """
        try:
            response = requests.get(url, timeout=60)
            if response.status_code == 200:
                filename = hashlib.md5(url.encode()).hexdigest() + '.pdf'
                filepath = self.download_dir / filename
                filepath.write_bytes(response.content)
                return filepath
        except Exception as e:
            print(f"  ❌ Error descargando: {e}")
        return None
    
    def _procesar_pdf_directo(self, pdf_data: bytes, metadata: Dict, url: str) -> Dict:
        """
        Procesa PDF directamente en memoria sin guardarlo en Storage
        Optimización de costos: solo guardamos el texto extraído en BD
        """
        import re
        
        # Calcular hash del contenido
        contenido_hash = hashlib.sha256(pdf_data).hexdigest()
        
        # Verificar si ya existe
        existing = self.supabase.table('documentos_oficiales')\
            .select('id')\
            .eq('contenido_hash', contenido_hash)\
            .execute()
        
        if existing.data:
            return {'status': 'ya_existe', 'documento_id': existing.data[0]['id']}
        
        # Extraer texto usando el processor
        texto = self.processor._extraer_texto_pdf_data(pdf_data)
        
        # Si no hay texto, intentar OCR
        if not texto or len(texto.strip()) < 10:
            texto = self.processor._extraer_texto_con_ocr(pdf_data)
        
        # Crear registro en BD (sin storage_path)
        doc_data = {
            'titulo': metadata.get('titulo', 'Sin título'),
            'tipo_documento': metadata['tipo_documento'],
            'nivel_educativo': metadata['nivel_educativo'],
            'asignatura': metadata.get('asignatura'),
            'modalidad': metadata['modalidad'],
            'año_vigencia': metadata['año_vigencia'],
            'fuente': metadata['fuente'],
            'url_original': url,
            'contenido_hash': contenido_hash,
            'contenido_texto': texto or 'Documento sin texto extraíble',
            'procesado': True,
            'fecha_procesamiento': datetime.now().isoformat(),
            'storage_path': None  # No guardamos en Storage para ahorrar costos
        }
        
        result = self.supabase.table('documentos_oficiales').insert(doc_data).execute()
        
        if result.data:
            doc_id = result.data[0]['id']
            
            # Generar embedding si hay texto
            if texto and len(texto) > 50:
                try:
                    self.processor._generar_embedding_supabase(doc_id, texto[:8000])
                except Exception as e:
                    print(f"  ⚠️ Error generando embedding: {e}")
            
            return {'status': 'procesado', 'documento_id': doc_id}
        
        return {'status': 'error', 'error': 'No se pudo insertar en BD'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Monitor de Documentos Oficiales')
    parser.add_argument('--interactive', action='store_true', help='Modo interactivo')
    args = parser.parse_args()
    
    monitor = DocumentMonitor(interactive=args.interactive)
    monitor.ejecutar_monitoreo_completo()      año = 2025
        import re
        año_match = re.search(r'20(2[4-9]|3[0-9])', texto_completo)
        if año_match:
            año = int(año_match.group(0))
        
        return {
            'titulo': texto.strip() or filename,
            'metadata': {
                'tipo_documento': tipo,
                'nivel_educativo': nivel,
                'asignatura': asignatura,
                'modalidad': modalidad,
                'año_vigencia': año,
                'fuente': 'docentemas' if 'docentemas' in url else 'cpeip',
                'url_original': url
            }
        }
    
    def _detectar_nivel_educativo(self, texto: str) -> str:
        """
        Detecta nivel educativo: primero patrones exactos, luego fuzzy
        """
        # 1. Patrones exactos de DocenteMás
        if '7' in texto and '8' in texto and ('básica' in texto or 'basica' in texto):
            return 'basica_7_8'
        elif 'ed. básica asignaturas' in texto or 'basica asignaturas' in texto:
            return 'basica_1_6'
        elif 'ed. básica generalista' in texto or 'basica generalista' in texto:
            return 'basica_generalista'
        elif 'educación media técnico profesional' in texto or 'media técnico profesional' in texto or 'media tp' in texto:
            return 'media_tp'
        elif 'educación media' in texto or 'ed. media' in texto:
            return 'media'
        elif 'educación parvularia' in texto or 'ed. parvularia' in texto or 'párvulo' in texto:
            return 'parvularia'
        elif 'educación especial escuela especial' in texto or 'especial escuela especial' in texto or 'neep' in texto:
            return 'especial_escuela'
        elif 'educación especial escuela regular' in texto or 'especial escuela regular' in texto:
            return 'especial_regular'
        elif 'personas jóvenes y adultas' in texto or 'epja' in texto:
            return 'epja'
        elif 'contextos de encierro' in texto or 'encierro' in texto:
            return 'encierro'
        elif 'lengua indígena' in texto or 'indigena' in texto:
            return 'lengua_indigena'
        elif 'pedagogía hospitalaria' in texto or 'hospitalaria' in texto:
            return 'hospitalaria'
        
        # 2. Patrones fuzzy (no exactos)
        elif ('7' in texto or '8' in texto) and 'basica' in texto:
            return 'basica_7_8'
        elif ('1' in texto or '6' in texto) and 'basica' in texto and 'asignatura' in texto:
            return 'basica_1_6'
        elif 'basica' in texto and 'generalista' in texto:
            return 'basica_generalista'
        elif 'media' in texto and ('tecnico' in texto or 'profesional' in texto):
            return 'media_tp'
        elif 'media' in texto:
            return 'media'
        elif 'parvularia' in texto or 'parvulo' in texto:
            return 'parvularia'
        elif 'especial' in texto and 'escuela especial' in texto:
            return 'especial_escuela'
        elif 'especial' in texto and 'regular' in texto:
            return 'especial_regular'
        elif 'jovenes' in texto or 'adultas' in texto or 'adultos' in texto:
            return 'epja'
        elif 'basica' in texto:
            return 'basica'
        
        return 'generalista'
    
    def _detectar_asignatura(self, texto: str) -> Optional[str]:
        """
        Detecta asignatura del documento
        """
        asignaturas = {
            'artes visuales': 'artes_visuales',
            'ciencias naturales': 'ciencias_naturales',
            'educación física': 'educacion_fisica',
            'educacion fisica': 'educacion_fisica',
            'francés': 'frances',
            'frances': 'frances',
            'historia': 'historia',
            'geografía': 'historia',
            'ciencias sociales': 'historia',
            'inglés': 'ingles',
            'ingles': 'ingles',
            'idioma extranjero': 'ingles',
            'lenguaje': 'lenguaje',
            'comunicación': 'lenguaje',
            'lengua castellana': 'lenguaje',
            'matemática': 'matematica',
            'matematica': 'matematica',
            'educación matemática': 'matematica',
            'música': 'musica',
            'musica': 'musica',
            'religión católica': 'religion_catolica',
            'religión evangélica': 'religion_evangelica',
            'tecnología': 'tecnologia',
            'tecnologia': 'tecnologia',
            'estudios sociales': 'estudios_sociales',
            'educación especial': 'educacion_especial',
            'educacion especial': 'educacion_especial',
            'diferencial': 'educacion_especial'
        }
        
        for key, value in asignaturas.items():
            if key in texto:
                return value
        
        return None
    
    def _detectar_modalidad(self, texto: str) -> str:
        """
        Detecta modalidad educativa según patrones de DocenteMás
        """
        if 'contextos de encierro' in texto or 'encierro' in texto:
            return 'encierro'
        elif 'personas jóvenes y adultas' in texto or 'epja' in texto:
            return 'epja'
        elif 'técnico profesional' in texto or 'tp' in texto:
            return 'tecnico_profesional'
        elif 'pedagogía hospitalaria' in texto or 'hospitalaria' in texto:
            return 'hospitalaria'
        elif 'lengua indígena' in texto or 'indigena' in texto:
            return 'lengua_indigena'
        elif 'educación especial escuela especial' in texto or 'neep' in texto:
            return 'especial_escuela'
        elif 'educación especial escuela regular' in texto:
            return 'especial_regular'
        elif 'escuela de lenguaje' in texto:
            return 'especial_lenguaje'
        elif 'especial' in texto:
            return 'especial'
        return 'regular'
        import re
        año_match = re.search(r'202[4-9]', filename)
        año = int(año_match.group(0)) if año_match else datetime.now().year
        
        return {
            'titulo': texto.strip() or filename,
            'metadata': {
                'tipo_documento': tipo,
                'año_vigencia': año,
                'nivel_educativo': nivel,
                'asignatura': asignatura,
                'url_oficial': url,
                'modalidad': 'regular'
            }
        }
    
    def _detectar_nivel_educativo(self, texto: str) -> str:
        """
        Detecta nivel educativo desde texto
        """
        
        mapeo = {
            'parvularia': 'parvularia',
            'básica 1': 'basica_1_6',
            'básica asignatura': 'basica_1_6',
            '7°': 'basica_7_8_media',
            '7 básico': 'basica_7_8_media',
            'media': 'basica_7_8_media',
            'técnico profesional': 'media_tecnico_profesional',
            'adultos': 'personas_jovenes_adultas',
            'epja': 'personas_jovenes_adultas',
            'especial': 'educacion_especial',
            'hospitalaria': 'pedagogia_hospitalaria',
            'lengua indígena': 'lengua_indigena',
            'encierro': 'contextos_encierro'
        }
        
        for patron, nivel in mapeo.items():
            if patron in texto:
                return nivel
        
        return 'general'
    
    def _detectar_asignatura(self, texto: str) -> Optional[str]:
        """
        Detecta asignatura desde texto
        """
        
        asignaturas = [
            'matemática', 'lenguaje', 'ciencias', 'historia',
            'inglés', 'artes', 'educación física', 'música',
            'tecnología', 'religión', 'filosofía'
        ]
        
        for asignatura in asignaturas:
            if asignatura in texto:
                return asignatura.replace(' ', '_')
        
        return 'generalista'
    
    def _descargar_pdf(self, url: str, titulo: str) -> Optional[str]:
        """
        Descarga un PDF desde una URL
        """
        
        try:
            print(f"  📥 Descargando...")
            
            response = requests.get(url, timeout=60, stream=True)
            
            if response.status_code != 200:
                print(f"  ⚠️  Error HTTP {response.status_code}")
                return None
            
            # Generar nombre de archivo seguro
            import re
            safe_name = re.sub(r'[^\w\s-]', '', titulo)[:50]
            filename = self.download_dir / f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            
            # Guardar
            with open(filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"  ✓ Descargado: {filename.name}")
            return str(filename)
            
        except Exception as e:
            print(f"  ❌ Error descargando: {e}")
            return None
    
    def _imprimir_resumen(self, resultados: Dict):
        """
        Imprime resumen de la ejecución
        """
        
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE MONITOREO")
        print("=" * 60)
        print(f"✅ Documentos nuevos:      {resultados['documentos_nuevos']}")
        print(f"🔄 Documentos actualizados: {resultados['documentos_actualizados']}")
        print(f"📋 Rúbricas extraídas:     {resultados['rubricas_extraidas']}")
        print(f"❌ Errores:                {len(resultados['errores'])}")
        
        if resultados['errores']:
            print("\nErrores encontrados:")
            for error in resultados['errores'][:5]:  # Máximo 5
                print(f"  • {error}")
        
        print("=" * 60)
    
    def _enviar_notificacion(self, resultados: Dict):
        """
        Envía notificación sobre cambios detectados
        """
        
        if not os.getenv('ENABLE_NOTIFICATIONS', 'false').lower() == 'true':
            return
        
        print("\n📧 Enviando notificación...")
        
        try:
            # Registrar en tabla de notificaciones
            self.supabase.table('notificaciones_admin').insert({
                'tipo': 'documentos_actualizados',
                'titulo': f"🔔 Nuevos documentos oficiales detectados",
                'contenido': {
                    'documentos_nuevos': resultados['documentos_nuevos'],
                    'documentos_actualizados': resultados['documentos_actualizados'],
                    'rubricas_extraidas': resultados['rubricas_extraidas'],
                    'fecha': datetime.now().isoformat()
                },
                'prioridad': 'alta' if resultados['documentos_nuevos'] > 0 else 'media',
                'leida': False
            }).execute()
            
            print("  ✓ Notificación registrada")
            
        except Exception as e:
            print(f"  ⚠️  Error enviando notificación: {e}")


def main():
    """
    Punto de entrada principal
    """
    
    parser = argparse.ArgumentParser(description='Monitor de Documentos Oficiales MINEDUC')
    parser.add_argument('--interactive', action='store_true', help='Modo interactivo')
    parser.add_argument('--auto', action='store_true', help='Modo automático (para cron)')
    parser.add_argument('--dry-run', action='store_true', help='Simular sin guardar')
    parser.add_argument('--force-refresh', action='store_true', help='Forzar reprocesamiento')
    
    args = parser.parse_args()
    
    # Validar variables de entorno
    required_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print(f"❌ Faltan variables de entorno: {', '.join(missing)}")
        sys.exit(1)
    
    # Ejecutar monitoreo
    monitor = DocumentMonitor(interactive=args.interactive)
    
    if args.dry_run:
        print("🔍 MODO DRY-RUN (sin guardar cambios)")
    
    resultados = monitor.ejecutar_monitoreo_completo()
    
    # Exit code basado en resultados
    if len(resultados['errores']) > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()