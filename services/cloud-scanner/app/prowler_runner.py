"""Orchestrates actual Prowler invocations: connection testing and
resource/finding discovery.

This is the only module in the service that imports Prowler's internal
Provider classes directly — everything upstream of this (main.py, and
everything outside this service in the rest of DPDP) only ever sees the
normalized contract in app/models.py. That boundary is what keeps Prowler
swappable later without touching anything else.

The call sequence for run_discovery is modeled directly on prowler's own
__main__.py (the CLI entrypoint) — instantiate provider, load check
metadata, resolve checks to execute, build provider-specific output
options, call execute_checks — using the actual verified signatures from
the installed package, not guessed ones.

Known residual uncertainty, flagged rather than papered over: the exact
shape execute_checks expects for `custom_checks_metadata` when there are no
custom checks, and ProwlerArgumentParser's exact parsing behavior for a
hand-built argv list, haven't been exercised end-to-end against a real
cloud account yet (no live credentials were available while writing this).
Both need a real-credential test pass before this is trusted in production.
"""

import importlib
import shutil
import tempfile
import threading

from prowler.lib.check.check import execute_checks
from prowler.lib.check.checks_loader import load_checks_to_execute
from prowler.lib.check.models import CheckMetadata
from prowler.lib.cli.parser import ProwlerArgumentParser
from prowler.providers.common.provider import Provider

from app.credential_handlers import build_provider_kwargs
from app.models import CheckCatalogResponse, CheckInfo, ConnectionTestResponse, DiscoveryResponse
from app.normalize import normalize_findings

# Verified against the OutputOptions imports/dispatch in prowler/__main__.py.
# Only the providers this service currently implements credential mapping
# for (see credential_handlers.py) are listed — adding a provider means
# adding it in both places.
_OUTPUT_OPTIONS_CLASS_BY_PROVIDER = {
    "aws": ("prowler.providers.aws.models", "AWSOutputOptions"),
    "azure": ("prowler.providers.azure.models", "AzureOutputOptions"),
    "gcp": ("prowler.providers.gcp.models", "GCPOutputOptions"),
    "m365": ("prowler.providers.m365.models", "M365OutputOptions"),
    "googleworkspace": (
        "prowler.providers.googleworkspace.models",
        "GoogleWorkspaceOutputOptions",
    ),
    "okta": ("prowler.providers.okta.models", "OktaOutputOptions"),
}


def _get_provider_class(provider_key: str):
    try:
        return Provider.get_class(provider_key)
    except ImportError as e:
        raise ValueError(f"Unknown or unavailable provider '{provider_key}': {e}")


def test_connection(provider_key: str, credentials: dict) -> ConnectionTestResponse:
    provider_class = _get_provider_class(provider_key)
    kwargs = build_provider_kwargs(provider_key, credentials)
    # Every test_connection signature checked (AWS, Azure, GCP) accepts the
    # same credential kwarg names as its constructor, plus this flag — so
    # the constructor kwargs are safe to reuse here unmodified.
    kwargs["raise_on_exception"] = False

    connection = provider_class.test_connection(**kwargs)
    return ConnectionTestResponse(
        connected=connection.is_connected,
        error=str(connection.error) if connection.error else None,
    )


def list_checks(provider_key: str) -> CheckCatalogResponse:
    """Returns Prowler's real check catalog for a provider — used by Super
    Admin to browse real checks when building a Control<->Check mapping,
    rather than typing a CheckID blind. Read-only, no credentials involved:
    CheckMetadata.get_bulk() reads check metadata.json files off disk, it
    doesn't touch any cloud account.
    """
    bulk_checks_metadata = CheckMetadata.get_bulk(provider_key)
    checks = [
        CheckInfo(
            check_id=metadata.CheckID,
            title=metadata.CheckTitle,
            severity=metadata.Severity,
            service=metadata.ServiceName,
            resource_type=metadata.ResourceType,
            description=metadata.Description,
        )
        for metadata in bulk_checks_metadata.values()
    ]
    return CheckCatalogResponse(provider=provider_key, checks=checks)


# Prowler's library API was built for one-process-per-scan CLI use: both
# Provider.set_global_provider() and alive_progress's stdout hook are
# process-global singletons, not per-call state. Two discovery calls running
# concurrently in this service (FastAPI runs sync endpoints in a thread
# pool) clobber each other's global provider and crash the second one with
# alive_progress's own "Nested use of alive_progress is not yet supported"
# — reproduced directly from two real scans overlapping. Serializing here
# makes concurrent scan requests queue instead of racing.
_discovery_lock = threading.Lock()


def _build_output_options(provider_key: str, args, bulk_checks_metadata, identity):
    module_name, class_name = _OUTPUT_OPTIONS_CLASS_BY_PROVIDER[provider_key]
    module = importlib.import_module(module_name)
    output_options_class = getattr(module, class_name)
    return output_options_class(args, bulk_checks_metadata, identity)


def run_discovery(provider_key: str, credentials: dict) -> DiscoveryResponse:
    if provider_key not in _OUTPUT_OPTIONS_CLASS_BY_PROVIDER:
        raise ValueError(
            f"Discovery not yet implemented for provider '{provider_key}'. "
            f"Supported: {sorted(_OUTPUT_OPTIONS_CLASS_BY_PROVIDER)}"
        )

    # Fail fast on bad credentials with a clear message, rather than letting
    # execute_checks fail deep inside a check with a far less useful error.
    connection_result = test_connection(provider_key, credentials)
    if not connection_result.connected:
        return DiscoveryResponse(
            provider=provider_key, connected=False, error=connection_result.error
        )

    provider_class = _get_provider_class(provider_key)
    kwargs = build_provider_kwargs(provider_key, credentials)

    # Ephemeral output directory for this one request only — Prowler's
    # output-writing side effects are directed here and deleted immediately
    # after, regardless of the JSON-OCSF file it also happens to write;
    # only the in-memory check_reports list this function returns is used.
    tmp_dir = tempfile.mkdtemp(prefix="prowler-scan-")
    try:
        with _discovery_lock:
            provider_instance = provider_class(**kwargs)
            Provider.set_global_provider(provider_instance)

            args = ProwlerArgumentParser().parse(
                [provider_key, "-M", "json-ocsf", "--output-directory", tmp_dir]
            )

            bulk_checks_metadata = CheckMetadata.get_bulk(provider_key)
            checks_to_execute = sorted(
                load_checks_to_execute(
                    provider=provider_key, bulk_checks_metadata=bulk_checks_metadata
                )
            )

            output_options = _build_output_options(
                provider_key, args, bulk_checks_metadata, provider_instance.identity
            )

            check_reports = execute_checks(
                checks_to_execute,
                provider_instance,
                {},
                args.config_file,
                output_options,
            )

        resources, findings = normalize_findings(check_reports)

        return DiscoveryResponse(
            provider=provider_key,
            connected=True,
            resources=resources,
            findings=findings,
        )
    except Exception as e:
        # test_connection() above only validates that the credentials
        # authenticate — it does not guarantee the account can actually be
        # scanned (e.g. Prowler's own AzureProvider constructor separately
        # requires at least one visible subscription, and raises its own
        # exception type if there are none, distinct from an auth failure).
        # Without this, any such error propagates as an opaque 500 with no
        # detail — caught directly from a real run, not a hypothetical.
        return DiscoveryResponse(
            provider=provider_key, connected=False, error=f"{type(e).__name__}: {e}"
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
