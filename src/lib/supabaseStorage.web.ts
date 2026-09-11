const serverStorage: Storage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

export const supabaseStorage =
  typeof localStorage === 'undefined' ? serverStorage : localStorage;
