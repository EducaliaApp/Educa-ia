# tests/pipeline/test_document_processor.py

import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO

# Agregar el directorio de scripts al path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../scripts/pipeline-document-monitor'))

# Import the DocumentProcessor class from the 01-document-processor.py file
from importlib.util import spec_from_file_location, module_from_spec

# Load the document processor module
spec = spec_from_file_location("document_processor", 
    os.path.join(os.path.dirname(__file__), '../../scripts/pipeline-document-monitor/01-document-processor.py'))
document_processor_module = module_from_spec(spec)
spec.loader.exec_module(document_processor_module)
DocumentProcessor = document_processor_module.DocumentProcessor

class TestDocumentProcessor:
    
    @pytest.fixture
    def mock_env_vars(self):
        """Mock de variables de entorno"""
        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'test_key',
            'OPENAI_API_KEY': 'test_openai_key'
        }):
            yield

    @pytest.fixture
    def mock_supabase(self):
        """Mock del cliente Supabase"""
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        return mock_client

    @pytest.fixture
    def processor(self, mock_env_vars, mock_supabase):
        """Instancia del procesador con mocks"""
        with patch('document_processor.create_client', return_value=mock_supabase):
            with patch('document_processor.OpenAI'):
                return DocumentProcessor()

    def test_init_success(self, mock_env_vars):
        """Test inicialización exitosa"""
        with patch('document_processor.create_client') as mock_create:
            with patch('document_processor.OpenAI') as mock_openai:
                processor = DocumentProcessor()
                
                mock_create.assert_called_once()
                mock_openai.assert_called_once()
                assert processor.supabase is not None

    def test_init_missing_env_vars(self):
        """Test fallo por variables faltantes"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="SUPABASE_URL no está configurada"):
                DocumentProcessor()

    def test_procesar_documentos_pendientes_empty(self, processor, mock_supabase):
        """Test procesamiento sin documentos pendientes"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        resultado = processor.procesar_documentos_pendientes()
        
        assert resultado['total'] == 0
        assert resultado['procesados'] == 0
        assert resultado['errores'] == 0

    def test_procesar_documentos_pendientes_with_docs(self, processor, mock_supabase):
        """Test procesamiento con documentos"""
        mock_docs = [
            {
                'id': 'doc1',
                'titulo': 'Test Doc 1',
                'storage_path': 'test/path1.pdf'
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = mock_docs
        
        # Mock del procesamiento individual
        with patch.object(processor, 'procesar_documento_individual') as mock_process:
            mock_process.return_value = {'status': 'procesado'}
            
            resultado = processor.procesar_documentos_pendientes()
            
            assert resultado['total'] == 1
            assert resultado['procesados'] == 1
            assert resultado['errores'] == 0

    def test_procesar_documento_individual_sin_storage_path(self, processor):
        """Test documento sin storage_path"""
        documento = {'id': 'test', 'titulo': 'Test'}
        
        resultado = processor.procesar_documento_individual(documento)
        
        assert resultado['status'] == 'sin_archivo'
        assert 'No tiene storage_path' in resultado['error']

    def test_extraer_texto_pdf_data_with_pymupdf(self, processor):
        """Test extracción de texto con PyMuPDF"""
        pdf_data = b'%PDF-1.4 fake pdf content'
        
        with patch('document_processor.fitz') as mock_fitz:
            mock_doc = Mock()
            mock_page = Mock()
            mock_page.get_text.return_value = "Texto de prueba"
            mock_doc.__enter__.return_value = [mock_page]
            mock_doc.__exit__.return_value = None
            mock_fitz.open.return_value = mock_doc
            
            resultado = processor._extraer_texto_pdf_data(pdf_data)
            
            assert "Texto de prueba" in resultado
            assert "--- Página 1 ---" in resultado

    def test_extraer_texto_pdf_data_fallback(self, processor):
        """Test extracción con fallback cuando PyMuPDF no está disponible"""
        pdf_data = b'Some readable text content here'
        
        with patch('document_processor.fitz', None):
            resultado = processor._extraer_texto_pdf_data(pdf_data)
            
            assert isinstance(resultado, str)
            assert len(resultado) > 0

    def test_generar_embedding_supabase_success(self, processor, mock_supabase):
        """Test generación de embedding exitosa"""
        mock_response = {'data': {'success': True}}
        mock_supabase.functions.invoke.return_value = mock_response
        
        # No debería lanzar excepción
        processor._generar_embedding_supabase('doc123', 'texto de prueba')

    def test_generar_embedding_supabase_error(self, processor, mock_supabase):
        """Test manejo de error en embedding"""
        mock_supabase.functions.invoke.side_effect = Exception("Connection error")
        
        with patch.object(processor, '_generar_embedding_directo') as mock_directo:
            mock_directo.side_effect = Exception("RPC error")
            
            with pytest.raises(Exception):
                processor._generar_embedding_supabase('doc123', 'texto de prueba')

    def test_limpiar_texto_para_embedding(self, processor):
        """Test limpieza de texto para embedding"""
        texto_sucio = "Texto con\x00caracteres\x1Fde control\nPágina 123\nwww.ejemplo.com"
        
        resultado = processor._limpiar_texto_para_embedding(texto_sucio)
        
        assert '\x00' not in resultado
        assert '\x1F' not in resultado
        assert 'Página 123' not in resultado
        assert 'www.ejemplo.com' not in resultado

    def test_extraer_contenido_relevante(self, processor):
        """Test extracción de contenido relevante"""
        texto_largo = """
        Párrafo irrelevante sin palabras clave.
        
        Este párrafo contiene objetivo de aprendizaje importante.
        
        Evaluación de competencias y habilidades del estudiante.
        
        Otro párrafo sin relevancia educativa.
        """
        
        resultado = processor._extraer_contenido_relevante(texto_largo)
        
        assert "objetivo de aprendizaje" in resultado
        assert "competencias y habilidades" in resultado
        assert len(resultado) < len(texto_largo)

    def test_extraer_texto_con_ocr_success(self, processor):
        """Test OCR exitoso"""
        pdf_data = b'fake pdf data'
        
        with patch('document_processor.fitz') as mock_fitz:
            with patch('document_processor.Image') as mock_image:
                with patch('document_processor.pytesseract') as mock_tesseract:
                    # Mock PyMuPDF
                    mock_doc = Mock()
                    mock_page = Mock()
                    mock_pix = Mock()
                    mock_pix.tobytes.return_value = b'png_data'
                    mock_page.get_pixmap.return_value = mock_pix
                    mock_doc.__enter__.return_value = [mock_page]
                    mock_doc.__exit__.return_value = None
                    mock_fitz.open.return_value = mock_doc
                    
                    # Mock PIL
                    mock_img = Mock()
                    mock_image.open.return_value = mock_img
                    
                    # Mock Tesseract
                    mock_tesseract.image_to_string.return_value = "Texto extraído por OCR"
                    
                    resultado = processor._extraer_texto_con_ocr(pdf_data)
                    
                    assert "Texto extraído por OCR" in resultado
                    assert "--- Página 1 (OCR) ---" in resultado

    def test_extraer_texto_con_ocr_no_available(self, processor):
        """Test OCR cuando no está disponible"""
        with patch('document_processor.pytesseract', None):
            resultado = processor._extraer_texto_con_ocr(b'fake_data')
            assert resultado == ""

    @pytest.mark.integration
    def test_procesamiento_completo_mock(self, processor, mock_supabase):
        """Test de integración con mocks completos"""
        # Configurar documento de prueba
        documento = {
            'id': 'test-doc-123',
            'titulo': 'Documento de Prueba',
            'storage_path': 'test/documento.pdf'
        }
        
        # Mock descarga de storage
        fake_pdf = b'%PDF-1.4 fake content with texto educativo'
        mock_supabase.storage.from_.return_value.download.return_value = fake_pdf
        
        # Mock extracción de texto
        with patch.object(processor, '_extraer_texto_pdf_data') as mock_extract:
            mock_extract.return_value = "Texto extraído del documento educativo"
            
            # Mock embedding
            with patch.object(processor, '_generar_embedding_supabase') as mock_embedding:
                mock_embedding.return_value = None  # No error
                
                resultado = processor.procesar_documento_individual(documento)
                
                assert resultado['status'] == 'procesado'
                assert resultado['documento_id'] == 'test-doc-123'
                assert resultado['texto_length'] > 0
                
                # Verificar que se llamó a update
                mock_supabase.table.assert_called()