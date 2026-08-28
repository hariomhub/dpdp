FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Ephemeral credential files are written here per-request and deleted
# immediately after the scan — never persisted beyond a single request's
# lifetime, never written to a volume.
RUN mkdir -p /tmp/cloud-scanner-creds

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
