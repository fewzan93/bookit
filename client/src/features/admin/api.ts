import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminBooking {
  _id: string;
  bookingRef: string;
  userId: { _id: string; name: string; email: string } | string;
  eventId: string;
  eventSnapshot: {
    title: string;
    slug: string;
    startAt: string;
    venueName: string;
    city: string;
    bannerUrl: string;
  };
  items: { seatId: string; seatLabel: string; tierId: string; tierName: string; price: number; currency: string }[];
  total: number;
  currency: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalTickets: number;
  usedTickets: number;
  attendanceRate: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  tagTypes: ['Admin'],
  endpoints: (build) => ({
    getAdminStats: build.query<AdminStats, void>({
      query: () => 'admin/stats',
      transformResponse: (res: ApiResponse<AdminStats>) => res.data,
      providesTags: ['Admin'],
    }),
    getAdminUsers: build.query<AdminUser[], void>({
      query: () => 'admin/users',
      transformResponse: (res: ApiResponse<{ users: AdminUser[] }>) => res.data.users,
      providesTags: ['Admin'],
    }),
    getAdminBookings: build.query<AdminBooking[], void>({
      query: () => 'admin/bookings',
      transformResponse: (res: ApiResponse<{ bookings: AdminBooking[] }>) => res.data.bookings,
      providesTags: ['Admin'],
    }),
  }),
});

export const { useGetAdminStatsQuery, useGetAdminUsersQuery, useGetAdminBookingsQuery } = adminApi;
