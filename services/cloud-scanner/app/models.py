"""Request/response contracts for the cloud-scanner service.

This service is deliberately the only place in the DPDP codebase that knows
Prowler exists — everything else (tenant-api, the frontend) speaks this
normalized JSON contract, not Prowler's own OCSF/CLI vocabulary. That
boundary is what makes Prowler swappable later without touching anything
outside this one service.
"""

from typing import Any, Literal
from pydantic import BaseModel, Field


class DiscoveryRequest(BaseModel):
    provider: str = Field(..., description="Provider key, matches CloudProviderType.key exactly (e.g. 'aws', 'azure', 'gcp')")
    credentials: dict[str, Any] = Field(..., description="Credential payload matching that provider's credentialSchema")


class DiscoveredResource(BaseModel):
    uid: str
    name: str
    region: str
    service: str
    cloud_resource_type: str
    tags: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DiscoveredFinding(BaseModel):
    check_id: str
    status: Literal["PASS", "FAIL", "MANUAL"]
    status_extended: str
    severity: str
    resource_uid: str
    remediation_text: str | None = None


class DiscoveryResponse(BaseModel):
    provider: str
    connected: bool
    error: str | None = None
    resources: list[DiscoveredResource] = Field(default_factory=list)
    findings: list[DiscoveredFinding] = Field(default_factory=list)


class ConnectionTestRequest(BaseModel):
    provider: str
    credentials: dict[str, Any]


class ConnectionTestResponse(BaseModel):
    connected: bool
    error: str | None = None


class CheckInfo(BaseModel):
    check_id: str
    title: str
    severity: str
    service: str
    resource_type: str
    description: str


class CheckCatalogResponse(BaseModel):
    provider: str
    checks: list[CheckInfo]
