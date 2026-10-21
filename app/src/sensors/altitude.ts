import { Barometer } from 'expo-sensors';

const SEA_LEVEL_HPA = 1013.25;

// 국제 표준 대기 공식. 절대 고도는 날씨에 따라 틀리지만, 러닝 한 번 동안의 오르내림은 GPS보다 훨씬 정확합니다.
export function pressureToAltitude(hPa: number): number {
  return 44_330 * (1 - (hPa / SEA_LEVEL_HPA) ** 0.1903);
}

// 기압계 고도를 계속 갱신합니다. 기압계가 없는 기기면 null (GPS 고도를 대신 사용).
export async function startBarometer(): Promise<{ latest: () => number | null; remove: () => void } | null> {
  try {
    if (!(await Barometer.isAvailableAsync())) return null;
    let altitude: number | null = null;
    Barometer.setUpdateInterval(1000);
    const sub = Barometer.addListener(({ pressure }) => {
      altitude = pressureToAltitude(pressure);
    });
    return { latest: () => altitude, remove: () => sub.remove() };
  } catch {
    return null;
  }
}
