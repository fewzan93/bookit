import { store } from './store';
import { authApi } from '../features/auth/api';
import { eventsApi } from '../features/events/api';
import { bookingsApi } from '../features/checkout/api';
import { ticketsApi } from '../features/tickets/api';
import { waitlistsApi } from '../features/waitlist/api';
import { analyticsApi } from '../features/analytics/api';
import { adminApi } from '../features/admin/api';

/**
 * Reset ALL RTK Query API caches.
 * Must be called after logout to prevent stale data from one user
 * appearing for the next user who logs in.
 */
export function resetAllApiState() {
  store.dispatch(authApi.util.resetApiState());
  store.dispatch(eventsApi.util.resetApiState());
  store.dispatch(bookingsApi.util.resetApiState());
  store.dispatch(ticketsApi.util.resetApiState());
  store.dispatch(waitlistsApi.util.resetApiState());
  store.dispatch(analyticsApi.util.resetApiState());
  store.dispatch(adminApi.util.resetApiState());
}
