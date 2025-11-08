# Archivo: /etc/cron.d/pipeline-document-monitor

# Ejecutar diariamente a las 2 AM
0 2 * * * cd /opt/portafolio-docente/scripts/pipeline-document-monitor && \
          /opt/portafolio-docente/venv/bin/python 00-monitor.py --auto \
          >> /var/log/pipeline-document-monitor.log 2>&1

# Verificar cada hora si hay documentos pendientes de procesar (opcional)
0 * * * * cd /opt/portafolio-docente/scripts/pipeline-document-monitor && \
          /opt/portafolio-docente/venv/bin/python check-pending.py \
          >> /var/log/document-check.log 2>&1
```

