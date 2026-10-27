import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goalsApi, usersApi } from '@/api/endpoints';
import type { Goal, GoalCreateRequest, GoalType } from '@/api/types';
import { useSession } from '@/auth/session';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { colors, radius, spacing, type } from '@/theme';
import { formatDate, formatDuration, parseDuration, toISODate } from '@/utils/format';

type Step = 'type' | 'detail' | 'schedule' | 'done';

const TYPES: { value: GoalType; icon: ComponentProps<typeof Ionicons>['name']; title: string; desc: string }[] = [
  {
    value: 'HEALTH',
    icon: 'heart-outline',
    title: '건강하게 꾸준히',
    desc: '직장인·취미 러너. 다음 날 지치지 않을 만큼만 달리며 건강을 챙겨요.',
  },
  {
    value: 'IMPROVE',
    icon: 'trending-up-outline',
    title: '기록 단축',
    desc: '대회는 없지만 5K·10K 기록을 줄이고 싶어요.',
  },
  {
    value: 'RACE',
    icon: 'trophy-outline',
    title: '대회 준비',
    desc: '대회 날짜에 맞춰 최고 기록을 노려요. 강도 높은 훈련도 포함돼요.',
  },
];

const DISTANCES = [
  { km: 5, label: '5K' },
  { km: 10, label: '10K' },
  { km: 21.0975, label: '하프' },
  { km: 42.195, label: '풀' },
];

const WEEKLY_DAYS = [2, 3, 4, 5, 6];
const MIN_RACE_DAYS = 14; // 서버 규칙: 대회는 오늘부터 2주 이후

// 시각을 버리고 날짜만 더함 (자정 기준)
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const weeksUntil = (d: Date) => Math.floor(Math.round((d.getTime() - addDays(new Date(), 0).getTime()) / 86_400_000) / 7);

