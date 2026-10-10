import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tutorlink/wishlist';
let memoryWishlist = [];

const getWebStorage = () => {
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
};

async function readWishlist() {
  try {
    const stored = getWebStorage()
      ? getWebStorage().getItem(STORAGE_KEY)
      : await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return memoryWishlist;

    const parsed = JSON.parse(stored);
    memoryWishlist = Array.isArray(parsed) ? parsed : [];
    return memoryWishlist;
  } catch {
    return memoryWishlist;
  }
}

async function writeWishlist(items) {
  memoryWishlist = items;
  const serialized = JSON.stringify(items);
  try {
    if (getWebStorage()) {
      getWebStorage().setItem(STORAGE_KEY, serialized);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // Keep the in-memory copy when the native storage module is unavailable.
  }
  return items;
}

const normalizeTutorId = (tutorId) => {
  if (tutorId === undefined || tutorId === null || String(tutorId).trim() === '') {
    throw new Error('A valid tutor id is required.');
  }
  return String(tutorId);
};

export const wishlistService = {
  async list() {
    return readWishlist();
  },

  async create(tutorId, note = '') {
    const id = normalizeTutorId(tutorId);
    const items = await readWishlist();
    const existing = items.find((item) => item.tutor_id === id);
    if (existing) return existing;

    const item = {
      id: `wishlist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tutor_id: id,
      note: note || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await writeWishlist([item, ...items]);
    return item;
  },

  async update(id, note) {
    const items = await readWishlist();
    const updated = items.map((item) => item.id === id
      ? { ...item, note: note || null, updated_at: new Date().toISOString() }
      : item);
    await writeWishlist(updated);
    return updated.find((item) => item.id === id) || null;
  },

  async getByTutorId(tutorId) {
    const id = normalizeTutorId(tutorId);
    const items = await readWishlist();
    return items.find((item) => item.tutor_id === id) || null;
  },

  async remove(tutorId) {
    const id = normalizeTutorId(tutorId);
    const items = await readWishlist();
    await writeWishlist(items.filter((item) => item.tutor_id !== id));
  },
};

export default wishlistService;
