import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export interface BookingItemDTO {
  seatId: string;
  seatLabel: string;
  tierId: string;
  tierName: string;
  price: number;
  currency: string;
}

export interface BookingEventSnapshot {
  title: string;
  slug: string;
  startAt: string;
  venueName: string;
  city: string;
  bannerUrl: string;
}

export interface BookingDTO {
  bookingRef: string;
  eventId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'refunded';
  items: BookingItemDTO[];
  promoCode?: string;
  promoDiscount: number;
  groupDiscount: number;
  subtotal: number;
  total: number;
  currency: string;
  eventSnapshot: BookingEventSnapshot;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PromoCheckResult {
  valid: true;
  promo: { code: string; type: 'percent' | 'fixed'; value: number };
}

export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  tagTypes: ['Bookings'],
  endpoints: (build) => ({
    getBooking: build.query<BookingDTO, string>({
      query: (ref) => `bookings/${ref}`,
      transformResponse: (res: ApiResponse<{ booking: BookingDTO }>) => res.data.booking,
      providesTags: ['Bookings'],
    }),
    getMyBookings: build.query<BookingDTO[], void>({
      query: () => 'bookings/mine',
      transformResponse: (res: ApiResponse<{ bookings: BookingDTO[] }>) => res.data.bookings,
      providesTags: ['Bookings'],
    }),
    createBooking: build.mutation<
      BookingDTO,
      { eventId: string; seatIds: string[]; promoCode?: string }
    >({
      query: (body) => ({ url: 'bookings', method: 'POST', body }),
      invalidatesTags: ['Bookings'],
      transformResponse: (res: ApiResponse<{ booking: BookingDTO }>) => res.data.booking,
    }),
    getCheckout: build.mutation<{ mode: 'stripe' | 'dev'; url: string | null }, string>({
      query: (ref) => ({ url: `bookings/${ref}/checkout`, method: 'POST' }),
      transformResponse: (res: ApiResponse<{ mode: 'stripe' | 'dev'; url: string | null }>) => res.data,
    }),
    devConfirm: build.mutation<BookingDTO, string>({
      query: (ref) => ({ url: `bookings/${ref}/dev-confirm`, method: 'POST' }),
      invalidatesTags: ['Bookings'],
      transformResponse: (res: ApiResponse<{ booking: BookingDTO }>) => res.data.booking,
    }),
    cancelBooking: build.mutation<BookingDTO, string>({
      query: (ref) => ({ url: `bookings/${ref}/cancel`, method: 'POST' }),
      invalidatesTags: ['Bookings'],
      transformResponse: (res: ApiResponse<{ booking: BookingDTO }>) => res.data.booking,
    }),
    refundBooking: build.mutation<BookingDTO, string>({
      query: (ref) => ({ url: `bookings/${ref}/refund`, method: 'POST' }),
      invalidatesTags: ['Bookings'],
      transformResponse: (res: ApiResponse<{ booking: BookingDTO }>) => res.data.booking,
    }),
    validatePromo: build.mutation<PromoCheckResult, { code: string; quantity: number }>({
      query: (body) => ({ url: 'bookings/promos/validate', method: 'POST', body }),
      transformResponse: (res: ApiResponse<PromoCheckResult>) => res.data,
    }),
  }),
});

export const {
  useGetBookingQuery,
  useGetMyBookingsQuery,
  useCreateBookingMutation,
  useGetCheckoutMutation,
  useDevConfirmMutation,
  useCancelBookingMutation,
  useRefundBookingMutation,
  useValidatePromoMutation,
} = bookingsApi;
