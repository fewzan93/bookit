import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { TicketService } from '../services/ticket.service.js';
import { PdfTicketService } from '../services/pdfTicket.service.js';
import { ApiError } from '../middlewares/errorHandler.js';

const ticketService = new TicketService();
const pdfService = new PdfTicketService();

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const tickets = await ticketService.listMine(req.user!.id);
  res.json({ success: true, data: { tickets } });
});

export const getQr = asyncHandler(async (req: Request, res: Response) => {
  const { ticket, qrRaw } = await ticketService.getQr(req.params.ref, req.user!.id);
  res.json({ success: true, data: { ticket, qrRaw } });
});

export const rotate = asyncHandler(async (req: Request, res: Response) => {
  const { ticket, qrRaw } = await ticketService.rotate(req.params.ref, req.user!.id);
  res.json({ success: true, message: 'QR code rotated', data: { ticket, qrRaw } });
});

export const downloadPdf = asyncHandler(async (req: Request, res: Response) => {
  const { ticket, qrRaw } = await ticketService.getQr(req.params.ref, req.user!.id);
  const pdf = await pdfService.generate(ticket, qrRaw, 'Attendee');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Bookit-${ticket.ticketRef}.pdf"`);
  res.send(pdf);
});

export const scan = asyncHandler(async (req: Request, res: Response) => {
  const payload = (req.body as { payload?: string }).payload;
  if (!payload || payload.length > 600) throw new ApiError(400, 'Missing QR payload');
  const result = await ticketService.scan(payload);
  res.json({ success: result.status !== 'invalid', message: result.message, data: { ...result } });
});
