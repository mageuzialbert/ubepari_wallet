import { apiFetch } from "@/lib/api/client";
import { makeApiError } from "@/lib/errors";

export type KycInput = {
  nida: string;
  firstName: string;
  lastName: string;
  workplace?: string;
  document: {
    uri: string;
    name: string;
    mimeType: string;
  };
};

export async function submitKyc(input: KycInput): Promise<void> {
  const form = new FormData();
  form.append("nida", input.nida);
  form.append("firstName", input.firstName);
  form.append("lastName", input.lastName);
  if (input.workplace) form.append("workplace", input.workplace);
  // RN FormData file shape — NOT a real Blob.
  form.append("doc", {
    uri: input.document.uri,
    name: input.document.name,
    type: input.document.mimeType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const res = await apiFetch("/api/kyc/submit", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore non-JSON errors
    }
    throw makeApiError(res.status, body);
  }
}
