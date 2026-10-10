import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tutorlink/filter-presets';
let memoryPresets = [];

async function read() {
  try {
    const stored = typeof globalThis?.localStorage !== 'undefined'
      ? globalThis.localStorage.getItem(STORAGE_KEY)
      : await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : memoryPresets;
    memoryPresets = Array.isArray(parsed) ? parsed : [];
  } catch {
    // Native storage may be unavailable in Expo Go; keep the local session copy.
  }
  return memoryPresets;
}

async function write(items) {
  memoryPresets = items;
  try {
    const serialized = JSON.stringify(items);
    if (typeof globalThis?.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(STORAGE_KEY, serialized);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // Keep the in-memory copy when native storage is unavailable.
  }
  return items;
}

export const filterPresetService = {
  list: read,
  async create(name, filters) {
    const items = await read();
    const item = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      filters_json: filters,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await write([item, ...items]);
    return item;
  },
  async update(id, changes) {
    const items = await read();
    const updated = items.map((item) => item.id === id
      ? { ...item, ...changes, updated_at: new Date().toISOString() }
      : item);
    await write(updated);
    return updated.find((item) => item.id === id) || null;
  },
  async remove(id) {
    const items = await read();
    await write(items.filter((item) => item.id !== id));
  },
};

export default filterPresetService;
