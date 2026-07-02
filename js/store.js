/* localStorage 진도 저장. 스키마:
   { problems: { [problemId]: { solved, attempts, hints, revealed, ts } } } */
const Store = (() => {
  const KEY = 'storymath.v1';

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
    state.problems[id] = {
      solved: true,
      attempts,
      hints,
      revealed,
      ts: Date.now(),
      // 완벽 풀이(오답·힌트·정답보기 없이) 기록은 한번 얻으면 유지
      perfect: (prev && prev.perfect) || (attempts === 0 && hints === 0 && !revealed)
    };
    save(state);
  }

  function unitProgress(unit) {
    const state = load();
    const solved = unit.problemIds.filter(id => state.problems[id] && state.problems[id].solved);
    return { solved: solved.length, total: unit.problemIds.length };
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  return { getProblem, recordSolved, unitProgress, reset, load };
})();
