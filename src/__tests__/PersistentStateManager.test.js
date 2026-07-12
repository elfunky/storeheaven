import PersistentStateManager from "../PersistentStateManager";
import { MMKV } from "react-native-mmkv";

beforeEach(() => {
  MMKV.__resetAll();
});

describe("PersistentStateManager", () => {
  test("initialize sets state from initialState when nothing is persisted", async () => {
    const manager = new PersistentStateManager("test-store");
    await manager.initialize({ count: 0, name: "demo" });

    expect(manager.getState()).toEqual({ count: 0, name: "demo" });
  });

  test("initialize merges persisted state over initialState", async () => {
    const first = new PersistentStateManager("shared-key");
    await first.initialize({ count: 0, name: "demo" });
    await first.setState({ count: 5 });

    const second = new PersistentStateManager("shared-key");
    await second.initialize({ count: 0, name: "demo" });

    expect(second.getState()).toEqual({ count: 5, name: "demo" });
  });

  test("initialize warns and does nothing when already initialized", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const manager = new PersistentStateManager("test-store");
    await manager.initialize({ count: 0 });
    await manager.initialize({ count: 99 });

    expect(manager.getState()).toEqual({ count: 0 });
    expect(warnSpy).toHaveBeenCalledWith(
      "PersistentStateManager has already been initialized"
    );

    warnSpy.mockRestore();
  });

  test("getState returns a single key or the full state", async () => {
    const manager = new PersistentStateManager("test-store");
    await manager.initialize({ count: 1, name: "demo" });

    expect(manager.getState("count")).toBe(1);
    expect(manager.getState()).toEqual({ count: 1, name: "demo" });
  });

  test("getState warns and returns undefined/empty object before initialization", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const manager = new PersistentStateManager("test-store");

    expect(manager.getState("count")).toBeUndefined();
    expect(manager.getState()).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  test("setState merges updates, persists them, and notifies listeners", async () => {
    const manager = new PersistentStateManager("test-store");
    await manager.initialize({ count: 0, name: "demo" });

    const listener = jest.fn();
    manager.subscribe(listener);
    await manager.setState({ count: 42 });

    expect(manager.getState()).toEqual({ count: 42, name: "demo" });
    expect(listener).toHaveBeenCalledWith({ count: 42, name: "demo" });

    const reloaded = new PersistentStateManager("test-store");
    await reloaded.initialize({ count: 0, name: "demo" });
    expect(reloaded.getState("count")).toBe(42);
  });

  test("setState warns and does nothing before initialization", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const manager = new PersistentStateManager("test-store");

    await manager.setState({ count: 1 });

    expect(manager.getState).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "PersistentStateManager has not been initialized"
    );

    warnSpy.mockRestore();
  });

  test("subscribe rejects non-function listeners", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const manager = new PersistentStateManager("test-store");

    const unsubscribe = manager.subscribe("not-a-function");

    expect(errorSpy).toHaveBeenCalledWith("Listener must be a function");
    expect(() => unsubscribe()).not.toThrow();

    errorSpy.mockRestore();
  });

  test("unsubscribe stops further notifications", async () => {
    const manager = new PersistentStateManager("test-store");
    await manager.initialize({ count: 0 });

    const listener = jest.fn();
    const unsubscribe = manager.subscribe(listener);
    unsubscribe();

    await manager.setState({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  test("loadState recovers from corrupted persisted JSON", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const storage = new MMKV({ id: "corrupted-store" });
    storage.set("corrupted-store", "{not-valid-json");

    const manager = new PersistentStateManager("corrupted-store");
    await manager.initialize({ count: 7 });

    expect(manager.getState()).toEqual({ count: 7 });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load state from MMKV:",
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });

  test("setState with an unchanged value keeps state intact and still notifies whole-store listeners", async () => {
    // Backward compatibility: v2.0.0 always notified whole-store subscribers,
    // even on a no-op update. That is preserved. (Redundant disk writes are
    // skipped internally, but subscribers still fire.)
    const manager = new PersistentStateManager("dirty-store");
    await manager.initialize({ count: 5 });

    const listener = jest.fn();
    manager.subscribe(listener);
    await manager.setState({ count: 5 }); // same value

    expect(listener).toHaveBeenCalledWith({ count: 5 });
    expect(manager.getState("count")).toBe(5);
  });

  test("keyed listeners do NOT fire on a no-op update", async () => {
    const manager = new PersistentStateManager("dirty-store-keyed");
    await manager.initialize({ count: 5 });

    const keyed = jest.fn();
    manager.subscribe(keyed, "count");
    await manager.setState({ count: 5 }); // same value -> count did not change

    expect(keyed).not.toHaveBeenCalled();
  });

  test("blacklisted keys are not persisted and reset to initial on reload", async () => {
    const manager = new PersistentStateManager("bl-store", {
      blacklist: ["token"],
    });
    await manager.initialize({ token: "", count: 0 });
    await manager.setState({ token: "secret", count: 3 });

    // In memory both values are present and usable.
    expect(manager.getState("token")).toBe("secret");
    expect(manager.getState("count")).toBe(3);

    const reloaded = new PersistentStateManager("bl-store", {
      blacklist: ["token"],
    });
    await reloaded.initialize({ token: "", count: 0 });

    expect(reloaded.getState("count")).toBe(3); // persisted
    expect(reloaded.getState("token")).toBe(""); // never persisted -> initial
  });

  test("changing only a blacklisted key leaves persisted data untouched", async () => {
    const manager = new PersistentStateManager("bl-store-2", {
      blacklist: ["temp"],
    });
    await manager.initialize({ temp: "a", count: 0 });
    await manager.setState({ temp: "b" }); // only blacklisted key changes

    expect(manager.getState("temp")).toBe("b"); // in memory it did change

    const reloaded = new PersistentStateManager("bl-store-2", {
      blacklist: ["temp"],
    });
    await reloaded.initialize({ temp: "a", count: 0 });
    expect(reloaded.getState("temp")).toBe("a"); // back to initial
    expect(reloaded.getState("count")).toBe(0);
  });

  test("resetState restores initialState, persists it, and notifies", async () => {
    const manager = new PersistentStateManager("reset-store");
    await manager.initialize({ count: 0, name: "demo" });
    await manager.setState({ count: 10, name: "changed" });

    const listener = jest.fn();
    manager.subscribe(listener);
    manager.resetState();

    expect(manager.getState()).toEqual({ count: 0, name: "demo" });
    expect(listener).toHaveBeenCalledWith({ count: 0, name: "demo" });

    const reloaded = new PersistentStateManager("reset-store");
    await reloaded.initialize({ count: 0, name: "demo" });
    expect(reloaded.getState()).toEqual({ count: 0, name: "demo" });
  });

  test("resetState warns and does nothing before initialization", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const manager = new PersistentStateManager("reset-store-2");

    manager.resetState();

    expect(warnSpy).toHaveBeenCalledWith(
      "PersistentStateManager has not been initialized"
    );
    warnSpy.mockRestore();
  });

  test("keyed subscribe fires only when that key changes", async () => {
    const manager = new PersistentStateManager("keyed-store");
    await manager.initialize({ a: 1, b: 2 });

    const aListener = jest.fn();
    manager.subscribe(aListener, "a");

    await manager.setState({ b: 20 }); // 'a' did not change
    expect(aListener).not.toHaveBeenCalled();

    await manager.setState({ a: 10 }); // 'a' changed
    expect(aListener).toHaveBeenCalledTimes(1);
    expect(aListener).toHaveBeenCalledWith(10, { a: 10, b: 20 });
  });

  test("keyed unsubscribe stops notifications for that key", async () => {
    const manager = new PersistentStateManager("keyed-store-2");
    await manager.initialize({ a: 1 });

    const listener = jest.fn();
    const unsubscribe = manager.subscribe(listener, "a");
    unsubscribe();

    await manager.setState({ a: 2 });
    expect(listener).not.toHaveBeenCalled();
  });
});
