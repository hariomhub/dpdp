/**
 * Which roles may do what, in one place, so a permission change is a one-line edit and is visible in review.
 * (Per-task and per-file rules live next to the code that enforces them; these are the coarse, module-level groups.)
 */

/** Change organisation details, classification, structure, and invite people. */
export const ORG_SETUP_ROLES = ['CEO', 'CO'] as const

/**
 * Connect cloud environments, run discovery scans, and review discovered assets.
 * The product spec names IT Admin and CO for these steps; CEO keeps override access, as elsewhere in the portal.
 */
export const CLOUD_OPERATOR_ROLES = ['CEO', 'CO', 'IT_ADMIN'] as const

/**
 * Read the tenant audit log. Audit information is restricted to those with a job-related need (NIST SP 800-53 AU-9,
 * PCI DSS 10.3.1): the people who run compliance, and the internal auditor, whose job is reviewing activity.
 * External auditors get scoped access through reports, not the raw log.
 */
export const AUDIT_LOG_VIEWER_ROLES = ['CEO', 'CO', 'INTERNAL_AUDITOR'] as const
