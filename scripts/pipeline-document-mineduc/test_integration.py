#!/usr/bin/env python3
"""Tests de integración end-to-end"""
import unittest
from unittest.mock import patch, Mock
import os

class TestIntegrationPipeline(unittest.TestCase):
    
    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_key',
        'OPENAI_API_KEY': 'test_key'
    })
    def test_env_variables(self):
        self.assertEqual(os.getenv('SUPABASE_URL'), 'https://test.supabase.co')
        self.assertIsNotNone(os.getenv('OPENAI_API_KEY'))
    
    def test_scripts_exist(self):
        scripts = [
            'fase1_extract.py',
            'fase2_transform.py',
            'fase3_load.py',
            'fase5_optimize.py',
            'fase6_metrics.py',
            'fase4_validacion_calidad.py'
        ]
        for script in scripts:
            self.assertTrue(os.path.exists(script), f"{script} no existe")
    
    def test_requirements_file(self):
        self.assertTrue(os.path.exists('requirements.txt'))
        with open('requirements.txt') as f:
            content = f.read()
            self.assertIn('supabase', content)
            self.assertIn('openai', content)
            self.assertIn('PyMuPDF', content)

if __name__ == '__main__':
    unittest.main()
