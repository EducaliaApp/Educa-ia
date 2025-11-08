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
            'docentemas': 'https://www.docentemas.cl/portafolio/',
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
        
        # 1. Monitorear DocenteMás
        print("\n📍 Monitoreando DocenteMás...")
        docs_docentemas = self._monitorear_docentemas()
        
        # 2. Monitorear CPEIP
        print("\n📍 Monitoreando CPEIP...")
        docs_cpeip = self._monitorear_cpeip()
        
        # 3. Combinar documentos encontrados
        todos_docs = docs_docentemas + docs_cpeip
        
        print(f"\n📊 Encontrados {len(todos_docs)} documentos potenciales")
        
        # 4. Procesar cada documento
        for i, doc_info in enumerate(todos_docs, 1):
            print(f"\n[{i}/{len(todos_docs)}] Procesando: {doc_info['titulo']}")
            
            try:
                # Descargar
                pdf_path = self._descargar_pdf(doc_info['url'], doc_info['titulo'])
                
                if not pdf_path:
                    continue
                
                # Procesar
                resultado = self.processor.procesar_pdf(
                    pdf_path=pdf_path,
                    metadata=doc_info['metadata']
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
    
    def _monitorear_docentemas(self) -> List[Dict]:
        """
        Escanea www.docentemas.cl en busca de PDFs
        """
        
        documentos = []
        
        try:
            # Página principal de portafolio
            response = requests.get(
                self.urls_monitoreo['docentemas'],
                timeout=30,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            
            if response.status_code != 200:
                print(f"  ⚠️  Error HTTP {response.status_code}")
                return documentos
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Buscar enlaces a PDFs
            for link in soup.find_all('a', href=True):
                href = link['href']
                
                # Filtrar solo PDFs de 2025
                if '.pdf' in href.lower() and '2025' in href:
                    
                    # Construir URL completa
                    if not href.startswith('http'):
                        href = f"https://www.docentemas.cl{href}"
                    
                    # Extraer información del nombre del archivo
                    info = self._extraer_info_nombre_archivo(href, link.get_text())
                    
                    if info:
                        documentos.append({
                            'url': href,
                            'titulo': info['titulo'],
                            'metadata': info['metadata']
                        })
            
            print(f"  ✓ Encontrados {len(documentos)} documentos en DocenteMás")
            
        except Exception as e:
            print(f"  ❌ Error monitoreando DocenteMás: {e}")
        
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
    
    def _extraer_info_nombre_archivo(self, url: str, texto: str) -> Optional[Dict]:
        """
        Extrae información estructurada del nombre del archivo
        """
        
        filename = url.split('/')[-1].lower()
        
        # Detectar tipo de documento
        tipo = None
        if 'manual' in filename or 'manual' in texto.lower():
            tipo = 'manual'
        elif 'rubrica' in filename or 'rúbrica' in texto.lower():
            tipo = 'rubrica'
        elif 'instructivo' in filename or 'instructivo' in texto.lower():
            tipo = 'instructivo'
        
        if not tipo:
            return None
        
        # Detectar nivel educativo
        nivel = self._detectar_nivel_educativo(filename + ' ' + texto.lower())
        
        # Detectar asignatura
        asignatura = self._detectar_asignatura(filename + ' ' + texto.lower())
        
        # Año (buscar 2024, 2025, etc)
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