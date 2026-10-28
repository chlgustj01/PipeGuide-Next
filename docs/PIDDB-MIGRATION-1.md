# 기능 이식 1단계 — PidDB 연결 판정

## 분석과 이식 범위

입력 ZIP: `PipeGuide_v10_github.zip`. 원본은 읽기만 했으며 파일 SHA-256을 작업 전후 비교해 동일함을 확인했다. 원본 엔트리 해시는 `PIDDB-PROVENANCE.json`에 기록했다.

- `src/14_piddb.js`: DB 판정 엔진만 이식. ES 모듈 export, 이전 화면 이름이 있는 주석, 좌표 없음 설명만 정리했다. `fromJson`, `linksFor`, `apply`의 분류·필터·묶음·카운트 로직은 변경하지 않았다. XLSX 보조 파서는 원본 엔진에 남아 있으나 이번 UI는 JSON DB만 받는다.
- `src/10_db.js`: JSON 리터럴과 source 값만 데이터 모듈로 추출했다. 기존 런타임 전역 객체를 연결하지 않았다. DB의 도면 픽셀 관측값은 선박 공간 좌표로 사용하지 않는다.
- `contrib/hyeonseo`: 변경 메모·콘솔 결과로 판정 의미와 `excludeDrill:true` 기준을 확인하고, 시연 CSV를 수정 없이 테스트 fixture로 복사했다.

엔진은 Connections의 REVIEW 행을 후보로, 명시적 Connections 연결을 확정으로, 열린 끝·미기재 끝점·짝 없는 관측을 미해결로 유지한다. 장비 도면 참조·Off-page·동일 Canonical·Shared label은 후보이며 같은 도면/라인번호만으로 자동 확정하지 않는다. 선택한 후보를 승인해도 3D나 실제 배관을 생성하지 않는다.

## 실제 연결 API

기존 `contracts.js`와 `registry.js`는 변경하지 않았다. 사용자가 ZIP 참고 DB 또는 JSON DB를 열면 다음 어댑터만 등록한다.

| 모듈 | registry 작업 | 실제 처리 |
| --- | --- | --- |
| connectionApproval | evaluateConnection | `fromJson(db,{excludeDrill:true})`로 만든 계산 그래프의 `linksFor` 판정과 현재 도면 범위 요약 |
| connectionApproval | getDecisions | 원본과 분리한 결정 맵·검토 이력·저장 상태 |
| connectionApproval | recordDecision | 기존 DB 후보 ID에만 승인/거부/되돌리기; 복제 그래프에 `apply` 실행 |
| pidDrawings | listDocuments / getDocument | DB의 도면 메타데이터와 실제 참조 ID; 도면 이미지·OCR 미포함 |

`getDocument`에서 DB에 없는 ID는 null이다. 도면 참조만 있고 Drawings 행이 없는 ID는 `referenceOnly`로 표시한다. 아직 등록하지 않은 선박 구조·장비·배관 네트워크·경로 모듈은 그대로 미연결이다. 호출은 기존 requestId·AbortSignal 계약을 따른다.

## UI와 승인 기록

처음에는 데이터 미연결/빈 상태다. 탐색 패널의 **ZIP 참고 DB 열기**로 실제 추출 DB를 명시적으로 연다. 기본 범위는 시연 5장이다. 실제 JSON DB를 파일로 선택할 수도 있다. 도면 범위와 Line ID별 판정 목록을 표시하며, 연결을 선택해야 근거 상세와 승인·거부·되돌리기가 나타난다. 원본 확정·미해결 행은 후보 승인으로 덮어쓰지 않는다. OCR와 3D 생성은 비활성이다.

탐색 KPI는 현재 도면 범위의 DB 참조 수·후보 판정 행 수·사용자 승인 행 수를 사용한다. 인식 완료는 `—`를 유지한다. DB나 프로젝트가 없으면 숫자를 만들지 않는다. 명시적으로 DB가 로드된 경우 실제 엔진이 반환한 0은 0으로 표시한다. `net.count`는 엔진 내부 링크 수이고, 화면/CSV는 Connections 양 끝을 합친 `linksFor` 행 수이므로 둘을 혼용하지 않는다.

원본 DB는 서비스 내부에서 복제·동결한다. 원래 `apply`가 인자로 받은 net을 갱신하므로 매 계산마다 base 그래프를 복제한다. 결정 맵과 append-only 검토 이벤트는 별도로 저장하며, 되돌리기는 해당 후보의 사용자 결정만 제거해 base 상태를 복원한다. 다른 후보의 결정은 유지한다.

브라우저 저장 키는 `pipeguide-next:piddb-decisions:v1:<DB 및 필터 옵션 SHA-256>`이다. 같은 DB에서는 결정을 복구하고 다른 DB에서는 섞지 않는다. 저장이 차단되거나 용량이 부족하면 세션 내 기록을 유지하고 UI에 저장 불가를 표시한다. 검증 과정의 승인·거부·되돌리기 이벤트도 별도 이력에 남으며, 검증을 마친 연결은 원본 후보 상태로 복원했다.

프로젝트 해제 시 판정 UI와 KPI를 비우고 검토 동작을 숨긴다. 다시 해당 DB 프로젝트를 선택하면 실제 결과를 복구한다. 세 작업 모드 전환은 선택 배관과 공통 WebGL 뷰포트를 재생성하지 않는다.

## 시연 CSV 회귀 결과

CSV의 11행 × 모든 열(LineID, DN, 계통, 양 끝 태그/도면, 상태, 근거, 링크 ID)을 비교했다. 각 도면에 닿는 양쪽 참조를 포함한다.

| 도면 | 확정 | 후보 | 미해결 |
| --- | ---: | ---: | ---: |
| V02_04_010_137 | 0 | 4 | 0 |
| V02_04_010_179 | 0 | 5 | 0 |
| V02_04_010_150 | 0 | 7 | 0 |
| V02_04_010_151 | 0 | 3 | 0 |
| V02_04_010_193 | 0 | 1 | 0 |
| 5장 합집합(중복 제거) | **0** | **11** | **0** |

도면을 공유하는 연결 때문에 각 행의 합은 합집합과 다르다. 원본 엔진의 시추 제외 후 전체 링크 수는 확정 18·후보 21·미해결 69로 일치한다. 시추 라인 191개 제외 규칙도 유지했다.

## 검증과 변경 파일

- `npm test`: 기존 22개 유지 + PidDB 15개 = **37개 통과**.
- `npm run check`: 통과. 기존 모듈 계약·검증 파일 삭제 없음.
- 브라우저: 빈 상태, DB 열기, KPI `5/—/11/0`, 후보 선택, 근거, 승인 `5/—/10/1`, 거부, 되돌리기 `5/—/11/0`, 도면 필터, 프로젝트 해제/복원, 모드·컨텍스트 유지, 별도 이력/설정, 콘솔 오류 없음 확인.
- 원본 ZIP 및 CSV fixture의 SHA-256 동일 확인. 원본 프로젝트 수정 없음. commit/push 없음.

추가: `src/piddb/{engine,reference-db,service,explore}.js`, `tests/piddb-regression.test.mjs`, `tests/fixtures/piddb-five-drawings.csv`, `docs/PIDDB-PROVENANCE.json`, 이 문서.

수정: `src/main.js`, `src/workspace-panels.js`, `src/workspace.css`, `AGENTS.md`, `README.md`, `docs/MODULES.md`. OCR 이미지 인식·독립 네트워크 3D·GA/선박/기관실 좌표·배관 생성·규정 검사·경로 최적화는 이식하지 않았다.
