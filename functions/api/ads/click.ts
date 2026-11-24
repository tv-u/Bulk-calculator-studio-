export async function onRequestPost(): Promise<Response> {
  return Response.json({ ok: true });
}
