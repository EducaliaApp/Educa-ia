// app/admin/rag-validation/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function RAGValidationDashboard() {
  const [report, setReport] = useState(null)
  
  useEffect(() => {
    fetch('/validation_report.json')
      .then(r => r.json())
      .then(setReport)
  }, [])
  
  if (!report) return <div>Cargando...</div>
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Validación Sistema RAG
      </h1>
      
      {/* Health Check */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Object.entries(report.sistema.checks).map(([key, data]) => (
          <div key={key} className="bg-white p-4 rounded shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{data.estado}</span>
              <h3 className="font-semibold">{key}</h3>
            </div>
            <p className="text-sm text-gray-600">{data.mensaje}</p>
          </div>
        ))}
      </div>
      
      {/* Documentos */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Documentos</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold">{report.documentos.total}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Aprobados</p>
            <p className="text-2xl font-bold text-green-600">
              {report.documentos.aprobados}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rechazados</p>
            <p className="text-2xl font-bold text-red-600">
              {report.documentos.rechazados}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Calidad Promedio</p>
            <p className="text-2xl font-bold">
              {(report.documentos.calidad_promedio * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      
      {/* Alertas */}
      {report.alertas.length > 0 && (
        <div className="bg-yellow-50 p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4 text-yellow-800">
            ⚠️ Alertas ({report.alertas.length})
          </h2>
          <ul className="space-y-2">
            {report.alertas.slice(0, 10).map((alerta, i) => (
              <li key={i} className="text-sm">
                <strong>{alerta.tipo}:</strong> {alerta.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}