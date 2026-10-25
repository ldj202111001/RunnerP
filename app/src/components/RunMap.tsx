import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';

import type { LatLng } from '@/sensors/useRunTracker';

export interface RunMapProps {
  route: LatLng[][]; // 일시정지 구간마다 끊긴 경로
  position: LatLng | null;
  follow: boolean; // true면 카메라가 현재 위치를 따라감
  onUserPan: () => void; // 사용자가 지도를 직접 움직이면 따라가기 해제
}

// 개발 빌드·정식 앱은 네이버 지도, Expo Go는 네이버 네이티브 모듈이 없어 Leaflet(OSM)으로 대신합니다.
// 네이버 지도 패키지는 불러오는 순간 네이티브 모듈을 찾으므로 Expo Go에서는 아예 불러오지 않습니다.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/* eslint-disable @typescript-eslint/no-require-imports */
export const RunMap: ComponentType<RunMapProps> = isExpoGo
  ? require('./RunMapLeaflet').RunMapLeaflet
  : require('./RunMapNaver').RunMapNaver;
/* eslint-enable @typescript-eslint/no-require-imports */