// S1 목표 설정: 목적 → (기록·대회만) 종목·날짜 → 주 몇 회 → 완료. 나머지는 기본값 (설계서 2절)
export default function GoalSetupScreen() {
  const { markGoalCreated } = useSession();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const minRaceDate = addDays(today, MIN_RACE_DAYS);

  const [step, setStep] = useState<Step>('type');
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [distanceKm, setDistanceKm] = useState(10);
  const [raceDate, setRaceDate] = useState(addDays(today, 12 * 7));
  const [weeklyDays, setWeeklyDays] = useState(3);
  const [recent5k, setRecent5k] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Goal | null>(null);

  const recent5kSec = recent5k.trim() === '' ? undefined : parseDuration(recent5k);
  const recent5kInvalid = recent5kSec === null || (recent5kSec !== undefined && (recent5kSec < 12 * 60 || recent5kSec > 90 * 60));
  const steps: Step[] = goalType === 'HEALTH' ? ['type', 'schedule'] : ['type', 'detail', 'schedule'];
  const stepIndex = steps.indexOf(step);

  const next = () => setStep(steps[stepIndex + 1]);
  const back = () => {
    setError(null);
    setStep(steps[stepIndex - 1]);
  };

  const moveRaceDate = (days: number) => {
    const moved = addDays(raceDate, days);
    setRaceDate(moved < minRaceDate ? minRaceDate : moved);
  };

  const submit = async () => {
    if (!goalType || recent5kInvalid) return;
    setError(null);
    setSubmitting(true);
    const extra = recent5kSec ? { recent_5k_sec: recent5kSec } : {};
    const body: GoalCreateRequest =
      goalType === 'HEALTH'
        ? { type: 'HEALTH', ...extra }
        : goalType === 'IMPROVE'
          ? { type: 'IMPROVE', distance_km: distanceKm, ...extra }
          : { type: 'RACE', distance_km: distanceKm, target_date: toISODate(raceDate), ...extra };
    try {
      await usersApi.updateProfile({ weekly_days: weeklyDays });
      setCreated(await goalsApi.create(body));
      setStep('done');
    } catch {
      setError('저장하지 못했습니다. 서버 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {step !== 'done' ? (
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View key={s} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
            ))}
          </View>
        ) : null}

        {step === 'type' ? (
          <>
            <Text style={styles.title}>어떤 러너인가요?</Text>
            <Text style={styles.subtitle}>목적에 따라 훈련 강도와 계획이 달라져요. 나중에 바꿀 수 있어요.</Text>
            <View style={styles.options}>
              {TYPES.map((t) => {
                const selected = goalType === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => setGoalType(t.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                      <Ionicons name={t.icon} size={22} color={selected ? '#fff' : colors.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{t.title}</Text>
                      <Text style={styles.optionDesc}>{t.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Button style={styles.cta} label="다음" onPress={next} disabled={!goalType} />
          </>
        ) : null}

        {step === 'detail' ? (
          <>
            <Text style={styles.title}>{goalType === 'RACE' ? '어떤 대회인가요?' : '어떤 기록을 줄일까요?'}</Text>
            <Text style={styles.label}>종목</Text>
            <View style={styles.chips}>
              {DISTANCES.map((d) => (
                <Chip key={d.km} label={d.label} selected={distanceKm === d.km} onPress={() => setDistanceKm(d.km)} />
              ))}
            </View>

            {goalType === 'RACE' ? (
              <>
                <Text style={styles.label}>대회 날짜</Text>
                <Card style={styles.dateCard}>
                  <Text style={styles.dateText}>{formatDate(toISODate(raceDate))}</Text>
                  <Text style={styles.dateHint}>{weeksUntil(raceDate)}주 남음</Text>
                  <View style={styles.dateButtons}>
                    <Chip label="‹ 1주" onPress={() => moveRaceDate(-7)} />
                    <Chip label="‹ 1일" onPress={() => moveRaceDate(-1)} />
                    <Chip label="1일 ›" onPress={() => moveRaceDate(1)} />
                    <Chip label="1주 ›" onPress={() => moveRaceDate(7)} />
                  </View>
                </Card>
              </>
            ) : null}

            <Text style={styles.note}>목표 기록은 현재 실력을 바탕으로 자동으로 정해요.</Text>
            <View style={styles.nav}>
              <Button style={styles.navButton} variant="secondary" label="이전" onPress={back} />
              <Button style={styles.navButton} label="다음" onPress={next} />
            </View>
          </>
        ) : null}

        {step === 'schedule' ? (
          <>
            <Text style={styles.title}>일주일에 몇 번 달릴 수 있나요?</Text>
            <View style={styles.chips}>
              {WEEKLY_DAYS.map((n) => (
                <Chip key={n} label={`${n}회`} selected={weeklyDays === n} onPress={() => setWeeklyDays(n)} />
              ))}
            </View>

            <Text style={styles.label}>최근 5K 기록 (선택)</Text>
            <TextField
              icon="stopwatch-outline"
              placeholder="예: 28:30 · 모르면 비워 두세요"
              keyboardType="numbers-and-punctuation"
              value={recent5k}
              onChangeText={setRecent5k}
            />
            {recent5kInvalid ? <Text style={styles.fieldError}>12:00 ~ 90:00 사이로 분:초 형식으로 적어 주세요.</Text> : null}

            {error ? (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.nav}>
              <Button style={styles.navButton} variant="secondary" label="이전" onPress={back} disabled={submitting} />
              <Button
                style={styles.navButton}
                label="시작하기"
                onPress={submit}
                loading={submitting}
                disabled={recent5kInvalid}
              />
            </View>
          </>
        ) : null}

        {step === 'done' && created ? (
          <>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>준비됐어요!</Text>
            <Card style={styles.summary}>
              <SummaryRow label="목적" value={TYPES.find((t) => t.value === created.type)?.title ?? ''} />
              <SummaryRow label="주간 횟수" value={`주 ${weeklyDays}회`} />
              {created.type === 'HEALTH' ? (
                <SummaryRow label="주간 목표 시간" value={`${created.weekly_minutes_target}분`} />
              ) : (
                <>
                  <SummaryRow
                    label="종목"
                    value={DISTANCES.find((d) => d.km === created.distance_km)?.label ?? `${created.distance_km}km`}
                  />
                  {created.target_date ? <SummaryRow label="대회 날짜" value={formatDate(created.target_date)} /> : null}
                  {created.baseline_time_sec ? (
                    <SummaryRow label="현재 예상 기록" value={formatDuration(created.baseline_time_sec * 1000)} />
                  ) : null}
                  {created.target_time_sec ? (
                    <SummaryRow label="목표 기록" value={formatDuration(created.target_time_sec * 1000)} strong />
                  ) : null}
                </>
              )}
            </Card>
            <Text style={styles.note}>
              {created.type === 'HEALTH'
                ? '편한 강도로 꾸준히 달리는 계획을 짜 드릴게요.'
                : '달릴수록 예상 기록이 실제 실력에 맞춰 갱신돼요.'}
            </Text>
            <Button style={styles.cta} label="홈으로" onPress={markGoalCreated} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && !selected && styles.chipPressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  dots: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  dot: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.primary },
  title: { ...type.h2, color: colors.text },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm },
  label: { ...type.bodyStrong, color: colors.text, marginTop: spacing.xxl, marginBottom: spacing.md },
  note: { ...type.caption, color: colors.muted, marginTop: spacing.xl },
  options: { gap: spacing.md, marginTop: spacing.xxl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  optionIconSelected: { backgroundColor: colors.primary },
  optionText: { flex: 1 },
  optionTitle: { ...type.h3, color: colors.text },
  optionDesc: { ...type.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.ink },
  chipPressed: { backgroundColor: colors.border },
  chipText: { ...type.bodyStrong, color: colors.textSecondary },
  chipTextSelected: { color: '#fff' },
  dateCard: { alignItems: 'center' },
  dateText: { ...type.h3, color: colors.text },
  dateHint: { ...type.caption, color: colors.muted, marginTop: spacing.xs },
  dateButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  fieldError: { ...type.caption, color: colors.danger, marginTop: spacing.sm },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
  cta: { marginTop: spacing.xxl },
  nav: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  navButton: { flex: 1 },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  summary: { marginTop: spacing.xl, gap: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { ...type.body, color: colors.textSecondary },
  summaryValue: { ...type.bodyStrong, color: colors.text },
  summaryStrong: { color: colors.primary, fontSize: 17 },
});
