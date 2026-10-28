# Runner Project — 개인 맞춤 러닝 관리 서비스

스마트폰 센서(GPS·가속도계·기압계)만으로 러닝을 기록하고, ML로 목표 기록을 예측해 규칙 기반 주간 훈련 계획을 추천하는 앱.
전체 설계(화면·API·DB·데이터 흐름)는 `전체구조설계서.md`에 있다. 기능을 만들기 전에 해당 절을 먼저 읽는다.

일정: 중간 발표 10/29 (ML 학습 범위), 최종 발표 12/03.

## 구조

**폰 단독 구조 (2026-10-29 전환)**: 서버·로그인 없이 폰 하나로 기록 저장(`app/src/db/`, 폰 SQLite)·예측(`app/src/engine/`, 앱에 포함한 모델)·계획을 한다. 학습만 PC에서 한다. 앱은 더 이상 `server/`를 부르지 않는다. `server/`는 전환 전 구현으로, 파이썬 쪽 피처 정의(`server/app/services/features.py`, 학습이 import)와 모델 원본(`server/ml_models/`) 때문에 남아 있다.

```
app/      Expo(SDK 58) + Expo Router 앱. 지침은 app/AGENTS.md (Expo API는 기억 말고 버전 문서 확인)
server/   (전환 전 구현, 앱은 안 씀) FastAPI. 학습이 쓰는 features.py와 모델 원본 ml_models/만 현역
ml/       오프라인 학습 (FitRec → preprocess.py → train.py → model_v1.json, 지금은 server/ml_models/에 저장). 지침은 ml/README.md, 데이터 받기는 ml/DATA.md
app/eas.json     EAS 빌드 프로필 (development = 개발 빌드 APK)
start_phone.bat  app에서 npx expo start (개발 빌드 앱이 PC에서 JS를 받아 감)
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
```
기록은 폰 안(`runner.db`)에 있으므로 PC 사이에 옮길 DB가 없다.
FitRec 데이터셋(`ml/data/`, 약 3GB)도 git에 없다. 다시 학습할 때만 `ml/DATA.md`의 링크로 받는다.

실행은 루트의 `start_phone.bat` (폰과 PC가 같은 Wi-Fi, 폰에 설치한 개발 빌드 앱으로 QR 스캔).

지도는 네이버 지도(`@mj-studio/react-native-naver-map`)라 Expo Go가 아니라 **개발 빌드**가 필요하다. Expo Go로 열면 `RunMap.tsx`가 Leaflet(OSM) 지도로 대신 그린다.
- 키: 네이버 클라우드 플랫폼 Maps Client ID, 패키지명 `com.runnerp.app`. EAS에는 `NAVER_MAP_CLIENT_ID` 환경변수로, 로컬은 `app/.env`(git에 없음, `app/.env.example` 참고).
- 개발 빌드 만들기: `cd app; npx eas-cli@latest build --profile development --platform android` → 나온 APK를 폰에 설치. 네이티브 패키지나 키를 바꿨을 때만 다시 빌드한다 (JS 수정은 그대로 반영).
- 밖에서 쓸 설치용 APK(PC 없이 실행): `cd app; npx eas-cli@latest build --profile preview --platform android`. EAS의 preview 환경에도 `NAVER_MAP_CLIENT_ID`가 있어야 한다.
- 앱 검사: `cd app; npx expo lint; npx tsc --noEmit`
- 엔진 검사: `cd app; npm run check:engine` (`src/engine`의 모델 예측·피처·지형이 파이썬과 같은 값인지, 검사 데이터는 `app/scripts/engine-parity.json`)
- 폰 DB 검사: `cd app; npm run check:db` (`src/db`를 Node 내장 SQLite로 실행해 저장·조회·목표 예측·입력 검사 확인)

## 진행 상황 (2026-10-29 기준)

