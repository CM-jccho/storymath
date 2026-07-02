/* 해시 라우팅 + 화면 렌더링 */
(() => {
  const app = document.getElementById('app');
  const DIFF_NAMES = Player.DIFF_NAMES;

  function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showError(e) {
    app.innerHTML = `
      <div class="error-card">
        <h2>앗, 문제가 생겼어요</h2>
        <p>${esc(e.message)}</p>
        <p class="error-tip">파일을 직접 열었다면 로컬 서버로 실행해 주세요:<br><code>python3 -m http.server</code></p>
        <a href="#/" class="btn primary">처음으로</a>
      </div>`;
  }

  /* ---------- 홈 ---------- */
  async function viewHome() {
    const cur = await Data.getCurriculum();
    const gradeCards = cur.grades.map(g => {
      const active = g.status === 'active';
      return active
        ? `<a href="#/grade/${g.id}" class="grade-card active"><span class="grade-name">${esc(g.name)}</span><span class="grade-open">열려 있어요 →</span></a>`
        : `<div class="grade-card"><span class="grade-name">${esc(g.name)}</span><span class="grade-soon">준비 중</span></div>`;
    }).join('');

    app.innerHTML = `
      <section class="hero">
        <h1>수학은 <em>푸는 방법</em>부터 배우는 거예요</h1>
        <p>"뭘 해야 할지 모르겠어"는 못하는 게 아니라, 아직 <strong>방법</strong>을 안 배운 것뿐이에요.<br>
        스토리수학에서는 이야기 속 문제를 <strong>이해 → 계획 → 실행 → 반성</strong> 네 단계로 한 걸음씩 풀어요.</p>
        <div class="hero-actions">
          <a href="#/method" class="btn ghost">'푼다는 것'이 뭐예요?</a>
          <a href="#/grade/e4" class="btn primary">바로 문제 풀기 →</a>
        </div>
      </section>
      <section class="phase-strip">
        ${Object.entries(Player.PHASE_INFO).map(([name, info]) => `
          <div class="phase-chip ${info.className}">
            <span class="phase-chip-icon">${info.icon}</span>
            <strong>${esc(name)}</strong>
            <span>${esc(info.tip)}</span>
          </div>`).join('')}
      </section>
      <section>
        <h2 class="section-title">학년 선택</h2>
        <div class="grade-grid">${gradeCards}</div>
      </section>`;
  }

  /* ---------- '푼다는 것' 방법론 ---------- */
  function viewMethod() {
    app.innerHTML = `
      <article class="method">
        <h1>수학 문제를 '푼다'는 것</h1>
        <p class="method-lead">문제를 보자마자 답이 떠오르는 사람은 없어요. 수학을 잘하는 사람은
        <strong>막혔을 때 다음에 무엇을 할지</strong> 알고 있을 뿐이에요. 그 순서는 딱 네 단계예요.</p>

        <div class="method-step phase-understand">
          <h2>🔍 1단계 · 이해 — 문제가 뭐라고 말하고 있지?</h2>
          <p>문제를 두 번 읽고 두 가지를 찾아요.</p>
          <ul>
            <li><strong>알고 있는 것</strong>: 문제가 알려 준 숫자와 사실 (동그라미!)</li>
            <li><strong>구해야 하는 것</strong>: 물음표 문장이 원하는 것 (밑줄!)</li>
          </ul>
          <p class="method-tip">여기서 막히면 → 문제를 소리 내어 읽고, 숫자마다 "이건 뭐지?"라고 물어보세요.</p>
        </div>

        <div class="method-step phase-plan">
          <h2>🗺️ 2단계 · 계획 — 어떻게 갈지 작전 세우기</h2>
          <p>아는 것에서 구하는 것까지 가는 길을 정해요. "더할까? 뺄까? 곱할까? 나눌까?
          아니면 먼저 다른 걸 구해야 하나?"</p>
          <p class="method-tip">여기서 막히면 → 비슷한 쉬운 문제를 떠올리거나, 문제를 더 작은 문제로 쪼개 보세요.</p>
        </div>

        <div class="method-step phase-execute">
          <h2>✏️ 3단계 · 실행 — 계획대로 계산하기</h2>
          <p>세운 계획을 실제로 해 보는 단계예요. 서두르지 말고 한 줄씩, 계산 과정을 남기면서요.</p>
          <p class="method-tip">여기서 막히면 → 계획으로 돌아가도 괜찮아요. 계획을 바꾸는 건 실패가 아니라 수학자들이 늘 하는 일이에요.</p>
        </div>

        <div class="method-step phase-reflect">
          <h2>💡 4단계 · 반성 — 답이 말이 되나?</h2>
          <p>답을 구했다고 끝이 아니에요. 답을 문제 상황에 다시 넣어 보세요.
          "버스 8대에 25명이 못 탄다면, 정말 8대가 답일까?"</p>
          <p class="method-tip">거꾸로 계산해 보기(검산), 어림해 보기, 단위 확인하기 — 이게 진짜 실력을 만들어요.</p>
        </div>

        <p class="method-closing">스토리수학의 모든 문제는 이 네 단계를 직접 밟으면서 풀어요.
        문제 몇 개만 풀어 보면, 처음 보는 문제 앞에서도 "먼저 뭘 해야 하는지" 알게 될 거예요.</p>
        <div class="hero-actions"><a href="#/grade/e4" class="btn primary">문제 풀러 가기 →</a></div>
      </article>`;
  }

  /* ---------- 학년 페이지 ---------- */
  async function viewGrade(gradeId) {
    const cur = await Data.getCurriculum();
    const grade = Data.findGrade(cur, gradeId);
    if (!grade) throw new Error('없는 학년이에요.');
    if (grade.status !== 'active') {
      app.innerHTML = `
        <div class="error-card"><h2>${esc(grade.name)}은 준비 중이에요</h2>
        <p>지금은 초등 4학년부터 열려 있어요.</p>
        <a href="#/grade/e4" class="btn primary">초등 4학년으로 →</a></div>`;
      return;
    }

    const sections = await Promise.all(grade.semesters.map(async sem => {
      const cards = await Promise.all(sem.units.map(async u => {
        let progress = '';
        try {
          const unitData = await Data.getUnit(u.id);
          const ids = unitData.problems.map(p => p.id);
          const done = ids.filter(id => { const r = Store.getProblem(id); return r && r.solved; }).length;
          progress = `<span class="unit-progress ${done === ids.length ? 'full' : ''}">${done}/${ids.length}</span>`;
        } catch { progress = '<span class="unit-progress">준비 중</span>'; }
        return `
          <a href="#/unit/${u.id}" class="unit-card">
            <span class="unit-number">${u.number}단원</span>
            <span class="unit-name">${esc(u.name)}</span>
            <span class="unit-domain">${esc(u.domain)}</span>
            ${progress}
          </a>`;
      }));
      return `<h2 class="section-title">${sem.semester}학기</h2><div class="unit-grid">${cards.join('')}</div>`;
    }));

    app.innerHTML = `
      <div class="page-head">
        <a href="#/" class="back-link">← 학년 선택</a>
        <h1>${esc(grade.name)}</h1>
      </div>
      ${sections.join('')}`;
  }

  /* ---------- 단원 페이지 ---------- */
  async function viewUnit(unitId) {
    const unit = await Data.getUnit(unitId);
    const cards = unit.problems
      .slice()
      .sort((a, b) => a.difficulty - b.difficulty)
      .map(p => {
        const rec = Store.getProblem(p.id);
        const status = rec && rec.solved
          ? (rec.perfect ? '<span class="p-status perfect">🏆 완벽!</span>' : '<span class="p-status solved">✅ 해결</span>')
          : '<span class="p-status">아직</span>';
        return `
          <a href="#/play/${p.id}" class="problem-card">
            <span class="diff-badge diff-${p.difficulty}">${DIFF_NAMES[p.difficulty]}</span>
            <span class="p-title">${esc(p.title)}</span>
            ${status}
          </a>`;
      }).join('');

    app.innerHTML = `
      <div class="page-head">
        <a href="#/grade/${unit.gradeId}" class="back-link">← 단원 목록</a>
        <h1>${esc(unit.unitName)}</h1>
        <p class="unit-meta">${unit.semester}학기 · ${esc(unit.domain)}</p>
      </div>
      <p class="unit-guide">기본부터 차례로 도전해 보세요. 같은 4단계 방법이 점점 어려운 문제에도 통한다는 걸 알게 될 거예요.</p>
      <div class="problem-list">${cards}</div>`;
  }

  /* ---------- 문제 플레이 ---------- */
  async function viewPlay(problemId) {
    const found = await Data.findProblem(problemId);
    if (!found) throw new Error('없는 문제예요.');
    Player.start(app, found.unit, found.problem);
  }

  /* ---------- 라우터 ---------- */
  async function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [page, arg] = hash.split('/');
    window.scrollTo(0, 0);
    try {
      if (!page) await viewHome();
      else if (page === 'method') viewMethod();
      else if (page === 'grade') await viewGrade(arg);
      else if (page === 'unit') await viewUnit(arg);
      else if (page === 'play') await viewPlay(arg);
      else await viewHome();
    } catch (e) {
      showError(e);
    }
  }

  window.addEventListener('hashchange', route);
  route();
})();
