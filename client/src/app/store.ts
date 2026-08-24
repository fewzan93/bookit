import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from '../features/auth/authSlice';
import seatMapReducer from '../features/seats/seatSlice';
import { authApi } from '../features/auth/api';
import { eventsApi } from '../features/events/api';
import { bookingsApi } from '../features/checkout/api';
import { ticketsApi } from '../features/tickets/api';
import { waitlistsApi } from '../features/waitlist/api';
import { analyticsApi } from '../features/analytics/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    seatMap: seatMapReducer,
    [authApi.reducerPath]: authApi.reducer,
    [eventsApi.reducerPath]: eventsApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [ticketsApi.reducerPath]: ticketsApi.reducer,
    [waitlistsApi.reducerPath]: waitlistsApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, eventsApi.middleware, bookingsApi.middleware, ticketsApi.middleware, waitlistsApi.middleware, analyticsApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
