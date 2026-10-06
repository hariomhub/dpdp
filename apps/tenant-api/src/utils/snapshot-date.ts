// UTC midnight of today's date IN UTC. The date comes from UTC parts so the result does not depend on the time zone
// the container happens to run in (a server in IST and one in UTC must write the same row at the same instant).
// Not `setHours(0,0,0,0)`, which sets local midnight and then shifts to the previous day once Postgres normalizes the
// `@db.Date` column to UTC.
export function todaySnapshotDate(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}
