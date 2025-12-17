const DB_NAME = "recap-db";
const DB_VERSION = 1;

export interface LocalCheatsheet {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LocalSyntaxEntry {
  id: string;
  cheatsheet_id: string;
  syntax: string;
  category: string;
  description: string | null;
  example: string | null;
  notes: string | null;
  display_format: string;
  language: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  geminiApiKey: string | null;
}

export function generateId(): string {
  return crypto.randomUUID();
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains("cheatsheets")) {
        db.createObjectStore("cheatsheets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("entries")) {
        db.createObjectStore("entries", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "key" });
      }
    };
  });
}

// Generic get all from store
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Generic put to store
async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Generic delete from store
async function remove(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Cheatsheet operations
export const cheatsheetsDB = {
  getAll: () => getAll<LocalCheatsheet>("cheatsheets"),
  
  put: (cheatsheet: LocalCheatsheet) => put("cheatsheets", cheatsheet),
  
  delete: (id: string) => remove("cheatsheets", id),
  
  async get(id: string): Promise<LocalCheatsheet | null> {
    const all = await this.getAll();
    return all.find(c => c.id === id) || null;
  },
};

// Entries operations
export const entriesDB = {
  getAll: () => getAll<LocalSyntaxEntry>("entries"),
  
  put: (entry: LocalSyntaxEntry) => put("entries", entry),
  
  delete: (id: string) => remove("entries", id),
  
  async getByCheatsheetId(cheatsheetId: string): Promise<LocalSyntaxEntry[]> {
    const all = await this.getAll();
    return all.filter(e => e.cheatsheet_id === cheatsheetId);
  },
  
  async deleteByCheatsheetId(cheatsheetId: string): Promise<void> {
    const all = await this.getAll();
    const toDelete = all.filter(e => e.cheatsheet_id === cheatsheetId);
    for (const entry of toDelete) {
      await this.delete(entry.id);
    }
  },
};

// Config operations
export const configDB = {
  async get(): Promise<AppConfig> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("config", "readonly");
      const store = transaction.objectStore("config");
      const request = store.get("app-config");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.value || { supabaseUrl: null, supabaseAnonKey: null, geminiApiKey: null });
      };
    });
  },
  
  async set(config: AppConfig): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("config", "readwrite");
      const store = transaction.objectStore("config");
      const request = store.put({ key: "app-config", value: config });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
  
  async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("config", "readwrite");
      const store = transaction.objectStore("config");
      const request = store.delete("app-config");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};
