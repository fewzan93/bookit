import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export interface AnalyticsSummary {
  revenue: number;
  ticketsSold: number;
  capacity: number;
  usedTickets: number;
  issuedTickets: number;
  events: {
    _id: string;
    title: string;
    slug: string;
    status: string;
    sold: number;
    capacity: number;
    revenue: number;
    startAt: string;
  }[];
}

export interface EventAnalytics {
  overview: {
    sold: number;
    capacity: number;
    revenue: number;
    bookings: number;
    attendance: number;
    attendanceRate: number;
  };
  daily: { date: string; label: string; count: number; revenue: number }[];
  peakHours: { hour: number; count: number }[];
  tiers: { tierId: string; name: string; sold: number; capacity: number; revenue: number }[];
  recentBookings: { bookingRef: string; total: number; status: string; paidAt?: string }[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  endpoints: (build) => ({
    getAnalyticsSummary: build.query<AnalyticsSummary, void>({
      query: () => 'analytics/summary',
      transformResponse: (res: ApiResponse<AnalyticsSummary>) => res.data,
    }),
    getEventAnalytics: build.query<EventAnalytics, string>({
      query: (id) => `analytics/events/${id}`,
      transformResponse: (res: ApiResponse<EventAnalytics>) => res.data,
    }),
  }),
});

export const { useGetAnalyticsSummaryQuery, useGetEventAnalyticsQuery } = analyticsApi;

export async function downloadCsv(urlPart: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/${urlPart}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
