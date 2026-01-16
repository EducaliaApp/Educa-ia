# Testing - MLOps Pipeline

## Estructura de Tests

```
scripts/
├── pipeline-document-mineduc/
│   ├── test_pipeline.py          # Tests unitarios ETL
│   └── test_integration.py       # Tests integración
├── rubricas/
│   └── test_rubricas.py          # Tests extracción rúbricas
└── test_metricas.py              # Tests métricas
```

## Ejecutar Tests

### Localmente

```bash
# Todos los tests
./scripts/run_tests.sh

# Tests específicos
cd scripts/pipeline-document-mineduc
python -m pytest test_pipeline.py -v

# Con cobertura
python -m pytest test_pipeline.py --cov=. --cov-report=html
```

### CI/CD

Los tests se ejecutan automáticamente en:
- Pull requests
- Push a main/develop
- Cambios en `scripts/pipeline-document-mineduc/**`
- Cambios en `scripts/rubricas/**`

Ver: `.github/workflows/test-pipeline.yml`

## Tests Implementados

### 1. Tests Unitarios ETL

**Archivo**: `test_pipeline.py`

- `test_fase1_extract`: Descarga de PDFs
- `test_fase2_transform`: Extracción de texto
- `test_fase3_load`: Generación de embeddings
- `test_validacion_calidad`: Validación de documentos

### 2. Tests Rúbricas

**Archivo**: `test_rubricas.py`

- `test_check_pending`: Verificar pendientes
- `test_extract_rubricas`: Extracción con IA
- `test_validate_rubricas`: Validación de calidad

### 3. Tests Integración

**Archivo**: `test_integration.py`

- `test_env_variables`: Variables de entorno
- `test_scripts_exist`: Existencia de scripts
- `test_requirements_file`: Dependencias

### 4. Tests Métricas

**Archivo**: `test_metricas.py`

- `test_metricas_procesamiento_schema`: Schema tabla
- `test_metricas_pipeline_rag_schema`: Schema tabla

## Cobertura

Objetivo: >80% cobertura de código

```bash
# Generar reporte HTML
pytest --cov=scripts --cov-report=html

# Ver en navegador
open htmlcov/index.html
```

## Mocks y Fixtures

### Supabase Mock

```python
@patch('fase1_extract.supabase')
def test_example(mock_supabase):
    mock_supabase.table().select().execute.return_value.data = [...]
```

### OpenAI Mock

```python
@patch('fase3_load.openai')
def test_example(mock_openai):
    mock_resp = Mock()
    mock_resp.data = [Mock(embedding=[0.1]*1536)]
    mock_openai.embeddings.create.return_value = mock_resp
```

## Agregar Nuevos Tests

1. Crear archivo `test_*.py`
2. Heredar de `unittest.TestCase`
3. Usar decoradores `@patch` para mocks
4. Ejecutar con pytest

```python
import unittest
from unittest.mock import patch

class TestNuevaFuncionalidad(unittest.TestCase):
    
    @patch('modulo.dependencia')
    def test_caso(self, mock_dep):
        # Arrange
        mock_dep.return_value = "test"
        
        # Act
        resultado = funcion_a_testear()
        
        # Assert
        self.assertEqual(resultado, "esperado")
```

## CI/CD Workflow

```yaml
jobs:
  test-etl-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: pytest test_pipeline.py -v --cov
```

## Troubleshooting

### Error: ModuleNotFoundError

```bash
# Agregar path al PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Error: Import failed

```bash
# Instalar en modo editable
pip install -e .
```

### Tests lentos

```bash
# Ejecutar solo tests rápidos
pytest -m "not slow"
```
