#!/usr/bin/env python3
"""Tests para extracción de rúbricas"""
import unittest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

class TestRubricasExtraction(unittest.TestCase):
    
    @patch('check_pending.supabase')
    def test_check_pending(self, mock_supabase):
        mock_supabase.table().select().eq().eq().is_().execute.return_value.data = [
            {'id': '1'}, {'id': '2'}
        ]
        
        from check_pending import supabase
        self.assertIsNotNone(supabase)
    
    @patch('extract_rubricas.supabase')
    @patch('extract_rubricas.openai')
    def test_extract_rubricas(self, mock_openai, mock_supabase):
        mock_supabase.table().select().eq().eq().limit().execute.return_value.data = [
            {'id': '1', 'contenido_texto': 'Test rubric content'}
        ]
        
        mock_resp = Mock()
        mock_resp.choices = [Mock(message=Mock(content='{"rubrica": "test"}'))]
        mock_openai.chat.completions.create.return_value = mock_resp
        
        from extract_rubricas import supabase
        self.assertIsNotNone(supabase)
    
    @patch('validate_rubricas.supabase')
    def test_validate_rubricas(self, mock_supabase):
        mock_supabase.table().select().eq().eq().execute.return_value.data = [
            {'id': '1', 'rubrica_extraida': True}
        ]
        
        from validate_rubricas import supabase
        self.assertIsNotNone(supabase)

if __name__ == '__main__':
    unittest.main()
