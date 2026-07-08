import { renderHook, act } from "@testing-library/react";
import { useStoreState } from "../useStoreState";
import { createStore } from "../../createStore";
import { MMKV } from "react-native-mmkv";

function createFakeStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: (key) => (key ? state[key] : state),
    setState: (updates) => {
      state = { ...state, ...updates };
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

beforeEach(() => {
  MMKV.__resetAll();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe("useStoreState", () => {
  test("returns the current value for the given key", () => {
    const store = createFakeStore({ count: 5 });
    const { result } = renderHook(() => useStoreState(store, "count"));

    expect(result.current[0]).toBe(5);
  });

  test("updates local state when the store notifies subscribers", () => {
    const store = createFakeStore({ count: 5 });
    const { result } = renderHook(() => useStoreState(store, "count"));

    act(() => {
      store.setState({ count: 6 });
    });

    expect(result.current[0]).toBe(6);
  });

  test("setter writes the new value through to the store", () => {
    const store = createFakeStore({ count: 5 });
    const { result } = renderHook(() => useStoreState(store, "count"));

    act(() => {
      result.current[1](10);
    });

    expect(store.getState("count")).toBe(10);
    expect(result.current[0]).toBe(10);
  });

  test("unsubscribes from the store on unmount", () => {
    const store = createFakeStore({ count: 5 });
    const { unmount } = renderHook(() => useStoreState(store, "count"));

    unmount();

    expect(() => store.setState({ count: 7 })).not.toThrow();
  });

  test("logs an error and does not crash when given an invalid store", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useStoreState(null, "count"));

    expect(result.current[0]).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid store provided to useStoreState"
    );

    errorSpy.mockRestore();
  });

  test("works end to end with a real MMKV-backed store", async () => {
    const store = createStore("hook-integration", { count: 0 });
    await store.initializeStore();

    const { result } = renderHook(() => useStoreState(store, "count"));

    expect(result.current[0]).toBe(0);

    act(() => {
      result.current[1](3);
    });

    expect(result.current[0]).toBe(3);
    expect(store.getState("count")).toBe(3);
  });
});
