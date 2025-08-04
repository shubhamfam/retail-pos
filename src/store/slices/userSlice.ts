import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole } from '../../types';

interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    
    addUser: (state, action: PayloadAction<User>) => {
      state.users.push(action.payload);
    },
    
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(u => u.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    
    deleteUser: (state, action: PayloadAction<number>) => {
      state.users = state.users.filter(u => u.id !== action.payload);
    },
    
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    
    login: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  setLoading,
  setError,
  setUsers,
  addUser,
  updateUser,
  deleteUser,
  setCurrentUser,
  login,
  logout,
} = userSlice.actions;

export default userSlice.reducer; 