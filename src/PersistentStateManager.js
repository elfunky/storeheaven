import { MMKV } from "react-native-mmkv";

class PersistentStateManager {
  constructor(storageKey = "persistentStatetate", options = {}) {
    this.storageKey = storageKey;
    this.storage = new MMKV({ id: storageKey });
    this.state = {};
    this.initialState = {};
    // Whole-store subscribers: notified with the full state on every change.
    this.listeners = new Set();
    // Per-key subscribers: notified only when their specific key changes.
    this.keyedListeners = new Map();
    this.isInitialized = false;
    // Keys that live in memory but are never written to disk.
    this.blacklist = Array.isArray(options.blacklist) ? options.blacklist : [];
    // Last string we actually persisted, used to skip redundant writes.
    this._lastPersisted = undefined;
  }

  // The subset of state we are allowed to persist (blacklist removed).
  getPersistableState() {
    if (this.blacklist.length === 0) {
      return this.state;
    }
    const persistable = {};
    for (const key of Object.keys(this.state)) {
      if (!this.blacklist.includes(key)) {
        persistable[key] = this.state[key];
      }
    }
    return persistable;
  }

  // Guarantees blacklisted keys always come from initialState, never disk,
  // even if they were persisted by an older version of the app.
  stripBlacklisted(source) {
    if (!source || this.blacklist.length === 0) {
      return source || {};
    }
    const result = {};
    for (const key of Object.keys(source)) {
      if (!this.blacklist.includes(key)) {
        result[key] = source[key];
      }
    }
    return result;
  }

  loadState() {
    try {
      const savedState = this.storage.getString(this.storageKey);
      return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
      console.error("Failed to load state from MMKV:", error);
      return null;
    }
  }

  saveState() {
    try {
      const serialized = JSON.stringify(this.getPersistableState());
      // Skip the native write when nothing we persist has actually changed.
      // This removes redundant disk writes WITHOUT ever delaying a real one,
      // so there is no data-loss window.
      if (serialized === this._lastPersisted) {
        return;
      }
      this.storage.set(this.storageKey, serialized);
      this._lastPersisted = serialized;
    } catch (error) {
      console.error("Failed to save state to MMKV:", error);
    }
  }

  async initialize(initialState = {}) {
    if (this.isInitialized) {
      console.warn("PersistentStateManager has already been initialized");
      return;
    }

    this.initialState = { ...initialState };
    const loadedState = this.stripBlacklisted(this.loadState());
    this.state = { ...initialState, ...loadedState };
    this.saveState();
    this.isInitialized = true;
    this.notifyListeners();
  }

  getState(key) {
    if (!this.isInitialized) {
      console.warn("PersistentStateManager has not been initialized");
      return key ? undefined : {};
    }
    return key ? this.state[key] : this.state;
  }

  async setState(updates) {
    if (!this.isInitialized) {
      console.warn("PersistentStateManager has not been initialized");
      return;
    }

    // Track which keys actually changed so per-key subscribers fire precisely.
    // Whole-store subscribers are always notified (v2.0.0 behaviour preserved),
    // and redundant disk writes are skipped inside saveState(), not here.
    const changedKeys = [];
    if (updates && typeof updates === "object") {
      for (const key of Object.keys(updates)) {
        if (!Object.is(this.state[key], updates[key])) {
          changedKeys.push(key);
        }
      }
      this.state = { ...this.state, ...updates };
    }

    this.saveState();
    this.notifyListeners(changedKeys);
  }

  // Restores every key to its initial value (e.g. on logout) and persists it.
  resetState() {
    if (!this.isInitialized) {
      console.warn("PersistentStateManager has not been initialized");
      return;
    }

    const previousState = this.state;
    this.state = { ...this.initialState };

    const changedKeys = [];
    const allKeys = new Set([
      ...Object.keys(previousState),
      ...Object.keys(this.state),
    ]);
    for (const key of allKeys) {
      if (!Object.is(previousState[key], this.state[key])) {
        changedKeys.push(key);
      }
    }

    this.saveState();
    this.notifyListeners(changedKeys);
  }

  subscribe(listener, key) {
    if (typeof listener !== "function") {
      console.error("Listener must be a function");
      return () => {};
    }

    // No key -> whole-store subscription (backward compatible).
    if (key === undefined || key === null) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    // Keyed subscription -> only notified when this key changes.
    if (!this.keyedListeners.has(key)) {
      this.keyedListeners.set(key, new Set());
    }
    const set = this.keyedListeners.get(key);
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.keyedListeners.delete(key);
      }
    };
  }

  notifyListeners(changedKeys) {
    // Whole-store subscribers always receive the full state.
    this.listeners.forEach((listener) => listener(this.state));

    if (!changedKeys || this.keyedListeners.size === 0) {
      return;
    }
    for (const key of changedKeys) {
      const set = this.keyedListeners.get(key);
      if (set) {
        set.forEach((listener) => listener(this.state[key], this.state));
      }
    }
  }
}

export default PersistentStateManager;
