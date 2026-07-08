import { MMKV } from "react-native-mmkv";

class PersistentStateManager {
  constructor(storageKey = "persistentStatetate") {
    this.storageKey = storageKey;
    this.storage = new MMKV({ id: storageKey });
    this.state = {};
    this.listeners = new Set();
    this.isInitialized = false;
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
      this.storage.set(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error("Failed to save state to MMKV:", error);
    }
  }

  async initialize(initialState) {
    if (this.isInitialized) {
      console.warn("PersistentStateManager has already been initialized");
      return;
    }

    const loadedState = this.loadState();
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

    this.state = { ...this.state, ...updates };
    this.saveState();
    this.notifyListeners();
  }

  subscribe(listener) {
    if (typeof listener !== "function") {
      console.error("Listener must be a function");
      return () => {};
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export default PersistentStateManager;
