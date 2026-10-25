import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// 디자인 토큰: 화면에서는 색·간격·글자 크기를 직접 쓰지 말고 여기 값을 씁니다.
export const colors = {
  // 브랜드: 에너지 있는 코랄 오렌지 + 짙은 잉크(강조 버튼·글자)
  primary: '#FF5A36',
  primaryPressed: '#E64A28',
  primarySoft: '#FFEDE8',
  ink: '#12141A',

  text: '#12141A',
  textSecondary: '#4B5161',
  muted: '#8A90A0',

  // 기본 바탕은 흰색. 입력칸·세그먼트처럼 바탕과 구분이 필요한 곳은 surfaceAlt.
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F5F7',
  border: '#E6E8EC',

  success: '#16A34A',
  successSoft: '#E7F6EC',
  warning: '#D97706',
  warningSoft: '#FDF3E3',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  info: '#3B6EF6',
  infoSoft: '#EAF0FE',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 64, fontWeight: '800', letterSpacing: -2, ...tabular },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '500' },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  stat: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, ...tabular },
} satisfies Record<string, TextStyle>;

// 카드·떠 있는 버튼용 그림자 (안드로이드는 elevation)
export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: '#0B1020', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 2 },
  }),
  float: Platform.select<ViewStyle>({
    ios: { shadowColor: '#0B1020', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 6 },
  }),
};
