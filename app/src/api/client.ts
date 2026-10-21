import { create } from 'axios';

import { getToken } from '@/auth/token';

// 휴대폰에서 접속하므로 localhost가 아니라 PC의 LAN IP를 써야 합니다. (.env 참고)
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const api = create({ baseURL, timeout: 10_000 });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
