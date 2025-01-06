import { useState, useEffect } from "react";

export const useStoreState = (store, key) => {
  const [state, setLocalState] = useState(undefined);

  useEffect(() => {
    // Ensure the store is valid
    if (
      !store ||
      typeof store.getState !== "function" ||
      typeof store.subscribe !== "function"
    ) {
      console.error("Invalid store provided to useStoreState");
      return;
    }

    // Get the current state for the key
    const currentState = store.getState(key);
    console.log(`Current state from ${store.name}:`, currentState);

    if (currentState !== undefined) {
      setLocalState(currentState);
    }

    // Subscribe to state changes
    const unsubscribe = store.subscribe((newState) => {
      setLocalState(key ? newState[key] : newState);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [store, key]);

  // Return the local state and a setter that updates the store
  return [state, (value) => store.setState({ [key]: value })];
};
