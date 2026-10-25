"""FitRec 메타 파일 → 러닝 1건당 요약 CSV (data/runs.csv)

endomondoHR.json.gz의 시계열은 운동마다 500개 지점으로 잘려 있어 전체 거리·시간을 알 수 없습니다.
그래서 운동 전체의 거리·시간·상승/하강이 들어 있는 endomondoMeta.json.gz를 씁니다.
열 이름은 서버 runs 테이블과 맞춥니다. 심박수는 읽지 않습니다.

실행: .venv\\Scripts\\python preprocess.py
"""

import ast
import csv
import gzip
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

DATA = Path(__file__).parent / "data"
SRC = DATA / "raw" / "endomondoMeta.json.gz"
OUT = DATA / "runs.csv"

# 기록 오류(GPS 튐, 자전거를 러닝으로 기록 등)를 거르는 범위
MIN_DISTANCE_M = 1000
MAX_DISTANCE_M = 50_000
MIN_DURATION_SEC = 5 * 60
MIN_PACE = 150  # 초/km, 2:30 (세계 기록보다 빠르면 오류)
MAX_PACE = 900  # 15:00 (이보다 느리면 걷기)

GENDER = {"male": "M", "female": "F"}
COLUMNS = [
    "user_id",
    "workout_id",
    "started_at",
    "duration_sec",
    "distance_m",
    "avg_pace_sec_per_km",
    "elevation_gain_m",
    "elevation_loss_m",
    "gender",
]


def parse(line: str) -> dict | None:
    # 파일의 각 줄은 JSON이 아니라 파이썬 dict 표기(None, 작은따옴표)입니다.
    try:
        return ast.literal_eval(line)
    except (ValueError, SyntaxError):
        return None


def to_row(w: dict) -> tuple[dict | None, str]:
    """러닝 1건을 CSV 행으로. 버리면 (None, 이유)"""
    if w.get("sport") != "run":
        return None, "not_run"
    km, sec, ts = w.get("distance"), w.get("duration"), w.get("timestamp")
    if not km or not sec or not ts:
        return None, "missing"
    distance_m = km * 1000
    pace = sec / km
    if not (MIN_DISTANCE_M <= distance_m <= MAX_DISTANCE_M) or sec < MIN_DURATION_SEC:
        return None, "out_of_range"
    if not (MIN_PACE <= pace <= MAX_PACE):
        return None, "pace_out_of_range"
    started = datetime.strptime(ts[0], "%Y-%m-%dT%H:%M:%S.%fZ")
    return {
        "user_id": w["userId"],
        "workout_id": w["id"],
        "started_at": started.isoformat(),
        "duration_sec": round(sec),
        "distance_m": round(distance_m),
        "avg_pace_sec_per_km": round(pace),
        "elevation_gain_m": "" if w.get("ascent") is None else round(w["ascent"]),
        "elevation_loss_m": "" if w.get("descent") is None else round(w["descent"]),
        "gender": GENDER.get(w.get("gender"), "OTHER"),
    }, "kept"


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows 콘솔에서 한글이 깨지지 않게
    stats: Counter[str] = Counter()
    seen: set[int] = set()
    with gzip.open(SRC, "rt", encoding="utf-8") as src, OUT.open("w", newline="", encoding="utf-8") as out:
        writer = csv.DictWriter(out, fieldnames=COLUMNS)
        writer.writeheader()
        for i, line in enumerate(src, 1):
            w = parse(line)
            if w is None:
                stats["unparsable"] += 1
                continue
            row, reason = to_row(w)
            if row and row["workout_id"] in seen:
                reason, row = "duplicate", None
            stats[reason] += 1
            if row:
                seen.add(row["workout_id"])
                writer.writerow(row)
            if i % 20_000 == 0:
                print(f"{i:,} 줄 처리, 러닝 {stats['kept']:,}건")

    print("결과:", dict(stats))
    print(f"→ {OUT}")


if __name__ == "__main__":
    main()
