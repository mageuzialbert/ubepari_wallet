import "server-only";

export function logEvent(name: string, data: Record<string, unknown> = {}): void {
  const payload = { event: name, ts: new Date().toISOString(), ...data };
  console.log(JSON.stringify(payload));
}
