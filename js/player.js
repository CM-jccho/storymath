/* 인터랙티브 단계별 풀이 엔진 */
const Player = (() => {
  const PHASE_INFO = {
    '이해': { icon: '🔍', className: 'phase-understand', tip: '문제가 무엇을 말하는지 파악해요' },
    '계획': { icon: '🗺️', className: 'phase-plan', tip: '어떻게 풀지 작전을 세워요' },
    '실행': { icon: '✏️', className: 'phase-execute', tip: '세운 계획대로 계산해요' },
    '반성': { icon: '💡', className: 'phase-reflect', tip: '답이 말이 되는지 확인해요' }
  };
  const DIFF_NAMES = { 1: '기본', 2: '응용', 3: '심화' };
  const REVEAL_AFTER = 3; // 이 횟수만큼 틀리면 '정답 보기' 제공

  let S = null; // 현재 플레이 상태

  function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  // 4자리 이상 정수에 3자리 콤마 (소수부는 그대로, '2026년' 같은 연도는 제외)
  function addCommas(escaped) {
    return String(escaped).replace(/(\d+)(\.\d+)?/g, (m, int, dec, offset, str) => {
      const after = str.charAt(offset + m.length);
      if (int.length < 4 || after === '년') return m;
      return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec || '');
    });
  }
  // 일반 텍스트: 이스케이프 + 콤마
  function fmt(text) {
    return addCommas(esc(text));
  }
  // 여러 줄 텍스트: + 줄바꿈
  function nl2br(text) {
    return fmt(text).replace(/\n/g, '<br>');
  }
  // 스토리·질문: 숫자를 강조 칩으로 감싸 "숫자 찾기"를 돕는다
  function nl2brNum(text) {
    return nl2br(text).replace(/(\d[\d,]*(?:\.\d+)?)/g, '<span class="num">$1</span>');
  }

  function start(container, unit, problem) {
    S = {
      container, unit, problem,
      stepIndex: 0,
      wrongTotal: 0,
      hintsUsed: 0,
      revealedCount: 0,
      stepWrong: 0,
      hintShown: false,
      multiSel: new Set(),
      solvedSteps: [] // { step, answerText, revealed }
    };
    render();
  }

  function answerText(step) {
    if (step.type === 'input') return step.answer + (step.unit || '');
    if (step.type === 'single') return step.options[step.answer];
    return step.answer.map(i => step.options[i]).join(', ');
  }

  function checkAnswer(step, given) {
    if (step.type === 'single') return given === step.answer;
    if (step.type === 'multi') {
      const want = [...step.answer].sort().join(',');
      const got = [...given].sort().join(',');
      return want === got;
    }
    // input: 공백·쉼표 제거 후 비교, 둘 다 숫자면 수치로 비교 (0.50 == 0.5, 1,000 == 1000)
    const norm = String(given).replace(/[\s,]+/g, '');
    const want = String(step.answer).replace(/[\s,]+/g, '');
    const NUM = /^-?\d+(\.\d+)?$/;
    if (NUM.test(norm) && NUM.test(want)) return parseFloat(norm) === parseFloat(want);
    return norm === want;
  }

  function render() {
    const p = S.problem;
    const steps = p.steps;
    const dots = steps.map((st, i) => {
      const info = PHASE_INFO[st.phase];
      const cls = i < S.stepIndex ? 'done' : i === S.stepIndex ? 'now' : '';
      return `<span class="dot ${info.className} ${cls}" title="${esc(st.phase)}"></span>`;
    }).join('');

    const solvedHtml = S.solvedSteps.map((s, i) => {
      const info = PHASE_INFO[s.step.phase];
      return `
        <div class="step-card solved">
          <div class="step-head">
            <span class="phase-badge ${info.className}">${info.icon} ${esc(s.step.phase)}</span>
            <span class="step-status">${s.revealed ? '👀 정답 봄' : '✅'}</span>
          </div>
          <p class="step-prompt">${nl2br(s.step.prompt)}</p>
          <p class="chosen-answer">${fmt(s.answerText)}</p>
          <p class="step-explain">${nl2br(s.step.explain)}</p>
        </div>`;
    }).join('');

    const isDone = S.stepIndex >= steps.length;
    S.container.innerHTML = `
      <div class="player">
        <div class="player-top">
          <a href="#/unit/${S.unit.unitId}" class="back-link">← ${esc(S.unit.unitName)}</a>
          <span class="diff-badge diff-${p.difficulty}">${DIFF_NAMES[p.difficulty]}</span>
        </div>
        <div class="story-card">
          <h2>${esc(p.title)}</h2>
          <p class="story">${nl2brNum(p.story)}</p>
          <p class="question">❓ ${nl2brNum(p.question)}</p>
        </div>
        <div class="step-dots">${dots}</div>
        <div class="steps">${solvedHtml}</div>
        <div id="current-step"></div>
      </div>`;

    if (isDone) renderComplete();
    else renderStep();
  }

  function renderStep() {
    const step = S.problem.steps[S.stepIndex];
    const info = PHASE_INFO[step.phase];
    const box = S.container.querySelector('#current-step');

    let body = '';
    if (step.type === 'input') {
      body = `
        <div class="input-row">
          <input type="text" id="step-input" class="answer-input" autocomplete="off" inputmode="decimal">
          ${step.unit ? `<span class="input-unit">${esc(step.unit)}</span>` : ''}
          <button id="btn-check" class="btn primary">확인</button>
        </div>`;
    } else {
      const multi = step.type === 'multi';
      body = `
        <div class="options">
          ${step.options.map((o, i) =>
            `<button class="option" data-i="${i}">${multi ? '<span class="checkbox"></span>' : ''}${fmt(o)}</button>`
          ).join('')}
        </div>
        ${multi ? '<button id="btn-check" class="btn primary">선택 완료</button>' : ''}`;
    }

    box.innerHTML = `
      <div class="step-card current">
        <div class="step-head">
          <span class="phase-badge ${info.className}">${info.icon} ${esc(step.phase)}</span>
          <span class="phase-tip">${esc(info.tip)}</span>
        </div>
        <p class="step-prompt">${nl2br(step.prompt)}</p>
        ${step.type === 'multi' ? '<p class="multi-note">해당하는 것을 모두 고르고 [선택 완료]를 눌러요.</p>' : ''}
        ${body}
        <div class="feedback" id="feedback"></div>
        <div class="step-actions">
          <button id="btn-hint" class="btn ghost">💡 힌트 보기</button>
          <button id="btn-reveal" class="btn ghost hidden">👀 정답 보기</button>
        </div>
      </div>`;

    S.stepWrong = 0;
    S.hintShown = false;
    S.multiSel = new Set();
    bindStep(step, box);
  }

  function bindStep(step, box) {
    const feedback = box.querySelector('#feedback');
    const hintBtn = box.querySelector('#btn-hint');
    const revealBtn = box.querySelector('#btn-reveal');

    hintBtn.addEventListener('click', () => {
      if (!S.hintShown) { S.hintsUsed++; S.hintShown = true; }
      feedback.className = 'feedback hint';
      feedback.innerHTML = `💡 ${nl2br(step.hint)}`;
    });

    revealBtn.addEventListener('click', () => {
      S.revealedCount++;
      pass(step, true);
    });

    function wrong() {
      S.wrongTotal++;
      S.stepWrong++;
      feedback.className = 'feedback wrong';
      feedback.innerHTML = '🤔 음, 다시 한번 생각해 볼까요? 힌트가 필요하면 힌트 버튼을 눌러요.';
      const card = box.querySelector('.step-card');
      card.classList.remove('shake');
      void card.offsetWidth; // 애니메이션 재시작
      card.classList.add('shake');
      if (S.stepWrong >= REVEAL_AFTER) revealBtn.classList.remove('hidden');
    }

    function attempt(given) {
      if (checkAnswer(step, given)) pass(step, false);
      else wrong();
    }

    if (step.type === 'input') {
      const input = box.querySelector('#step-input');
      const check = () => { if (input.value.trim() !== '') attempt(input.value); };
      box.querySelector('#btn-check').addEventListener('click', check);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      input.focus();
    } else if (step.type === 'single') {
      box.querySelectorAll('.option').forEach(btn =>
        btn.addEventListener('click', () => attempt(Number(btn.dataset.i))));
    } else {
      box.querySelectorAll('.option').forEach(btn =>
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.i);
          if (S.multiSel.has(i)) { S.multiSel.delete(i); btn.classList.remove('selected'); }
          else { S.multiSel.add(i); btn.classList.add('selected'); }
        }));
      box.querySelector('#btn-check').addEventListener('click', () => {
        if (S.multiSel.size > 0) attempt(S.multiSel);
      });
    }
  }

  function pass(step, revealed) {
    S.solvedSteps.push({ step, answerText: answerText(step), revealed });
    S.stepIndex++;
    render();
    // 새로 완료된 단계가 보이도록 스크롤
    const cards = S.container.querySelectorAll('.step-card');
    const last = cards[cards.length - 1];
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderComplete() {
    const p = S.problem;
    Store.recordSolved(p.id, {
      attempts: S.wrongTotal,
      hints: S.hintsUsed,
      revealed: S.revealedCount > 0
    });

    const perfect = S.wrongTotal === 0 && S.hintsUsed === 0 && S.revealedCount === 0;
    const next = S.unit.problems.find(q => q.difficulty === p.difficulty + 1);

    S.container.querySelector('#current-step').innerHTML = `
      <div class="complete-card">
        <div class="complete-emoji">${perfect ? '🏆' : '🎉'}</div>
        <h2>${perfect ? '완벽한 풀이!' : '문제 해결!'}</h2>
        <p class="final-answer">답: <strong>${fmt(p.finalAnswer)}</strong></p>
        <div class="wrapup">📌 ${nl2br(p.wrapUp)}</div>
        <div class="stats">
          <span>다시 생각한 횟수 ${S.wrongTotal}</span>
          <span>힌트 ${S.hintsUsed}</span>
        </div>
        <div class="complete-actions">
          <button id="btn-retry" class="btn ghost">다시 풀기</button>
          ${next ? `<a class="btn primary" href="#/play/${next.id}">다음 단계 도전 (${DIFF_NAMES[next.difficulty]}) →</a>` : ''}
          <a class="btn ${next ? 'ghost' : 'primary'}" href="#/unit/${S.unit.unitId}">단원으로</a>
        </div>
      </div>`;
    S.container.querySelector('#btn-retry').addEventListener('click', () =>
      start(S.container, S.unit, S.problem));
  }

  return { start, DIFF_NAMES, PHASE_INFO };
})();
