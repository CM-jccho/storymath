# 스토리수학 (StoryMath)

"뭘 해야 할지 모르겠어"는 못하는 게 아니라 아직 **푸는 방법**을 안 배운 것. 이야기 속 수학 문제를 **이해 → 계획 → 실행 → 반성** (Polya 4단계)으로 한 단계씩 직접 밟으며 푸는 학습 사이트.

- 2022 개정 교육과정 기반, 초1~중3 구조 (현재 초4 12단원 × 난이도 3 오픈)
- 의존성 없는 순수 정적 사이트 (HTML/CSS/vanilla JS + JSON)
- 회원가입 없음 — 진도는 브라우저 localStorage에 저장

## 실행

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

(fetch를 쓰므로 파일을 직접 열면 안 되고 로컬 서버가 필요하다.)

## 구조

```
index.html            진입점 (해시 라우팅 SPA)
css/style.css
js/
  app.js              라우터 + 홈/방법론/학년/단원 화면
  player.js           인터랙티브 단계별 풀이 엔진
  data.js             curriculum/문제 JSON 로딩
  store.js            localStorage 진도 저장
data/
  curriculum.json     학년·학기·단원 구조 (초1~중3)
  problems/<unitId>.json  단원별 문제 (스키마: pipeline/SCHEMA.md)
pipeline/
  SCHEMA.md           문제 데이터 스키마 + 품질 체크리스트
  GENERATION.md       새 학년 확장 절차 (AI 생성 + 검수 파이프라인)
  validate.py         스키마 검증 스크립트
REQUIREMENTS.md       요구사항 및 결정사항
```

## 새 학년 열기

`pipeline/GENERATION.md` 참조: 교육과정 조사 → curriculum.json 갱신 → Claude로 단원별 문제 생성 → validate.py → AI 교차검증 + 사람 검수 → 배포.

## 배포

정적 파일뿐이므로 폴더 전체를 GitHub Pages, Vercel 등에 그대로 올리면 된다.
