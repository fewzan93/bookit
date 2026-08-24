import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export interface TicketDTO {
  ticketRef: string;
  bookingId: string;
  eventSnapshot: {
    title: string;
    slug: string;
    startAt: string;
    venueName: string;
    city: string;
    bannerUrl: string;
  };
  seatLabel?: string;
  tierName: string;
  price: number;
  currency: string;
  status: 'valid' | 'used' | 'cancelled';
  qrVersion: number;
}

export interface TicketQrDTO {
  ticket: TicketDTO;
  qrRaw: string;
}

export interface ScanResultDTO {
  status: 'valid' | 'used' | 'cancelled' | 'expired' | 'invalid';
  message: string;
  ticket?: TicketDTO;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const ticketsApi = createApi({
  reducerPath: 'ticketsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  tagTypes: ['Tickets'],
  endpoints: (build) => ({
    getMyTickets: build.query<TicketDTO[], void>({
      query: () => 'tickets',
      transformResponse: (res: ApiResponse<{ tickets: TicketDTO[] }>) => res.data.tickets,
      providesTags: ['Tickets'],
    }),
    getTicketQr: build.query<TicketQrDTO, string>({
      query: (ref) => `tickets/${ref}`,
      transformResponse: (res: ApiResponse<TicketQrDTO>) => res.data,
    }),
    rotateTicket: build.mutation<TicketQrDTO, string>({
      query: (ref) => ({ url: `tickets/${ref}/rotate`, method: 'POST' }),
      transformResponse: (res: ApiResponse<TicketQrDTO>) => res.data,
      invalidatesTags: ['Tickets'],
    }),
    scanTicket: build.mutation<ScanResultDTO, { payload: string }>({
      query: (body) => ({ url: 'tickets/scan', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ScanResultDTO> & { data: ScanResultDTO }) => res.data,
    }),
  }),
});

export const {
  useGetMyTicketsQuery,
  useGetTicketQrQuery,
  useRotateTicketMutation,
  useScanTicketMutation,
} = ticketsApi;

export async function downloadTicketPdf(ref: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tickets/${ref}/pdf`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not download PDF');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bookit-${ref}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
