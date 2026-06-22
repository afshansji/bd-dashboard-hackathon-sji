const storage = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
};

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageStub,
    configurable: true,
  });
}

if (typeof (globalThis as Record<string, unknown>).Deno === "undefined") {
  Object.defineProperty(globalThis, "Deno", {
    value: { test: () => {} },
    configurable: true,
  });
}
