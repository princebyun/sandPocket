/**
 * In-memory LRU cache for compiled Java JAR buffers.
 * Served directly to CheerpJ WebAssembly runtime over HTTP.
 */

const jarCache = new Map();
const MAX_CACHE_SIZE = 50;

export function storeJar(id, buffer) {
  if (jarCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = jarCache.keys().next().value;
    jarCache.delete(oldestKey);
  }
  jarCache.set(id, buffer);
}

export function retrieveJar(id) {
  return jarCache.get(id);
}
