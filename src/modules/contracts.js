// Contracts only. No domain implementation, imported legacy state or sample design data.
export const contracts = Object.freeze({
  pidDrawings: { name: 'P&ID 도면', description: '도면·개정·문서 출처', methods: ['listDocuments', 'getDocument'] },
  shipStructure: { name: '선박 모델 · 공간', description: '외부 모델·공간·좌표계 메타데이터', methods: ['listModels', 'getSpatialReference', 'listSpaces'] },
  equipmentPlacement: { name: '장비 · 노즐', description: '장비 배치·노즐·모델 참조', methods: ['listEquipment', 'listNozzles'] },
  pipingNetwork: { name: '배관 네트워크', description: '명시적 노드·연결·출처', methods: ['getNetwork'] },
  connectionApproval: { name: '연결 판정 · 승인', description: '판정 근거·검토·승인 이력', methods: ['evaluateConnection', 'getDecisions', 'recordDecision'] },
  routePlanning: { name: '경로 생성 · 간섭', description: '명시적 제약·장애물·검사 기준', methods: ['generateCandidates', 'checkInterference'] },
  routeComparison: { name: '경로 전후 비교', description: '버전·지표·비교 근거', methods: ['compareRoutes'] }
});
for (const contract of Object.values(contracts)) { Object.freeze(contract.methods); Object.freeze(contract); }

/**
 * @typedef {{ sourceId: string, revision: string, uri?: string }} Provenance
 * @typedef {{ id: string, units: string, axes: string, handedness: 'left'|'right', originDescription: string, transformToWorkspace: number[], verification: 'unverified'|'verified' }} SpatialReference
 * @typedef {{ requestId: string, signal: AbortSignal }} RequestContext
 * @typedef {{ schemaVersion: '1', name: string, capabilities: string[], invoke: (method:string, input:unknown, context:RequestContext)=>Promise<unknown> }} ModuleAdapter
 * Spatial references belong to imported datasets. No workspace default dimensions or units exist.
 */
