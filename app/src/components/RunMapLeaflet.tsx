import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useLastKnownLocation } from '@/sensors/useLastKnownLocation';
import type { LatLng } from '@/sensors/useRunTracker';
import { colors } from '@/theme';

import type { RunMapProps } from './RunMap';

// 위치를 아직 모를 때 보여줄 곳 (서울시청)
const FALLBACK_CENTER: LatLng = { latitude: 37.5665, longitude: 126.978 };
const ZOOM = 17;

// Expo Go용 대체 지도: Expo Go에는 네이버 지도 네이티브 모듈이 없어서 WebView + Leaflet + OpenStreetMap으로 그립니다.
// OSM 무료 타일 서버는 개발·테스트용입니다. 개발 빌드·정식 앱에서는 RunMapNaver를 씁니다.
const buildHtml = (center: LatLng, lineColor: string) => `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;background:#e5e7eb}</style>
</head><body><div id="map"></div><script>
  var send = function (msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); };
  if (!window.L) { send({ type: 'error', message: 'leaflet load failed' }); }
  var map = L.map('map', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], ${ZOOM});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  var lines = L.layerGroup().addTo(map);
  var dot = null;

  // 앱에서 injectJavaScript로 호출하는 함수들
  window.setRoute = function (segments) {
    lines.clearLayers();
    segments.forEach(function (seg) {
      if (seg.length >= 2) L.polyline(seg, { color: '${lineColor}', weight: 5 }).addTo(lines);
    });
  };
  window.setPosition = function (lat, lng, follow) {
    if (!dot) {
      dot = L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }).addTo(map);
    } else {
      dot.setLatLng([lat, lng]);
    }
    if (follow) map.panTo([lat, lng], { animate: true, duration: 0.5 });
  };
  window.jumpTo = function (lat, lng) { map.setView([lat, lng], ${ZOOM}, { animate: false }); };

  // 사용자가 지도를 직접 움직이면 따라가기 해제
  map.on('dragstart', function () { send({ type: 'pan' }); });
  send({ type: 'ready' });
</script></body></html>`;

export function RunMapLeaflet({ route, position, follow, onUserPan }: RunMapProps) {
  const webRef = useRef<WebView<object>>(null);
  const [ready, setReady] = useState(false);
  const lastKnown = useLastKnownLocation();
  const html = useMemo(() => buildHtml(FALLBACK_CENTER, colors.primary), []);

  const run = (js: string) => webRef.current?.injectJavaScript(`${js};true;`);

  // 측정 전에는 마지막 위치로 이동만 합니다. 실제 위치가 들어오면 그쪽이 우선입니다.
  useEffect(() => {
    if (ready && lastKnown && !position) {
      run(`jumpTo(${lastKnown.latitude}, ${lastKnown.longitude})`);
      run(`setPosition(${lastKnown.latitude}, ${lastKnown.longitude}, false)`);
    }
  }, [ready, lastKnown, position]);

  useEffect(() => {
    if (ready && position) run(`setPosition(${position.latitude}, ${position.longitude}, ${follow})`);
  }, [ready, position, follow]);

  // route는 화면 갱신마다 새 배열이라, 점 개수가 바뀔 때만 다시 그립니다.
  const pointCount = route.reduce((n, seg) => n + seg.length, 0);
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);
  useEffect(() => {
    if (!ready) return;
    const segments = routeRef.current.map((seg) => seg.map((p) => [p.latitude, p.longitude]));
    run(`setRoute(${JSON.stringify(segments)})`);
  }, [ready, pointCount, route.length]);

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = JSON.parse(e.nativeEvent.data) as { type: string; message?: string };
    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'pan') onUserPan();
    else if (msg.type === 'error') console.warn('[RunMap]', msg.message);
  };

  return (
    <WebView
      ref={webRef}
      style={StyleSheet.absoluteFill}
      source={{ html, baseUrl: 'https://localhost/' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      // 새로고침 등으로 페이지가 다시 뜨면 ready 메시지를 다시 기다립니다.
      onLoadStart={() => setReady(false)}
      scrollEnabled={false}
      overScrollMode="never"
      setBuiltInZoomControls={false}
    />
  );
}
