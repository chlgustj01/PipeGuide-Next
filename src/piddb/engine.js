/* ===== 14_piddb.js — P&ID Master DB 연결 판정 엔진 (현서) =====
   PipeGuide V2 의 PidDB 에서 판정 엔진만 분리. 화면(이전 화면)·three.js·DOM·임시 좌표(ASSUMED 배치)·3D 형상은 뺐다.
   입력: PID_DB (10_db.js, fromJson) 또는 PID_Master_DB_v6.xlsx (readXlsxBuffer → build). 원본은 읽기만 함.
   판정: CONFIRMED = Connections 시트 연결 (DB Status REVIEW 행은 CANDIDATE) · 사용자가 승인한 후보
         CANDIDATE  = Equipment_Refs.LineID · OffPage_Links · 같은 Canonical · Shared_Line_Candidates (같은 라인번호·같은 도면 참조만으로 확정하지 않음)
         UNRESOLVED = 열린 끝(객체 미기재) · 장비 목록·연결 기호에 없는 끝점 · 짝 못 찾은 연결 기호 관측
   승인: apply(net, { 연결ID: 'approved' | 'rejected' }) — 순수 함수, 저장은 v10 쪽.
   v10: fromJson(PID_DB, { excludeDrill: true }) → linksFor(net, 도면ID 배열) */
