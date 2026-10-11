export function onRequestGet(): Response {
  return Response.json({ status: 'ok', service: 'davinova-pages-functions', stage: 'scaffold' });
}
