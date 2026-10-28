import { contracts } from './contracts.js';

/** Independent adapters with explicit capabilities; nothing is registered by default. */
export function createModuleRegistry() {
  const adapters = new Map();
  return Object.freeze({
    register(id, adapter) {
      const contract = contracts[id];
      if (!contract) throw new TypeError(`알 수 없는 모듈: ${id}`);
      if (adapters.has(id)) throw new Error(`이미 등록된 모듈: ${id}`);
      if (!adapter || adapter.schemaVersion !== '1' || typeof adapter.name !== 'string' || !adapter.name.trim() || typeof adapter.invoke !== 'function' || !Array.isArray(adapter.capabilities) || !adapter.capabilities.length || adapter.capabilities.some(m => !contract.methods.includes(m))) throw new TypeError('잘못된 모듈 어댑터');
      const registered = Object.freeze({ name: adapter.name, capabilities: Object.freeze([...adapter.capabilities]), invoke: adapter.invoke.bind(adapter) });
      adapters.set(id, registered);
      return () => { if (adapters.get(id) === registered) adapters.delete(id); };
    },
    list() { return Object.entries(contracts).map(([id, c]) => ({ id, ...c, status: adapters.has(id) ? 'connected' : 'disconnected', adapterName: adapters.get(id)?.name ?? null })); },
    async invoke(id, method, input, { signal, requestId } = {}) {
      const adapter = adapters.get(id);
      if (!adapter) throw new Error(`모듈 미연결: ${id}`);
      if (!adapter.capabilities.includes(method)) throw new Error(`지원하지 않는 작업: ${method}`);
      if (!signal || typeof signal.throwIfAborted !== 'function' || !requestId) throw new TypeError('requestId와 AbortSignal이 필요합니다');
      signal.throwIfAborted();
      const result = await adapter.invoke(method, input, { signal, requestId });
      signal.throwIfAborted();
      return result;
    }
  });
}
