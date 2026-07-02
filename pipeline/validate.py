#!/usr/bin/env python3
"""StoryMath 문제 데이터 검증. 사용법: python3 pipeline/validate.py [unitId ...]
인자가 없으면 data/problems/ 전체를 검증한다."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROBLEMS_DIR = ROOT / "data" / "problems"
CURRICULUM = ROOT / "data" / "curriculum.json"

PHASES = {"이해", "계획", "실행", "반성"}
TYPES = {"multi", "single", "input"}


def err(errors, fid, msg):
    errors.append(f"  [{fid}] {msg}")


def validate_step(errors, pid, i, step):
    fid = f"{pid} step{i}"
    if step.get("phase") not in PHASES:
        err(errors, fid, f"phase가 올바르지 않음: {step.get('phase')}")
    t = step.get("type")
    if t not in TYPES:
        err(errors, fid, f"type이 올바르지 않음: {t}")
        return
    for field in ("prompt", "hint", "explain"):
        if not isinstance(step.get(field), str) or not step[field].strip():
            err(errors, fid, f"{field} 누락 또는 비어 있음")
    ans = step.get("answer")
    if t in ("multi", "single"):
        opts = step.get("options")
        if not isinstance(opts, list) or len(opts) < 2:
            err(errors, fid, "options는 2개 이상의 배열이어야 함")
            return
        if t == "multi":
            if not isinstance(ans, list) or not ans:
                err(errors, fid, "multi의 answer는 비어 있지 않은 인덱스 배열이어야 함")
            elif any(not isinstance(a, int) or a < 0 or a >= len(opts) for a in ans):
                err(errors, fid, f"answer 인덱스가 options 범위(0~{len(opts)-1})를 벗어남")
        else:
            if not isinstance(ans, int) or ans < 0 or ans >= len(opts):
                err(errors, fid, f"single의 answer 인덱스가 범위(0~{len(opts)-1})를 벗어남")
    else:  # input
        if not isinstance(ans, str) or not ans.strip():
            err(errors, fid, "input의 answer는 비어 있지 않은 문자열이어야 함")


def validate_problem(errors, unit_id, p):
    pid = p.get("id", "(id 없음)")
    if not str(pid).startswith(unit_id + "-d"):
        err(errors, pid, f"id가 '{unit_id}-d<난이도>-<번호>' 형식이 아님")
    if p.get("difficulty") not in (1, 2, 3):
        err(errors, pid, f"difficulty는 1~3이어야 함: {p.get('difficulty')}")
    for field in ("title", "story", "question", "finalAnswer", "wrapUp"):
        if not isinstance(p.get(field), str) or not p[field].strip():
            err(errors, pid, f"{field} 누락 또는 비어 있음")
    steps = p.get("steps")
    if not isinstance(steps, list) or len(steps) < 4:
        err(errors, pid, "steps는 4개 이상이어야 함 (이해→계획→실행→반성)")
        return
    for i, s in enumerate(steps):
        validate_step(errors, pid, i, s)
    phases = [s.get("phase") for s in steps]
    for ph in PHASES:
        if ph not in phases:
            err(errors, pid, f"'{ph}' 단계가 없음")
    if phases[0] != "이해":
        err(errors, pid, "첫 단계는 '이해'여야 함")
    if phases[-1] != "반성":
        err(errors, pid, "마지막 단계는 '반성'이어야 함")


def validate_file(errors, path, known_units):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(errors, path.name, f"JSON 파싱 실패: {e}")
        return
    unit_id = data.get("unitId", "")
    if path.stem != unit_id:
        err(errors, path.name, f"파일명과 unitId 불일치: {unit_id}")
    if known_units and unit_id not in known_units:
        err(errors, path.name, f"curriculum.json에 없는 unitId: {unit_id}")
    for field in ("gradeId", "semester", "unitName", "domain"):
        if field not in data:
            err(errors, path.name, f"{field} 누락")
    if not isinstance(data.get("standards"), list) or not data["standards"]:
        err(errors, path.name, "standards 누락")
    problems = data.get("problems")
    if not isinstance(problems, list) or not problems:
        err(errors, path.name, "problems가 비어 있음")
        return
    diffs = sorted(p.get("difficulty", 0) for p in problems)
    if not {1, 2, 3}.issubset(set(diffs)):
        err(errors, path.name, f"난이도 1,2,3이 모두 있어야 함 (현재: {diffs})")
    for p in problems:
        validate_problem(errors, unit_id, p)


def main():
    known_units = set()
    if CURRICULUM.exists():
        cur = json.loads(CURRICULUM.read_text(encoding="utf-8"))
        for g in cur["grades"]:
            for sem in g["semesters"]:
                for u in sem["units"]:
                    known_units.add(u["id"])
    targets = sys.argv[1:]
    files = ([PROBLEMS_DIR / f"{t}.json" for t in targets]
             if targets else sorted(PROBLEMS_DIR.glob("*.json")))
    total_errors = 0
    for path in files:
        errors = []
        if not path.exists():
            print(f"✗ {path.name}: 파일 없음")
            total_errors += 1
            continue
        validate_file(errors, path, known_units)
        if errors:
            print(f"✗ {path.name}: 오류 {len(errors)}건")
            print("\n".join(errors))
            total_errors += len(errors)
        else:
            n = len(json.loads(path.read_text(encoding='utf-8'))["problems"])
            print(f"✓ {path.name}: 문제 {n}개 통과")
    print(f"\n{'모두 통과!' if total_errors == 0 else f'총 오류 {total_errors}건'}")
    sys.exit(1 if total_errors else 0)


if __name__ == "__main__":
    main()
