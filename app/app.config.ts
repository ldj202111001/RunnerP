import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json에 네이버 지도 플러그인을 더합니다. 키는 git에 올리지 않고 환경변수로 받습니다.
// - 로컬: app/.env 의 NAVER_MAP_CLIENT_ID (app/.env.example 참고)
// - EAS 빌드: eas env:create 로 등록한 NAVER_MAP_CLIENT_ID
// 키는 네이티브 빌드 때 앱에 들어가므로, 바꾸면 개발 빌드를 다시 만들어야 합니다.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['@mj-studio/react-native-naver-map', { client_id: process.env.NAVER_MAP_CLIENT_ID ?? '' }],
  ],
});
