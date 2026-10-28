# Runner Project — 개인 맞춤 러닝 관리 서비스

스마트폰 센서(GPS·가속도계·기압계)만으로 러닝을 기록하고, ML로 목표 기록을 예측해 규칙 기반 주간 훈련 계획을 추천하는 앱.
전체 설계(화면·API·DB·데이터 흐름)는 `전체구조설계서.md`에 있다. 기능을 만들기 전에 해당 절을 먼저 읽는다.

일정: 중간 발표 10/29 (ML 학습 범위), 최종 발표 12/03.

## 구조

**폰 단독 구조로 전환 중 (2026-10-29 결정)**: 서버 없이 폰 하나로 기록 저장·예측·계획을 한다. 학습만 PC에서 하고 모델 파일을 앱에 포함한다. `server/`의 기능은 앱(`src/db/`, `src/engine/`)으로 옮기는 중이며, 다 옮길 때까지 참고용으로 남긴다. 순서는 설계서 8절 5단계.

```
app/      Expo(SDK 58) + Expo Router 앱. 지침은 app/AGENTS.md (Expo API는 기억 말고 버전 문서 확인)
server/   (전환 전 구현) FastAPI + SQLAlchemy + Alembic. 개발 DB는 SQLite(server/dev.db)
ml/       오프라인 학습 (FitRec → preprocess.py → train.py → model_v1.json, 지금은 server/ml_models/에 저장). 지침은 ml/README.md, 데이터 받기는 ml/DATA.md
app/eas.json     EAS 빌드 프로필 (development = 개발 빌드 APK)
start_phone.bat  PC LAN IP 감지 → app/.env.local 갱신 → 서버·Expo를 각각 새 창으로 실행
```

## 설계 원칙 (어기지 말 것)

1. 심박수는 쓰지 않는다. 훈련 부하는 sRPE = 운동 시간(분) × RPE(1–10).
2. ML은 성과 예측(`predictor`)에만, 계획 배분은 규칙(`planner`: ACWR·80/20)으로. 두 모듈을 섞지 않는다.
3. 폰 하나로 동작한다. 서버·로그인·인터넷 없이 앱 안에서 저장·예측·계획까지 한다. 모델은 정적 파일로 앱에 포함하고 폰에서 재학습하지 않는다.
4. 원본 GPS 시계열은 저장하지 않는다. 러닝 1건당 요약값 + 폴리라인 + 1km 구간 + 100m 간격 고도 프로필만. 경사 등 지형 값은 프로필로 계산(`terrain`).
5. ML 피처는 앱 DB의 `runs` 테이블만으로 계산 가능해야 한다.

## 실행

처음 받은 PC에서:
```
cd app;    npm install
cd server; py -3.13 -m venv .venv; .venv\Scripts\pip install -r requirements.txt
```
`server/.env`는 git에 없다 (`server/.env.example` 참고, 다른 PC에서 직접 복사).
개발 DB `server/dev.db`도 git에 없다 (계정·기록을 이어 쓰려면 복사, 아니면 `alembic upgrade head`로 빈 DB).
FitRec 데이터셋(`ml/data/`, 약 3GB)도 git에 없다. 다시 학습할 때만 `ml/DATA.md`의 링크로 받는다.

실행은 루트의 `start_phone.bat` (폰과 PC가 같은 Wi-Fi, 폰에 설치한 개발 빌드 앱으로 QR 스캔).

지도는 네이버 지도(`@mj-studio/react-native-naver-map`)라 Expo Go가 아니라 **개발 빌드**가 필요하다. Expo Go로 열면 `RunMap.tsx`가 Leaflet(OSM) 지도로 대신 그린다.
- 키: 네이버 클라우드 플랫폼 Maps Client ID, 패키지명 `com.runnerp.app`. EAS에는 `NAVER_MAP_CLIENT_ID` 환경변수로, 로컬은 `app/.env`(git에 없음, `app/.env.example` 참고).
- 개발 빌드 만들기: `cd app; npx eas-cli@latest build --profile development --platform android` → 나온 APK를 폰에 설치. 네이티브 패키지나 키를 바꿨을 때만 다시 빌드한다 (JS 수정은 그대로 반영).
- 서버만: `cd server; .venv\Scripts\python -m alembic upgrade head; .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- 헬스 체크: `http://<PC IP>:8000/api/v1/health`
- 앱 검사: `cd app; npx expo lint; npx tsc --noEmit`
- 엔진 검사: `cd app; npm run check:engine` (`src/engine`의 모델 예측·피처·지형이 파이썬과 같은 값인지, 검사 데이터는 `app/scripts/engine-parity.json`)

## 진행 상황 (2026-10-29 기준)

