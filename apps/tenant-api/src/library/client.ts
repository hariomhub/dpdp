import { getSuperAdminPrisma } from '@dpdp/database'

/**
 * The ONE place the tenant plane reads Library content (regulations, controls, products, sample evidence, LMS content,
 * cloud catalogs) from.
 *
 * Today this is the Super Admin database. The target architecture (docs/architecture/01-architecture.md) replaces it with
 * a local `catalog` replica filled from signed Library Releases, so that an instance never connects to the vendor's
 * database. Everything that reads Library content goes through `src/library/*` precisely so that switch is made here,
 * in one file, without touching any caller.
 *
 * Nothing outside `src/library/` may import `getSuperAdminPrisma`.
 */
export const lib = () => getSuperAdminPrisma()
