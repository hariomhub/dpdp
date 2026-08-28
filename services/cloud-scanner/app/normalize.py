"""Converts Prowler's own Check_Report objects (Check_Report_AWS,
Check_Report_Azure, Check_Report_GCP, ...) into this service's normalized
DiscoveredResource / DiscoveredFinding contract.

This is the one place that translates Prowler's per-provider field names
(resource_arn vs resource_id vs project_id, region vs location, ...) into a
single consistent shape — verified against the actual Check_Report base
class and its AWS/Azure/GCP subclasses in prowler/lib/check/models.py.
"""

from typing import Any

from app.models import DiscoveredResource, DiscoveredFinding


def _resource_uid(check_report: Any) -> str:
    # AWS reports carry an ARN when the resource has one; Azure/GCP carry an id.
    arn = getattr(check_report, "resource_arn", None)
    if arn:
        return arn
    rid = getattr(check_report, "resource_id", None)
    if rid:
        return str(rid)
    return getattr(check_report, "resource_name", "") or "unknown"


def _resource_name(check_report: Any) -> str:
    # Azure/GCP reports have an explicit resource_name. AWS does not — its
    # resource_id is already "id or name" per Check_Report_AWS.__init__, and
    # the raw resource dict often has its own "name" key worth preferring.
    explicit_name = getattr(check_report, "resource_name", None)
    if explicit_name:
        return explicit_name
    raw = getattr(check_report, "resource", None) or {}
    if isinstance(raw, dict) and raw.get("name"):
        return str(raw["name"])
    return getattr(check_report, "resource_id", "") or "unnamed"


def _resource_region(check_report: Any) -> str:
    # AWS: region. Azure/GCP: location. Fall back to "global" for
    # account/org-scoped resources that have neither.
    return (
        getattr(check_report, "region", None)
        or getattr(check_report, "location", None)
        or "global"
    )


def _normalize_tags(check_report: Any) -> dict[str, str]:
    raw_tags = getattr(check_report, "resource_tags", None)
    if not raw_tags:
        return {}
    tags: dict[str, str] = {}
    for tag in raw_tags:
        if isinstance(tag, dict):
            # AWS-style {"Key": ..., "Value": ...} or a plain {k: v} pair.
            if "Key" in tag and "Value" in tag:
                tags[str(tag["Key"])] = str(tag["Value"])
            else:
                for k, v in tag.items():
                    tags[str(k)] = str(v)
    return tags


def check_report_to_resource(check_report: Any) -> DiscoveredResource:
    metadata = check_report.check_metadata
    return DiscoveredResource(
        uid=_resource_uid(check_report),
        name=_resource_name(check_report),
        region=_resource_region(check_report),
        service=metadata.ServiceName,
        cloud_resource_type=metadata.ResourceType,
        tags=_normalize_tags(check_report),
        metadata=getattr(check_report, "resource", None) or {},
    )


def check_report_to_finding(check_report: Any) -> DiscoveredFinding:
    metadata = check_report.check_metadata
    remediation_text = None
    remediation = getattr(metadata, "Remediation", None)
    if remediation is not None:
        recommendation = getattr(remediation, "Recommendation", None)
        if recommendation is not None:
            remediation_text = getattr(recommendation, "Text", None)

    status = check_report.status
    if status not in ("PASS", "FAIL", "MANUAL"):
        status = "MANUAL"

    return DiscoveredFinding(
        check_id=metadata.CheckID,
        status=status,
        status_extended=check_report.status_extended,
        severity=metadata.Severity,
        resource_uid=_resource_uid(check_report),
        remediation_text=remediation_text,
    )


def normalize_findings(check_reports: list[Any]) -> tuple[list[DiscoveredResource], list[DiscoveredFinding]]:
    """Converts a list of Check_Report objects into deduplicated resources
    plus one finding per (check, resource) pair. Multiple checks touching
    the same resource collapse to one DiscoveredResource, matching how a
    real resource inventory should look (not one row per check).
    """
    resources_by_uid: dict[str, DiscoveredResource] = {}
    findings: list[DiscoveredFinding] = []

    for report in check_reports:
        resource = check_report_to_resource(report)
        if resource.uid not in resources_by_uid:
            resources_by_uid[resource.uid] = resource
        findings.append(check_report_to_finding(report))

    return list(resources_by_uid.values()), findings
