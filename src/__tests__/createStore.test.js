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

  test("resetState is exposed and restores the initial state", async () => {
    const store = createStore("cs-reset", { count: 0 });
    await store.initializeStore();
    await store.setState({ count: 7 });

    expect(store.getState("count")).toBe(7);

    store.resetState();
    expect(store.getState("count")).toBe(0);
  });

  test("blacklist option keeps a key out of persistence", async () => {
    const store = createStore(
      "cs-bl",
      { session: "", count: 0 },
      { blacklist: ["session"] }
    );
    await store.initializeStore();
    await store.setState({ session: "abc", count: 2 });

    const reloaded = createStore(
      "cs-bl",
      { session: "", count: 0 },
      { blacklist: ["session"] }
    );
    await reloaded.initializeStore();

    expect(reloaded.getState("count")).toBe(2);
    expect(reloaded.getState("session")).toBe("");
  });

  test("subscribe accepts a key for granular notifications", async () => {
    const store = createStore("cs-keyed", { a: 1, b: 2 });
    await store.initializeStore();

    const aListener = jest.fn();
    store.subscribe(aListener, "a");

    await store.setState({ b: 5 });
    expect(aListener).not.toHaveBeenCalled();

    await store.setState({ a: 9 });
    expect(aListener).toHaveBeenCalledTimes(1);
  });
});
