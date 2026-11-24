export async function onRequestGet(): Promise<Response> {
  return Response.json({
    ok: true,
    runtime: 'cloudflare-pages',
    environment: 'production',
  });
}
