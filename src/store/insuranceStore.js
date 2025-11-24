import { create } from 'zustand';

export const useInsuranceStore = create((set) => ({
  parsedData: null,
  isLoading: false,
  error: null,

  setParsedData: (data) => set({ parsedData: data, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ parsedData: null, isLoading: false, error: null }),
}));
