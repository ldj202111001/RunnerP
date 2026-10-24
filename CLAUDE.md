# Runner Project — 개인 맞춤 러닝 관리 서비스

스마트폰 센서(GPS·가속도계·기압계)만으로 러닝을 기록하고, ML로 목표 기록을 예측해 규칙 기반 주간 훈련 계획을 추천하는 앱.
전체 설계(화면·API·DB·데이터 흐름)는 `전체구조설계서.md`에 있다. 기능을 만들기 전에 해당 절을 먼저 읽는다.

일정: 중간 발표 10/29 (ML 학습 범위), 최종 발표 12/03.

## 구조

```
app/      Expo(SDK 58) + Expo Router 앱. 지침은 app/AGENTS.md (Expo API는 기억 말고 버전 문서 확인)
server/   FastAPI + SQLAlchemy + Alembic. 개발 DB는 SQLite(server/dev.db), 운영은 MySQL 예정
start_phone.bat  PC LAN IP 감지 → app/.env.local 갱신 → 서버·Expo를 각각 새 창으로 실행
```

`ml/`(오프라인 학습: FitRec 전처리 → features.py → XGBoost → model_v1.pkl)은 아직 없다.

## 설계 원칙 (어기지 말 것)

1. 심박수는 쓰지 않는다. 훈련 부하는 sRPE = 운동 시간(분) × RPE(1–10).
2. ML은 성과 예측(`services/predictor.py`)에만, 계획 배분은 규칙(`services/planner.py`: ACWR·80/20)으로. 두 모듈을 섞지 않는다.
3. 앱은 수집·표시만, 계산은 서버에서.
4. 원본 GPS 시계열은 저장하지 않는다. 러닝 1건당 요약값 + 폴리라인 + 1km 구간 + 100m 간격 고도 프로필만. 경사 등 지형 값은 서버가 프로필로 계산(`services/terrain.py`).
5. ML 피처는 앱 DB의 `runs` 테이블만으로 계산 가능해야 한다.

## 실행

처음 받은 PC에서:
```
cd app;    npm install
cd server; py -3.13 -m venv .venv; .venv\Scripts\pip install -r requirements.txt
```
`server/.env`는 git에 없다 (`server/.env.example` 참고, 다른 PC에서 직접 복사).

실행은 루트의 `start_phone.bat` (폰과 PC가 같은 Wi-Fi, Expo Go로 QR 스캔).
- 서버만: `cd server; .venv\Scripts\python -m alembic upgrade head; .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- 헬스 체크: `http://<PC IP>:8000/api/v1/health`
- 앱 검사: `cd app; npx expo lint; npx tsc --noEmit`

## 진행 상황 (2026-10-22 기준)

서버 (`server/app/routers/`, 미구현 API는 `_stub.not_implemented()`로 501 반환):
- 완료: `/health`, `/auth/signup`, `/auth/login`, `/users/me`, `PUT /users/me/profile`, `GET /goals/current`, `POST /runs`(고도 프로필·경사 분석 포함), `GET /runs`, `GET /runs/{id}`
- 미구현: `POST /goals`, `PUT /goals/{id}`, `GET /goals/current/progress`, `PATCH /runs/{id}/feedback`, `/plans/*` 전부, `/predict`, `/stats/weekly`
- `services/predictor.py`, `planner.py`, `fatigue.py`는 docstring 뼈대만 있음. `ml_models/`는 비어 있음.

앱 (`app/src/app/`):
- 구현: 로그인(`login.tsx`), 러닝 측정(`(drawer)/index.tsx` + `src/sensors/`의 GPS 필터·걸음수·고도·요약, `src/storage/runBuffer.ts`), 결과 화면 요약·코스 지형 표시(`run-result.tsx`)
- 플레이스홀더: 목표 설정(`goal-setup.tsx`), 오늘(`today.tsx`), 계획(`plan.tsx`), 기록(`history.tsx`), 러닝 상세(`runs/[id].tsx`), 결과 화면의 RPE·완주·메모 입력

다음 순서(설계서 8절): FitRec 전처리 → `features.py` → XGBoost 학습 → predictor·planner 구현 → 추천 API → 남은 화면.

## 작업 규칙

- 두 PC(데스크톱·노트북)에서 GitHub `ldj202111001/RunnerP`로 동기화한다. 작업 시작 시 `git pull`, 끝나면 커밋·push.
- 위 "진행 상황"은 큰 기능을 끝낼 때마다 갱신한다.
