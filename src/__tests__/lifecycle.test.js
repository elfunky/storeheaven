import { createStore } from "../createStore";
import { MMKV } from "react-native-mmkv";

// A new store instance on the same storage key models a real app relaunch:
// the in-memory state is gone, and initializeStore() must rebuild it from disk.
// Crash / force-kill / OS-killed-in-background all reduce to the same thing —
// the process ended, and on next launch we read whatever reached disk.
beforeEach(() => {
  MMKV.__resetAll();
});

describe("real-world lifecycle scenarios", () => {
  test("LOGIN: persisted user survives a relaunch, blacklisted token does not", async () => {
    const app1 = createStore(
      "lc-auth",
      { user: null, token: "", isLoading: false },
      { blacklist: ["token", "isLoading"] }
    );
    await app1.initializeStore();
    await app1.setState({ user: { name: "Sam" }, token: "jwt-123" });

    // Relaunch
    const app2 = createStore(
      "lc-auth",
      { user: null, token: "", isLoading: false },
      { blacklist: ["token", "isLoading"] }
    );
    await app2.initializeStore();

    expect(app2.getState("user")).toEqual({ name: "Sam" }); // persisted
    expect(app2.getState("token")).toBe(""); // never written -> initial
  });

  test("LOGOUT: resetState clears data and the reset survives a relaunch", async () => {
    const app1 = createStore("lc-logout", { user: null, cart: [] });
    await app1.initializeStore();
    await app1.setState({ user: { name: "Sam" }, cart: [{ id: 1 }] });

    app1.resetState(); // logout

    const app2 = createStore("lc-logout", { user: null, cart: [] });
    await app2.initializeStore();

    expect(app2.getState("user")).toBeNull();
    expect(app2.getState("cart")).toEqual([]);
  });

  test("CRASH / FORCE-KILL: a non-awaited setState is already on disk (synchronous write)", async () => {
    const app1 = createStore("lc-crash", { count: 0 });
    await app1.initializeStore();

    // Simulate the app dying the instant after setState returns — we do NOT
    // await it. Because the MMKV write is synchronous, the value is already
    // persisted; there is no pending buffer to lose.
    app1.setState({ count: 42 });

    const app2 = createStore("lc-crash", { count: 0 });
    await app2.initializeStore();

    expect(app2.getState("count")).toBe(42);
  });

  test("BACKGROUND then OS-kill: last committed state is restored on next launch", async () => {
    const app1 = createStore("lc-bg", { screen: "home", draft: "" });
    await app1.initializeStore();
    await app1.setState({ screen: "checkout" });
    // App goes to background here. No flush() needed — writes are synchronous,
    // so nothing is buffered. OS may kill the process at any time.

    const app2 = createStore("lc-bg", { screen: "home", draft: "" });
    await app2.initializeStore();
    expect(app2.getState("screen")).toBe("checkout");
  });

  test("API FETCH: server data can be blacklisted so it refetches instead of going stale", async () => {
    const app1 = createStore(
      "lc-api",
      { posts: [], lastFetchedAt: 0 },
      { blacklist: ["posts"] }
    );
    await app1.initializeStore();

    // Simulate a successful fetch.
    await app1.setState({ posts: [{ id: 1 }, { id: 2 }], lastFetchedAt: 1000 });
    expect(app1.getState("posts")).toHaveLength(2); // available in memory now

    const app2 = createStore(
      "lc-api",
      { posts: [], lastFetchedAt: 0 },
      { blacklist: ["posts"] }
    );
    await app2.initializeStore();

    expect(app2.getState("posts")).toEqual([]); // not persisted -> refetch fresh
    expect(app2.getState("lastFetchedAt")).toBe(1000); // metadata persisted
  });

  test("FOREGROUND (warm resume): in-memory state is untouched while the process lives", async () => {
    const app = createStore("lc-fg", { count: 0 });
    await app.initializeStore();
    await app.setState({ count: 7 });

    // Backgrounding/foregrounding without an OS kill keeps the same instance;
    // no re-initialize happens and state is intact.
    expect(app.getState("count")).toBe(7);
  });

  test("RE-INITIALIZE is ignored so a foreground init call cannot wipe live state", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const app = createStore("lc-reinit", { count: 0 });
    await app.initializeStore();
    await app.setState({ count: 5 });

    // A second initializeStore (e.g. accidentally called on resume) is a no-op.
    await app.initializeStore();

    expect(app.getState("count")).toBe(5);
    warnSpy.mockRestore();
  });

  test("SCHEMA GROWTH: a new key added in a later app version falls back to its initial value", async () => {
    // v1 of the app
    const v1 = createStore("lc-schema", { a: 1 });
    await v1.initializeStore();
    await v1.setState({ a: 10 });

    // v2 adds a new key `b`
    const v2 = createStore("lc-schema", { a: 1, b: "new-default" });
    await v2.initializeStore();

    expect(v2.getState("a")).toBe(10); // migrated existing value
    expect(v2.getState("b")).toBe("new-default"); // new key uses its default
  });

  test("OFFLINE: storage is fully local, so reads/writes work with no network", async () => {
    // There is no network path in storehaven; this simply documents that being
    // offline has zero effect on persistence.
    const app = createStore("lc-offline", { queued: [] });
    await app.initializeStore();
    await app.setState({ queued: [{ id: 1 }] });
    expect(app.getState("queued")).toEqual([{ id: 1 }]);
  });
});
