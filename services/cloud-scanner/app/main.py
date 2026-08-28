import sys

# Prowler's console output (colored text, and alive_progress's "blocks" bar
# style) writes Unicode block-drawing characters. When stdout isn't attached
# to a real terminal (e.g. redirected to a log file, as happens whenever this
# service runs as a managed process on Windows), Python falls back to the
# OS locale codepage (cp1252/"charmap") instead of UTF-8, and that codepage
# can't represent those characters — crashing a real, otherwise-successful
# scan partway through with UnicodeEncodeError. Caught from an actual run.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException

from app.models import (
    DiscoveryRequest, DiscoveryResponse,
    ConnectionTestRequest, ConnectionTestResponse,
    CheckCatalogResponse,
)
from app.prowler_runner import run_discovery, test_connection, list_checks

app = FastAPI(title="DPDP Cloud Scanner", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "cloud-scanner"}


@app.post("/connection-test", response_model=ConnectionTestResponse)
def connection_test(req: ConnectionTestRequest):
    try:
        return test_connection(req.provider, req.credentials)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/discover", response_model=DiscoveryResponse)
def discover(req: DiscoveryRequest):
    try:
        return run_discovery(req.provider, req.credentials)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/checks", response_model=CheckCatalogResponse)
def checks(provider: str):
    try:
        return list_checks(provider)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not load checks for provider '{provider}': {e}")
