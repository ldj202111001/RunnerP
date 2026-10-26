# ml/data ???곗씠?곗뀑 諛쏄린

`ml/data/`??git???녿떎 (?숈닠?? ?щ같??湲덉?, ?먮낯留???3GB). ??PC?먯꽌???꾨옒?濡??ㅼ떆 諛쏅뒗??

異쒖쿂: [FitRec Datasets](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/FitRec-Project.html)
(Ni, Muhlstein, McAuley, WWW'19). 援ш? ?쒕씪?대툕 留곹겕???ㅼ슫濡쒕뱶媛 留됲? ?덉뼱 UCSD 二쇱냼瑜??대떎.

## ?먮낯 (`data/raw/`)

| ?뚯씪 | ?ш린 | ?댁슜 | ?ъ슜 |
|---|---|---|---|
| [endomondoMeta.json.gz](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoMeta.json.gz) | 1,088,266,461 B (??1.1GB) | ?대룞蹂?嫄곕━쨌?쒓컙쨌?곸듅/?섍컯쨌移쇰줈由?룸궇?㉱룹꽦蹂꽷룹쥌紐?| `preprocess.py` ?낅젰 |
| [endomondoHR.json.gz](https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoHR.json.gz) | 1,995,378,519 B (??2.0GB) | ?대룞蹂?500吏???쒓퀎?? ?꾩튂쨌怨좊룄쨌?띾룄쨌?щ컯??| 吏湲덉? ??? (李멸퀬?? |

`ml` ?대뜑?먯꽌:

```
mkdir data\raw
curl.exe -L -o data/raw/endomondoMeta.json.gz https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoMeta.json.gz
curl.exe -L -o data/raw/endomondoHR.json.gz   https://mcauleylab.ucsd.edu/public_datasets/gdrive/fitrec/endomondoHR.json.gz
```

諛쏆? ???뚯씪 ?ш린媛 ???쒖? 媛숈?吏 ?뺤씤?쒕떎 (`dir data\raw`).

## 留뚮뱾?댁????뚯씪 (`data/`)

諛쏆쓣 ?꾩슂 ?놁씠 ?ㅽ겕由쏀듃濡??ㅼ떆 留뚮뱺??

| ?뚯씪 | 留뚮뱶???ㅽ겕由쏀듃 |
|---|---|
| `runs.csv` | `.venv\Scripts\python preprocess.py` (Meta ???щ떇留? ?댁긽移??쒓굅) |
| `dataset.csv` | `.venv\Scripts\python train.py` (?쇱쿂 怨꾩궛 寃곌낵, ?숈뒿 以???? |
