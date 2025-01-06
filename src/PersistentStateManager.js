import AsyncStorage from "@react-native-async-storage/async-storage";

class PersistentStateManager {
  constructor(storageKey = "persistentStatetate") {
    this.storageKey = storageKey;
    this.state = {};
    this.listeners = new Set();
    this.isInitialized = false;
  }

  async loadState() {
    try {
      const savedState = await AsyncStorage.getItem(this.storageKey);
      return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
      console.error("Failed to load state from AsyncStorage:", error);
      return null;
    }
  }

  async saveState() {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error("Failed to save state to AsyncStorage:", error);
    }
  }

  async initialize(initialState) {
    if (this.isInitialized) {
      console.warn("PersistentStateManager has already been initialized");
      return;
    }

    const loadedState = await this.loadState();
    this.state = { ...initialState, ...loadedState };
    await this.saveState();
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
    await this.saveState();
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
