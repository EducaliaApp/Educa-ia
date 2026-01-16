# Tests para ProfeFlow Pipeline ETL

Este directorio contiene tests completos para el pipeline ETL de ProfeFlow, incluyendo procesamiento de documentos, extracción de rúbricas y Edge Functions.

## 📁 Estructura de Tests

```
tests/
├── conftest.py                 # Configuración global y fixtures
├── pytest.ini                 # Configuración de pytest
├── README.md                   # Esta documentación
├── pipeline/                   # Tests del pipeline ETL
│   ├── test_document_processor.py    # Tests del procesador de documentos
│   └── test_rubric_extractor.py      # Tests del extractor de rúbricas
├── integration/                # Tests de integración
│   └── test_pipeline_complete.py     # Tests del pipeline completo
└── unit/                       # Tests unitarios
    └── test_edge_functions.py        # Tests de Edge Functions

```

## 🚀 Ejecutar Tests

### Todos los tests
```bash
pytest
```

### Tests por categoría
```bash
# Tests unitarios rápidos
pytest -m unit

# Tests de integración
pytest -m integration

# Tests del pipeline ETL
pytest -m pipeline

# Tests de Edge Functions
pytest -m edge_functions
```

### Tests específicos
```bash
# Solo procesador de documentos
pytest tests/pipeline/test_document_processor.py

# Solo extractor de rúbricas
pytest tests/pipeline/test_rubric_extractor.py

# Test específico
pytest tests/pipeline/test_document_processor.py::TestDocumentProcessor::test_init_success
```

### Con cobertura
```bash
pytest --cov=scripts --cov-report=html
```

## 🏷️ Markers Disponibles

- `@pytest.mark.unit` - Tests unitarios rápidos
- `@pytest.mark.integration` - Tests de integración
- `@pytest.mark.slow` - Tests que tardan >5 segundos
- `@pytest.mark.api` - Tests que requieren APIs externas
- `@pytest.mark.pipeline` - Tests específicos del pipeline
- `@pytest.mark.edge_functions` - Tests de Edge Functions
- `@pytest.mark.mock_only` - Tests solo con mocks

## 🔧 Configuración

### Variables de Entorno para Tests
```bash
# Archivo .env.test (opcional)
TESTING=true
SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test_key
OPENAI_API_KEY=test_openai_key
ANTHROPIC_API_KEY=test_anthropic_key
GITHUB_TOKEN=test_github_token
COHERE_API_KEY=test_cohere_key
```

### Dependencias de Testing
```bash
pip install pytest pytest-mock pytest-asyncio pytest-cov
```

## 📋 Cobertura de Tests

### DocumentProcessor
- ✅ Inicialización con/sin variables de entorno
- ✅ Procesamiento de documentos pendientes
- ✅ Extracción de texto con PyMuPDF
- ✅ OCR para documentos escaneados
- ✅ Generación de embeddings
- ✅ Limpieza y optimización de texto
- ✅ Manejo de errores y fallbacks

### RubricExtractor
- ✅ Inicialización con múltiples APIs
- ✅ Identificación de secciones de rúbricas
- ✅ Extracción con Anthropic, OpenAI, GitHub Models, Cohere
- ✅ Cascada de fallback entre APIs
- ✅ Manejo de rate limits
- ✅ Guardado en base de datos
- ✅ Manejo de errores JSON

### Edge Functions
- ✅ Generación de embeddings
- ✅ Monitoreo de documentos
- ✅ Optimización vectorial
- ✅ Autenticación de servicio
- ✅ Manejo de errores

### Pipeline Completo
- ✅ Flujo ETL completo
- ✅ Monitoreo → Procesamiento → Extracción
- ✅ Recuperación de errores
- ✅ Rate limit handling
- ✅ Embedding generation flow

## 🎯 Casos de Test Principales

### 1. Procesamiento de Documentos
```python
def test_procesamiento_completo_mock(processor, mock_supabase):
    """Test de integración con mocks completos"""
    # Configura documento, mock descarga, extracción, embedding
    # Verifica procesamiento exitoso
```

### 2. Extracción de Rúbricas
```python
def test_cascada_fallback_completa(extractor, sample_rubric_text):
    """Test cascada: Anthropic → OpenAI → GitHub → Cohere"""
    # Simula fallos en orden hasta éxito con Cohere
```

### 3. Pipeline ETL Completo
```python
def test_complete_etl_pipeline_simulation():
    """Test simulación completa del pipeline ETL"""
    # EXTRACT: Monitoreo → TRANSFORM: Procesamiento → LOAD: Rúbricas
```

## 🐛 Debugging Tests

### Ejecutar con debugging
```bash
# Verbose output
pytest -v -s

# Solo fallos
pytest --tb=short

# Parar en primer fallo
pytest -x

# Ejecutar test específico con debugging
pytest -v -s tests/pipeline/test_document_processor.py::TestDocumentProcessor::test_init_success
```

### Logs durante tests
```bash
# Ver logs de la aplicación
pytest --log-cli-level=DEBUG

# Capturar prints
pytest -s
```

## 📊 Métricas de Tests

### Tiempo de Ejecución Esperado
- Tests unitarios: < 1 segundo cada uno
- Tests de integración: 2-5 segundos cada uno
- Pipeline completo: 5-10 segundos

### Cobertura Objetivo
- Procesador de documentos: >90%
- Extractor de rúbricas: >90%
- Edge Functions: >80%
- Pipeline completo: >85%

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    pytest -m "not slow" --cov=scripts
    pytest -m integration --maxfail=1
```

### Pre-commit Hooks
```bash
# Ejecutar tests rápidos antes de commit
pytest -m "unit and not slow" --maxfail=3
```

## 🆘 Troubleshooting

### Errores Comunes

1. **ImportError en scripts**
   ```bash
   # Asegurar que el path está configurado
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/scripts/pipeline-document-mineduc"
   ```

2. **Tests lentos**
   ```bash
   # Ejecutar solo tests rápidos
   pytest -m "not slow"
   ```

3. **Fallos de mocks**
   ```bash
   # Verificar que los mocks están configurados correctamente
   pytest -v -s tests/pipeline/test_document_processor.py::test_init_success
   ```

### Logs Útiles
- Tests fallidos: `pytest --tb=long`
- Cobertura detallada: `pytest --cov-report=term-missing`
- Tiempo de ejecución: `pytest --durations=10`