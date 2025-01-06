import PersistentStateManager from "./PersistentStateManager";

export const createStore = (name, initialState) => {
  const persistentState = new PersistentStateManager(name); // unique key for each store

  return {
    initializeStore: () => persistentState.initialize(initialState),
    getState: (key) => persistentState.getState(key),
    setState: (updates) => persistentState.setState(updates),
    subscribe: (listener) => persistentState.subscribe(listener),
  };
};
