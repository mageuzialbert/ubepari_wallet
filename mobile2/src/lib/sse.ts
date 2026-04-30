import EventSource from 'react-native-sse';

import { apiBaseUrl } from '@/lib/api/client';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentLocale } from '@/lib/locale';

export type AssistantCard =
  | { kind: 'product'; slug: string; name: string; brand: string; tagline: string; priceTzs: number; image: string }
  | { kind: 'goal'; id: string; reference: string; productName: string; status: string; contributedTzs: number; priceTzs: number; monthlyTargetTzs: number; nextReminderDate: string | null }
  | { kind: 'goalPlan'; priceTzs: number; term: number; monthlyTarget: number }
  | { kind: 'contribution'; goalId: string; amountTzs: number; status: string; createdAt: string };

export type AssistantEvent =
  | { type: 'meta'; data: { conversationId: string | null; authState: string } }
  | { type: 'token'; data: { text: string } }
  | { type: 'tool_call'; data: { id: string; name: string } }
  | { type: 'card'; data: { card: AssistantCard } }
  | { type: 'tool_result'; data: { id: string; name: string } }
  | { type: 'done'; data: { finishReason?: string } }
  | { type: 'error'; data: { reason: string } };

export type AssistantStreamHandle = {
  close: () => void;
};

type Body = {
  conversationId?: string | null;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
};

const EVENTS = [
  'meta',
  'token',
  'tool_call',
  'card',
  'tool_result',
  'done',
  'error',
] as const;

export async function openAssistantStream(
  body: Body,
  onEvent: (e: AssistantEvent) => void,
): Promise<AssistantStreamHandle> {
  const session = await tokenStorage.read();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'X-Locale': currentLocale(),
  };
  if (session && !tokenStorage.isExpired(session)) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const es = new EventSource(`${apiBaseUrl()}/api/assistant/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    pollingInterval: 0,
  });

  for (const name of EVENTS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    es.addEventListener(name as any, (ev: any) => {
      try {
        const parsed = ev?.data ? JSON.parse(ev.data) : {};
        onEvent({ type: name, data: parsed } as AssistantEvent);
      } catch {
        // ignore malformed events
      }
    });
  }

  return {
    close: () => es.close(),
  };
}