서버 (`server/app/routers/`, 미구현 API는 `_stub.not_implemented()`로 501 반환):
- 완료: `/health`, `/auth/signup`, `/auth/login`, `/users/me`, `PUT /users/me/profile`(보낸 필드만 변경, 신체 정보 선택), `POST /goals`·`PUT /goals/{id}`(목표 유형 HEALTH/IMPROVE/RACE, 초기 예측을 baseline·predictions에 저장, 계획 생성은 planner 이후), `GET /goals/current`, `POST /runs`(고도 프로필·경사 분석 포함), `GET /runs`, `GET /runs/{id}`, `DELETE /runs/{id}`, `GET /runs/summary`(기간 합계), `POST /predict`(XGBoost 예측, 기록 없으면 Riegel 대체)
- 미구현: `GET /goals/current/progress`, `PATCH /runs/{id}/feedback`, `/plans/*` 전부, `/stats/weekly`
- `services/features.py`(ML 피처, 학습과 공유), `predictor.py`(서버 시작 시 `ml_models/model_v1.json` 로드) 완료. `planner.py`, `fatigue.py`는 docstring 뼈대만 있음.

ML (`ml/`):
- FitRec endomondoMeta → `preprocess.py` → 러닝 318,611건 / 1,191명 → `train.py` → `server/ml_models/model_v1.json` (+ feature_list, meta)
- 평가(사용자 단위 분리, 페이스 MAE): Riegel 기준선 32.9 → 선형회귀 31.2 → 랜덤포레스트 31.1 → XGBoost 30.3초/km
- `export_app_model.py`: 학습한 모델 → 앱용 가벼운 JSON(`app/assets/model/model_v1.json`, 1.4MB) + 엔진 검사 데이터. 재학습하면 이것도 다시 실행

폰 단독 전환 (설계서 8절 5단계):
- 1) 앱에서 예측 완료: `app/src/engine/` — `model.ts`(XGBoost 나무를 직접 따라가 예측, float32 비교), `features.ts`, `predictor.ts`(모델 + Riegel 대체), `terrain.ts`. 파이썬과 일치 확인(모델 600건 최대 차이 0.0008초/km, 피처 80건 동일, 지형은 .5 반올림 방향만 다름). 아직 화면에 연결하지 않았고 화면은 서버 API를 씀
- 남은 것: 2) 폰 SQLite(`expo-sqlite`, 개발 빌드 다시 필요) 3) 목표 저장·러닝 저장을 앱으로 옮겨 화면 연결 4) 로그인 제거

앱 (`app/src/app/`):
- 구현: 로그인(`login.tsx`), 목표 설정 온보딩(`goal-setup.tsx`: 목적 3종 → 기록·대회만 종목·대회 날짜 → 주 몇 회·5K(선택) → 요약), 러닝 측정(`(drawer)/index.tsx` + `src/sensors/`의 GPS 필터·걸음수·고도·요약, `src/storage/runBuffer.ts`), 결과 화면(`run-result.tsx`), 기록 목록(`(drawer)/history.tsx`: 이번 달 합계·20개씩 이어 불러오기·당겨서 새로고침), 러닝 상세(`runs/[id].tsx`: 삭제 포함). 결과·상세는 `components/RunSummary.tsx`(요약·경로 지도·지표·코스 지형·1km 구간)를 함께 쓴다
- UI: 흰색 기반 디자인 토큰(`src/theme.ts`)과 공통 컴포넌트(`src/components/`의 Button·Card·StatTile·TextField·RoundButton), 프로필·로그아웃이 있는 옆 메뉴(`(drawer)/_layout.tsx`)
- 지도: 네이버 지도(`RunMapNaver.tsx`, 개발 빌드)와 Expo Go용 Leaflet 대체(`RunMapLeaflet.tsx`). 측정 중 지도를 흐리게, 브랜드색 현재 위치 점, 출발·1km 마커. 지난 러닝 경로는 정지 지도 `RouteMap`(Naver/Leaflet, 경로 전체에 맞춤)
- 측정 화면 지표는 옆으로 넘기는 2페이지: 1) 거리·시간·평균/현재 페이스 2) 케이던스(최근 30초)·걸음수·현재 경사(최근 약 100m)·현재 고도·누적 상승. 측정 중에는 옆 메뉴 스와이프를 끈다
- 플레이스홀더: 오늘(`today.tsx`), 계획(`plan.tsx`), 기록 탭의 주간 그래프·예상 기록 추이, 결과 화면의 RPE·완주·메모 입력

다음 순서(설계서 8절): 폰 단독 전환(~~모델을 앱에서 예측~~ → 폰 SQLite → 계산 코드 이전 → 로그인 제거) → 앱 안에 planner → 남은 화면.

## 작업 규칙

- 두 PC(데스크톱·노트북)에서 GitHub `ldj202111001/RunnerP`로 동기화한다. 작업 시작 시 `git pull`, 끝나면 커밋·push.
- 위 "진행 상황"은 큰 기능을 끝낼 때마다 갱신한다.
