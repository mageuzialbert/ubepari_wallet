import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Send, Sparkles } from "lucide-react-native";

import { AssistantCard } from "@/components/AssistantCard";
import { openAssistantStream, type AssistantEvent, type AssistantStreamHandle } from "@/lib/sse";
import { haptic } from "@/lib/haptics";
import { brand } from "@/theme/tokens";
import type { AssistantCard as CardType } from "@/types/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: CardType[];
};

const SUGGESTIONS = [
  "What laptops do you have under TZS 2M?",
  "Help me pick a gaming PC",
  "Show my goals",
  "How does the savings plan work?",
];

export default function Assistant() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const streamRef = useRef<AssistantStreamHandle | null>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    haptic.light();

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: "", cards: [] };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    scrollToEnd();

    streamRef.current?.close();
    const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

    streamRef.current = await openAssistantStream(
      {
        conversationId: conversationIdRef.current,
        message: text,
        history,
      },
      (ev: AssistantEvent) => {
        if (ev.type === "meta") {
          conversationIdRef.current = ev.data.conversationId ?? conversationIdRef.current;
          return;
        }
        if (ev.type === "token") {
          setMessages((prev) => {
            const next = prev.slice();
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + ev.data.text };
            }
            return next;
          });
        } else if (ev.type === "card") {
          haptic.selection();
          setMessages((prev) => {
            const next = prev.slice();
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                cards: [...(last.cards ?? []), ev.data.card],
              };
            }
            return next;
          });
        } else if (ev.type === "done" || ev.type === "error") {
          setStreaming(false);
          if (ev.type === "error") {
            haptic.error();
            setMessages((prev) => {
              const next = prev.slice();
              const last = next[next.length - 1];
              if (last?.role === "assistant" && !last.content) {
                next[next.length - 1] = {
                  ...last,
                  content:
                    ev.data.reason === "rate_limited"
                      ? t("assistant.rateLimit", "Too many questions. Try again in a bit.")
                      : t("assistant.errorGeneric", "Something went wrong. Try again."),
                };
              }
              return next;
            });
          }
          streamRef.current?.close();
          streamRef.current = null;
        }
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center gap-2 px-5 pb-3 pt-2">
          <Sparkles size={18} color={brand.blueHex} />
          <Text
            className="text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 20 }}
          >
            {t("nav.aiTips", "AI Tech Tips")}
          </Text>
        </View>

        {messages.length === 0 ? (
          <View className="flex-1 justify-end px-5 pb-4">
            <Text className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              {t("assistant.tryAsking", "Try asking")}
            </Text>
            <View className="gap-2">
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => sendMessage(s)}
                  className="rounded-2xl border border-border bg-card p-4 active:opacity-90"
                >
                  <Text className="text-sm text-foreground">{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            renderItem={({ item }) => <Bubble message={item} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View className="flex-row items-end gap-2 border-t border-border bg-background p-3">
          <View className="flex-1 rounded-2xl border border-border bg-muted px-4 py-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t("assistant.placeholder", "Ask anything about PCs or savings")}
              placeholderTextColor="#8E8E93"
              multiline
              className="max-h-32 text-base text-foreground"
              style={{ minHeight: 24 }}
            />
          </View>
          <Pressable
            disabled={streaming || !input.trim()}
            onPress={() => sendMessage(input)}
            className={[
              "h-11 w-11 items-center justify-center rounded-full",
              streaming || !input.trim() ? "bg-muted" : "bg-primary",
            ].join(" ")}
          >
            {streaming ? (
              <ActivityIndicator color="#8E8E93" />
            ) : (
              <Send size={18} color={input.trim() ? "white" : "#8E8E93"} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View
      className={[
        "mb-3 max-w-[86%] rounded-3xl px-4 py-3",
        isUser ? "self-end bg-primary" : "self-start bg-muted",
      ].join(" ")}
    >
      {message.content ? (
        <Text
          className={isUser ? "text-primary-foreground" : "text-foreground"}
          style={{ fontSize: 15, lineHeight: 22 }}
        >
          {message.content}
        </Text>
      ) : !isUser ? (
        <View className="flex-row gap-1">
          <Dot /><Dot delay={120} /><Dot delay={240} />
        </View>
      ) : null}
      {message.cards && message.cards.length > 0 ? (
        <View className="mt-1">
          {message.cards.map((c, i) => <AssistantCard key={i} card={c} />)}
        </View>
      ) : null}
    </View>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <View
      className="h-2 w-2 rounded-full bg-muted-foreground opacity-60"
      style={{ transform: [{ translateY: 0 }] }}
    />
  );
}
