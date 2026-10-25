# ml/ — 오프라인 모델 학습

FitRec(Endomondo) 러닝 기록으로 "최근 4주 기록 → 다음 러닝 페이스" 모델을 학습해 `server/ml_models/`에 저장한다.

## 준비 (PC마다 한 번)

```
cd ml
py -3.11 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

데이터는 git에 없다 (학술용, 재배포 금지). `data/raw/`에 직접 받는다:

```
curl -L -o data/raw/endomondoMeta.json.gz https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoMeta.json.gz
```

출처: [FitRec Datasets](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/FitRec-Project.html)
(Ni, Muhlstein, McAuley, WWW'19). 구글 드라이브 링크는 다운로드가 막혀 있어 위 UCSD 주소를 쓴다.

## 실행

```
.venv\Scripts\python preprocess.py   # endomondoMeta → data/runs.csv (러닝만, 이상치 제거)
.venv\Scripts\python train.py        # 피처 생성 → 기준선·선형회귀·랜덤포레스트·XGBoost 비교 → 저장
```

## 데이터 메모

- `endomondoHR.json.gz`의 시계열(위치·고도·심박)은 운동마다 **500개 지점으로 잘려** 있어 전체 거리·시간을 못 구한다.
  그래서 운동 전체 거리·시간·상승/하강이 있는 `endomondoMeta.json.gz`를 쓴다.
- 파일의 각 줄은 JSON이 아니라 파이썬 dict 표기라 `ast.literal_eval`로 읽는다.
- 피처 정의는 서버와 같은 파일 `server/app/services/features.py`를 쓴다. 심박수·케이던스·나이는 FitRec에 없거나 앱이 재지 않아서 쓰지 않는다.
- 모델은 XGBoost 자체 형식(`model_v1.json`)으로 저장한다. 파이썬 버전과 상관없이 서버에서 불러올 수 있다.
