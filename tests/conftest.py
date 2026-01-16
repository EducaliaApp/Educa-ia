# tests/conftest.py

import pytest
import os
import sys
from unittest.mock import Mock, patch

# Configuración global para tests
pytest_plugins = []

@pytest.fixture(scope="session")
def test_env():
    """Variables de entorno para testing"""
    return {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_key',
        'OPENAI_API_KEY': 'test_openai_key',
        'ANTHROPIC_API_KEY': 'test_anthropic_key',
        'GITHUB_TOKEN': 'test_github_token',
        'COHERE_API_KEY': 'test_cohere_key'
    }

@pytest.fixture
def mock_supabase_response():
    """Mock estándar de respuesta de Supabase"""
    def _create_response(data=None, error=None):
        response = Mock()
        response.data = data or []
        response.error = error
        return response
    return _create_response

@pytest.fixture
def sample_pdf_content():
    """Contenido de PDF de ejemplo"""
    return b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n178\n%%EOF'

@pytest.fixture
def sample_rubric_json():
    """JSON de rúbrica de ejemplo"""
    return {
        "indicador_id": "test_indicator_1",
        "nombre_indicador": "Planificación de la enseñanza",
        "descripcion_indicador": "Evalúa la calidad de la planificación docente",
        "evidencia_revisar": ["Planificaciones de clase", "Objetivos de aprendizaje"],
        "nivel_insatisfactorio": {
            "descripcion": "No presenta planificación adecuada",
            "condiciones": [],
            "operador_logico": "AND",
            "puntaje": 1.0
        },
        "nivel_basico": {
            "descripcion": "Presenta planificación básica",
            "condiciones": [
                {
                    "id": "condicion_1",
                    "texto": "Incluye objetivos de aprendizaje",
                    "tipo": "presencia",
                    "cuantificador": "al_menos_uno",
                    "verificable_automaticamente": True
                }
            ],
            "operador_logico": "AND",
            "puntaje": 2.0
        },
        "nivel_competente": {
            "descripcion": "Presenta planificación completa",
            "condiciones": [
                {
                    "id": "condicion_1",
                    "texto": "Incluye todos los elementos requeridos",
                    "tipo": "cuantitativa",
                    "cuantificador": "todos",
                    "verificable_automaticamente": True
                }
            ],
            "operador_logico": "AND",
            "puntaje": 3.0
        },
        "nivel_destacado": {
            "descripcion": "Presenta planificación excepcional",
            "condiciones": [
                {
                    "id": "condicion_1",
                    "texto": "Supera los estándares mínimos",
                    "tipo": "cualitativa",
                    "cuantificador": "todos",
                    "verificable_automaticamente": False
                }
            ],
            "operador_logico": "AND",
            "puntaje": 4.0
        },
        "notas_aclaratorias": ["Esta rúbrica evalúa la planificación docente"]
    }

@pytest.fixture
def mock_api_responses():
    """Respuestas mock para diferentes APIs"""
    return {
        'anthropic_success': {
            'content': [Mock(text='```json\n{"indicador_id": "anthropic_test"}\n```')]
        },
        'openai_success': {
            'choices': [Mock(message=Mock(content='{"indicador_id": "openai_test"}'))]
        },
        'github_success': {
            'choices': [{'message': {'content': '{"indicador_id": "github_test"}'}}]
        },
        'cohere_success': {
            'text': '{"indicador_id": "cohere_test"}'
        }
    }

# Configuración de pytest
def pytest_configure(config):
    """Configuración de pytest"""
    config.addinivalue_line(
        "markers", "integration: marca tests como de integración"
    )
    config.addinivalue_line(
        "markers", "slow: marca tests como lentos"
    )
    config.addinivalue_line(
        "markers", "api: marca tests que requieren APIs externas"
    )

def pytest_collection_modifyitems(config, items):
    """Modificar items de la colección de tests"""
    for item in items:
        # Agregar marker 'slow' a tests de integración
        if "integration" in item.keywords:
            item.add_marker(pytest.mark.slow)
        
        # Agregar marker 'api' a tests que usan APIs externas
        if any(keyword in item.name.lower() for keyword in ['anthropic', 'openai', 'github', 'cohere']):
            item.add_marker(pytest.mark.api)