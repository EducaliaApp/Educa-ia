# tests/integration/test_pipeline_complete.py

import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock
import tempfile
import json

# Agregar directorios al path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../scripts/pipeline-document-mineduc'))

class TestPipelineComplete:
    """Tests de integración para el pipeline completo ETL"""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock completo del cliente Supabase"""
        client = Mock()
        
        # Mock tabla documentos_oficiales
        client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        client.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()
        client.table.return_value.insert.return_value.execute.return_value = Mock()
        
        # Mock storage
        client.storage.from_.return_value.download.return_value = b'%PDF-1.4 fake pdf content'
        client.storage.from_.return_value.upload.return_value = {'data': {'path': 'test/path'}, 'error': None}
        
        # Mock functions
        client.functions.invoke.return_value = {'data': {'success': True}, 'error': None}
        
        return client

    @pytest.fixture
    def mock_env_complete(self):
        """Variables de entorno completas para testing"""
        env_vars = {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'test_service_key',
            'OPENAI_API_KEY': 'test_openai_key',
            'ANTHROPIC_API_KEY': 'test_anthropic_key',
            'GITHUB_TOKEN': 'test_github_token',
            'COHERE_API_KEY': 'test_cohere_key'
        }
        with patch.dict(os.environ, env_vars):
            yield env_vars

    @pytest.mark.integration
    def test_document_monitor_to_processor_flow(self, mock_env_complete, mock_supabase_client):
        """Test flujo completo: monitoreo → procesamiento"""
        
        # 1. Simular documentos detectados por el monitor
        documentos_detectados = [
            {
                'nombre': 'Manual Educación Básica 2025.pdf',
                'url': 'https://example.com/manual.pdf',
                'tipo': 'manual_portafolio',
                'año': 2025,
                'nivel_educativo': 'basica_1_6',
                'modalidad': 'regular'
            }
        ]
        
        # 2. Mock del procesamiento de documentos
        with patch('document_processor.create_client', return_value=mock_supabase_client):
            with patch('document_processor.OpenAI'):
                from document_processor import DocumentProcessor
                
                processor = DocumentProcessor()
                
                # Simular documento pendiente
                mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
                    {
                        'id': 'doc-123',
                        'titulo': 'Manual Educación Básica 2025',
                        'storage_path': 'manuales/2025/manual_basica.pdf',
                        'procesado': False
                    }
                ]
                
                # Mock extracción de texto exitosa
                with patch.object(processor, '_extraer_texto_pdf_data') as mock_extract:
                    mock_extract.return_value = "Contenido educativo del manual con objetivos de aprendizaje"
                    
                    # Mock embedding
                    with patch.object(processor, '_generar_embedding_supabase') as mock_embedding:
                        resultado = processor.procesar_documentos_pendientes()
                        
                        assert resultado['total'] == 1
                        assert resultado['procesados'] == 1
                        assert resultado['errores'] == 0
                        
                        # Verificar que se actualizó el documento
                        mock_supabase_client.table.return_value.update.assert_called()

    @pytest.mark.integration
    def test_processor_to_rubric_extractor_flow(self, mock_env_complete, mock_supabase_client):
        """Test flujo: procesamiento → extracción de rúbricas"""
        
        # 1. Simular documento procesado con contenido de rúbricas
        documento_con_rubricas = {
            'id': 'rubric-doc-456',
            'titulo': 'Rúbricas Educación Básica 2025',
            'tipo_documento': 'rubricas',
            'nivel_educativo': 'basica_1_6',
            'año_vigencia': 2025,
            'contenido_texto': """
            Rúbrica del indicador: Planificación de la enseñanza
            
            INSATISFACTORIO: No presenta planificación o esta es inadecuada para el logro de los objetivos.
            BÁSICO: Presenta una planificación que considera algunos elementos básicos.
            COMPETENTE: Presenta una planificación completa y coherente con los objetivos.
            DESTACADO: Presenta una planificación excepcional que supera los estándares.
            """
        }
        
        # 2. Mock del extractor de rúbricas
        with patch('rubric_extractor.Anthropic'):
            with patch('rubric_extractor.openai.OpenAI'):
                from rubric_extractor import RubricExtractor
                
                extractor = RubricExtractor()
                
                # Mock respuesta exitosa de Anthropic
                mock_anthropic_response = Mock()
                mock_anthropic_response.content = [Mock()]
                mock_anthropic_response.content[0].text = json.dumps({
                    "indicador_id": "planificacion_ensenanza",
                    "nombre_indicador": "Planificación de la enseñanza",
                    "descripcion_indicador": "Evalúa la calidad de la planificación docente",
                    "evidencia_revisar": ["Planificaciones de clase", "Objetivos de aprendizaje"],
                    "nivel_insatisfactorio": {
                        "descripcion": "No presenta planificación o esta es inadecuada",
                        "condiciones": [],
                        "operador_logico": "AND",
                        "puntaje": 1.0
                    },
                    "nivel_basico": {
                        "descripcion": "Presenta una planificación que considera algunos elementos básicos",
                        "condiciones": [],
                        "operador_logico": "AND", 
                        "puntaje": 2.0
                    },
                    "nivel_competente": {
                        "descripcion": "Presenta una planificación completa y coherente",
                        "condiciones": [],
                        "operador_logico": "AND",
                        "puntaje": 3.0
                    },
                    "nivel_destacado": {
                        "descripcion": "Presenta una planificación excepcional",
                        "condiciones": [],
                        "operador_logico": "AND",
                        "puntaje": 4.0
                    },
                    "notas_aclaratorias": []
                })
                
                extractor.anthropic.messages.create.return_value = mock_anthropic_response
                
                # Extraer rúbricas
                rubricas = extractor.extraer_rubricas(
                    documento_con_rubricas['contenido_texto'],
                    {
                        'nivel_educativo': documento_con_rubricas['nivel_educativo'],
                        'año_vigencia': documento_con_rubricas['año_vigencia']
                    }
                )
                
                assert len(rubricas) == 1
                assert rubricas[0]['indicador_id'] == 'planificacion_ensenanza'
                assert rubricas[0]['nivel_educativo'] == 'basica_1_6'

    @pytest.mark.integration
    def test_complete_etl_pipeline_simulation(self, mock_env_complete, mock_supabase_client):
        """Test simulación completa del pipeline ETL"""
        
        # EXTRACT: Simular monitoreo de documentos
        documentos_nuevos = [
            {
                'titulo': 'Manual Portafolio Básica 2025',
                'url': 'https://docentemas.cl/manual_basica_2025.pdf',
                'tipo_documento': 'manual_portafolio',
                'nivel_educativo': 'basica_1_6',
                'año_vigencia': 2025
            }
        ]
        
        # TRANSFORM: Procesamiento de documentos
        with patch('document_processor.create_client', return_value=mock_supabase_client):
            with patch('document_processor.OpenAI'):
                from document_processor import DocumentProcessor
                
                processor = DocumentProcessor()
                
                # Simular documento descargado y almacenado
                documento_procesado = {
                    'id': 'etl-test-789',
                    'titulo': 'Manual Portafolio Básica 2025',
                    'storage_path': 'manuales/2025/portafolio_basica.pdf',
                    'procesado': False
                }
                
                mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [documento_procesado]
                
                # Mock extracción exitosa con OCR
                with patch.object(processor, '_extraer_texto_pdf_data') as mock_extract_text:
                    mock_extract_text.return_value = ""  # Simular PDF escaneado
                    
                    with patch.object(processor, '_extraer_texto_con_ocr') as mock_ocr:
                        mock_ocr.return_value = """
                        Manual de Portafolio Docente 2025
                        
                        Rúbrica del indicador: Reflexión sobre la práctica
                        
                        INSATISFACTORIO: No evidencia reflexión sobre su práctica docente
                        BÁSICO: Evidencia reflexión básica sobre algunos aspectos de su práctica
                        COMPETENTE: Evidencia reflexión sistemática y fundamentada sobre su práctica
                        DESTACADO: Evidencia reflexión profunda y propositiva sobre su práctica
                        """
                        
                        resultado_procesamiento = processor.procesar_documentos_pendientes()
                        
                        assert resultado_procesamiento['procesados'] == 1

        # LOAD: Extracción de rúbricas y almacenamiento
        with patch('rubric_extractor.Anthropic'):
            with patch('rubric_extractor.openai.OpenAI'):
                from rubric_extractor import RubricExtractor
                
                extractor = RubricExtractor()
                
                # Simular documento con rúbricas procesado
                documento_con_rubricas = {
                    'id': 'etl-test-789',
                    'titulo': 'Manual Portafolio Básica 2025',
                    'tipo_documento': 'manual_portafolio',
                    'nivel_educativo': 'basica_1_6',
                    'año_vigencia': 2025,
                    'contenido_texto': mock_ocr.return_value
                }
                
                mock_supabase_client.table.return_value.select.return_value.in_.return_value.eq.return_value.execute.return_value.data = [documento_con_rubricas]
                
                # Mock extracción exitosa con fallback a Cohere
                extractor.anthropic = None  # Simular Anthropic no disponible
                extractor.openai_client = None  # Simular OpenAI no disponible
                
                mock_cohere_response = Mock()
                mock_cohere_response.ok = True
                mock_cohere_response.json.return_value = {
                    "text": json.dumps({
                        "indicador_id": "reflexion_practica",
                        "nombre_indicador": "Reflexión sobre la práctica",
                        "descripcion_indicador": "Evalúa la capacidad de reflexión docente",
                        "evidencia_revisar": ["Reflexiones escritas", "Análisis de práctica"],
                        "nivel_insatisfactorio": {"descripcion": "No evidencia reflexión", "puntaje": 1.0},
                        "nivel_basico": {"descripcion": "Reflexión básica", "puntaje": 2.0},
                        "nivel_competente": {"descripcion": "Reflexión sistemática", "puntaje": 3.0},
                        "nivel_destacado": {"descripcion": "Reflexión profunda", "puntaje": 4.0}
                    })
                }
                
                with patch('rubric_extractor.requests.post', return_value=mock_cohere_response):
                    # Simular procesamiento completo
                    total_rubricas = 0
                    
                    for doc in [documento_con_rubricas]:
                        rubricas = extractor.extraer_rubricas(
                            doc['contenido_texto'],
                            {
                                'nivel_educativo': doc['nivel_educativo'],
                                'año_vigencia': doc['año_vigencia']
                            }
                        )
                        
                        if rubricas:
                            extractor.guardar_rubricas(rubricas, mock_supabase_client)
                            total_rubricas += len(rubricas)
                    
                    assert total_rubricas == 1

    @pytest.mark.integration
    def test_error_recovery_pipeline(self, mock_env_complete, mock_supabase_client):
        """Test recuperación de errores en el pipeline"""
        
        # Simular errores en cascada y recuperación
        with patch('document_processor.create_client', return_value=mock_supabase_client):
            with patch('document_processor.OpenAI'):
                from document_processor import DocumentProcessor
                
                processor = DocumentProcessor()
                
                # Simular documento con problemas
                documento_problematico = {
                    'id': 'error-test-999',
                    'titulo': 'Documento Problemático',
                    'storage_path': 'problemas/documento_corrupto.pdf'
                }
                
                mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [documento_problematico]
                
                # Simular fallo en descarga
                mock_supabase_client.storage.from_.return_value.download.side_effect = Exception("Storage error")
                
                resultado = processor.procesar_documentos_pendientes()
                
                # El pipeline debe continuar a pesar del error
                assert resultado['total'] == 1
                assert resultado['procesados'] == 0
                assert resultado['errores'] == 1

    @pytest.mark.integration 
    def test_embedding_generation_flow(self, mock_env_complete, mock_supabase_client):
        """Test flujo de generación de embeddings"""
        
        with patch('document_processor.create_client', return_value=mock_supabase_client):
            with patch('document_processor.OpenAI'):
                from document_processor import DocumentProcessor
                
                processor = DocumentProcessor()
                
                documento = {
                    'id': 'embedding-test-111',
                    'titulo': 'Test Embedding',
                    'storage_path': 'test/embedding.pdf'
                }
                
                mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [documento]
                
                # Mock extracción de texto exitosa
                with patch.object(processor, '_extraer_texto_pdf_data') as mock_extract:
                    mock_extract.return_value = "Texto educativo para generar embedding con objetivos de aprendizaje"
                    
                    # Mock embedding exitoso
                    mock_supabase_client.functions.invoke.return_value = {'data': {'success': True}, 'error': None}
                    
                    resultado = processor.procesar_documentos_pendientes()
                    
                    assert resultado['procesados'] == 1
                    
                    # Verificar que se intentó generar embedding
                    mock_supabase_client.functions.invoke.assert_called()

    def test_rate_limit_handling(self, mock_env_complete):
        """Test manejo de rate limits en APIs"""
        
        with patch('rubric_extractor.Anthropic'):
            with patch('rubric_extractor.openai.OpenAI'):
                from rubric_extractor import RubricExtractor
                
                extractor = RubricExtractor()
                
                # Simular rate limit en GitHub Models y éxito en Cohere
                mock_github_429 = Mock()
                mock_github_429.ok = False
                mock_github_429.status_code = 429
                
                mock_cohere_success = Mock()
                mock_cohere_success.ok = True
                mock_cohere_success.json.return_value = {
                    "text": '{"indicador_id": "rate_limit_test", "nombre_indicador": "Test"}'
                }
                
                with patch('rubric_extractor.requests.post', side_effect=[mock_github_429, mock_github_429, mock_github_429, mock_cohere_success]):
                    with patch('time.sleep'):  # Acelerar test
                        resultado = extractor._extraer_con_github_models("test prompt", {'nivel_educativo': 'test'})
                        
                        # Debe fallar GitHub y usar Cohere
                        assert resultado is None  # GitHub falló
                        
                        # Probar Cohere directamente
                        resultado_cohere = extractor._extraer_con_cohere("test prompt", {'nivel_educativo': 'test'})
                        assert resultado_cohere is not None
                        assert resultado_cohere['indicador_id'] == 'rate_limit_test'