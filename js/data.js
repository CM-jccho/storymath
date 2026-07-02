/* curriculum.json과 단원별 문제 파일 로딩 (캐시 포함) */
const Data = (() => {
  let curriculum = null;
  const unitCache = {};

  async function getCurriculum() {
    if (!curriculum) {
      const res = await fetch('data/curriculum.json');
      if (!res.ok) throw new Error('교육과정 데이터를 불러올 수 없어요.');
      curriculum = await res.json();
    }
    return curriculum;
  }

  async function getUnit(unitId) {
    if (!unitCache[unitId]) {
      const res = await fetch(`data/problems/${unitId}.json`);
      if (!res.ok) throw new Error(`단원 데이터(${unitId})를 불러올 수 없어요.`);
      unitCache[unitId] = await res.json();
    }
    return unitCache[unitId];
  }

  function findGrade(cur, gradeId) {
    return cur.grades.find(g => g.id === gradeId) || null;
  }

  function findUnitMeta(cur, unitId) {
    for (const g of cur.grades) {
      for (const sem of g.semesters) {
        const u = sem.units.find(u => u.id === unitId);
        if (u) return { grade: g, semester: sem.semester, unit: u };
      }
    }
    return null;
  }

  async function findProblem(problemId) {
    // problemId 형식: <unitId>-d<난이도>-<번호>, unitId 형식: e4-1-3
    const unitId = problemId.split('-').slice(0, 3).join('-');
    const unit = await getUnit(unitId);
    const problem = unit.problems.find(p => p.id === problemId);
    return problem ? { unit, problem } : null;
  }

  return { getCurriculum, getUnit, findGrade, findUnitMeta, findProblem };
})();
