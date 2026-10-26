# ml/data — 데이터셋 받기

`ml/data/`는 git에 없다 (학술용, 재배포 금지, 원본만 약 3GB). 새 PC에서는 아래대로 다시 받는다.

출처: [FitRec Datasets](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/FitRec-Project.html)
(Ni, Muhlstein, McAuley, WWW'19). 구글 드라이브 링크는 다운로드가 막혀 있어 UCSD 주소를 쓴다.

## 원본 (`data/raw/`)

| 파일 | 크기 | 내용 | 사용 |
|---|---|---|---|
| [endomondoMeta.json.gz](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoMeta.json.gz) | 1,088,266,461 B (약 1.1GB) | 운동별 거리·시간·상승/하강·칼로리·날씨·성별·종목 | `preprocess.py` 입력 |
| [endomondoHR.json.gz](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoHR.json.gz) | 1,995,378,519 B (약 2.0GB) | 운동별 500지점 시계열: 위치·고도·속도·심박수 | 지금은 안 씀 (참고용) |

`ml` 폴더에서:

```
mkdir data\raw
curl.exe -L -o data/raw/endomondoMeta.json.gz https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoMeta.json.gz
curl.exe -L -o data/raw/endomondoHR.json.gz   https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoHR.json.gz
```

받은 뒤 파일 크기가 위 표와 같은지 확인한다 (`dir data\raw`).

## 만들어지는 파일 (`data/`)

받을 필요 없이 스크립트로 다시 만든다.

| 파일 | 만드는 스크립트 |
|---|---|
| `runs.csv` | `.venv\Scripts\python preprocess.py` (Meta → 러닝만, 이상치 제거) |
| `dataset.csv` | `.venv\Scripts\python train.py` (피처 계산 결과, 학습 중 저장) |
