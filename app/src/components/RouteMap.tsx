import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';

import type { LatLng } from '@/sensors/useRunTracker';

export interface RouteMapProps {
  points: LatLng[]; // 저장된 경로 (서버의 route_polyline을 풀어서)
}

// 지난 러닝의 경로를 보여 주는 정지 지도. 경로 전체가 보이게 맞추고, 스크롤 안에 놓이므로 손으로 움직이지 않습니다.
// 측정용 RunMap과 같은 이유로 Expo Go에서는 Leaflet(OSM)으로 대신합니다.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/* eslint-disable @typescript-eslint/no-require-imports */
export const RouteMap: ComponentType<RouteMapProps> = isExpoGo
  ? require('./RouteMapLeaflet').RouteMapLeaflet
  : require('./RouteMapNaver').RouteMapNaver;
/* eslint-enable @typescript-eslint/no-require-imports */
