"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Menu, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageList } from "@/components/assistant/message-list";
import { Composer } from "@/components/assistant/composer";
import { SuggestedPrompts } from "@/components/assistant/suggested-prompts";
import {
  ConversationSidebar,
  type ConversationItem,
} from "@/components/assistant/conversation-sidebar";
import { useChatStream } from "@/lib/assistant/useChatStream";
import {
  loadAnonHistory,
  saveAnonHistory,
  clearAnonHistory,
  type ChatMessage,
} from "@/lib/assistant/anonStorage";
import { useSessionUser } from "@/lib/use-session-user";
import { useDictionary, useLocale } from "@/i18n/provider";

type Props = {
  initialConversations: ConversationItem[];
};

export function AssistantShell({ initialConversations }: Props) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.assistant;
  const { user, loading: sessionLoading } = useSessionUser();
  const signedIn = !!user;

  const [conversations, setConversations] =
    React.useState<ConversationItem[]>(initialConversations);

  const chat = useChatStream([]);

  const lastSavedLengthRef = React.useRef(0);

  // Hydrate anon history once on mount when we're not signed in.
  React.useEffect(() => {
    if (sessionLoading || signedIn) return;
    const stored = loadAnonHistory(locale);
    if (stored.length > 0) {
      chat.setMessages(stored);
      lastSavedLengthRef.current = stored.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, signedIn, locale]);

  // Persist anon history on every change.
  React.useEffect(() => {
    if (signedIn) return;
    // Skip the no-op first render, but persist once we have messages or we've cleared them.
    if (
      chat.messages.length === 0 &&
      lastSavedLengthRef.current === 0
    ) {
      return;
    }
    saveAnonHistory(locale, chat.messages);
    lastSavedLengthRef.current = chat.messages.length;
  }, [chat.messages, signedIn, locale]);

  // Refresh server-side conversation list after new turns.
  const refreshConversations = React.useCallback(async () => {
    if (!signedIn) return;
    try {
      const res = await fetch("/api/assistant/conversations", {
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json()) as { conversations: ConversationItem[] };
        setConversations(body.conversations ?? []);
      }
    } catch {
      // ignore
    }
  }, [signedIn]);

  const handleSend = React.useCallback(
    (message: string) => {
      const history = signedIn
        ? undefined
        : chat.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }));
      void chat
        .send({
          message,
          conversationId: signedIn ? chat.conversationId : undefined,
          history,
        })
        .then(() => {
          if (signedIn) void refreshConversations();
        });
    },
    [chat, signedIn, refreshConversations],
  );

  const handleNew = React.useCallback(() => {
    if (signedIn) {
      chat.reset();
    } else {
      clearAnonHistory(locale);
      chat.reset();
      lastSavedLengthRef.current = 0;
    }
  }, [chat, locale, signedIn]);

  const handleSelect = React.useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/assistant/conversations/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          messages: {
            id: string;
            role: string;
            content: string;
          }[];
        };
        const loaded: ChatMessage[] = body.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        chat.setMessages(loaded);
        chat.setConversationId(id);
      } catch {
        // ignore
      }
    },
    [chat],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/assistant/conversations/${id}`, {
          method: "DELETE",
        });
      } catch {
        // ignore
      }
      if (chat.conversationId === id) {
        chat.reset();
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
    },
    [chat],
  );

  const sidebar = signedIn ? (
    <ConversationSidebar
      conversations={conversations}
      activeId={chat.conversationId}
      pending={chat.pending}
      onNew={handleNew}
      onSelect={handleSelect}
      onDelete={handleDelete}
    />
  ) : null;

  const showEmpty = chat.messages.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl flex-col px-4 pb-6 pt-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <Wand2 className="h-3 w-3" strokeWidth={2.5} />
          {t.brandBadge}
        </div>
        {signedIn ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full lg:hidden"
                aria-label={t.historyLabel}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetHeader className="p-0 pb-3">
                <SheetTitle className="text-left text-[13px] font-semibold tracking-tight">
                  {t.historyLabel}
                </SheetTitle>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
        ) : null}
      </div>

      <div className="flex flex-1 gap-6">
        {signedIn ? (
          <div className="hidden w-64 shrink-0 lg:block">{sidebar}</div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {showEmpty ? (
            <div className="flex flex-1 flex-col justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {signedIn && user?.firstName
                    ? t.emptyHeadingPersonal.replace(
                        "{name}",
                        user.firstName,
                      )
                    : t.emptyHeading}
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
                  {t.emptySubheading}
                </p>
              </div>
              <div className="mx-auto mt-10 w-full max-w-2xl">
                <SuggestedPrompts signedIn={signedIn} onPick={handleSend} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1">
              <MessageList messages={chat.messages} />
            </div>
          )}

          {!signedIn && !sessionLoading ? (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
              <p className="text-[13px] text-muted-foreground">
                {t.signInCtaForPersonal}
              </p>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full"
              >
                <Link href={`/${locale}/signin`}>
                  {t.signInAction} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="mt-4">
            <Composer pending={chat.pending} onSend={handleSend} />
            {chat.error ? (
              <p className="mt-2 text-center text-[12px] text-destructive">
                {chat.error === "rate_limited"
                  ? t.errorRateLimited
                  : t.errorGeneric}
              </p>
            ) : null}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
