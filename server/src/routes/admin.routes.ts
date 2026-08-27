import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { seedDatabase } from '../controllers/seed.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';

export const adminRoutes = Router();

// All admin routes require auth + admin role
adminRoutes.use(authRequired, requireRoles('admin'));

adminRoutes.post('/seed', seedDatabase);

// List all users (admin only)
adminRoutes.get('/users', asyncHandler(async (_req, res) => {
  const { User } = await import('../models/user.model.js');
  const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).exec();
  res.json({ success: true, data: { users } });
}));

// List all bookings across all users (admin only)
adminRoutes.get('/bookings', asyncHandler(async (_req, res) => {
  const { Booking } = await import('../models/booking.model.js');
  const bookings = await Booking.find()
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(100)
    .exec();
  res.json({ success: true, data: { bookings } });
}));

// System-wide stats (admin only)
adminRoutes.get('/stats', asyncHandler(async (_req, res) => {
  const { User } = await import('../models/user.model.js');
  const { Event } = await import('../models/event.model.js');
  const { Booking } = await import('../models/booking.model.js');
  const { Ticket } = await import('../models/ticket.model.js');

  const [totalUsers, totalEvents, totalBookings, confirmedBookings] = await Promise.all([
    User.countDocuments().exec(),
    Event.countDocuments().exec(),
    Booking.countDocuments().exec(),
    Booking.find({ status: 'confirmed' }).select('total').exec(),
  ]);

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.total, 0);
  const totalTickets = await Ticket.countDocuments().exec();
  const usedTickets = await Ticket.countDocuments({ status: 'used' }).exec();

  res.json({
    success: true,
    data: {
      totalUsers,
      totalEvents,
      totalBookings,
      totalRevenue,
      totalTickets,
      usedTickets,
      attendanceRate: totalTickets > 0 ? usedTickets / totalTickets : 0,
    },
  });
}));

// ── User management ──────────────────────────────────────────

// Change a user's role
adminRoutes.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const { role } = req.body as { role?: string };
  if (!role || !['user', 'organizer', 'admin'].includes(role)) {
    throw new ApiError(400, 'Invalid role. Must be user, organizer, or admin');
  }
  const { User } = await import('../models/user.model.js');
  const user = await User.findById(req.params.id).exec();
  if (!user) throw new ApiError(404, 'User not found');
  if (user.id === req.user!.id) throw new ApiError(400, 'Cannot change your own role');
  user.role = role as 'user' | 'organizer' | 'admin';
  await user.save();
  res.json({ success: true, message: `User role changed to ${role}`, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
}));

// Delete a user
adminRoutes.delete('/users/:id', asyncHandler(async (req, res) => {
  const { User } = await import('../models/user.model.js');
  const { Booking } = await import('../models/booking.model.js');
  const { Ticket } = await import('../models/ticket.model.js');
  const user = await User.findById(req.params.id).exec();
  if (!user) throw new ApiError(404, 'User not found');
  if (user.id === req.user!.id) throw new ApiError(400, 'Cannot delete your own account');
  // Cancel pending bookings and cancel valid tickets
  await Booking.updateMany({ userId: user.id, status: 'pending' }, { $set: { status: 'cancelled' } }).exec();
  await Ticket.updateMany({ userId: user.id, status: 'valid' }, { $set: { status: 'cancelled' } }).exec();
  await User.findByIdAndDelete(user.id).exec();
  res.json({ success: true, message: `User ${user.name} deleted` });
}));

// ── Event management ─────────────────────────────────────────

// List ALL events (admin sees everything)
adminRoutes.get('/events', asyncHandler(async (_req, res) => {
  const { Event } = await import('../models/event.model.js');
  const events = await Event.find()
    .populate('organizerId', 'name email')
    .populate('venueId', 'name')
    .sort({ createdAt: -1 })
    .exec();
  res.json({ success: true, data: { events } });
}));

// Delete any event (admin override)
adminRoutes.delete('/events/:id', asyncHandler(async (req, res) => {
  const { Event } = await import('../models/event.model.js');
  const { Seat } = await import('../models/seat.model.js');
  const { Booking } = await import('../models/booking.model.js');
  const { Ticket } = await import('../models/ticket.model.js');
  const { Waitlist } = await import('../models/waitlist.model.js');
  const event = await Event.findById(req.params.id).exec();
  if (!event) throw new ApiError(404, 'Event not found');
  await Seat.deleteMany({ eventId: event.id }).exec();
  await Booking.updateMany({ eventId: event.id, status: 'pending' }, { $set: { status: 'cancelled' } }).exec();
  await Ticket.updateMany({ eventId: event.id, status: 'valid' }, { $set: { status: 'cancelled' } }).exec();
  await Waitlist.deleteMany({ eventId: event.id }).exec();
  await Event.findByIdAndDelete(event.id).exec();
  res.json({ success: true, message: `Event "${event.title}" deleted` });
}));
