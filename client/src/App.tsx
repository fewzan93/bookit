import { useEffect, lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useAppDispatch } from './app/hooks';
import { authApi } from './features/auth/api';
import { RouteGuard } from './features/auth/components/RouteGuard';
import { FullScreenLoader } from './features/auth/components/FullScreenLoader';
import AccountPage from './features/auth/pages/Account';
import LoginPage from './features/auth/pages/Login';
import RegisterPage from './features/auth/pages/Register';
import HomePage from './pages/Home';
import NotFoundPage from './pages/NotFound';

const EventDetailPage = lazy(() => import('./pages/EventDetail'));
const SeatSelectionPage = lazy(() => import('./features/seats/pages/SeatSelection'));
const CheckoutPage = lazy(() => import('./features/checkout/pages/Checkout'));
const BookingCompletePage = lazy(() => import('./features/checkout/pages/BookingComplete'));
const BookingsPage = lazy(() => import('./features/checkout/pages/Bookings'));
const DashboardLayout = lazy(() => import('./features/events/pages/DashboardLayout'));
const EventForm = lazy(() => import('./features/events/pages/EventForm'));
const EventsList = lazy(() => import('./features/events/pages/EventsList'));
const AnalyticsPage = lazy(() => import('./features/analytics/pages/Analytics'));
const MyTicketsPage = lazy(() => import('./features/tickets/pages/MyTickets'));
const ScannerPage = lazy(() => import('./features/tickets/pages/Scanner'));
const WaitlistsPage = lazy(() => import('./features/waitlist/pages/Waitlists'));
const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard'));

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(authApi.endpoints.getMe.initiate());
  }, [dispatch]);

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route
          path="/events/:slug/seats"
          element={
            <RouteGuard>
              <SeatSelectionPage />
            </RouteGuard>
          }
        />
        <Route
          path="/events/:slug/checkout"
          element={
            <RouteGuard>
              <CheckoutPage />
            </RouteGuard>
          }
        />
        <Route
          path="/booking/complete/:ref"
          element={
            <RouteGuard>
              <BookingCompletePage />
            </RouteGuard>
          }
        />
        <Route
          path="/bookings"
          element={
            <RouteGuard>
              <BookingsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/tickets"
          element={
            <RouteGuard>
              <MyTicketsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/scanner"
          element={
            <RouteGuard roles={['organizer', 'admin']}>
              <ScannerPage />
            </RouteGuard>
          }
        />
        <Route
          path="/waitlists"
          element={
            <RouteGuard>
              <WaitlistsPage />
            </RouteGuard>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/account"
          element={
            <RouteGuard>
              <AccountPage />
            </RouteGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RouteGuard roles={['organizer', 'admin']}>
              <DashboardLayout />
            </RouteGuard>
          }
        >
          <Route index element={<EventsList />} />
          <Route path="new" element={<EventForm />} />
          <Route path=":id/edit" element={<EventForm />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
