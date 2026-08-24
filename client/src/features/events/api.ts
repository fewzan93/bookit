import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/config';

export interface VenueRef {
  _id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  image?: string;
}

export interface PublicEventSummary {
  _id: string;
  title: string;
  slug: string;
  category: string;
  banner: { url: string };
  startAt: string;
  endAt?: string;
  city: string;
  address: string;
  currency: string;
  priceFrom: number | null;
  venue: { name: string; type: string; id: string } | null;
  organizer: { name: string } | null;
}

export interface EventTierDTO {
  tierId: string;
  name: string;
  price: number;
  afterPrice?: number;
  currency: string;
  capacity: number;
  sold: number;
  activeUntil?: string;
}

export interface EventDetailDTO {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  banner: { url: string; publicId?: string };
  startAt: string;
  endAt?: string;
  status: string;
  city: string;
  address: string;
  tags: string[];
  tiers: EventTierDTO[];
  venue: VenueRef | null;
  venueId?: string | VenueRef | { _id: string };
  organizer: { name: string; email: string } | null;
}

export interface EventMineDTO extends EventDetailDTO {
  venueId: string;
}

export interface ListEventsResult {
  events: PublicEventSummary[];
  page: number;
  pages: number;
  total: number;
}

export interface EventsFilters {
  query?: string;
  category?: string;
  sort?: 'date' | 'price' | 'name';
  page?: number;
  limit?: number;
  lng?: number;
  lat?: number;
  radiusKm?: number;
}

export interface TierInput {
  name: string;
  price: number;
  currency?: string;
  capacity: number;
  activeUntil?: string;
}

export interface EventCreateInput {
  title: string;
  description: string;
  category: string;
  bannerUrl: string;
  venueId: string;
  startAt: string;
  endAt?: string;
  status?: 'draft' | 'published' | 'cancelled';
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  tags?: string[];
  tiers: TierInput[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface VenueCreateInput {
  name: string;
  type: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  config?: { sections: VenueSectionInput[] };
}

export interface VenueSectionInput {
  name: string;
  tierId: string;
  rows: number;
  cols: number;
  startNumber: number;
}

export interface SeatDTO {
  id: string;
  row: string;
  number: number;
  status: string;
  tierId: string;
}

export interface SeatSectionDTO {
  sectionId: string;
  name: string;
  tierId: string;
  rows: number;
  cols: number;
  startNumber: number;
  seats: SeatDTO[];
}

export interface SeatMapDTO {
  sections: SeatSectionDTO[];
  tiers: EventTierDTO[];
  soldOutTierIds: string[];
}

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/api/v1`, credentials: 'include' }),
  tagTypes: ['Events', 'Venues'],
  endpoints: (build) => ({
    getEvents: build.query<ListEventsResult, EventsFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.query) params.set('query', filters.query);
        if (filters.category) params.set('category', filters.category);
        if (filters.sort && filters.sort !== 'date') params.set('sort', filters.sort);
        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));
        if (filters.lng !== undefined) params.set('lng', String(filters.lng));
        if (filters.lat !== undefined) params.set('lat', String(filters.lat));
        if (filters.radiusKm) params.set('radiusKm', String(filters.radiusKm));
        return `events?${params.toString()}`;
      },
      transformResponse: (res: ApiResponse<ListEventsResult>) => res.data,
      providesTags: ['Events'],
    }),
    getEvent: build.query<EventDetailDTO, string>({
      query: (key) => `events/${key}`,
      transformResponse: (res: ApiResponse<{ event: EventDetailDTO }>) => res.data.event,
      providesTags: ['Events'],
    }),
    getRelated: build.query<PublicEventSummary[], string>({
      query: (id) => `events/${id}/related`,
      transformResponse: (res: ApiResponse<{ events: PublicEventSummary[] }>) => res.data.events,
      providesTags: ['Events'],
    }),
    getSeatMap: build.query<SeatMapDTO, string>({
      query: (id) => `events/${id}/seats`,
      transformResponse: (res: ApiResponse<SeatMapDTO>) => res.data,
      providesTags: ['Events'],
    }),
    getMine: build.query<EventMineDTO[], void>({
      query: () => 'events/mine',
      transformResponse: (res: ApiResponse<{ events: EventMineDTO[] }>) => res.data.events,
      providesTags: ['Events'],
    }),
    createEvent: build.mutation<EventDetailDTO, EventCreateInput>({
      query: (body) => ({ url: 'events', method: 'POST', body }),
      invalidatesTags: ['Events'],
      transformResponse: (res: ApiResponse<{ event: EventDetailDTO }>) => res.data.event,
    }),
    updateEvent: build.mutation<EventDetailDTO, { id: string; body: Partial<EventCreateInput> & { status?: string } }>({
      query: ({ id, body }) => ({ url: `events/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Events'],
      transformResponse: (res: ApiResponse<{ event: EventDetailDTO }>) => res.data.event,
    }),
    deleteEvent: build.mutation<void, string>({
      query: (id) => ({ url: `events/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Events'],
    }),
    uploadBanner: build.mutation<{ url: string; publicId?: string }, File>({
      query: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return { url: 'upload/banner', method: 'POST', body: fd };
      },
      transformResponse: (res: ApiResponse<{ url: string; publicId?: string }>) => res.data,
    }),
    getMyVenues: build.query<VenueRef[], void>({
      query: () => 'venues',
      transformResponse: (res: ApiResponse<{ venues: VenueRef[] }>) => res.data.venues,
      providesTags: ['Venues'],
    }),
    createVenue: build.mutation<VenueRef, VenueCreateInput>({
      query: (body) => ({ url: 'venues', method: 'POST', body }),
      invalidatesTags: ['Venues'],
      transformResponse: (res: ApiResponse<{ venue: VenueRef }>) => res.data.venue,
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetEventQuery,
  useGetRelatedQuery,
  useGetSeatMapQuery,
  useGetMineQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useUploadBannerMutation,
  useGetMyVenuesQuery,
  useCreateVenueMutation,
} = eventsApi;

export const EVENT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'music', label: 'Music' },
  { value: 'theater', label: 'Theater' },
  { value: 'sports', label: 'Sports' },
  { value: 'conference', label: 'Conference' },
  { value: 'festival', label: 'Festival' },
  { value: 'comedy', label: 'Comedy' },
];
