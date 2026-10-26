import { cachedPrintAreas, customSetupProblem, type PrintifyEnv } from '../../../server/printify';

/** Tells the design maker whether orders are open, and Printify's exact print-area shapes once known. */
export async function onRequestGet({ env }: { env: PrintifyEnv }): Promise<Response> {
  const problem = customSetupProblem(env);
  return Response.json(
    { ready: !problem, printAreas: env.DB ? await cachedPrintAreas(env.DB) : {} },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
