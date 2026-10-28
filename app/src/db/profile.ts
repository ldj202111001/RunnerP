// 프로필 (한 줄뿐). 예전 GET /users/me, PUT /users/me/profile

import type { Gender, Profile, Weekday } from '@/api/types';

import { fromJson, toJson, ValidationError, type Db } from './sqlite';

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface ProfileRow {
  weekly_days: number;
  availability: string | null;
  gender: Gender | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
}

function toProfile(row: ProfileRow): Profile {
  return { ...row, availability: fromJson<Profile['availability']>(row.availability) };
}

export async function getProfile(db: Db): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT weekly_days, availability, gender, birth_year, height_cm, weight_kg FROM profile WHERE id = 1',
    [],
  );
  return row ? toProfile(row) : null;
}

function validate(p: Profile): void {
  if (!Number.isInteger(p.weekly_days) || p.weekly_days < 2 || p.weekly_days > 6) {
    throw new ValidationError('주 운동 횟수는 2–6회여야 합니다.');
  }
  if (p.availability) {
    for (const [day, minutes] of Object.entries(p.availability)) {
      if (!WEEKDAYS.includes(day as Weekday) || minutes == null || minutes < 0 || minutes > 300) {
        throw new ValidationError('요일별 가능 시간은 0–300분이어야 합니다.');
      }
    }
    const openDays = WEEKDAYS.filter((d) => (p.availability?.[d] ?? 0) > 0).length;
    if (p.weekly_days > openDays) {
      throw new ValidationError(`주 ${p.weekly_days}회는 운동 가능한 요일 수(${openDays}일)보다 많습니다.`);
    }
  }
  if (p.birth_year != null && (p.birth_year < 1900 || p.birth_year > 2100)) {
    throw new ValidationError('출생 연도를 확인해 주세요.');
  }
  if (p.height_cm != null && (p.height_cm <= 0 || p.height_cm >= 300)) {
    throw new ValidationError('키를 확인해 주세요.');
  }
  if (p.weight_kg != null && (p.weight_kg <= 0 || p.weight_kg >= 500)) {
    throw new ValidationError('몸무게를 확인해 주세요.');
  }
}

// 보낸 필드만 바꿉니다 (undefined는 그대로 둠). 온보딩이 weekly_days만 보내도 신체 정보를 지우지 않도록
export async function updateProfile(db: Db, body: Profile): Promise<Profile> {
  const current = await getProfile(db);
  const defined = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
  const next: Profile = { ...current, ...defined } as Profile;
  validate(next);
  await db.runAsync(
    `INSERT INTO profile (id, weekly_days, availability, gender, birth_year, height_cm, weight_kg, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT (id) DO UPDATE SET
       weekly_days = excluded.weekly_days, availability = excluded.availability, gender = excluded.gender,
       birth_year = excluded.birth_year, height_cm = excluded.height_cm, weight_kg = excluded.weight_kg,
       updated_at = excluded.updated_at`,
    [
      next.weekly_days,
      toJson(next.availability),
      next.gender ?? null,
      next.birth_year ?? null,
      next.height_cm ?? null,
      next.weight_kg ?? null,
    ],
  );
  return (await getProfile(db)) as Profile;
}
