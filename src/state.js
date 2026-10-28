export const modes = Object.freeze({
  explore: { title: '선박 탐색', kicker: 'SHIP EXPLORER', description: '배관·장비·공간을 한눈에 확인하세요.' },
  review: { title: '문제 검토', kicker: 'ISSUE REVIEW', description: '검토 근거와 승인 상태를 구분해 확인하세요.' },
  improve: { title: '경로 개선', kicker: 'ROUTE IMPROVEMENT', description: '현재 경로와 대안을 비교하는 작업 공간입니다.' }
});
export const categories = Object.freeze({ pipes: '배관', equipment: '장비', spaces: '공간' });
export function createUIState() {
  let value = Object.freeze({ mode: 'explore', category: 'pipes', view: '3d', rotating: false });
  const listeners = new Set();
  return {
    get: () => value,
    set(patch) {
      const next = { ...value, ...patch };
      if (!modes[next.mode] || !categories[next.category] || !['3d', '2d'].includes(next.view) || typeof next.rotating !== 'boolean') throw new TypeError('잘못된 UI 상태');
      if (Object.keys(patch).some(key => !(key in value))) throw new TypeError('정의되지 않은 UI 상태');
      value = Object.freeze(next); listeners.forEach(fn => fn(value));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
