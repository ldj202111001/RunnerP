import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme';
import { routeBounds } from '@/utils/routeBounds';

import type { RouteMapProps } from './RouteMap';

// Expo Go용 대체: WebView + Leaflet + OpenStreetMap (개발·테스트용)
const buildHtml = (points: RouteMapProps['points']) => {
  const b = routeBounds(points);
  const line = JSON.stringify(points.map((p) => [p.latitude, p.longitude]));
  const bounds = JSON.stringify([
    [b.latitude, b.longitude],
    [b.latitude + b.latitudeDelta, b.longitude + b.longitudeDelta],
  ]);
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;background:#e5e7eb}</style>
</head><body><div id="map"></div><script>
  var map = L.map('map', {
    zoomControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false,
    doubleClickZoom: false, boxZoom: false, keyboard: false,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  map.fitBounds(${bounds});
  var line = ${line};
  if (line.length >= 2) {
    L.polyline(line, { color: '${colors.primary}', weight: 5 }).addTo(map);
    L.circleMarker(line[line.length - 1], { radius: 7, color: '#fff', weight: 3, fillColor: '${colors.ink}', fillOpacity: 1 }).addTo(map);
  }
  if (line.length) {
    L.circleMarker(line[0], { radius: 7, color: '#fff', weight: 3, fillColor: '${colors.success}', fillOpacity: 1 }).addTo(map);
  }
</script></body></html>`;
};

export function RouteMapLeaflet({ points }: RouteMapProps) {
  const html = useMemo(() => buildHtml(points), [points]);

  return (
    <WebView
      style={StyleSheet.absoluteFill}
      source={{ html, baseUrl: 'https://localhost/' }}
      originWhitelist={['*']}
      scrollEnabled={false}
      overScrollMode="never"
      setBuiltInZoomControls={false}
    />
  );
}
