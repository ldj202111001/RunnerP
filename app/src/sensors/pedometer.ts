import { Pedometer } from 'expo-sensors';

// 걸음수 측정을 시작합니다. 센서가 없거나 권한이 거부되면 null을 돌려줍니다.
// onSteps에는 이번 구독을 시작한 뒤의 누적 걸음수가 전달됩니다.
export async function startStepCounter(onSteps: (steps: number) => void): Promise<{ remove: () => void } | null> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    const { granted } = await Pedometer.requestPermissionsAsync();
    if (!granted) return null;
    return Pedometer.watchStepCount((result) => onSteps(result.steps));
  } catch {
    return null;
  }
}
