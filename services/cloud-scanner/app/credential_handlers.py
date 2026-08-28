"""Maps a (provider_key, credentials dict) pair to the exact constructor
kwargs Prowler's own Provider classes expect.

Verified directly against the actually-installed prowler package's __init__
signatures (prowler/providers/<key>/<key>_provider.py) — not guessed. See
each function's comment for where that verification came from.
"""

import os


def aws_provider_kwargs(creds: dict) -> dict:
    """Verified against AwsProvider.__init__ in prowler/providers/aws/aws_provider.py.
    Supports both static keys and assume-role directly as constructor kwargs.
    """
    if "role_arn" in creds:
        return {
            "role_arn": creds["role_arn"],
            "external_id": creds.get("external_id"),
            "aws_access_key_id": creds.get("aws_access_key_id"),
            "aws_secret_access_key": creds.get("aws_secret_access_key"),
            "aws_session_token": creds.get("aws_session_token"),
            "session_duration": creds.get("session_duration", 3600),
            "role_session_name": creds.get("role_session_name"),
        }
    return {
        "aws_access_key_id": creds["aws_access_key_id"],
        "aws_secret_access_key": creds["aws_secret_access_key"],
        "aws_session_token": creds.get("aws_session_token"),
    }


def azure_provider_kwargs(creds: dict) -> dict:
    """Verified against AzureProvider.__init__ — its own docstring shows this
    exact static-credential usage: tenant_id + client_id + client_secret,
    with all auth-mode flags left at their False defaults.
    """
    return {
        "tenant_id": creds["tenant_id"],
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
    }


def gcp_provider_kwargs(creds: dict) -> dict:
    """Verified against GcpProvider.__init__. service_account_key is passed
    as a dict directly; the OAuth refresh-token flow is the alternative path.
    """
    if "service_account_key" in creds:
        return {"service_account_key": creds["service_account_key"]}
    return {
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": creds["refresh_token"],
    }


def googleworkspace_provider_kwargs(creds: dict) -> dict:
    """Verified against GoogleWorkspaceProvider.__init__."""
    return {
        "credentials_content": creds["credentials_content"],
        "delegated_user": creds["delegated_user"],
    }


def m365_provider_kwargs(creds: dict) -> dict:
    """M365Provider's constructor dispatch (seen in providers/common/provider.py's
    init_global_provider) only shows the sp_env_auth=True path, which reads
    AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_TENANT_ID from the
    environment — the same Entra-based env vars Azure uses. A direct
    static-kwarg path (mirroring AzureProvider's client_id/client_secret)
    was not confirmed in what I inspected, so this goes through env vars
    until that's verified against M365Provider's own docstring.
    """
    os.environ["AZURE_CLIENT_ID"] = creds["client_id"]
    os.environ["AZURE_CLIENT_SECRET"] = creds["client_secret"]
    os.environ["AZURE_TENANT_ID"] = creds["tenant_id"]
    return {"sp_env_auth": True, "tenant_id": creds["tenant_id"]}


def okta_provider_kwargs(creds: dict) -> dict:
    """Verified against the okta branch of init_global_provider: okta_org_domain,
    okta_client_id, okta_private_key are real constructor kwargs.

    KNOWN GAP: okta_org_domain (e.g. "acme.okta.com") is not currently part
    of the Okta credentialSchema seeded in CloudProviderType, nor does
    TenantCloudConnection have a separate "scope/uid" field distinct from
    credentials. Prowler's own hosted API keeps org domain in the Provider's
    `uid` field, separate from its `secret`. Until DPDP's schema grows an
    equivalent field, this raises rather than silently guessing a domain.
    """
    if "okta_org_domain" not in creds:
        raise ValueError(
            "Okta requires okta_org_domain, which is not yet part of the stored "
            "credential schema or TenantCloudConnection — this is a known gap, "
            "not a runtime bug. Add an org-domain field before enabling Okta."
        )
    return {
        "okta_org_domain": creds["okta_org_domain"],
        "okta_client_id": creds["okta_client_id"],
        "okta_private_key": creds["okta_private_key"],
        "okta_scopes": creds.get("okta_scopes"),
    }


PROVIDER_KWARGS_BUILDERS = {
    "aws": aws_provider_kwargs,
    "azure": azure_provider_kwargs,
    "gcp": gcp_provider_kwargs,
    "googleworkspace": googleworkspace_provider_kwargs,
    "m365": m365_provider_kwargs,
    "okta": okta_provider_kwargs,
}


def build_provider_kwargs(provider_key: str, credentials: dict) -> dict:
    builder = PROVIDER_KWARGS_BUILDERS.get(provider_key)
    if builder is None:
        raise ValueError(
            f"Provider '{provider_key}' is not yet implemented in this service. "
            f"Supported: {sorted(PROVIDER_KWARGS_BUILDERS)}"
        )
    return builder(credentials)
