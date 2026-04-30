import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';

import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import {
  openAssistantStream,
  type AssistantCard,
  type AssistantStreamHandle,
} from '@/lib/sse';
import { formatTzs } from '@/lib/currency';

type Role = 'ai' | 'user';

interface ProductLink {
  label: string;
  slug: string;
}

interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
  links?: ProductLink[];
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function cardToLink(card: AssistantCard): ProductLink | null {
  if (card.kind === 'product') {
    return {
      slug: card.slug,
      label: `${card.name} — ${card.brand} · ${formatTzs(card.priceTzs)}`,
    };
  }
  return null;
}

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.delay(600 - i * 150),
        ]),
      ),
    );
    Animated.parallel(anims).start();
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              {
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const router = useRouter();
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
      <View style={{ maxWidth: '82%' }}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          {isUser ? (
            <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
              {msg.text || ' '}
            </Text>
          ) : (
            <Markdown style={markdownStyles}>{msg.text || ' '}</Markdown>
          )}
          {msg.links && msg.links.length > 0 && (
            <View style={styles.linksWrap}>
              {msg.links.map((link) => (
                <TouchableOpacity
                  key={link.slug}
                  style={styles.linkChip}
                  onPress={() => router.push(`/product/${link.slug}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkChipText} numberOfLines={1}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Text
          style={[
            styles.timeText,
            isUser ? styles.timeTextUser : styles.timeTextAi,
          ]}
        >
          {msg.time}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const greeting: Message = {
    id: 'greeting',
    role: 'ai',
    text: t('chat.greeting'),
    time: nowTime(),
  };
  const suggestions = [
    t('chat.suggestion1'),
    t('chat.suggestion2'),
    t('chat.suggestion3'),
    t('chat.suggestion4'),
  ];
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const streamRef = useRef<AssistantStreamHandle | null>(null);

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  // Cleanup any open stream on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, []);

  const history = useMemo(() => {
    // Send last ~10 message pairs as conversation context. Skip the greeting.
    return messages
      .filter((m) => m.id !== 'greeting' && m.text.trim().length > 0)
      .slice(-20)
      .map((m) => ({
        role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: nowTime(),
    };
    const aiId = `ai_${Date.now()}`;
    const aiMsg: Message = {
      id: aiId,
      role: 'ai',
      text: '',
      time: nowTime(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setStreaming(true);
    scrollToEnd();

    try {
      // Close any existing stream defensively.
      streamRef.current?.close();

      const handle = await openAssistantStream(
        {
          conversationId,
          message: trimmed,
          history: history.slice(0, -1), // last message is current; backend gets it via `message`
        },
        (event) => {
          if (event.type === 'meta') {
            if (event.data.conversationId) {
              setConversationId(event.data.conversationId);
            }
          } else if (event.type === 'token') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, text: m.text + (event.data.text ?? '') } : m,
              ),
            );
            scrollToEnd();
          } else if (event.type === 'card') {
            const link = cardToLink(event.data.card);
            if (!link) return;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== aiId) return m;
                const next = m.links ? [...m.links] : [];
                if (!next.some((l) => l.slug === link.slug)) next.push(link);
                return { ...m, links: next };
              }),
            );
          } else if (event.type === 'done') {
            setStreaming(false);
            streamRef.current?.close();
            streamRef.current = null;
            scrollToEnd();
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      text: m.text || t('chat.errorStream'),
                    }
                  : m,
              ),
            );
            setStreaming(false);
            streamRef.current?.close();
            streamRef.current = null;
          }
          // tool_call / tool_result are intentionally ignored for v1 — the
          // resulting card / final text already conveys the outcome.
        },
      );
      streamRef.current = handle;
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
                ...m,
                text: t('chat.errorReach'),
              }
            : m,
        ),
      );
      setStreaming(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <MaterialCommunityIcons name="robot-outline" size={22} color={Colors.white} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{t('chat.title')}</Text>
            <Text style={styles.headerSub}>{t('chat.subtitle')}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={
            streaming && messages[messages.length - 1]?.text === '' ? (
              <TypingIndicator />
            ) : null
          }
        />

        {messages.length <= 1 && !streaming && (
          <View style={styles.suggestionsRow}>
            {suggestions.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.inputWrap}>
            {!input && (
              <Text style={styles.inputPlaceholder} pointerEvents="none">
                {t('chat.placeholder')}
              </Text>
            )}
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
              editable={!streaming}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || streaming) && styles.sendBtnDisabled,
            ]}
            onPress={() => send(input)}
            disabled={!input.trim() || streaming}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  headerName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
    lineHeight: 18,
  },
  headerSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  messageList: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 6,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 2,
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleAi: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  bubbleTextAi: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  bubbleTextUser: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.white,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 9,
    marginTop: 2,
    color: Colors.textMuted,
    fontFamily: Fonts.regular,
  },
  timeTextAi: {
    marginLeft: 4,
    textAlign: 'left',
  },
  timeTextUser: {
    textAlign: 'right',
    marginRight: 4,
  },
  typingRow: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
  },
  inputPlaceholder: {
    position: 'absolute',
    left: 16,
    right: 16,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
    paddingVertical: 10,
    maxHeight: 90,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  linksWrap: {
    marginTop: 10,
    gap: 7,
  },
  linkChip: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  linkChipText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  },
  strong: {
    fontFamily: Fonts.semiBold,
  },
  em: {
    fontStyle: 'italic',
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    marginVertical: 1,
  },
  bullet_list_icon: {
    marginLeft: 0,
    marginRight: 6,
    color: Colors.textPrimary,
  },
  ordered_list_icon: {
    marginLeft: 0,
    marginRight: 6,
    color: Colors.textPrimary,
  },
  link: {
    color: Colors.primary,
  },
  code_inline: {
    fontFamily: Fonts.regular,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  heading1: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    marginTop: 4,
    marginBottom: 2,
  },
  heading2: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    marginTop: 4,
    marginBottom: 2,
  },
  heading3: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    marginTop: 4,
    marginBottom: 2,
  },
});
