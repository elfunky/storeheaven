# storehaven

## **storehaven** is a lightweight, customizable state management library for React Native applications. It simplifies the process of persisting and managing application state across components for **react native**.

## Features

- **Persistent State Management**: Automatically save and load state.
- **Custom Blacklisting**: Exclude specific states from persistence.
- **Reactivity**: Subscribe to state changes and update UI dynamically.
- **Easy Integration**: Minimal setup and flexible API.

---

## Installation

Install **storehaven** via npm:

```bash
npm install storehaven

or

yarn add storehaven
```

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

### `createStore(name, initialState)`

- **name** (`string`): Unique key for the store.
- **initialState** (`object`): The initial state of the store.

Creates a store with the provided `name` and `initialState`.

---

### `initializeStore()`

Initializes the store and loads its state from AsyncStorage.

---

### `getState(key)`

- **key** (`string`, optional): Fetches the value of a specific key in the state. If no key is provided, returns the entire state.

---

### `setState(updates)`

- **updates** (`object`): Partial updates to the store state.

---

### `subscribe(listener)`

- **listener** (`function`): A function that will be called when the state changes. Returns an unsubscribe function to stop listening for changes.

---

### `useStoreState(store, key)`

React hook for accessing and updating store state in functional components.

# Contributing

Contributions are welcome! Please fork this repository, make your changes, and submit a pull request.

# License

This project is licensed under the MIT License.
