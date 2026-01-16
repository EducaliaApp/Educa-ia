# tests/pipeline/test_rubric_extractor.py

import pytest
import os
import sys
import json
from unittest.mock import Mock, patch, MagicMock

# Agregar el directorio de scripts al path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../scripts/pipeline-document-mineduc'))

# Import the RubricExtractor class from the rubric-extractor.py file
from importlib.util import spec_from_file_location, module_from_spec

# Load the rubric extractor module
spec = spec_from_file_location("rubric_extractor", 
    os.path.join(os.path.dirname(__file__), '../../scripts/pipeline-document-mineduc/rubric-extractor.py'))
rubric_extractor_module = module_from_spec(spec)
spec.loader.exec_module(rubric_extractor_module)
RubricExtractor = rubric_extractor_module.RubricExtractor

class TestRubricExtractor:
    
    @pytest.fixture
    def mock_env_vars(self):
        """Mock de variables de entorno"""
        with patch.dict(os.environ, {
            'OPENAI_API_KEY': 'test_openai_key',
            'GEMINI_API_KEY': 'test_gemini_key',
            'COHERE_API_KEY': 'test_cohere_key',
            'ANTHROPIC_API_KEY': 'test_anthropic_key'
        }):
            yield

    @pytest.fixture
    def extractor(self, mock_env_vars):
        """Instancia del extractor con mocks"""
        with patch('rubric_extractor.openai.OpenAI'):
            with patch('rubric_extractor.genai'):
                with patch('rubric_extractor.Anthropic'):
                    return RubricExtractor()

    @pytest.fixture
    def sample_rubric_text(self):
        """Texto de rúbrica de ejemplo"""
        return """
        Rúbrica del indicador: Planificación de clases
        
        INSATISFACTORIO: No presenta planificación o esta es inadecuada
        BÁSICO: Presenta planificación básica con algunos elementos
        COMPETENTE: Planificación completa con todos los elementos requeridos
        DESTACADO: Planificación excepcional que supera los estándares
        """

    @pytest.fixture
    def sample_metadata(self):
        """Metadata de ejemplo"""
        return {
            'nivel_educativo': 'basica_1_6',
            'asignatura': 'matematicas',
            'año_vigencia': 2025,
            'modalidad': 'regular'
        }

    def test_init_all_apis_available(self, mock_env_vars):
        """Test inicialización con todas las APIs disponibles"""
        with patch('rubric_extractor.openai.OpenAI') as mock_openai:
            with patch('rubric_extractor.genai') as mock_genai:
                with patch('rubric_extractor.Anthropic') as mock_anthropic:
                    mock_genai.configure = Mock()
                    mock_genai.GenerativeModel.return_value = Mock()
                    
                    extractor = RubricExtractor()
                    
                    assert extractor.openai_client is not None
                    assert extractor.gemini_client is not None
                    assert extractor.cohere_key == 'test_cohere_key'
                    assert extractor.anthropic is not None

    def test_init_no_apis_available(self):
        """Test inicialización sin APIs disponibles"""
        with patch.dict(os.environ, {}, clear=True):
            with patch('rubric_extractor.openai', None):
                with patch('rubric_extractor.genai', None):
                    with patch('rubric_extractor.Anthropic', None):
                        extractor = RubricExtractor()
                        
                        assert extractor.openai_client is None
                        assert extractor.gemini_client is None
                        assert extractor.cohere_key is None
                        assert extractor.anthropic is None

    def test_identificar_secciones_rubricas(self, extractor, sample_rubric_text):
        """Test identificación de secciones de rúbricas"""
        secciones = extractor._identificar_secciones_rubricas(sample_rubric_text)
        
        assert len(secciones) > 0
        assert any('INSATISFACTORIO' in seccion for seccion in secciones)

    def test_identificar_secciones_rubricas_empty(self, extractor):
        """Test con texto sin rúbricas"""
        texto_sin_rubricas = "Este es un texto normal sin rúbricas educativas."
        
        secciones = extractor._identificar_secciones_rubricas(texto_sin_rubricas)
        
        assert len(secciones) == 0

    def test_extraer_rubricas_with_limit(self, extractor, sample_metadata):
        """Test extracción con límite de rúbricas"""
        # Crear texto con muchas rúbricas
        texto_muchas_rubricas = """
        Rúbrica del indicador: Test 1
        INSATISFACTORIO: Test BÁSICO: Test COMPETENTE: Test DESTACADO: Test
        
        Rúbrica del indicador: Test 2
        INSATISFACTORIO: Test BÁSICO: Test COMPETENTE: Test DESTACADO: Test
        
        Rúbrica del indicador: Test 3
        INSATISFACTORIO: Test BÁSICO: Test COMPETENTE: Test DESTACADO: Test
        
        Rúbrica del indicador: Test 4
        INSATISFACTORIO: Test BÁSICO: Test COMPETENTE: Test DESTACADO: Test
        
        Rúbrica del indicador: Test 5
        INSATISFACTORIO: Test BÁSICO: Test COMPETENTE: Test DESTACADO: Test
        
        Rúbrica del indicador: Test 6
        INSATISFACTORIO: Test BÁSICO: Test COMPETENTE: Test DESTACADO: Test
        """
        
        with patch.object(extractor, '_extraer_rubrica_individual') as mock_extract:
            mock_extract.return_value = None  # Simular fallo en extracción
            
            rubricas = extractor.extraer_rubricas(texto_muchas_rubricas, sample_metadata)
            
            # Debe limitarse a 5 rúbricas máximo
            assert mock_extract.call_count <= 5

    def test_extraer_rubrica_individual_openai_success(self, extractor, sample_rubric_text, sample_metadata):
        """Test extracción exitosa con OpenAI"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "indicador_id": "test_indicator",
            "nombre_indicador": "Test Indicator",
            "descripcion_indicador": "Test description",
            "evidencia_revisar": ["test evidence"],
            "nivel_insatisfactorio": {"descripcion": "test", "condiciones": [], "operador_logico": "AND", "puntaje": 1.0},
            "nivel_basico": {"descripcion": "test", "condiciones": [], "operador_logico": "AND", "puntaje": 2.0},
            "nivel_competente": {"descripcion": "test", "condiciones": [], "operador_logico": "AND", "puntaje": 3.0},
            "nivel_destacado": {"descripcion": "test", "condiciones": [], "operador_logico": "AND", "puntaje": 4.0},
            "notas_aclaratorias": ["test note"]
        })
        
        extractor.openai_client.chat.completions.create.return_value = mock_response
        
        resultado = extractor._extraer_rubrica_individual(sample_rubric_text, sample_metadata)
        
        assert resultado is not None
        assert resultado['indicador_id'] == 'test_indicator'
        assert resultado['nivel_educativo'] == 'basica_1_6'
        assert resultado['asignatura'] == 'matematicas'

    def test_extraer_rubrica_individual_openai_rate_limit(self, extractor, sample_rubric_text, sample_metadata):
        """Test fallback cuando OpenAI tiene rate limit"""
        # Simular rate limit en OpenAI
        extractor.openai_client.chat.completions.create.side_effect = Exception("rate limit exceeded")
        
        # Mock Gemini exitoso
        mock_gemini_response = Mock()
        mock_gemini_response.text = json.dumps({
            "indicador_id": "gemini_test",
            "nombre_indicador": "Gemini Test"
        })
        extractor.gemini_client.generate_content.return_value = mock_gemini_response
        
        resultado = extractor._extraer_rubrica_individual(sample_rubric_text, sample_metadata)
        
        assert resultado is not None
        assert resultado['indicador_id'] == 'gemini_test'

    def test_extraer_con_github_models_success(self, extractor, sample_metadata):
        """Test extracción exitosa con GitHub Models"""
        prompt = "Test prompt"
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "indicador_id": "github_test",
                        "nombre_indicador": "GitHub Test"
                    })
                }
            }]
        }
        
        with patch('rubric_extractor.requests.post', return_value=mock_response):
            resultado = extractor._extraer_con_github_models(prompt, sample_metadata)
            
            assert resultado is not None
            assert resultado['indicador_id'] == 'github_test'
            assert resultado['nivel_educativo'] == 'basica_1_6'

    def test_extraer_con_github_models_rate_limit(self, extractor, sample_metadata):
        """Test manejo de rate limit en GitHub Models"""
        prompt = "Test prompt"
        
        # Primer intento: rate limit
        mock_response_429 = Mock()
        mock_response_429.ok = False
        mock_response_429.status_code = 429
        
        # Segundo intento: exitoso
        mock_response_200 = Mock()
        mock_response_200.ok = True
        mock_response_200.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({"indicador_id": "retry_success"})
                }
            }]
        }
        
        with patch('rubric_extractor.requests.post', side_effect=[mock_response_429, mock_response_200]):
            with patch('time.sleep'):  # Mock sleep para acelerar test
                resultado = extractor._extraer_con_github_models(prompt, sample_metadata)
                
                assert resultado is not None
                assert resultado['indicador_id'] == 'retry_success'

    def test_extraer_con_cohere_success(self, extractor, sample_metadata):
        """Test extracción exitosa con Cohere"""
        prompt = "Test prompt"
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            "text": json.dumps({
                "indicador_id": "cohere_test",
                "nombre_indicador": "Cohere Test"
            })
        }
        
        with patch('rubric_extractor.requests.post', return_value=mock_response):
            resultado = extractor._extraer_con_cohere(prompt, sample_metadata)
            
            assert resultado is not None
            assert resultado['indicador_id'] == 'cohere_test'
            assert resultado['nivel_educativo'] == 'basica_1_6'

    def test_extraer_con_cohere_json_in_text(self, extractor, sample_metadata):
        """Test extracción de JSON embebido en texto de Cohere"""
        prompt = "Test prompt"
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            "text": 'Aquí está el JSON solicitado: {"indicador_id": "embedded_json", "nombre_indicador": "Test"} y más texto.'
        }
        
        with patch('rubric_extractor.requests.post', return_value=mock_response):
            resultado = extractor._extraer_con_cohere(prompt, sample_metadata)
            
            assert resultado is not None
            assert resultado['indicador_id'] == 'embedded_json'

    def test_guardar_rubricas_new_rubric(self, extractor):
        """Test guardado de rúbrica nueva"""
        mock_supabase = Mock()
        
        # Simular que no existe
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        # Mock insert exitoso
        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
        
        rubricas = [{
            'indicador_id': 'new_rubric',
            'nombre_indicador': 'Nueva Rúbrica',
            'año_vigencia': 2025
        }]
        
        extractor.guardar_rubricas(rubricas, mock_supabase)
        
        # Verificar que se llamó insert
        mock_supabase.table.return_value.insert.assert_called_once()

    def test_guardar_rubricas_update_existing(self, extractor):
        """Test actualización de rúbrica existente"""
        mock_supabase = Mock()
        
        # Simular que existe
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {'id': 'existing_id'}
        ]
        
        # Mock update exitoso
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()
        
        rubricas = [{
            'indicador_id': 'existing_rubric',
            'nombre_indicador': 'Rúbrica Existente',
            'año_vigencia': 2025
        }]
        
        extractor.guardar_rubricas(rubricas, mock_supabase)
        
        # Verificar que se llamó update
        mock_supabase.table.return_value.update.assert_called_once()

    def test_guardar_rubricas_error_handling(self, extractor):
        """Test manejo de errores al guardar"""
        mock_supabase = Mock()
        
        # Simular error en la consulta
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("DB Error")
        
        rubricas = [{
            'indicador_id': 'error_rubric',
            'nombre_indicador': 'Error Rúbrica'
        }]
        
        # No debe lanzar excepción, debe manejar el error
        extractor.guardar_rubricas(rubricas, mock_supabase)

    @pytest.mark.integration
    def test_cascada_fallback_completa(self, extractor, sample_rubric_text, sample_metadata):
        """Test de cascada completa de fallback"""
        # OpenAI falla
        extractor.openai_client.chat.completions.create.side_effect = Exception("rate limit exceeded")
        
        # Gemini falla
        extractor.gemini_client.generate_content.side_effect = Exception("quota exceeded")
        
        # Cohere exitoso
        mock_cohere_success = Mock()
        mock_cohere_success.ok = True
        mock_cohere_success.json.return_value = {
            "text": json.dumps({
                "indicador_id": "fallback_success",
                "nombre_indicador": "Fallback Success"
            })
        }
        
        with patch('rubric_extractor.requests.post', return_value=mock_cohere_success):
            resultado = extractor._extraer_rubrica_individual(sample_rubric_text, sample_metadata)
            
            assert resultado is not None
            assert resultado['indicador_id'] == 'fallback_success'

    def test_todas_apis_fallan(self, extractor, sample_rubric_text, sample_metadata):
        """Test cuando todas las APIs fallan"""
        # Configurar todos los fallos
        extractor.openai_client.chat.completions.create.side_effect = Exception("API Error")
        extractor.gemini_client.generate_content.side_effect = Exception("API Error")
        extractor.anthropic.messages.create.side_effect = Exception("API Error")
        
        mock_error_response = Mock()
        mock_error_response.ok = False
        mock_error_response.status_code = 500
        
        with patch('rubric_extractor.requests.post', return_value=mock_error_response):
            resultado = extractor._extraer_rubrica_individual(sample_rubric_text, sample_metadata)
            
            assert resultado is None