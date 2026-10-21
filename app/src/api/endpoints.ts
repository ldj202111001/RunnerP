import { api } from './client';
import type {
  Goal,
  GoalCreateRequest,
  GoalProgress,
  LoginRequest,
  LoginResponse,
  Me,
  Page,
  Profile,
  Run,
  RunCreateRequest,
  RunFeedbackRequest,
  RunFeedbackResponse,
  SignupRequest,
  SignupResponse,
  TodayPlan,
  WeekPlan,
  WeeklyStat,
} from './types';

export const authApi = {
  signup: (body: SignupRequest) => api.post<SignupResponse>('/auth/signup', body).then((r) => r.data),
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body).then((r) => r.data),
};

export const usersApi = {
  me: () => api.get<Me>('/users/me').then((r) => r.data),
  updateProfile: (body: Profile) => api.put<Profile>('/users/me/profile', body).then((r) => r.data),
};

export const goalsApi = {
  create: (body: GoalCreateRequest) => api.post<Goal>('/goals', body).then((r) => r.data),
  current: () => api.get<Goal>('/goals/current').then((r) => r.data),
  update: (id: number, body: GoalCreateRequest) => api.put<Goal>(`/goals/${id}`, body).then((r) => r.data),
  progress: () => api.get<GoalProgress>('/goals/current/progress').then((r) => r.data),
};

export const runsApi = {
  create: (body: RunCreateRequest) => api.post<Run>('/runs', body).then((r) => r.data),
  feedback: (id: number, body: RunFeedbackRequest) =>
    api.patch<RunFeedbackResponse>(`/runs/${id}/feedback`, body).then((r) => r.data),
  list: (params: { from?: string; to?: string; page?: number } = {}) =>
    api.get<Page<Run>>('/runs', { params }).then((r) => r.data),
  get: (id: number) => api.get<Run>(`/runs/${id}`).then((r) => r.data),
};

export const plansApi = {
  today: () => api.get<TodayPlan>('/plans/today').then((r) => r.data),
  week: (start: string) => api.get<WeekPlan>('/plans/week', { params: { start } }).then((r) => r.data),
  regenerate: () => api.post<WeekPlan>('/plans/regenerate').then((r) => r.data),
};

export const statsApi = {
  weekly: (weeks = 8) => api.get<WeeklyStat[]>('/stats/weekly', { params: { weeks } }).then((r) => r.data),
};
