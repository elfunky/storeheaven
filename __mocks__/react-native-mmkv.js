// Manual mock of the native `react-native-mmkv` module for tests.
// MMKV is a native/JSI module and cannot run under plain Jest, so this
// stand-in mimics its synchronous get/set/delete API with an in-memory
// Map, keyed per storage `id` (matching real MMKV's per-instance-id persistence).
class MMKV {
  constructor(config = {}) {
    this.id = config.id || "mmkv.default";
    if (!MMKV.instances.has(this.id)) {
      MMKV.instances.set(this.id, new Map());
    }
    this.store = MMKV.instances.get(this.id);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  getString(key) {
    return this.store.get(key);
  }

  delete(key) {
    this.store.delete(key);
  }

  clearAll() {
    this.store.clear();
  }
}

MMKV.instances = new Map();
MMKV.__resetAll = () => {
  MMKV.instances = new Map();
};

module.exports = { MMKV };
