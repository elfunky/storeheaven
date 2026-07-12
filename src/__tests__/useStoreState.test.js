import { renderHook, act } from "@testing-library/react";
import { createStore } from "../createStore";
import { useStoreState } from "../hooks/useStoreState";
import { MMKV } from "react-native-mmkv";

beforeEach(() => {
  MMKV.__resetAll();
});

describe("useStoreState", () => {
  test("reads the current value and updates it through the store", async () => {
    const store = createStore("hook-store", { count: 0 });
    await store.initializeStore();

    const { result } = renderHook(() => useStoreState(store, "count"));

    expect(result.current[0]).toBe(0);

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
    expect(store.getState("count")).toBe(5);
  });

  test("does not re-render when an unrelated key changes", async () => {
    const store = createStore("hook-store-2", { a: 1, b: 2 });
    await store.initializeStore();

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useStoreState(store, "a");
    });

    const rendersAfterMount = renderCount;

    act(() => {
      store.setState({ b: 99 }); // 'a' is untouched
    });

    expect(result.current[0]).toBe(1);
    expect(renderCount).toBe(rendersAfterMount);
  });
});
