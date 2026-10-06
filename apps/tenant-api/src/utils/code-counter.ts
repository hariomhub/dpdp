/**
 * Human-readable codes (AST-001, ACT-001) allocated by the database.
 *
 * The previous approach read every existing code, took the highest and added one. That is O(n) per call and two
 * concurrent requests computed the same next number - one of them then failed on the unique (tenantId, code) index
 * with a raw database error. A counter row incremented by a single INSERT ... ON CONFLICT DO UPDATE is atomic: each
 * caller gets its own block of numbers, and concurrent callers queue on the row lock.
 *
 * Pass the transaction client when the numbers are used inside a transaction: the increment then commits or rolls
 * back together with the rows that use it (so a failed attempt leaves no gap), and the row lock is held until commit.
 */

export type CodeKind = 'ASSET' | 'TASK'

const PREFIX: Record<CodeKind, string> = { ASSET: 'AST', TASK: 'ACT' }

export function formatCode(kind: CodeKind, n: number): string {
  return `${PREFIX[kind]}-${String(n).padStart(3, '0')}`
}

/** Anything with Prisma's tagged-template raw query - the client itself or an interactive-transaction client. */
export interface RawQueryClient {
  $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>
}

/**
 * Reserve `count` consecutive numbers for this organisation and return the first one.
 * (The numbers reserved are first .. first + count - 1.)
 */
export async function reserveCodeNumbers(client: RawQueryClient, tenantId: string, kind: CodeKind, count = 1): Promise<number> {
  if (!Number.isInteger(count) || count < 1) throw new Error('count must be a positive whole number')
  const rows = (await client.$queryRaw`
    INSERT INTO "code_counters" ("tenantId", "name", "value")
    VALUES (${tenantId}, ${kind}, ${count})
    ON CONFLICT ("tenantId", "name") DO UPDATE SET "value" = "code_counters"."value" + ${count}
    RETURNING "value"
  `) as Array<{ value: number }>
  return rows[0].value - count + 1
}

/** Reserve one code and return it formatted, e.g. "AST-007". */
export async function nextCode(client: RawQueryClient, tenantId: string, kind: CodeKind): Promise<string> {
  return formatCode(kind, await reserveCodeNumbers(client, tenantId, kind, 1))
}
