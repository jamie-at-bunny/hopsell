export function loader() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
