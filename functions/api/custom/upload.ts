import { customProduct } from '../../../src/lib/customDesign';
import { customSetupProblem, type PrintifyEnv } from '../../../server/printify';

const MAX_PRINT_BYTES = 25 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 3 * 1024 * 1024;
const MAX_PER_HOUR = 15;

function reply(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Width and height from a PNG header, or null if the bytes are not a PNG. */
function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((byte, index) => bytes[index] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Stores a finished design (print PNG + preview JPEG) in R2 and returns its id for checkout. */
export async function onRequestPost({ request, env }: { request: Request; env: PrintifyEnv }): Promise<Response> {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return reply({ error: 'Cross-origin uploads are not allowed.' }, 403);
  const problem = customSetupProblem(env);
  if (problem || !env.CUSTOM_DESIGNS) return reply({ error: 'Custom orders open very soon. Please check back shortly.' }, 503);

  const ipHash = (await sha256('custom:' + (request.headers.get('CF-Connecting-IP') || 'unknown'))).slice(0, 32);
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM custom_designs WHERE ip_hash=? AND created_at>datetime('now','-1 hour')").bind(ipHash).first<{ n: number }>();
  if ((recent?.n ?? 0) >= MAX_PER_HOUR) return reply({ error: 'Too many designs saved in a short time. Please try again in an hour.' }, 429);

  let form: FormData;
  try { form = await request.formData(); } catch { return reply({ error: 'The design could not be read. Please try again.' }, 400); }
  const product = customProduct(form.get('product'));
  const color = String(form.get('color') || '');
  const print = form.get('print');
  const preview = form.get('preview');
  if (!product || !product.colors.some((item) => item.name === color)) return reply({ error: 'Pick a product and colour first.' }, 400);
  if (form.get('rights') !== 'yes') return reply({ error: 'Please confirm you have the right to print this design.' }, 400);
  if (!(print instanceof File) || !(preview instanceof File)) return reply({ error: 'The design files are missing.' }, 400);
  if (print.size > MAX_PRINT_BYTES || preview.size > MAX_PREVIEW_BYTES) return reply({ error: 'This design is too large. Try a smaller picture.' }, 413);

  const printBytes = new Uint8Array(await print.arrayBuffer());
  const size = pngSize(printBytes);
  if (!size || size.width < 300 || size.height < 300 || size.width > 8000 || size.height > 8000) return reply({ error: 'The print file is not a valid image.' }, 400);
  const previewBytes = new Uint8Array(await preview.arrayBuffer());
  if (previewBytes[0] !== 0xff || previewBytes[1] !== 0xd8) return reply({ error: 'The preview is not a valid image.' }, 400);

  const id = crypto.randomUUID();
  const printKey = `designs/${id}/print.png`;
  const previewKey = `designs/${id}/preview.jpg`;
  await env.CUSTOM_DESIGNS.put(printKey, printBytes, { httpMetadata: { contentType: 'image/png' } });
  await env.CUSTOM_DESIGNS.put(previewKey, previewBytes, { httpMetadata: { contentType: 'image/jpeg' } });
  await env.DB.prepare('INSERT INTO custom_designs (id,product_key,color,print_key,preview_key,width,height,ip_hash) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, product.key, color, printKey, previewKey, size.width, size.height, ipHash).run();
  return reply({ designId: id });
}
