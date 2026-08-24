import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export interface WaitlistDTO {
  _id: string;
  eventId: string;
  tierId: string;
  status: 'queued' | 'notified' | 'fulfilled' | 'removed';
  eventSnapshot: {
    title: string;
    slug: string;
    startAt: string;
    venueName: string;
    bannerUrl: string;
  };
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const waitlistsApi = createApi({
  reducerPath: 'waitlistsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  tagTypes: ['Waitlists'],
  endpoints: (build) => ({
    getMyWaitlists: build.query<WaitlistDTO[], void>({
      query: () => 'waitlists',
      transformResponse: (res: ApiResponse<{ entries: WaitlistDTO[] }>) => res.data.entries,
      providesTags: ['Waitlists'],
    }),
    joinWaitlist: build.mutation<WaitlistDTO, { eventId: string; tierId: string }>({
      query: (body) => ({ url: 'waitlists', method: 'POST', body }),
      invalidatesTags: ['Waitlists'],
      transformResponse: (res: ApiResponse<{ entry: WaitlistDTO }>) => res.data.entry,
    }),
    leaveWaitlist: build.mutation<void, string>({
      query: (id) => ({ url: `waitlists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Waitlists'],
    }),
  }),
});

export const { useGetMyWaitlistsQuery, useJoinWaitlistMutation, useLeaveWaitlistMutation } = waitlistsApi;
