import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export type UserRole = 'user' | 'organizer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'user';
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: { user: User | null } | null;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  tagTypes: ['Auth'],
  endpoints: (build) => ({
    getMe: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
      transformResponse: (res: AuthResponse) => res.data!.user!,
    }),
    register: build.mutation<User, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Auth'],
      transformResponse: (res: AuthResponse) => res.data!.user!,
    }),
    login: build.mutation<User, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth'],
      transformResponse: (res: AuthResponse) => res.data!.user!,
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth'],
      transformResponse: () => undefined,
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation, useRegisterMutation, useLogoutMutation } = authApi;
