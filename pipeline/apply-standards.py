#!/usr/bin/env python3
"""단원 파일의 standards를 pipeline/standards-*.json의 공식 원문으로 강제 동기화.
사용법: python3 pipeline/apply-standards.py [gradeId ...]  (인자 없으면 매핑이 있는 전체)"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / "pipeline"
PROBLEMS = ROOT / "data" / "problems"


def main():
    mapping = {}
    for f in sorted(PIPELINE.glob("standards-*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for uid, std in data.items():
            if not uid.startswith("_"):
                mapping[uid] = std

    targets = sys.argv[1:]
    changed = same = missing = 0
    for uid, std in sorted(mapping.items()):
        if targets and not any(uid.startswith(t) for t in targets):
            continue
        path = PROBLEMS / f"{uid}.json"
        if not path.exists():
            missing += 1
            continue
        unit = json.loads(path.read_text(encoding="utf-8"))
        if unit.get("standards") == std:
            same += 1
            continue
        unit["standards"] = std
        path.write_text(json.dumps(unit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed += 1
        print(f"정정: {uid}")
    print(f"\n변경 {changed} / 동일 {same} / 파일 없음 {missing}")


if __name__ == "__main__":
    main()
