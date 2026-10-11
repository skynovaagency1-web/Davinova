interface Env { DB: D1Database; DRY_RUN?: string }
interface ScheduledEvent { cron: string; scheduledTime: number }
export async function scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
  // TODO: implement FondMart order/tracking sync using the supported integration method and official account documentation, apply backoff, persist audit events, and notify customers.
  // Do not register a production cron until this function is implemented and integration-tested.
}
