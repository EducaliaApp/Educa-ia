# Archivo: /etc/cron.d/document-monitor

# Ejecutar diariamente a las 2 AM
0 2 * * * cd /opt/portafolio-docente/scripts/document-monitor && \
          /opt/portafolio-docente/venv/bin/python monitor.py --auto \
          >> /var/log/document-monitor.log 2>&1

# Verificar cada hora si hay documentos pendientes de procesar (opcional)
0 * * * * cd /opt/portafolio-docente/scripts/document-monitor && \
          /opt/portafolio-docente/venv/bin/python check-pending.py \
          >> /var/log/document-check.log 2>&1
```

