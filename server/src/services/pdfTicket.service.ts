import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { ITicket } from '../models/ticket.model.js';
import { User } from '../models/user.model.js';
import { encodeQrPayload } from '../utils/qrToken.js';

export class PdfTicketService {
  async generate(ticket: ITicket, qrRaw: string, holderName: string): Promise<Buffer> {
    const snap = ticket.eventSnapshot;
    const qrPng = await QRCode.toBuffer(qrRaw, { width: 220, margin: 1 });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A6', margin: 26, info: { Title: `Bookit — ${snap.title}` } });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(19).text('BOOKIT', { characterSpacing: 4 });
      doc.moveDown(0.2);

      doc.font('Helvetica-Bold').fontSize(14).text(cap(snap.title, 54), { width: 330 });
      doc.font('Helvetica').fontSize(9).fillColor('#555555').text(
        [
          snap.venueName ? cap(snap.venueName, 50) : 'Venue TBA',
          snap.city ? cap(snap.city, 40) : '',
          formatWhen(snap.startAt),
        ]
          .filter(Boolean)
          .join(' · '),
      );

      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
        .text(`HOLDER: ${holderName}`)
        .text(`SEAT:   ${ticket.seatLabel ?? 'GA'}   ·   ${cap(ticket.tierName, 26)}`);
      doc.text(`PRICE:  ${ticket.currency} ${ticket.price.toFixed(2)}`);

      doc.moveDown(0.6);
      doc.rect(doc.x, doc.y, 260, 0.6).fill('#e879f9').strokeColor('#e879f9');

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#555555').text(ticket.ticketRef, { characterSpacing: 2 });

      doc.moveDown(0.4);
      doc.image(qrPng, 26, doc.y, { width: 110, height: 110 });

      doc.save()
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#f6c453')
        .text(
          ticket.status === 'used'
            ? 'ALREADY CHECKED IN'
            : ticket.status === 'cancelled'
              ? 'CANCELLED'
              : 'ADMIT ONE',
        );

      doc.end();
    });
  }

  async build(ticket: ITicket): Promise<{ pdf: Buffer; holder: string }> {
    const user = await User.findById(ticket.userId).select('name').exec();
    const holder = user?.name ?? 'Attendee';
    const qrRaw = encodeQrPayload({
      ticketRef: ticket.ticketRef,
      version: ticket.qrVersion,
      eventId: ticket.eventId.toString(),
      expEpoch: ticket.qrExpEpoch,
    });
    return { pdf: await this.generate(ticket, qrRaw, holder), holder };
  }
}

function cap(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatWhen(d: Date | string): string {
  const date = new Date(d);
  return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}
