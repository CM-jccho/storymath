/* 해시 라우팅 + 화면 렌더링 */
(() => {
  const app = document.getElementById('app');
  const DIFF_NAMES = Player.DIFF_NAMES;
  const PHASE_INFO = Player.PHASE_INFO;

  function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  // "초등 3학년" → "초3", "중등 1학년" → "중1", "고등 1학년" → "고1"
  function shortGrade(name) {
    return name.replace(/^(초|중|고)등?\s*(\d)학년$/, '$1$2');
  }
  function activeUnits(cur) {
    const list = [];
    for (const g of cur.grades) {
      if (g.status !== 'active') continue;
      for (const sem of g.semesters) {
        for (const u of sem.units) list.push({ grade: g, semester: sem.semester, unit: u });
      }
    }
    return list;
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

  function methodStrip() {
    return `
      <div class="method-strip">
        ${Player.PHASES.map(ph => {
          const info = PHASE_INFO[ph];
          return `<div class="m-item">
            <span class="m-step">${info.n}</span>
            <strong>${esc(ph)}</strong>
            <span>${esc(info.tip)}</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  /* ---------- 홈 ---------- */
  async function viewHome() {
    const cur = await Data.getCurriculum();
    const game = Store.getGame();
    const level = Store.levelInfo(game.xp);
    const statsCard = game.xp > 0 ? `
      <a href="#/me" class="grade-row" style="margin-bottom:24px">
        <span class="grade-badge">Lv</span>
        <span class="grade-info"><span class="grade-name">${esc(level.name)} · ${game.xp} XP</span>
        <span class="grade-sub">${game.streak.days >= 2 ? `🔥 ${game.streak.days}일 연속 · ` : ''}배지 ${Object.keys(game.badges).length}개 · 내 기록 보기</span></span>
        <span class="grade-arrow">›</span>
      </a>` : '';
    app.innerHTML = `
      <section class="hero">
        <span class="hero-eyebrow">현행 교육과정 기반</span>
        <h1>수학이 어려운 게 아니라<br><em>푸는 방법</em>을 몰랐을 뿐이에요</h1>
        <p>이야기 속 문제를 네 단계로 한 걸음씩. 정답을 외우는 대신,
        처음 보는 문제 앞에서 "다음에 뭘 해야 하는지"를 배워요.</p>
        <div class="hero-actions">
          <a href="#/grades" class="btn primary">문제 풀러 가기</a>
          <a href="#/method" class="btn ghost">푼다는 것이 뭐예요?</a>
        </div>
      </section>
      ${methodStrip()}
      ${statsCard}
      <h2 class="section-title">학년별 학습</h2>
      ${gradeListHtml(cur)}
      <h2 class="section-title">다르게 둘러보기</h2>
      <div class="grade-list">
        <a href="#/sets" class="grade-row">
          <span class="grade-badge">세트</span>
          <span class="grade-info"><span class="grade-name">랜덤 문제 세트</span>
          <span class="grade-sub">골고루 · 기본 다지기 · 심화 도전 · 새 문제 · 복습 — 매번 다르게 뽑아요</span></span>
          <span class="grade-arrow">›</span>
        </a>
        <a href="#/explore/domain" class="grade-row">
          <span class="grade-badge">영역</span>
          <span class="grade-info"><span class="grade-name">영역별</span>
          <span class="grade-sub">수와 연산 · 변화와 관계 · 도형과 측정 · 자료와 가능성</span></span>
          <span class="grade-arrow">›</span>
        </a>
        <a href="#/explore/track" class="grade-row">
          <span class="grade-badge">계통</span>
          <span class="grade-info"><span class="grade-name">계통별</span>
          <span class="grade-sub">분수, 도형처럼 학년을 넘어 이어지는 주제 순서대로</span></span>
          <span class="grade-arrow">›</span>
        </a>
        <a href="#/explore/level" class="grade-row">
          <span class="grade-badge">난이도</span>
          <span class="grade-info"><span class="grade-name">난이도별</span>
          <span class="grade-sub">기본 · 응용 · 심화 문제만 골라 풀기</span></span>
          <span class="grade-arrow">›</span>
        </a>
      </div>`;
  }

  function gradeListHtml(cur) {
    return `<div class="grade-list">` + cur.grades.map(g => {
      const short = shortGrade(g.name);
      if (g.status !== 'active') {
        return `<div class="grade-row disabled">
          <span class="grade-badge">${esc(short)}</span>
          <span class="grade-info"><span class="grade-name">${esc(g.name)}</span>
          <span class="grade-sub">준비 중</span></span>
        </div>`;
      }
      const unitCount = g.semesters.reduce((n, s) => n + s.units.length, 0);
      return `<a href="#/grade/${g.id}" class="grade-row">
        <span class="grade-badge">${esc(short)}</span>
        <span class="grade-info"><span class="grade-name">${esc(g.name)}</span>
        <span class="grade-sub">1·2학기 ${unitCount}단원</span></span>
        <span class="grade-arrow">›</span>
      </a>`;
    }).join('') + `</div>`;
  }

  /* ---------- 학년 목록 페이지 ---------- */
  async function viewGrades() {
    const cur = await Data.getCurriculum();
    app.innerHTML = `
      <div class="page-head"><h1>학년 선택</h1>
      <p class="unit-meta">지금 열려 있는 학년부터 시작해 보세요.</p></div>
      ${gradeListHtml(cur)}`;
  }

  /* ---------- '푼다는 것' 방법론 ---------- */
  function viewMethod() {
    const stepsMeta = [
      { ph: '이해', title: '문제가 뭐라고 말하고 있지?', body: `<p>문제를 두 번 읽고 두 가지를 찾아요.</p>
        <ul><li><strong>알고 있는 것</strong>: 문제가 알려 준 숫자와 사실 (동그라미!)</li>
        <li><strong>구해야 하는 것</strong>: 물음표 문장이 원하는 것 (밑줄!)</li></ul>`,
        tip: '여기서 막히면 → 문제를 소리 내어 읽고, 숫자마다 "이건 뭐지?"라고 물어보세요.' },
      { ph: '계획', title: '어떻게 갈지 작전 세우기', body: `<p>아는 것에서 구하는 것까지 가는 길을 정해요.
        "더할까? 뺄까? 곱할까? 나눌까? 아니면 먼저 다른 걸 구해야 하나?"</p>`,
        tip: '여기서 막히면 → 비슷한 쉬운 문제를 떠올리거나, 문제를 더 작은 문제로 쪼개 보세요.' },
      { ph: '실행', title: '계획대로 계산하기', body: `<p>세운 계획을 실제로 해 보는 단계예요. 서두르지 말고 한 줄씩, 계산 과정을 남기면서요.</p>`,
        tip: '여기서 막히면 → 계획으로 돌아가도 괜찮아요. 계획을 바꾸는 건 실패가 아니라 수학자들이 늘 하는 일이에요.' },
      { ph: '반성', title: '답이 말이 되나?', body: `<p>답을 구했다고 끝이 아니에요. 답을 문제 상황에 다시 넣어 보세요.
        "버스 8대에 25명이 못 탄다면, 정말 8대가 답일까?"</p>`,
        tip: '거꾸로 계산해 보기(검산), 어림해 보기, 단위 확인하기 — 이게 진짜 실력을 만들어요.' }
    ];
    app.innerHTML = `
      <article class="method">
        <h1>수학 문제를 '푼다'는 것</h1>
        <p class="method-lead">문제를 보자마자 답이 떠오르는 사람은 없어요. 수학을 잘하는 사람은
        <strong>막혔을 때 다음에 무엇을 할지</strong> 알고 있을 뿐이에요. 그 순서는 딱 네 단계예요.</p>
        ${stepsMeta.map(s => {
          const info = PHASE_INFO[s.ph];
          return `<div class="method-step ${info.className}">
            <h2><span class="m-step">${info.n}</span>${esc(s.ph)} — ${esc(s.title)}</h2>
            ${s.body}
            <p class="method-tip">${esc(s.tip)}</p>
          </div>`;
        }).join('')}
        <p class="method-closing">스토리수학의 모든 문제는 이 네 단계를 직접 밟으면서 풀어요.
        문제 몇 개만 풀어 보면, 처음 보는 문제 앞에서도 "먼저 뭘 해야 하는지" 알게 될 거예요.</p>
        <div class="hero-actions"><a href="#/grades" class="btn primary">문제 풀러 가기</a></div>
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
        <p>다른 학년을 먼저 둘러보세요.</p>
        <a href="#/grades" class="btn primary">학년 선택으로</a></div>`;
      return;
    }

    const sections = await Promise.all(grade.semesters.map(async sem => {
      const rows = await Promise.all(sem.units.map(u => unitRowHtml(u, null)));
      const title = sem.label ? esc(sem.label) : `${sem.semester}학기`;
      return `<h2 class="semester-title">${title}</h2><div class="unit-list">${rows.join('')}</div>`;
    }));

    app.innerHTML = `
      <div class="page-head">
        <a href="#/grades" class="back-link">← 학년 선택</a>
        <h1>${esc(grade.name)}</h1>
      </div>
      ${sections.join('')}`;
  }

  // 단원 행 (진도 바 포함). gradeLabel을 주면 학년 배지로 표시(탐색 화면용)
  async function unitRowHtml(u, gradeLabel) {
    let done = 0, total = 0;
    try {
      const unitData = await Data.getUnit(u.id);
      const ids = unitData.problems.map(p => p.id);
      total = ids.length;
      done = ids.filter(id => { const r = Store.getProblem(id); return r && r.solved; }).length;
    } catch { /* 콘텐츠 준비 전 */ }
    const pct = total ? Math.round(done / total * 100) : 0;
    const badge = gradeLabel
      ? `<span class="unit-no">${esc(gradeLabel)}</span>`
      : `<span class="unit-no">${u.number}</span>`;
    return `
      <a href="#/unit/${u.id}" class="unit-row ${total && done === total ? 'done' : ''}">
        ${badge}
        <span class="unit-body">
          <span class="unit-name">${esc(u.name)}</span>
          <span class="unit-domain">${esc(u.domain)}</span>
        </span>
        <span class="unit-right">
          <span class="unit-count">${done}/${total || '-'}</span>
          <span class="progress-track"><span class="progress-fill ${done === total && total ? 'full' : ''}" style="width:${pct}%"></span></span>
        </span>
      </a>`;
  }

  /* ---------- 탐색 (영역별 / 계통별 / 난이도별) ---------- */
  async function viewExplore(tab) {
    tab = tab || 'domain';
    const cur = await Data.getCurriculum();
    const tabs = [
      { id: 'domain', name: '영역별' },
      { id: 'track', name: '계통별' },
      { id: 'level', name: '난이도별' }
    ];
    const tabsHtml = `<div class="tabs">${tabs.map(t =>
      `<a href="#/explore/${t.id}" class="tab ${t.id === tab ? 'active' : ''}">${t.name}</a>`).join('')}</div>`;

    let body = '';
    if (tab === 'domain') body = await exploreDomain(cur);
    else if (tab === 'track') body = await exploreTrack(cur);
    else body = await exploreLevel(cur);

    app.innerHTML = `
      <div class="page-head"><h1>탐색</h1>
      <p class="unit-meta">학년 순서가 아니어도 괜찮아요. 끌리는 주제부터 골라 보세요.</p></div>
      ${tabsHtml}${body}`;
  }

  async function exploreDomain(cur) {
    const all = activeUnits(cur);
    const sections = await Promise.all(cur.domains.map(async d => {
      const items = all.filter(x => x.unit.domain === d);
      if (!items.length) return '';
      const rows = await Promise.all(items.map(x => unitRowHtml(x.unit, shortGrade(x.grade.name))));
      return `<h2 class="semester-title">${esc(d)}</h2><div class="unit-list">${rows.join('')}</div>`;
    }));
    return sections.join('');
  }

  async function exploreTrack(cur) {
    const tracks = await Data.getTracks();
    const sections = await Promise.all(tracks.map(async t => {
      const metas = t.units.map(id => Data.findUnitMeta(cur, id))
        .filter(m => m && m.grade.status === 'active');
      if (!metas.length) return '';
      const rows = await Promise.all(metas.map(m => unitRowHtml(m.unit, shortGrade(m.grade.name))));
      return `
        <div class="track-section">
          <h2 class="semester-title">${esc(t.name)}</h2>
          <p class="track-desc">${esc(t.description)}</p>
          <div class="unit-list">${rows.join('')}</div>
        </div>`;
    }));
    return sections.join('');
  }

  async function exploreLevel(cur) {
    const all = activeUnits(cur);
    const units = (await Promise.all(all.map(async x => {
      try { return { meta: x, data: await Data.getUnit(x.unit.id) }; }
      catch { return null; }
    }))).filter(Boolean);

    return [1, 2, 3].map(level => {
      const cards = units.flatMap(({ meta, data }) =>
        data.problems.filter(p => p.difficulty === level).map(p => {
          const rec = Store.getProblem(p.id);
          const status = rec && rec.solved
            ? (rec.perfect ? '<span class="p-status perfect">완벽</span>' : '<span class="p-status solved">해결</span>')
            : '<span class="p-status">아직</span>';
          return `
            <a href="#/play/${p.id}" class="problem-card">
              <span class="unit-no">${esc(shortGrade(meta.grade.name))}</span>
              <span class="unit-body">
                <span class="p-title">${esc(p.title)}</span>
                <span class="unit-domain">${esc(meta.unit.name)}</span>
              </span>
              ${status}
            </a>`;
        }));
      return `<h2 class="semester-title">${DIFF_NAMES[level]} · ${cards.length}문제</h2>
        <div class="problem-list">${cards.join('')}</div>`;
    }).join('');
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
          ? (rec.perfect ? '<span class="p-status perfect">완벽</span>' : '<span class="p-status solved">해결</span>')
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

  /* ---------- 랜덤 문제 세트 ---------- */
  const SET_TYPES = [
    { id: 'mix', name: '골고루 세트', desc: '기본·응용·심화를 섞어서 5문제', size: 5 },
    { id: 'basic', name: '기본 다지기', desc: '기본 문제만 모아서 5문제', size: 5 },
    { id: 'challenge', name: '심화 도전', desc: '심화 문제만 골라서 3문제', size: 3 },
    { id: 'new', name: '새 문제만', desc: '아직 안 풀어 본 문제 5문제', size: 5 },
    { id: 'review', name: '복습 세트', desc: '힌트를 썼거나 헤맸던 문제 다시 5문제', size: 5 }
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function collectProblems(cur, scope) {
    const targets = activeUnits(cur).filter(x => scope === 'all' || x.grade.id === scope);
    const loaded = (await Promise.all(targets.map(async x => {
      try { return await Data.getUnit(x.unit.id); } catch { return null; }
    }))).filter(Boolean);
    return loaded.flatMap(u => u.problems.map(p => ({ id: p.id, difficulty: p.difficulty })));
  }

  async function buildSet(cur, scope, type) {
    const pool = await collectProblems(cur, scope);
    const rec = id => Store.getProblem(id);
    let picked = [];
    if (type.id === 'mix') {
      const byDiff = d => shuffle(pool.filter(p => p.difficulty === d));
      picked = [...byDiff(1).slice(0, 2), ...byDiff(2).slice(0, 2), ...byDiff(3).slice(0, 1)];
    } else if (type.id === 'basic') {
      picked = shuffle(pool.filter(p => p.difficulty === 1)).slice(0, type.size);
    } else if (type.id === 'challenge') {
      picked = shuffle(pool.filter(p => p.difficulty === 3)).slice(0, type.size);
    } else if (type.id === 'new') {
      picked = shuffle(pool.filter(p => { const r = rec(p.id); return !(r && r.solved); })).slice(0, type.size);
    } else if (type.id === 'review') {
      picked = shuffle(pool.filter(p => {
        const r = rec(p.id);
        return r && r.solved && (r.attempts > 0 || r.hints > 0 || r.revealed);
      })).slice(0, type.size);
    }
    if (picked.length === 0) return null;
    return { ids: shuffle(picked).map(p => p.id), index: 0, typeName: type.name, ts: Date.now() };
  }

  async function viewSets(scope) {
    scope = scope || 'all';
    const cur = await Data.getCurriculum();
    const grades = cur.grades.filter(g => g.status === 'active');
    const chips = [
      `<a href="#/sets" class="chip ${scope === 'all' ? 'active' : ''}">전체</a>`,
      ...grades.map(g =>
        `<a href="#/sets/${g.id}" class="chip ${scope === g.id ? 'active' : ''}">${esc(shortGrade(g.name))}</a>`)
    ].join('');

    const cards = SET_TYPES.map(t => `
      <button class="grade-row set-type" data-type="${t.id}">
        <span class="grade-badge">${t.size}</span>
        <span class="grade-info"><span class="grade-name">${esc(t.name)}</span>
        <span class="grade-sub">${esc(t.desc)}</span></span>
        <span class="grade-arrow">›</span>
      </button>`).join('');

    app.innerHTML = `
      <div class="page-head"><h1>랜덤 문제 세트</h1>
      <p class="unit-meta">범위를 고르고 세트를 뽑으면, 매번 다른 문제 조합이 나와요.</p></div>
      <div class="chip-row">${chips}</div>
      <div class="grade-list">${cards}</div>
      <p class="unit-guide" id="set-msg"></p>`;

    app.querySelectorAll('.set-type').forEach(btn =>
      btn.addEventListener('click', async () => {
        const type = SET_TYPES.find(t => t.id === btn.dataset.type);
        const set = await buildSet(cur, scope, type);
        if (!set) {
          document.getElementById('set-msg').textContent =
            type.id === 'review' ? '아직 복습할 문제가 없어요. 먼저 몇 문제 풀어 볼까요?'
            : type.id === 'new' ? '이 범위의 문제를 모두 풀었어요! 다른 범위를 골라 보세요.'
            : '뽑을 문제가 없어요. 다른 범위를 골라 보세요.';
          return;
        }
        Store.saveSet(set);
        location.hash = `#/play/${set.ids[0]}`;
      }));
  }

  /* ---------- 내 기록 ---------- */
  async function viewMe() {
    const cur = await Data.getCurriculum();
    const game = Store.getGame();
    const level = Store.levelInfo(game.xp);
    const problems = Store.load().problems;
    const solvedCount = Object.values(problems).filter(r => r.solved).length;
    const perfectCount = Object.values(problems).filter(r => r.perfect).length;

    const gradeRows = await Promise.all(cur.grades.filter(g => g.status === 'active').map(async g => {
      const unitIds = g.semesters.flatMap(s => s.units.map(u => u.id));
      let done = 0, total = 0;
      for (const uid of unitIds) {
        try {
          const u = await Data.getUnit(uid);
          total += u.problems.length;
          done += u.problems.filter(p => { const r = problems[p.id]; return r && r.solved; }).length;
        } catch { /* skip */ }
      }
      const pct = total ? Math.round(done / total * 100) : 0;
      return `<div class="grade-row" style="cursor:default">
        <span class="grade-badge">${esc(shortGrade(g.name))}</span>
        <span class="grade-info"><span class="grade-name">${done}/${total} 해결</span></span>
        <span class="unit-right"><span class="progress-track"><span class="progress-fill ${pct === 100 ? 'full' : ''}" style="width:${pct}%"></span></span></span>
      </div>`;
    }));

    const badges = Object.entries(Store.BADGES).map(([id, b]) => {
      const earned = !!game.badges[id];
      return `<div class="badge-card ${earned ? '' : 'locked'}">
        <span class="badge-icon">${earned ? '🎖' : '🔒'}</span>
        <strong>${esc(b.name)}</strong>
        <span>${esc(b.desc)}</span>
      </div>`;
    }).join('');

    app.innerHTML = `
      <div class="page-head"><h1>내 기록</h1></div>
      <div class="story-card">
        <div class="level-bar-row">
          <span class="level-name">${esc(level.name)}</span>
          <span class="progress-track level-track"><span class="progress-fill" style="width:${level.progress}%"></span></span>
          <span class="level-next">${level.nextMin ? `${level.xp}/${level.nextMin} XP` : `${level.xp} XP · MAX`}</span>
        </div>
        <div class="stats" style="margin:14px 0 0">
          <span>해결 ${solvedCount}</span>
          <span>완벽 풀이 ${perfectCount}</span>
          <span>${game.streak.days >= 2 ? `🔥 ${game.streak.days}일 연속` : `연속 ${game.streak.days || 0}일`}</span>
        </div>
      </div>
      <h2 class="section-title">배지</h2>
      <div class="badge-grid">${badges}</div>
      <h2 class="section-title">학년별 진도</h2>
      <div class="grade-list">${gradeRows.join('')}</div>
      <p style="margin-top:28px"><button id="btn-reset" class="btn ghost">기록 모두 지우기</button></p>`;

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('진도, XP, 배지가 모두 지워져요. 정말 지울까요?')) {
        Store.reset();
        location.hash = '#/';
      }
    });
  }

  /* ---------- 문제 플레이 ---------- */
  async function viewPlay(problemId) {
    const found = await Data.findProblem(problemId);
    if (!found) throw new Error('없는 문제예요.');
    // 세트에 포함된 문제면 세트 진행 위치를 동기화
    const set = Store.getSet();
    if (set) {
      const i = set.ids.indexOf(problemId);
      if (i >= 0 && i !== set.index) { set.index = i; Store.saveSet(set); }
    }
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
      else if (page === 'grades') await viewGrades();
      else if (page === 'grade') await viewGrade(arg);
      else if (page === 'explore') await viewExplore(arg);
      else if (page === 'sets') await viewSets(arg);
      else if (page === 'me') await viewMe();
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
