# storehaven

## **storehaven** is a lightweight, customizable state management library for React Native applications. It simplifies the process of persisting and managing application state across components for **react native**.

## Features

- **Persistent State Management**: Automatically save and load state.
- **Custom Blacklisting**: Exclude specific keys from persistence (e.g. tokens, temporary UI state).
- **Granular Reactivity**: Subscribe to the whole store or a single key so components only re-render when the data they use changes.
- **Reset Support**: Restore a store to its initial state in one call (great for logout).
- **Zero-loss, low-write persistence**: Every real change is written to MMKV synchronously (no data-loss window), while no-op and blacklist-only updates skip the disk write entirely.
- **Easy Integration**: Minimal setup and flexible API.

---

## Installation

Install **storehaven** via npm:

```bash
npm install storehaven react-native-mmkv

or

yarn add storehaven react-native-mmkv
```

> **storehaven** persists state using [`react-native-mmkv`](https://github.com/mrousavy/react-native-mmkv), so it must be installed alongside it as a peer dependency. MMKV relies on JSI and does **not** work inside Expo Go — use a custom dev client (`expo prebuild` / EAS Build) or a bare React Native project instead.

---

# What's New

Three additions that most apps need day to day. All of them are **optional and backward compatible** — existing code keeps working unchanged.

## 1. Blacklist — keep secrets & temporary data off the disk

**What:** Mark keys that should live in memory only and never be written to storage.

**Why it matters:** By default everything is persisted. You almost never want to save an auth token, a password, or a `isLoading` flag to disk — that's a security risk and a source of stale UI. Blacklisting fixes this without splitting your store.

**Where to use:** auth tokens, passwords, one-off UI flags (`isLoading`, `isModalOpen`), form drafts.

```javascript
import { createStore } from "storehaven";

// 3rd argument = options { blacklist }
export const authStore = createStore(
  "auth",
  { user: null, token: "", isLoading: false },
  { blacklist: ["token", "isLoading"] }
);

await authStore.setState({ user: { name: "Sam" }, token: "abc123" });

authStore.getState("token"); // "abc123"  → available in memory
// After the app restarts:
authStore.getState("user");  // { name: "Sam" }  -> persisted
authStore.getState("token"); // ""  -> never written to disk
```

## 2. `resetState()` — clear a store in one call

**What:** Reset every key back to its `initialState` value, persist it, and update the UI.

**Why it matters:** Without it, you'd manually set each key back to default one by one — easy to miss one and leak the previous user's data.

**Where to use:** logout, "clear cart", "start over" / reset flows.

```javascript
const handleLogout = () => {
  authStore.resetState(); // user, token, isLoading → all back to initial
};
```

## 3. Per-key subscriptions — only re-render what actually changed

**What:** `useStoreState(store, key)` now re-renders a component **only** when that specific key changes.

**Why it matters:** Previously any change notified every subscribed component. In a busy screen this causes wasted re-renders. Now a component reading `count` is untouched when `name` changes → faster, smoother UI. **No code change needed — it just works.**

**Where to use:** everywhere you already use `useStoreState`. For non-React listeners, pass a key as the 2nd argument to `subscribe`.

```javascript
const [count, setCount] = useStoreState(demoStore, "count");
// demoStore.setState({ name: "x" }) → this component does NOT re-render.

// Non-React listener scoped to one key:
const unsub = cartStore.subscribe((newValue, fullState) => {
  logEvent("cart_total_changed", { total: newValue });
}, "cartTotal");
```

> **Bonus (automatic):** Setting a key to the value it already has, or changing only a blacklisted key, no longer triggers a disk write — while every real change is still written immediately, so there is **no data-loss window**.

---

# Usage

## 1. Setting Up a Store

### Create a store folder inside store folder create demoStore.js file

#### (note you can provide desired name for store file)

```javascript
import { createStore } from "storehaven";

const demoInitialState = {
  isDemoMode: false,
  customStep: 0,
  apiData: null,
};

// Create a store
export const demoStore = createStore("demo", demoInitialState);

// Optionally exclude keys from persistence (they live in memory only and
// reset to their initial value on every app start):
export const authStore = createStore(
  "auth",
  { token: "", user: null },
  { blacklist: ["token"] }
);
```

## 2. Initializing All Stores

### Initialize all stores in your application using initializeAllStores create index.js in your store folder:

```javascript
import { demoStore } from "./demoStore";
import { detailsStore } from "./detailsStore";

// Function to initialize all stores
export const initializeAllStores = async () => {
  const stores = [demoStore, detailsStore]; // provide created store file name to this stores array
  await Promise.all(stores.map((store) => store.initializeStore()));
};
```

## 3. Integrating in the App Entry Point

### Use the initializeAllStores function in your app's entry point to set up the stores before rendering your app:

```javascript
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { initializeAllStores } from "./store";

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initStores = async () => {
      try {
        await initializeAllStores();
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing stores:", error);
      }
    };

    initStores();
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <YourAppNavigator />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
```

## 4. Using the Store in Components

### Access and update the store state using the useStoreState hook:

```javascript
import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useStoreState } from "storehaven";
import { demoStore } from "./demoStore";

const DemoComponent = () => {
  const [isDemoMode, setDemoMode] = useStoreState(demoStore, "isDemoMode");
  const [customStep, setCustomStep] = useStoreState(demoStore, "customStep");

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Demo Mode: {isDemoMode ? "ON" : "OFF"}</Text>
      <Button
        title={isDemoMode ? "Turn Off Demo Mode" : "Turn On Demo Mode"}
        onPress={() => setDemoMode(!isDemoMode)}
      />

      <Text style={styles.text}>Custom Step: {customStep}</Text>
      <Button title="Next Step" onPress={() => setCustomStep(customStep + 1)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default DemoComponent;
```

# API Reference

### `createStore(name, initialState, options?)`

- **name** (`string`): Unique key for the store.
- **initialState** (`object`): The initial state of the store.
- **options** (`object`, optional):
  - **blacklist** (`string[]`): Keys that are kept in memory but never written to disk. They reset to their `initialState` value on every app start. Use this for auth tokens, drafts, or transient UI flags.

Creates a store with the provided `name` and `initialState`.

---

### `resetState()`

Restores every key to its `initialState` value, persists the reset, and notifies subscribers. Useful for clearing user data on logout.

---

### `initializeStore()`

Initializes the store and loads its state from MMKV.

---

### `getState(key)`

- **key** (`string`, optional): Fetches the value of a specific key in the state. If no key is provided, returns the entire state.

---

### `setState(updates)`

- **updates** (`object`): Partial updates to the store state.

---

### `subscribe(listener, key?)`

- **listener** (`function`): A function called when the state changes.
- **key** (`string`, optional): When provided, the listener fires **only** when that specific key changes, and receives `(newValue, fullState)`. Without a key, the listener fires on every change and receives the full state.

Returns an unsubscribe function to stop listening for changes.

---

### `useStoreState(store, key)`

React hook for accessing and updating store state in functional components.

# Running Tests

```bash
npm test
```

# Contributing

Contributions are welcome! Please fork this repository, make your changes, and submit a pull request.

# License

This project is licensed under the MIT License.
