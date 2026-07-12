import PersistentStateManager from "./PersistentStateManager";

export const createStore = (name, initialState, options) => {
  const persistentState = new PersistentStateManager(name, options); // unique key for each store

  return {
    initializeStore: () => persistentState.initialize(initialState),
    getState: (key) => persistentState.getState(key),
    setState: (updates) => persistentState.setState(updates),
    resetState: () => persistentState.resetState(),
    subscribe: (listener, key) => persistentState.subscribe(listener, key),
  };
};
