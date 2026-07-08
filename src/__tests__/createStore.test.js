import { createStore } from "../createStore";
import { MMKV } from "react-native-mmkv";

beforeEach(() => {
  MMKV.__resetAll();
});

describe("createStore", () => {
  test("exposes the expected store API", () => {
    const store = createStore("demo", { count: 0 });

    expect(typeof store.initializeStore).toBe("function");
    expect(typeof store.getState).toBe("function");
    expect(typeof store.setState).toBe("function");
    expect(typeof store.subscribe).toBe("function");
  });

  test("initializes, reads, and updates state end to end", async () => {
    const store = createStore("demo", { count: 0, name: "demo" });
    await store.initializeStore();

    expect(store.getState()).toEqual({ count: 0, name: "demo" });

    const listener = jest.fn();
    store.subscribe(listener);
    await store.setState({ count: 1 });

    expect(store.getState("count")).toBe(1);
    expect(listener).toHaveBeenCalledWith({ count: 1, name: "demo" });
  });

  test("each store name persists independently", async () => {
    const storeA = createStore("store-a", { value: "a" });
    const storeB = createStore("store-b", { value: "b" });

    await storeA.initializeStore();
    await storeB.initializeStore();
    await storeA.setState({ value: "updated" });

    expect(storeA.getState("value")).toBe("updated");
    expect(storeB.getState("value")).toBe("b");
  });
});
