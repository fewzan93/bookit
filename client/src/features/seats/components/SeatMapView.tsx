import { cn } from '../../../lib/utils';
import { formatPrice } from '../../../lib/format';
import type { EventTierDTO, SeatDTO, SeatSectionDTO } from '../../events/api';
import type { SeatCell, SeatStatus } from '../seatSlice';

const TIER_PALETTE = ['#e879f9', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa'];

const SIZE = 26;
const GAP_X = 4;
const GAP_Y = 8;

export function tierColor(tierId: string, tiers: EventTierDTO[]): string {
  const index = tiers.findIndex((t) => t.tierId === tierId);
  return TIER_PALETTE[(index >= 0 ? index : 0) % TIER_PALETTE.length];
}

function statusStyle(status: SeatStatus, color: string): { fill: string; stroke: string; label?: string } {
  switch (status) {
    case 'booked':
      return { fill: '#27272a', stroke: '#3f3f46', label: '×' };
    case 'locked':
      return { fill: '#f59e0b', stroke: '#fbbf24', label: 'L' };
    case 'disabled':
      return { fill: '#18181b', stroke: '#27272a' };
    default:
      return { fill: color, stroke: color };
  }
}

export function SeatMapView({
  sections,
  tiers,
  seatsById,
  selected,
  soldOutTierIds = [],
  onSeatClick,
}: {
  sections: SeatSectionDTO[];
  tiers: EventTierDTO[];
  seatsById: Record<string, SeatCell>;
  selected: string[];
  soldOutTierIds?: string[];
  onSeatClick: (seat: SeatDTO) => void;
}) {
  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const sectionColor = tierColor(section.tierId, tiers);

        return (
          <div key={section.sectionId}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-white">{section.name}</h3>
              <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-white" style={{ borderColor: `${sectionColor}66`, backgroundColor: `${sectionColor}1a` }}>
                {formatPrice(
                  tiers.find((t) => t.tierId === section.tierId)?.price ?? null,
                  tiers.find((t) => t.tierId === section.tierId)?.currency ?? 'USD',
                )}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mx-auto w-fit">
                <svg
                  role="grid"
                  aria-label={`Seat map for ${section.name}`}
                  viewBox={`0 0 ${Math.max(section.cols * (SIZE + GAP_X) + 40, 120)} ${section.rows * (SIZE + GAP_Y) + GAP_Y}`}
                  className="select-none"
                  style={{ minWidth: Math.max(section.cols * (SIZE + GAP_X) + 40, 200) }}
                >
                  {Array.from({ length: section.rows }).map((_, r) => {
                    const y = r * (SIZE + GAP_Y) + GAP_Y;
                    const rowLabel = String.fromCharCode(65 + r);
                    return (
                      <g key={rowLabel}>
                        <text x={2} y={y + SIZE - 7} fontSize={11} fill="#71717a" fontFamily="inherit">
                          {rowLabel}
                        </text>
                        {Array.from({ length: section.cols }).map((_, c) => {
                          const seatNumber = section.startNumber + c;
                          const seat = section.seats.find((s) => s.row === rowLabel && s.number === seatNumber);
                          if (!seat) return <g key={`${rowLabel}-${seatNumber}`} />;
                          const cell: SeatCell = seatsById[seat.id] ?? { status: seat.status as SeatStatus, tierId: seat.tierId };
                          const tierFull = soldOutTierIds.includes(seat.tierId);
                          const isSelected = selected.includes(seat.id);
                          const effective = tierFull && cell.status === 'available' ? ('disabled' as const) : cell.status;
                          const style = statusStyle(effective, isSelected ? '#ffffff' : tierColor(cell.tierId, tiers));
                          const x = c * (SIZE + GAP_X) + 32;
                          return (
                            <g
                              key={seat.id}
                              className={cn('transition-opacity', effective !== 'available' && !isSelected && 'cursor-not-allowed opacity-80')}
                              onClick={() => {
                                if (effective === 'available' || isSelected) onSeatClick(seat);
                              }}
                            >
                              <title>{`Row ${seat.row}, Seat ${seat.number} — ${effective}${tierFull ? ' (tier sold out)' : ''}`}</title>
                              <rect
                                x={x}
                                y={y}
                                width={SIZE}
                                height={SIZE}
                                rx={5}
                                fill={style.fill}
                                stroke={isSelected ? '#ffffff' : style.stroke}
                                strokeWidth={isSelected ? 2.5 : 1}
                              />
                              {style.label && (
                                <text x={x + SIZE / 2} y={y + SIZE / 2 + 4} fontSize={12} textAnchor="middle" fill={effective === 'locked' ? '#7c2d12' : '#3f3f46'}>
                                  {style.label}
                                </text>
                              )}
                              {isSelected && (
                                <text x={x + SIZE / 2} y={y + SIZE / 2 + 4} fontSize={12} textAnchor="middle" fill="#18181b" fontWeight={700}>
                                  ✓
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
