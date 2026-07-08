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
});
