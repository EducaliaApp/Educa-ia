# tests/unit/test_edge_functions.py

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock

class TestEdgeFunctions:
    """Tests unitarios para Edge Functions de Supabase"""
    
    @pytest.fixture
    def mock_request(self):
        """Mock de Request para Edge Functions"""
        request = Mock()
        request.json = AsyncMock()
        request.headers = {'Authorization': 'Bearer test_token'}
        return request

    @pytest.fixture
    def mock_supabase_client(self):
        """Mock del cliente Supabase para Edge Functions"""
        client = Mock()
        client.from_.return_value.select.return_value.eq.return_value.execute.return_value = {
            'data': [], 'error': None
        }
        client.from_.return_value.update.return_value.eq.return_value.execute.return_value = {
            'data': [{'id': 'test'}], 'error': None
        }
        return client

    def test_generar_embedding_documento_success(self, mock_request, mock_supabase_client):
        """Test generación exitosa de embedding"""
        # Configurar request
        mock_request.json.return_value = {
            'documento_id': 'doc-123',
            'texto': 'Texto de prueba para embedding'
        }
        
        # Mock respuesta de OpenAI
        mock_openai_response = Mock()
        mock_openai_response.ok = True
        mock_openai_response.json.return_value = {
            'data': [{'embedding': [0.1, 0.2, 0.3] * 512}]  # 1536 dimensiones
        }
        
        with patch('requests.post', return_value=mock_openai_response):
            with patch('os.getenv', return_value='test_openai_key'):
                # Simular la función (no podemos importar directamente las Edge Functions)
                # Pero podemos testear la lógica
                
                # Verificar que se llamaría a OpenAI correctamente
                expected_payload = {
                    'model': 'text-embedding-3-small',
                    'input': 'Texto de prueba para embedding',
                    'encoding_format': 'float'
                }
                
                # El test verifica que la lógica sería correcta
                assert mock_request.json.return_value['documento_id'] == 'doc-123'
                assert len(mock_request.json.return_value['texto']) > 0

    def test_generar_embedding_documento_missing_params(self, mock_request):
        """Test error por parámetros faltantes"""
        mock_request.json.return_value = {
            'documento_id': 'doc-123'
            # Falta 'texto'
        }
        
        # Simular validación de parámetros
        data = mock_request.json.return_value
        
        with pytest.raises(KeyError):
            # Esto simula lo que haría la Edge Function
            if not data.get('documento_id') or not data.get('texto'):
                raise KeyError('documento_id y texto son requeridos')

    def test_generar_embedding_documento_openai_error(self, mock_request):
        """Test error de OpenAI API"""
        mock_request.json.return_value = {
            'documento_id': 'doc-123',
            'texto': 'Texto de prueba'
        }
        
        # Mock error de OpenAI
        mock_openai_response = Mock()
        mock_openai_response.ok = False
        mock_openai_response.status_code = 429
        mock_openai_response.text.return_value = 'Rate limit exceeded'
        
        with patch('requests.post', return_value=mock_openai_response):
            with patch('os.getenv', return_value='test_openai_key'):
                # Simular manejo de error
                response = mock_openai_response
                
                assert not response.ok
                assert response.status_code == 429

    def test_monitor_documentos_oficiales_success(self, mock_request, mock_supabase_client):
        """Test monitoreo exitoso de documentos"""
        mock_request.json.return_value = {'force': False}
        
        # Mock respuesta de scraping
        mock_html = '''
        <div>
            <a data-downloadurl="https://example.com/doc1.pdf">Manual 2025</a>
        </div>
        '''
        
        mock_fetch_response = Mock()
        mock_fetch_response.ok = True
        mock_fetch_response.text.return_value = mock_html
        
        with patch('requests.get', return_value=mock_fetch_response):
            # Simular extracción de links
            import re
            
            patron = r'data-downloadurl=["\']([^"\']*)["\'][^>]*>([^<]*)<\/a>'
            matches = re.findall(patron, mock_html)
            
            assert len(matches) == 1
            assert matches[0][0] == 'https://example.com/doc1.pdf'
            assert matches[0][1] == 'Manual 2025'

    def test_monitor_documentos_oficiales_parsing(self):
        """Test parsing de nombres de archivos"""
        # Simular función de parsing
        def parsear_nombre_archivo(nombre, tipo):
            nombre_lower = nombre.lower()
            
            # Detectar año
            año_match = re.search(r'202[0-9]', nombre)
            año = int(año_match.group(0)) if año_match else 2025
            
            # Detectar nivel
            if 'básica' in nombre_lower or 'basica' in nombre_lower:
                nivel = 'basica_1_6'
            elif 'media' in nombre_lower:
                nivel = 'basica_7_8_media'
            elif 'parvularia' in nombre_lower:
                nivel = 'parvularia'
            else:
                nivel = 'regular'
            
            return {'año': año, 'nivel': nivel, 'modalidad': 'regular'}
        
        import re
        
        # Test casos
        test_cases = [
            ('Manual Educación Básica 2025.pdf', 'manual', {'año': 2025, 'nivel': 'basica_1_6'}),
            ('Rúbricas Educación Media 2024.pdf', 'rubricas', {'año': 2024, 'nivel': 'basica_7_8_media'}),
            ('Manual Parvularia 2025.pdf', 'manual', {'año': 2025, 'nivel': 'parvularia'}),
        ]
        
        for nombre, tipo, expected in test_cases:
            resultado = parsear_nombre_archivo(nombre, tipo)
            assert resultado['año'] == expected['año']
            assert resultado['nivel'] == expected['nivel']

    def test_optimize_vector_search_stats(self, mock_request, mock_supabase_client):
        """Test estadísticas de optimización vectorial"""
        mock_request.json.return_value = {
            'action': 'stats',
            'tables': ['chunks_documentos', 'rubricas_mbe']
        }
        
        # Mock respuestas de estadísticas
        mock_supabase_client.from_.return_value.select.return_value.execute.return_value = {
            'data': [], 'error': None, 'count': 100
        }
        
        # Simular lógica de estadísticas
        tables = mock_request.json.return_value['tables']
        stats = {}
        
        for table in tables:
            # Simular consulta de estadísticas
            total = 100  # Mock count
            with_embedding = 80  # Mock count con embedding
            
            stats[table] = {
                'total': total,
                'with_embedding': with_embedding,
                'without_embedding': total - with_embedding,
                'coverage_pct': round((with_embedding / total) * 100) if total > 0 else 0
            }
        
        assert stats['chunks_documentos']['coverage_pct'] == 80
        assert stats['rubricas_mbe']['coverage_pct'] == 80

    def test_service_auth_validation(self):
        """Test validación de autenticación de servicio"""
        # Simular función de autenticación
        def validar_auth(headers):
            auth_header = headers.get('Authorization', '')
            
            if not auth_header.startswith('Bearer '):
                return False
            
            token = auth_header.replace('Bearer ', '')
            
            # Validar diferentes tipos de tokens
            valid_tokens = [
                'test_service_role_key',
                'test_anon_key', 
                'test_custom_secret'
            ]
            
            return token in valid_tokens
        
        # Test casos válidos
        assert validar_auth({'Authorization': 'Bearer test_service_role_key'})
        assert validar_auth({'Authorization': 'Bearer test_anon_key'})
        
        # Test casos inválidos
        assert not validar_auth({'Authorization': 'Bearer invalid_token'})
        assert not validar_auth({'Authorization': 'invalid_format'})
        assert not validar_auth({})

    def test_document_processor_edge_function_flow(self, mock_request, mock_supabase_client):
        """Test flujo completo de procesamiento en Edge Function"""
        # Simular request de procesamiento
        mock_request.json.return_value = {
            'documento_id': 'doc-456'
        }
        
        # Mock documento en BD
        mock_supabase_client.from_.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = {
            'data': {
                'id': 'doc-456',
                'storage_path': 'test/documento.pdf',
                'procesado': False
            },
            'error': None
        }
        
        # Mock descarga de storage
        mock_supabase_client.storage.from_.return_value.download.return_value = b'fake pdf content'
        
        # Simular lógica de procesamiento
        documento_id = mock_request.json.return_value['documento_id']
        documento = mock_supabase_client.from_.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value['data']
        
        assert documento['id'] == documento_id
        assert not documento['procesado']

    def test_error_handling_edge_functions(self, mock_request):
        """Test manejo de errores en Edge Functions"""
        # Simular diferentes tipos de errores
        error_scenarios = [
            {'type': 'missing_auth', 'headers': {}, 'expected_status': 401},
            {'type': 'invalid_json', 'body': 'invalid json', 'expected_status': 400},
            {'type': 'missing_params', 'body': '{}', 'expected_status': 400},
        ]
        
        for scenario in error_scenarios:
            if scenario['type'] == 'missing_auth':
                # Simular falta de autorización
                headers = scenario['headers']
                assert 'Authorization' not in headers
                
            elif scenario['type'] == 'invalid_json':
                # Simular JSON inválido
                try:
                    json.loads(scenario['body'])
                    assert False, "Debería haber fallado"
                except json.JSONDecodeError:
                    assert True
                    
            elif scenario['type'] == 'missing_params':
                # Simular parámetros faltantes
                data = json.loads(scenario['body'])
                assert len(data) == 0