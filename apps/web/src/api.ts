import { streamEventSchema, type StreamEvent } from "@pulseops/contracts";
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
export const session = {
  get token() {
    return localStorage.getItem("pulseops_token");
  },
  set(token: string) {
    localStorage.setItem("pulseops_token", token);
  },
  clear() {
    localStorage.removeItem("pulseops_token");
  },
};
export async function api<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (session.token) headers.set("authorization", `Bearer ${session.token}`);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export async function investigate(
  id: string,
  question: string,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
) {
  const response = await fetch(
    `${API_URL}/api/v1/incidents/${id}/investigate`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ question }),
      signal,
    },
  );
  if (!response.ok || !response.body)
    throw new Error("Não foi possível iniciar a investigação.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block.split("\n").find((line) => line.startsWith("data: "));
      if (data) {
        const parsed = streamEventSchema.safeParse(JSON.parse(data.slice(6)));
        if (parsed.success) onEvent(parsed.data);
      }
    }
  }
}
