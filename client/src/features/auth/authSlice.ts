import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import { authApi, type User } from './api';

export type AuthStatus = 'checking' | 'authenticated' | 'guest';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'checking',
  error: null,
};

function extractErrorMessage(payload: unknown): string {
  const data = (payload as { data?: { message?: string } } | undefined)?.data?.message;
  return data ?? 'Something went wrong, please try again.';
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const succeeded = isAnyOf(
      authApi.endpoints.getMe.matchFulfilled,
      authApi.endpoints.login.matchFulfilled,
      authApi.endpoints.register.matchFulfilled,
    );
    const failed = isAnyOf(authApi.endpoints.login.matchRejected, authApi.endpoints.register.matchRejected);

    builder
      .addMatcher(succeeded, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.error = null;
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.status = 'guest';
      })
      .addMatcher(authApi.endpoints.getMe.matchRejected, (state) => {
        state.user = null;
        state.status = 'guest';
      })
      .addMatcher(failed, (state, action) => {
        state.status = 'guest';
        state.error = extractErrorMessage(action.payload);
      });
  },
});

export const { resetError } = authSlice.actions;
export default authSlice.reducer;