ML (`ml/`):
- FitRec endomondoMeta → `preprocess.py` → 러닝 318,611건 / 1,191명 → `train.py` → `server/ml_models/model_v1.json` (+ feature_list, meta)
- 평가(사용자 단위 분리, 페이스 MAE): Riegel 기준선 32.9 → 선형회귀 31.2 → 랜덤포레스트 31.1 → XGBoost 30.3초/km
- `export_app_model.py`: 학습한 모델 → 앱용 가벼운 JSON(`app/assets/model/model_v1.json`, 1.4MB) + 엔진 검사 데이터. 재학습하면 이것도 다시 실행

폰 단독 전환 (설계서 8절 5단계, 완료):
- 예측 `app/src/engine/`: `model.ts`(XGBoost 나무를 직접 따라가 예측, float32 비교), `features.ts`, `predictor.ts`(모델 + Riegel 대체), `terrain.ts`. 파이썬과 일치 확인(모델 600건 최대 차이 0.0008초/km, 피처 80건 동일, 지형은 .5 반올림 방향만 다름)
- 저장 `app/src/db/`: `schema.ts`(테이블 7개, users 없음, 프로필 한 줄, `PRAGMA user_version` 마이그레이션), `profile.ts`·`goals.ts`(목표 생성 시 예측 → baseline·predictions)·`runs.ts`(저장 시 지형·케이던스 계산), 화면용 입구 `index.ts`(`profileDb`·`goalsDb`·`runsDb`), 타입 `types.ts`
- 화면은 모두 `@/db`를 쓴다. 로그인·토큰·axios·expo-secure-store 제거, 세션(`src/session.tsx`)은 진행 중 목표 유무로 첫 화면만 정함
- 미구현(서버에도 없던 것): 목표 진행률, 결과 입력(RPE)·재조정, planner·주간 계획·오늘 추천, 주간 통계

앱 (`app/src/app/`):
- 구현: 목표 설정 온보딩(`goal-setup.tsx`: 목적 3종 → 기록·대회만 종목·대회 날짜 → 주 몇 회·5K(선택) → 요약), 러닝 측정(`(drawer)/index.tsx` + `src/sensors/`의 GPS 필터·걸음수·고도·요약, `src/storage/runBuffer.ts`), 결과 화면(`run-result.tsx`), 기록 목록(`(drawer)/history.tsx`: 이번 달 합계·20개씩 이어 불러오기·당겨서 새로고침), 러닝 상세(`runs/[id].tsx`: 삭제 포함). 결과·상세는 `components/RunSummary.tsx`(요약·경로 지도·지표·코스 지형·1km 구간)를 함께 쓴다
- UI: 흰색 기반 디자인 토큰(`src/theme.ts`)과 공통 컴포넌트(`src/components/`의 Button·Card·StatTile·TextField·RoundButton), 현재 목표를 보여 주는 옆 메뉴(`(drawer)/_layout.tsx`)
- 지도: 네이버 지도(`RunMapNaver.tsx`, 개발 빌드)와 Expo Go용 Leaflet 대체(`RunMapLeaflet.tsx`). 측정 중 지도를 흐리게, 브랜드색 현재 위치 점, 출발·1km 마커. 지난 러닝 경로는 정지 지도 `RouteMap`(Naver/Leaflet, 경로 전체에 맞춤)
- 측정 화면 지표는 옆으로 넘기는 2페이지: 1) 거리·시간·평균/현재 페이스 2) 케이던스(최근 30초)·걸음수·현재 경사(최근 약 100m)·현재 고도·누적 상승. 측정 중에는 옆 메뉴 스와이프를 끈다
- 플레이스홀더: 오늘(`today.tsx`), 계획(`plan.tsx`), 기록 탭의 주간 그래프·예상 기록 추이, 결과 화면의 RPE·완주·메모 입력

다음 순서(설계서 8절): ~~폰 단독 전환~~ → 앱 안에 planner(`src/engine/planner.ts`, 유형별 수치 묶음·RACE 단계) → 결과 입력(RPE)·재조정 → 남은 화면.

## 작업 규칙

- 두 PC(데스크톱·노트북)에서 GitHub `ldj202111001/RunnerP`로 동기화한다. 작업 시작 시 `git pull`, 끝나면 커밋·push.
- 위 "진행 상황"은 큰 기능을 끝낼 때마다 갱신한다.