const PidDB = (() => {
  const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
  const colIdx = ref => { let c = 0; for (const ch of ref.replace(/\d+/g, '')) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };
  const attr = (tag, a) => (tag.match(new RegExp('\\s' + a + '="([^"]*)"')) || [])[1];

  // zip 항목 { 이름: 문자열 } → { 시트명: [[셀...]] }. 네임스페이스 접두사(x: 등)는 떼고 해석
  function parseWorkbook(files) {
    const txt = k => (files[k] || '').replace(/<(\/?)[A-Za-z]+:(?=[A-Za-z])/g, '<$1');
    const shared = [...txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
      .map(m => unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
    const rels = Object.fromEntries([...txt('xl/_rels/workbook.xml.rels').matchAll(/<Relationship [^>]*>/g)].map(m => [attr(m[0], 'Id'), attr(m[0], 'Target')]));
    const res = {};
    for (const m of txt('xl/workbook.xml').matchAll(/<sheet [^>]*>/g)) {
      const target = rels[attr(m[0], 'r:id')].replace(/^\/?xl\//, '');
      const rows = [];
      for (const r of txt('xl/' + target).matchAll(/<row[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
        const row = [];
        for (const c of (r[1] || '').matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const t = (c[2].match(/t="(\w+)"/) || [])[1], body = c[3] || '';
          const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          let val = null;
          if (t === 's') val = shared[+v];
          else if (t === 'inlineStr') val = unesc([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
          else if (v !== undefined) val = t === 'str' || t === 'e' ? unesc(v) : t === 'b' ? v === '1' : +v;
          row[colIdx(c[1])] = val;
        }
        rows.push(Array.from(row, x => (x === undefined ? null : x)));
      }
      res[unesc(attr(m[0], 'name'))] = rows;
    }
    return res;
  }

  // 브라우저: ArrayBuffer → zip 해제 (deflate-raw 는 DecompressionStream) → parseWorkbook
  async function readXlsxBuffer(ab) {
    const buf = new Uint8Array(ab), dv = new DataView(ab);
    let eocd = buf.length - 22;
    while (eocd >= 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd--;
    if (eocd < 0) throw new Error('xlsx(zip) 형식이 아님');
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    const files = {}, dec = new TextDecoder('utf-8');
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = dec.decode(buf.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (!/\.(xml|rels)$/.test(name)) continue;
      const st = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = buf.slice(st, st + csize);
      files[name] = method === 8
        ? await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
        : dec.decode(data);
    }
    return parseWorkbook(files);
  }

  // 시트 → 머리글 이름으로 된 객체 배열 (빈 행 제외)
  const table = (wb, name) => {
    const rows = wb[name] || [];
    const h = rows[0] || [];
    return rows.slice(1).filter(r => r.some(v => v !== null && v !== '')).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? null : r[i]])));
  };

  const OPC_RE = /^D[A-Z0-9]{2,4}R\d{3}-\d+$/;   // 도면 간 연결 기호 (예 DA733R001-2) — Connector_Observations 의 ConnectorText 형식
  const NZ_RE = /^(.+)\.(N\w*)$/;                // 장비태그.노즐 (예 315YD3620.N1)

  /* 연결(link) = 배관 ↔ 객체 1쌍. 상태 3가지
     CONFIRMED  : Connections 시트의 연결 (DB Status 가 REVIEW 인 행은 CANDIDATE) — 사용자가 승인한 후보도 CONFIRMED
     CANDIDATE  : 다른 시트에서 나온 후보 (장비 도면 참조 · Off-page 링크 · 같은 Canonical · 같은 라인번호 도면 연속). 승인 전에는 배관을 만들지 않음
     UNRESOLVED : 끝 객체가 없거나(열린 끝) 장비 목록·연결 기호에 없는 끝점, 짝을 못 찾은 연결 기호 관측 */
  const LINK_TYPE = {
    CONN: 'Connections 연결', OPEN_END: '열린 끝 (다른 끝 객체 미기재)', UNLISTED: '미확정 끝점', REF: '장비 도면 참조 (Equipment_Refs.LineID)',
    OFFPAGE: 'Off-page 링크 연결 기호', SAME_CANON: '같은 Canonical 라인 (표기 차이)', SHARED_LABEL: '같은 라인번호 도면 연속 (Shared_Line_Candidates)', CONNECTOR_OBS: '연결 기호 관측 (짝 미확인)',
  };

  function build(wb, source) {
    const T = {}; ['Drawings', 'Lines', 'Line_Occurrences', 'OffPage_Links', 'Equipment_Refs', 'Valves', 'Connections', 'Review_Items', 'Connector_Observations', 'Shared_Line_Candidates', 'Change_Log'].forEach(k => T[k] = table(wb, k));
    const missingSheets = ['Lines', 'Equipment_Refs', 'Connections'].filter(k => !wb[k]);
    if (missingSheets.length) throw new Error('필수 시트 없음: ' + missingSheets.join(', '));
    const issues = [], issue = (level, code, id, msg) => issues.push({ level, code, id, msg });
    const nodes = new Map(), lines = new Map(), links = new Map();

    // 배관 (Lines)
    for (const r of T.Lines) {
      const occ = T.Line_Occurrences.filter(o => o.LineID === r.LineID);
      lines.set(r.LineID, { id: 'LN:' + r.LineID, lineId: r.LineID, canonical: r.CanonicalLineID, size: r.NominalSize, spec: r.Spec, service: r.Service, system: r.System,
        status: r.Status, evidence: r.Evidence, notes: r.Notes, inLines: true, drawings: [...new Set(occ.map(o => o.DrawingID).filter(Boolean))],
        offPage: T.OffPage_Links.filter(l => l.LineID === r.LineID).map(l => ({ id: l.LinkID, from: l.FromDrawingID, to: l.ToDrawingID, text: l.ConnectorText, status: l.LinkStatus })),
        conns: [] });
    }
    const lineOf = (lid, conn) => {
      if (!lines.has(lid)) {
        lines.set(lid, { id: 'LN:' + lid, lineId: lid, canonical: null, size: null, spec: null, service: null, system: null, status: 'NOT_IN_LINES', evidence: conn.Evidence, notes: null, inLines: false, drawings: [conn.DrawingID].filter(Boolean), offPage: [], conns: [] });
        issue('WARN', 'LINE_NOT_IN_LINES', lid, `${conn.ConnectionID} 의 LineID 가 Lines 시트에 없음 (속성 누락)`);
      }
      return lines.get(lid);
    };
    // 같은 (유형·배관·객체) 연결은 하나로 묶고 근거만 모음
    const addLink = (type, status, line, node, basis, extra = {}) => {
      const id = `${type}:${line}|${node || basis.ref}`;
      const L = links.get(id);
      if (L) { L.basis.push(basis); if (status === 'CONFIRMED') L.status = 'CONFIRMED'; return L; }
      const nl = Object.assign({ id, type, status, base: status, line, node: node || null, basis: [basis] }, extra);
      links.set(id, nl); return nl;
    };
    const opcNode = s => {
      const id = 'OPC:' + s;
      if (!nodes.has(id)) nodes.set(id, { id, kind: 'opc', tag: s, obs: T.Connector_Observations.filter(o => o.ConnectorText === s).map(o => ({ id: o.ObservationID, drawing: o.DrawingID, label: o.AdjacentLabel, target: o.TargetDrawingID, status: o.MatchStatus })) });
      return id;
    };

    // 장비 (Equipment_Refs) — 같은 태그는 한 장비로 묶고 도면 참조를 모두 보관
    for (const r of T.Equipment_Refs) {
      const id = 'EQ:' + r.EquipmentTag;
      if (!nodes.has(id)) nodes.set(id, { id, kind: 'equip', tag: r.EquipmentTag, type: r.Type, inRefs: true, refs: [] });
      nodes.get(id).refs.push({ refId: r.EquipmentRefID, drawing: r.DrawingID, lineId: r.LineID, status: r.Status, evidence: r.Evidence, notes: r.Notes });
    }
    for (const e of nodes.values()) if (e.refs.length > 1) issue('INFO', 'EQUIP_MULTI_REF', e.tag, `같은 태그가 ${e.refs.length}건 (${[...new Set(e.refs.map(x => x.drawing))].join(', ')}) — 한 장비로 묶음`);

    // Connections 끝점 해석 — DB 문자열만으로 판정, 모르는 것은 UNLISTED 로 남김
    const endpoint = (s, conn) => {
      s = String(s == null ? '' : s).trim();
      if (!s || s === conn.LineID) return { open: true };       // 끝점 칸이 비었거나 라인번호 자체 = 이 쪽 끝 객체 미기재
      const nz = s.match(NZ_RE);
      if (nz) {
        const eq = 'EQ:' + nz[1];
        if (!nodes.has(eq)) { nodes.set(eq, { id: eq, kind: 'equip', tag: nz[1], type: null, inRefs: false, refs: [] }); issue('WARN', 'EQUIP_NOT_IN_REFS', nz[1], `노즐 ${s} 의 장비가 Equipment_Refs 에 없음`); }
        const id = 'NZ:' + s;
        if (!nodes.has(id)) nodes.set(id, { id, kind: 'nozzle', tag: s, nozzle: nz[2], parent: eq });
        return { id };
      }
      if (nodes.has('EQ:' + s)) return { id: 'EQ:' + s };
      if (OPC_RE.test(s)) return { id: opcNode(s) };
      const id = 'UN:' + s;
      if (!nodes.has(id)) { nodes.set(id, { id, kind: 'unlisted', tag: s }); issue('WARN', 'ENDPOINT_UNLISTED', s, `${conn.ConnectionID} 끝점 "${s}" 이 장비 목록·연결 기호 어디에도 없음 (미확정 객체)`); }
      return { id, unlisted: true };
    };
    const connections = [];
    for (const c of T.Connections) {
      if (!c.LineID) { issue('WARN', 'CONN_NO_LINE', c.ConnectionID, 'LineID 비어 있음 — 배관으로 그리지 않음'); continue; }
      const L = lineOf(c.LineID, c), a = endpoint(c.FromObjectID, c), b = endpoint(c.ToObjectID, c);
      const cn = { id: c.ConnectionID, line: L.id, lineId: c.LineID, from: a.id || null, to: b.id || null, fromRaw: c.FromObjectID, toRaw: c.ToObjectID,
        relation: c.Relation, status: c.Status, evidence: c.Evidence, notes: c.Notes, drawing: c.DrawingID, open: !(a.id && b.id) };
      connections.push(cn); L.conns.push(cn.id);
      const basis = { src: 'Connections', ref: c.ConnectionID, drawing: c.DrawingID, dbStatus: c.Status, evidence: c.Evidence, note: [c.Relation, c.Notes].filter(Boolean).join(' · ') };
      for (const [e, raw, side] of [[a, c.FromObjectID, 'From'], [b, c.ToObjectID, 'To']]) {
        if (e.open) addLink('OPEN_END', 'UNRESOLVED', L.id, null, Object.assign({}, basis, { ref: `${c.ConnectionID}.${side}`, note: `${side} = "${raw == null ? '' : raw}" (객체 미기재) · ${basis.note}` }));
        else if (e.unlisted) addLink('UNLISTED', 'UNRESOLVED', L.id, e.id, basis);
        else addLink('CONN', c.Status === 'REVIEW' ? 'CANDIDATE' : 'CONFIRMED', L.id, e.id, basis);
      }
    }
    // 후보 1: 장비 도면 참조 (같은 도면에 라인번호가 함께 적힘) — 노즐·연결 미확정
    for (const e of nodes.values()) if (e.kind === 'equip') for (const r of e.refs) if (r.lineId) {
      if (!lines.has(r.lineId)) { issue('WARN', 'REF_LINE_NOT_IN_LINES', r.refId, `${r.lineId} 가 Lines 에 없음`); continue; }
      addLink('REF', 'CANDIDATE', 'LN:' + r.lineId, e.id, { src: 'Equipment_Refs', ref: r.refId, drawing: r.drawing, dbStatus: r.status, evidence: r.evidence, note: r.notes || '' });
    }
    // 후보 2: Off-page 링크 — ConnectorText 의 연결 기호마다 배관 ↔ 기호
    for (const o of T.OffPage_Links) {
      if (!lines.has(o.LineID)) { issue('WARN', 'OFFPAGE_LINE_NOT_IN_LINES', o.LinkID, `${o.LineID} 가 Lines 에 없음`); continue; }
      const codes = String(o.ConnectorText || '').split('/').map(s => s.trim()).filter(Boolean);
      for (const s of codes) {
        if (!OPC_RE.test(s)) { issue('INFO', 'OFFPAGE_CODE_FORMAT', o.LinkID, `연결 기호 형식 아님: "${s}"`); continue; }
        addLink('OFFPAGE', 'CANDIDATE', 'LN:' + o.LineID, opcNode(s), { src: 'OffPage_Links', ref: o.LinkID, drawing: `${o.FromDrawingID} → ${o.ToDrawingID}`, dbStatus: o.LinkStatus, evidence: o.Evidence, note: [o.ConnectorText, o.Notes].filter(Boolean).join(' · ') });
      }
    }
    // 후보 3: 같은 CanonicalLineID 를 가진 서로 다른 LineID (표기 차이) — 승인하면 한 배관으로 묶음
    const byCanon = new Map();
    for (const l of lines.values()) if (l.canonical) (byCanon.get(l.canonical) || byCanon.set(l.canonical, []).get(l.canonical)).push(l);
    for (const [cn, ls] of byCanon) if (ls.length > 1) for (const o of ls.slice(1))
      addLink('SAME_CANON', 'CANDIDATE', ls[0].id, o.id, { src: 'Lines', ref: cn, drawing: [...ls[0].drawings, ...o.drawings].join(', '), dbStatus: `${ls[0].status} / ${o.status}`, evidence: '', note: `${ls[0].lineId} · ${o.lineId} → Canonical ${cn}` }, { lineB: true });
    // 후보 4: 같은 라인번호가 두 도면에 관측 — 도면 연속성 후보 (객체 연결 아님, 승인해도 3D 변화 없음)
    for (const c of T.Shared_Line_Candidates) {
      const l = lines.get(c.CanonicalLabel) || (byCanon.get(c.CanonicalLabel) || [])[0];
      if (!l) { issue('INFO', 'SHARED_LABEL_NO_LINE', c.CandidateID, `${c.CanonicalLabel} 가 Lines 에 없음`); continue; }
      addLink('SHARED_LABEL', 'CANDIDATE', l.id, null, { src: 'Shared_Line_Candidates', ref: c.CandidateID, drawing: `${c.DrawingA} ↔ ${c.DrawingB}`, dbStatus: c.Status, evidence: [c.EvidenceA, c.EvidenceB].filter(Boolean).join(' / '), note: c.WhyPending || '' });
    }
    // 미해결: 연결 기호 관측 중 상대 도면을 못 찾은 것 (배관 없음)
    for (const o of T.Connector_Observations) if (/UNMATCHED|PENDING/.test(o.MatchStatus || ''))
      links.set('CONNECTOR_OBS:' + o.ObservationID, { id: 'CONNECTOR_OBS:' + o.ObservationID, type: 'CONNECTOR_OBS', status: 'UNRESOLVED', base: 'UNRESOLVED', line: null, node: null, code: o.ConnectorText,
        basis: [{ src: 'Connector_Observations', ref: o.ObservationID, drawing: o.DrawingID, dbStatus: o.MatchStatus, evidence: o.Evidence, note: [o.ConnectorText, o.AdjacentLabel, o.ReviewNote].filter(Boolean).join(' · ') }] });

    if (!T.Valves.length) issue('INFO', 'VALVES_EMPTY', 'Valves', 'Valves 시트에 행이 없음 — 밸브는 표시하지 않음');
    const openReview = T.Review_Items.filter(r => r.Status === 'OPEN');
    if (openReview.length) issue('INFO', 'REVIEW_OPEN', `${openReview.length}건`, 'Review_Items 에 OPEN 검토 항목');

    const net = {
      meta: { schema: 'pidnet-2', source: source || 'PID_Master_DB_v6.xlsx', dbName: ((table(wb, 'START_HERE').find(r => r['항목'] === 'DB 이름') || {})['설명']) || null,
        sheets: Object.fromEntries(Object.keys(wb).map(k => [k, Math.max(0, (wb[k] || []).filter(r => r.some(v => v !== null && v !== '')).length - 1)])),
        coord: { status: 'NONE', basis: 'DB 에 XYZ 없음 — 좌표·3D 형상을 생성하지 않음' } },
      nodes: [...nodes.values()], lines: [...lines.values()], connections, links: [...links.values()],
      review: T.Review_Items.map(r => ({ id: r.ReviewID, priority: r.Priority, type: r.ObjectType, obj: r.ObjectID, issue: r.Issue, status: r.Status, next: r.NextAction })),
      issues,
    };
    return apply(net, {});
  }

  /* 사용자 결정(승인·거부) 반영 → 상태 · 배관 묶음 · 연결 여부 · 개수를 다시 계산 (순수 계산, 저장은 v10 쪽). decisions = { linkId: 'approved' | 'rejected' }
     원본 base 상태는 그대로 두고 status 만 바꿈. 결과는 같은 net 객체 (갱신) */
  function apply(net, decisions) {
    decisions = decisions || {};
    for (const l of net.links) {
      const d = l.base === 'CANDIDATE' ? decisions[l.id] : null;
      l.decision = d || null;
      l.status = d === 'approved' ? 'CONFIRMED' : d === 'rejected' ? 'REJECTED' : l.base;
    }
    const live = l => l.status !== 'REJECTED';
    // 승인된 SAME_CANON 은 배관 묶음(group)으로 합침
    const par = new Map(net.lines.map(l => [l.id, l.id])), find = x => (par.get(x) === x ? x : (par.set(x, find(par.get(x))), par.get(x)));
    net.links.filter(l => l.type === 'SAME_CANON' && l.status === 'CONFIRMED').forEach(l => par.set(find(l.node), find(l.line)));
    net.lines.forEach(l => l.group = find(l.id));
    // 연결 여부 (거부된 후보 제외) — 미연결 목록용
    const used = new Set(), usedLine = new Set();
    for (const l of net.links) if (live(l) && l.line && l.type !== 'SHARED_LABEL') { usedLine.add(l.line); if (l.node && !l.lineB) used.add(l.node); }
    for (const n of net.nodes) if (n.kind === 'nozzle' && used.has(n.id)) used.add(n.parent);
    net.nodes.forEach(n => { n.connected = used.has(n.id); n.hidden = n.kind === 'opc' && !n.connected && !(n.obs || []).length ? true : false; });
    net.lines.forEach(l => l.connected = usedLine.has(l.id));
    net.count = countLinks(net);
    return net;
  }
  const countLinks = net => {
    const c = { CONFIRMED: 0, CANDIDATE: 0, UNRESOLVED: 0, REJECTED: 0, approved: 0 };
    net.links.forEach(l => { c[l.status]++; if (l.decision === 'approved') c.approved++; });
    return c;
  };


  /* ---------- v10 연결 ---------- */
  // v10 와 같은 시추 계통 기준 (9_pid_link.js 와 동일, Lines.System 기준)
  const DRILL = /mud|barite|bentonite|nitrogen|tension|cement|well test|burner/i;

  /* PID_DB (10_db.js — 시트명 → 행 객체 배열) → build() 와 같은 net. 엑셀 업로드 없이.
     opts.excludeDrill: Lines.System 이 시추 계통인 라인과, 그 LineID 를 쓰는 행(Line_Occurrences · OffPage_Links · Equipment_Refs · Connections ·
     Shared_Line_Candidates)을 빼고 만든다. 뺀 개수는 net.meta.excluded 에 기록. LineID 가 없거나 Lines 에 없는 행은 계통을 알 수 없어 남긴다. */
  function fromJson(db, opts) {
    opts = opts || {};
    if (!db || !Array.isArray(db.Lines)) throw new Error('PID_DB 형식이 아님 (Lines 배열 없음)');
    const sheets = Object.fromEntries(Object.entries(db).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.slice()]));
    let excluded = null;
    if (opts.excludeDrill) {
      const drillLines = new Set(sheets.Lines.filter(l => DRILL.test(l.System || '')).map(l => l.LineID));
      const drillLabels = new Set([...drillLines, ...sheets.Lines.filter(l => drillLines.has(l.LineID)).map(l => l.CanonicalLineID).filter(Boolean)]);
      excluded = { rule: String(DRILL), basis: 'Lines.System', lines: drillLines.size };
      const cut = (name, f) => { if (!sheets[name]) return; const n0 = sheets[name].length; sheets[name] = sheets[name].filter(r => !f(r)); excluded[name] = n0 - sheets[name].length; };
      cut('Lines', r => drillLines.has(r.LineID));
      ['Line_Occurrences', 'OffPage_Links', 'Equipment_Refs', 'Connections'].forEach(k => cut(k, r => drillLines.has(r.LineID)));
      cut('Shared_Line_Candidates', r => drillLabels.has(r.CanonicalLabel));
    }
    // 행 객체 → 머리글 + 값 배열 (build 가 읽는 형식). meta 는 START_HERE 시트로
    const wb = {};
    for (const [k, rows] of Object.entries(sheets)) {
      const head = [...new Set(rows.flatMap(r => Object.keys(r)))];
      wb[k] = [head, ...rows.map(r => head.map(h => (r[h] === undefined || r[h] === '' ? null : r[h])))];
    }
    if (db.meta && typeof db.meta === 'object') wb.START_HERE = [['항목', '설명'], ...Object.entries(db.meta)];
    const net = build(wb, db.source || 'PID_DB');
    net.meta.from = 'PID_DB (10_db.js)';
    net.meta.excluded = excluded;
    return net;
  }

  // 공칭 구경 (inch 표기) → DN. 표에 없으면 null
  const DN = { '1/2': 15, '3/4': 20, '1': 25, '1 1/4': 32, '1 1/2': 40, '2': 50, '2 1/2': 65, '3': 80, '4': 100, '5': 125, '6': 150, '8': 200, '10': 250, '12': 300, '14': 350, '16': 400, '18': 450, '20': 500, '24': 600 };
  const dnOf = s => {
    if (s == null || s === '') return null;
    const m = String(s).trim().match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:in|inch|"|”)?$/i);
    return m ? (DN[m[1].replace(/\s+/g, ' ')] || null) : null;
  };
  // 라인번호의 계통 코드 (3자리 숫자) — '803-013' → 803, 'MA333-AP-733-061' → 733, 'DL7A4-MH-325-086-HT' → 325
  const sysOf = id => {
    const t = String(id || '').split('-').filter(x => !/^[A-Z]+$/.test(x) || /\d/.test(x));
    if (t.length === 2 && /^\d{3}$/.test(t[0])) return t[0];
    const k = t.length >= 2 && /^\d{3}$/.test(t[t.length - 2]) ? t[t.length - 2] : '';
    return k;
  };

  /* v10 용 판정 목록. drawingIds 에 닿는 연결만 (from·to 도면 중 하나라도). DB 에 없는 연결은 만들지 않는다 — net.links 를 그대로 옮김.
     Connections 행은 양쪽 끝 판정을 합쳐 1줄 (둘 다 확정이면 CONFIRMED, 한쪽이라도 미해결이면 UNRESOLVED, DB REVIEW 면 CANDIDATE).
     나머지는 연결 1건 = 1줄. ids = apply(decisions) 에 쓸 연결 ID */
  function linksFor(net, drawingIds) {
    const want = drawingIds && drawingIds.length ? new Set(drawingIds) : null;
    const N = new Map(net.nodes.map(n => [n.id, n])), Ls = new Map(net.lines.map(l => [l.id, l]));
    const tagOf = id => { const n = N.get(id); return n ? n.tag : ''; };
    const lineOf = id => Ls.get(id) || {};
    const row = (lineId, from, to, status, basis, evidence, ids, extra) => Object.assign({ LineID: lineId || '', dn: dnOf(lineOf('LN:' + lineId).size), sys: sysOf(lineId), from, to, status, basis, evidence, ids }, extra || {});
    const out = [];
    // Connections 행 단위
    const byConn = new Map();
    for (const l of net.links) for (const b of l.basis) if (b.src === 'Connections') {
      const cid = String(b.ref).replace(/\.(From|To)$/, '');
      (byConn.get(cid) || byConn.set(cid, new Set()).get(cid)).add(l);
    }
    for (const c of net.connections) {
      const ls = [...(byConn.get(c.id) || [])];
      const st = ls.some(l => l.status === 'UNRESOLVED') ? 'UNRESOLVED' : ls.some(l => l.status === 'REJECTED') ? 'REJECTED' : ls.some(l => l.status === 'CANDIDATE') ? 'CANDIDATE' : 'CONFIRMED';
      const un = ls.find(l => l.status === 'UNRESOLVED');
      const end = (id, raw) => ({ tag: id ? tagOf(id) : (raw && raw !== c.lineId ? String(raw) : ''), drawing: c.drawing || '' });
      out.push(row(c.lineId, end(c.from, c.fromRaw), end(c.to, c.toRaw), st, un ? un.type : 'CONN', `Connections ${c.id}`, ls.map(l => l.id), { relation: c.relation || '', dbStatus: c.status || '' }));
    }
    for (const l of net.links) {
      if (l.basis.some(b => b.src === 'Connections')) continue;
      const b = l.basis[0], ev = l.basis.map(x => `${x.src} ${x.ref}`).join('; ');
      const L = lineOf(l.line);
      if (l.type === 'REF') out.push(row(L.lineId, { tag: tagOf(l.node), drawing: b.drawing || '' }, { tag: '', drawing: b.drawing || '' }, l.status, 'REF', ev, [l.id]));
      else if (l.type === 'OFFPAGE') { const [fa, fb] = String(b.drawing || '').split(' → '); out.push(row(L.lineId, { tag: '', drawing: fa || '' }, { tag: '', drawing: fb || '' }, l.status, 'OFFPAGE', `${ev} · ${tagOf(l.node)}`, [l.id], { connector: tagOf(l.node) })); }
      else if (l.type === 'SAME_CANON') { const L2 = lineOf(l.node); out.push(row(L.lineId, { tag: '', drawing: (L.drawings || [])[0] || '' }, { tag: '', drawing: (L2.drawings || [])[0] || '' }, l.status, 'SAME_CANON', ev, [l.id], { other: L2.lineId || '' })); }
      else if (l.type === 'SHARED_LABEL') { const [da, db] = String(b.drawing || '').split(' ↔ '); out.push(row(L.lineId, { tag: '', drawing: da || '' }, { tag: '', drawing: db || '' }, l.status, 'SHARED_LABEL', ev, [l.id])); }
      else if (l.type === 'CONNECTOR_OBS') out.push(row('', { tag: l.code || '', drawing: b.drawing || '' }, { tag: '', drawing: '' }, l.status, 'CONNECTOR_OBS', ev, [l.id]));
    }
    return want ? out.filter(r => want.has(r.from.drawing) || want.has(r.to.drawing)) : out;
  }

  return { parseWorkbook, readXlsxBuffer, build, apply, LINK_TYPE, fromJson, linksFor, DRILL };
})();
export { PidDB };
