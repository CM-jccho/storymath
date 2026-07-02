/* localStorage 진도·세트·게임(XP/스트릭/배지) 저장 */
const Store = (() => {
  const KEY = 'storymath.v1';
  const SET_KEY = 'storymath.set.v1';
  const GAME_KEY = 'storymath.game.v1';

  /* ---------- 진도 ---------- */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { problems: {} };
    } catch {
      return { problems: {} };
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function getProblem(id) {
    return load().problems[id] || null;
  }

  function recordSolved(id, { attempts, hints, revealed }) {
    const state = load();
    const prev = state.problems[id];
    const firstSolve = !(prev && prev.solved);
    state.problems[id] = {
      solved: true,
      attempts,
      hints,
      revealed,
      ts: Date.now(),
      perfect: (prev && prev.perfect) || (attempts === 0 && hints === 0 && !revealed)
    };
    save(state);
    return { firstSolve };
  }

  function unitProgress(unit) {
    const state = load();
    const solved = unit.problemIds.filter(id => state.problems[id] && state.problems[id].solved);
    return { solved: solved.length, total: unit.problemIds.length };
  }

  function reset() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(SET_KEY);
    localStorage.removeItem(GAME_KEY);
  }

  /* ---------- 랜덤 문제 세트: { ids, index, typeName, ts } ---------- */
  function getSet() {
    try {
      return JSON.parse(localStorage.getItem(SET_KEY));
    } catch {
      return null;
    }
  }

  function saveSet(set) {
    localStorage.setItem(SET_KEY, JSON.stringify(set));
  }

  function clearSet() {
    localStorage.removeItem(SET_KEY);
  }

  /* ---------- 게임: XP / 레벨 / 스트릭 / 배지 ---------- */
  const LEVELS = [
    { min: 0, name: '수학 새싹' },
    { min: 100, name: '수학 탐험가' },
    { min: 300, name: '문제 해결사' },
    { min: 700, name: '풀이 전략가' },
    { min: 1500, name: '수학 마스터' },
    { min: 3000, name: '수학 레전드' }
  ];
  const BADGES = {
    'first-solve': { name: '첫 걸음', desc: '첫 문제를 해결했어요' },
    'unit-complete': { name: '단원 정복', desc: '한 단원의 모든 문제를 해결했어요' },
    'perfect-10': { name: '완벽주의자', desc: '완벽 풀이 10개를 달성했어요' },
    'challenge-5': { name: '도전자', desc: '심화 문제 5개를 해결했어요' },
    'set-complete': { name: '세트 클리어', desc: '문제 세트를 끝까지 완주했어요' },
    'streak-3': { name: '3일 연속', desc: '3일 연속으로 공부했어요' },
    'streak-7': { name: '일주일 연속', desc: '7일 연속으로 공부했어요' }
  };
  const XP_BY_DIFF = { 1: 10, 2: 20, 3: 30 };

  function getGame() {
    let g;
    try {
      g = JSON.parse(localStorage.getItem(GAME_KEY));
    } catch { /* 손상 시 초기화 */ }
    return g || { xp: 0, streak: { last: null, days: 0 }, badges: {} };
  }

  function saveGame(g) {
    localStorage.setItem(GAME_KEY, JSON.stringify(g));
  }

  function levelInfo(xp) {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
    const cur = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;
    return {
      index: idx,
      name: cur.name,
      xp,
      nextMin: next ? next.min : null,
      progress: next ? Math.min(100, Math.round((xp - cur.min) / (next.min - cur.min) * 100)) : 100
    };
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function touchStreak(g) {
    const t = today();
    if (g.streak.last === t) return;
    const yesterday = new Date(Date.now() - 86400000);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    g.streak.days = g.streak.last === y ? g.streak.days + 1 : 1;
    g.streak.last = t;
  }

  function grantBadge(g, id, newBadges) {
    if (!g.badges[id]) {
      g.badges[id] = Date.now();
      newBadges.push({ id, ...BADGES[id] });
    }
  }

  // 문제 완료 시 호출. unitProblemIds는 단원 완주 배지 판정용.
  function awardForSolve({ difficulty, perfect, revealed, firstSolve, unitProblemIds }) {
    const g = getGame();
    const before = levelInfo(g.xp);
    let xp = 0;
    if (firstSolve) {
      xp = XP_BY_DIFF[difficulty] || 10;
      if (perfect) xp = Math.round(xp * 1.5);
      if (revealed) xp = Math.max(1, Math.round(xp / 2));
    } else {
      xp = 2; // 복습 보상
    }
    g.xp += xp;
    touchStreak(g);

    const newBadges = [];
    const problems = load().problems;
    const solvedList = Object.entries(problems).filter(([, r]) => r.solved);
    grantBadge(g, 'first-solve', newBadges);
    if (unitProblemIds && unitProblemIds.every(id => problems[id] && problems[id].solved)) {
      grantBadge(g, 'unit-complete', newBadges);
    }
    if (solvedList.filter(([, r]) => r.perfect).length >= 10) grantBadge(g, 'perfect-10', newBadges);
    if (solvedList.filter(([id]) => /-d3-/.test(id)).length >= 5) grantBadge(g, 'challenge-5', newBadges);
    if (g.streak.days >= 3) grantBadge(g, 'streak-3', newBadges);
    if (g.streak.days >= 7) grantBadge(g, 'streak-7', newBadges);
    saveGame(g);

    const after = levelInfo(g.xp);
    return { xp, newBadges, levelUp: after.index > before.index, level: after, streak: g.streak.days };
  }

  function awardSetComplete() {
    const g = getGame();
    const newBadges = [];
    grantBadge(g, 'set-complete', newBadges);
    g.xp += 20; // 세트 완주 보너스
    saveGame(g);
    return { xp: 20, newBadges, level: levelInfo(g.xp) };
  }

  return {
    getProblem, recordSolved, unitProgress, reset, load,
    getSet, saveSet, clearSet,
    getGame, levelInfo, awardForSolve, awardSetComplete, BADGES
  };
})();
