import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChatMessage, ReferencedPlace } from '@ou-campus-map/shared-types';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { LAYER_META, REPORT_CATEGORY_META, type IconName } from '@/constants/categories';
import { hasApi } from '@/constants/config';
import { colors, fonts, radius, space } from '@/constants/theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import { api, ApiError } from '@/lib/api';

interface Turn extends ChatMessage {
  id: string;
  places?: ReferencedPlace[];
  error?: boolean;
}

const SUGGESTIONS = [
  'Where can I eat right now?',
  'Nearest printer to me',
  'Accessible entrance to Bizzell',
];

const PLACE_ICON: Record<ReferencedPlace['type'], { icon: IconName; color: string }> = {
  building: { icon: LAYER_META.buildings.icon, color: LAYER_META.buildings.color },
  dining: { icon: LAYER_META.dining.icon, color: LAYER_META.dining.color },
  printer: { icon: LAYER_META.printers.icon, color: LAYER_META.printers.color },
  accessibility: { icon: LAYER_META.accessibility.icon, color: LAYER_META.accessibility.color },
  report: { icon: REPORT_CATEGORY_META.other.icon, color: colors.warning },
};

let seq = 0;
const nextId = () => `t${++seq}`;

/** Natural-language campus assistant, grounded in the app's own data (design doc §8, §9.2). */
export default function AssistantScreen() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Turn>>(null);
  const { location } = useUserLocation();

  const chat = useMutation({
    mutationFn: (message: string) =>
      api.chat({
        message,
        history: turns.filter((t) => !t.error).map(({ role, content }) => ({ role, content })),
        userLocation: location ?? undefined,
      }),
    onSuccess: (res) =>
      setTurns((t) => [
        ...t,
        { id: nextId(), role: 'assistant', content: res.reply, places: res.referencedPlaces },
      ]),
    onError: (err) => {
      const message =
        err instanceof ApiError && err.code === 'RATE_LIMITED'
          ? err.message
          : 'The campus assistant is unavailable right now. The map, reports and directions still work — try again in a bit.';
      setTurns((t) => [...t, { id: nextId(), role: 'assistant', content: message, error: true }]);
    },
  });

  const send = (text: string) => {
    const message = text.trim();
    if (!message || chat.isPending) return;
    setTurns((t) => [...t, { id: nextId(), role: 'user', content: message }]);
    setDraft('');
    chat.mutate(message);
  };

  const openPlace = (p: ReferencedPlace) =>
    router.navigate({
      pathname: '/',
      params: { focusType: p.type, focusId: p.id, t: String(Date.now()) },
    });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader
        subtitle="AI campus guide"
        right={
          turns.length > 0 ? (
            <IconButton
              icon="broom"
              accessibilityLabel="Clear conversation"
              onPress={() => setTurns([])}
            />
          ) : undefined
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[styles.list, turns.length === 0 && { flex: 1 }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons name="creation" size={28} color={colors.cream} />
              </View>
              <AppText variant="headlineSm" style={{ textAlign: 'center' }}>
                Ask anything about campus
              </AppText>
              <AppText color={colors.textSecondary} style={{ textAlign: 'center' }}>
                I answer from the map’s own data — buildings, dining, printers, accessibility and
                live reports. If I don’t know, I’ll say so.
              </AppText>
              {!hasApi && (
                <AppText variant="bodySm" color={colors.warning} style={{ textAlign: 'center' }}>
                  The assistant needs the Node API (EXPO_PUBLIC_API_BASE_URL) and AI service
                  running.
                </AppText>
              )}
            </View>
          }
          renderItem={({ item }) => <Bubble turn={item} onPlace={openPlace} />}
          ListFooterComponent={
            chat.isPending ? (
              <View
                style={[styles.bubble, styles.assistant, styles.typing]}
                accessibilityLabel="Assistant is typing"
              >
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <AppText color={colors.textSecondary}>Thinking…</AppText>
              </View>
            ) : null
          }
        />

        <View style={styles.composer}>
          {turns.length === 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestions}
              keyboardShouldPersistTaps="handled"
            >
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={styles.suggestion}
                  onPress={() => send(s)}
                  accessibilityRole="button"
                >
                  <AppText variant="labelLg">{s}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about campus…"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              multiline
              maxLength={1000}
              accessibilityLabel="Message the campus assistant"
              onSubmitEditing={() => send(draft)}
            />
            <IconButton
              icon="arrow-up"
              accessibilityLabel="Send message"
              onPress={() => send(draft)}
              background={draft.trim() ? colors.crimsonBright : colors.surfaceElevated}
              color={draft.trim() ? colors.white : colors.textDisabled}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ turn, onPlace }: { turn: Turn; onPlace: (p: ReferencedPlace) => void }) {
  const mine = turn.role === 'user';
  return (
    <View style={{ gap: space.xs, alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={[
          styles.bubble,
          mine ? styles.user : styles.assistant,
          turn.error && styles.errorBubble,
        ]}
      >
        {turn.error && (
          <MaterialCommunityIcons name="cloud-off-outline" size={18} color={colors.error} />
        )}
        <AppText variant="bodyLg" style={{ flexShrink: 1 }}>
          {turn.content}
        </AppText>
      </View>
      {turn.places && turn.places.length > 0 && (
        <View style={styles.places}>
          {turn.places.map((p) => (
            <Pressable
              key={`${p.type}:${p.id}`}
              style={styles.place}
              onPress={() => onPlace(p)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${p.name} on the map`}
            >
              <MaterialCommunityIcons
                name={PLACE_ICON[p.type].icon}
                size={16}
                color={PLACE_ICON[p.type].color}
              />
              <AppText variant="labelMd">{p.name}</AppText>
              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: space.lg, gap: space.md },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.lg,
    padding: space.md,
    flexDirection: 'row',
    gap: space.sm,
  },
  user: { backgroundColor: colors.crimson, borderBottomRightRadius: radius.sm },
  assistant: { backgroundColor: colors.surfaceElevated, borderBottomLeftRadius: radius.sm },
  errorBubble: { borderColor: colors.error, borderWidth: 1 },
  typing: { alignItems: 'center', marginTop: space.md },
  places: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, maxWidth: '92%' },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  composer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.background,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  suggestions: { paddingHorizontal: space.lg, gap: space.sm },
  suggestion: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingTop: 13,
    paddingBottom: 13,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
});
