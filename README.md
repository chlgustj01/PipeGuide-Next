# PipeGuide-Next

기존 PiPeGuide와 독립된 선박 배관 워크스페이스 UI MVP. HTML·CSS·ES 모듈을 분리했으며, 외부 패키지·CDN·설계 데이터·레거시 코드에 의존하지 않습니다.

## 실행

Node.js 20 이상에서 실행합니다. 의존성 설치는 필요 없습니다.

```sh
npm run dev
```

브라우저에서 `http://127.0.0.1:4190`을 엽니다. ES 모듈을 사용하므로 파일 더블클릭 대신 HTTP 서버로 실행하세요. 서버는 로컬 인터페이스에만 바인딩됩니다. 정적 호스팅에는 `index.html`과 `src/`를 함께 올립니다.

## 검증

```sh
npm test
npm run check
```

## 포함한 UI

- 세로 작업 메뉴: 탐색 · 문제 검토 · 경로 개선
- 공통 WebGL 뷰포트, UI용 방향 표시와 입체/평면 보기
- 검색의 데이터 없음 안내, 배관·장비·공간 탭, 필요할 때 여는 작업·설정 패널
- 키보드 검색(`/`), 패널 닫기(`Esc`), 뷰포트 방향키·초기화(`Home`)
- 독립 모듈 계약 7개와 등록·호출·취소 인터페이스

실제 모델·GA 좌표·전역 선박 치수·P&ID·장비·네트워크·판정·승인·경로 계산·비교는 포함하지 않았습니다. UI에는 가짜 검사 결과나 설계 좌표를 표시하지 않습니다. 현재 어댑터 등록은 0개입니다.

구조: `index.html`(마크업), `src/styles.css`(표현), `src/main.js`(UI 조립), `src/state.js`(UI 상태), `src/viewport.js`(빈 WebGL 뷰포트), `src/modules/`(기능 경계).

[프로젝트 원칙](AGENTS.md) · [디자인 분석](docs/UI-ANALYSIS.md) · [모듈 인터페이스](docs/MODULES.md)
