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

    // Sync the current value (it may have changed between render and effect).
    setLocalState(store.getState(key));

    // Subscribe scoped to `key` so this component only re-renders when THIS
    // key changes. Without a key it falls back to a whole-store subscription.
    const unsubscribe = store.subscribe(() => {
      setLocalState(store.getState(key));
    }, key);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [store, key]);

  // Return the local state and a setter that updates the store
  return [state, (value) => store.setState({ [key]: value })];
};
