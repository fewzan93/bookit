import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
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
