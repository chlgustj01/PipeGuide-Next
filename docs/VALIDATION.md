# UI MVP 검증 — 2026-10-28

신규 저장소 `https://github.com/chlgustj01/PipeGuide-Next.git`를 별도 경로에 clone한 뒤 작성했다. 기존 Unity 저장소, 기존 배포 HTML, GitHub 원격 저장소·브랜치를 변경하지 않았다. commit/push/배포는 수행하지 않았다.

## 변경 파일

- `index.html`: 독립 화면 구조
- `src/styles.css`: 다크 블루 UI, 세로 메뉴, 전체 화면 뷰포트, 필요 시 표시하는 패널
- `src/main.js`, `src/state.js`, `src/icons.js`: UI 조립·상태·아이콘
- `src/viewport.js`: 모델이 없는 WebGL 뷰포트와 UI 방향 표시
- `src/modules/contracts.js`, `src/modules/registry.js`: 7개 독립 모듈 계약과 등록·호출·취소 인터페이스
- `package.json`, `.gitignore`, `scripts/serve.mjs`, `scripts/check.mjs`: 무설치 실행·정적 검증
- `tests/ui-state.test.mjs`, `tests/module-registry.test.mjs`: 상태 분리·미연결·어댑터 격리·취소 테스트
- `AGENTS.md`, `README.md`, `docs/UI-ANALYSIS.md`, `docs/MODULES.md`, 이 문서: 원칙·분석·구조·실행·검증 기록

## 결과

- `npm test`: 9개 통과, 실패 0
- `npm run check`: JS 구문, HTML/CSS/JS 분리, 외부 HTML 리소스 없음, 레거시 전역 참조 없음 확인
- `npm run dev`: 127.0.0.1:4190에서 독립 실행
- 브라우저: WebGL 준비 상태, 탐색/문제 검토/경로 개선 전환, 비활성 기능 사유, 검색 결과의 데이터 없음 안내, 대상 탭, 2D/3D 보기, 방향 회전/초기화, 설정 7개 모듈, Escape 닫기와 `/` 검색 포커스 확인
- 입력 문자열은 텍스트로 표시됨을 확인
- 브라우저 콘솔 오류 0

## 한계와 다음 단계

실제 도메인 모듈·모델 로더·데이터 업로드·판정·승인·경로 계산·검사·비교는 구현하지 않았다. 계약의 실제 응답 스키마와 도메인별 입력 검증은 각 모듈을 연결할 때 구현해야 한다. 현재 WebGL 형상은 UI 방향 표시만이며 실제 설계 데이터가 아니다. 정적 배포에는 index.html과 src 디렉터리를 함께 제공한다.
