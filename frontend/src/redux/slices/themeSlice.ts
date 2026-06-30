import { createSlice } from '@reduxjs/toolkit';

const storedMode = localStorage.getItem('themeMode') as 'light' | 'dark' | null;

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: storedMode || 'light' as 'light' | 'dark' },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem('themeMode', state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
