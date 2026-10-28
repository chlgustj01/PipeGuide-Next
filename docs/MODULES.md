# 독립 기능 인터페이스

이 문서는 계약 초안이다. 해당 기능은 구현되지 않았고 UI는 어댑터를 자동 호출하지 않는다. UI 상태와 도메인 데이터는 분리된다.

| 모듈 ID | 작업 계약 | 명시적으로 받아야 할 입력/반환 정보 |
| --- | --- | --- |
| pidDrawings | listDocuments, getDocument | 문서 ID·개정, 도면 출처·문서 자원 |
| shipStructure | listModels, getSpatialReference, listSpaces | 모델 ID·버전, 공간 ID, 출처·단위·좌표계·변환·확인 상태 |
| equipmentPlacement | listEquipment, listNozzles | 모델/공간 참조, 장비·노즐 ID, 위치의 좌표계 참조 |
| pipingNetwork | getNetwork | 네트워크 개정, 노드·간선·문서/모델 참조·출처 |
| connectionApproval | evaluateConnection, getDecisions, recordDecision | 연결 후보·판정 근거·규칙 버전, 판정과 사용자 승인 각각의 상태·이력 |
| routePlanning | generateCandidates, checkInterference | 시작/종료 노즐·좌표계·단위·명시적 장애물·제약·검사 기준, 후보·검사 근거 |
| routeComparison | compareRoutes | 기준/대안 버전·동일 좌표계 여부·지표 정의, 비교 결과와 근거 |

어댑터 형태: `{ schemaVersion: '1', name, capabilities: ['작업명'], invoke(method, input, { requestId, signal }) }`.

등록은 `createModuleRegistry().register(id, adapter)`, 해제는 반환된 함수로 한다. 등록된 어댑터만 호출할 수 있고, 각 호출에는 requestId와 AbortSignal이 필수다. 미등록·지원하지 않는 작업·취소 상태는 오류로 처리한다. 어댑터는 반드시 취소 신호를 존중해야 한다. UI에서 실행 중·오류·완료 표시와 도메인별 응답 검증은 실제 모듈을 연결하는 단계에서 추가한다.

`recordDecision`은 부작용이 있는 작업이므로 향후에도 명시적 사용자 승인 동작에만 연결한다. 등록이나 조회가 승인을 수행해서는 안 된다. 기하학적 인접과 P&ID 연결, 연결 판정과 사용자 승인을 서로 대체하지 않는다.

## 외부 공간 데이터 원칙

모델마다 `sourceId`, `revision`, `units`, `axes`, `handedness`, `originDescription`, `transformToWorkspace`, `verification`을 제공한다. 변환은 가져온 데이터의 명시적 메타데이터다. 미확인 값은 자동 추정하거나 정답으로 표시하지 않는다. 외부 입력 검증과 실제 모델 로더는 아직 구현하지 않았다. 전역 선박 크기·GA 좌표·기본 단위는 정의하지 않는다.

다른 모듈의 내부 객체를 직접 참조하지 않고 필요한 문서·모델·공간·장비의 ID와 버전을 입력으로 전달한다. UI 방향 표시의 정규화 화면 좌표를 모델 좌표로 사용해서는 안 된다.
