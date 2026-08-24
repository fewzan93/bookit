import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SeatStatus = 'available' | 'locked' | 'booked' | 'disabled';

export interface SeatCell {
  status: SeatStatus;
  tierId: string;
}

interface SeatMapState {
  eventId: string | null;
  seats: Record<string, SeatCell>;
  selected: string[];
  expiresAt: number | null;
  error: string | null;
}

const initialState: SeatMapState = {
  eventId: null,
  seats: {},
  selected: [],
  expiresAt: null,
  error: null,
};

export const seatMapSlice = createSlice({
  name: 'seatMap',
  initialState,
  reducers: {
    mapLoaded(state, action: PayloadAction<{ eventId: string; seats: Record<string, SeatCell> }>) {
      state.eventId = action.payload.eventId;
      state.seats = action.payload.seats;
      state.error = null;
    },
    seatChanges(state, action: PayloadAction<{ changes: { seatId: string; status: SeatStatus }[] }>) {
      for (const change of action.payload.changes) {
        const cell = state.seats[change.seatId];
        if (!cell) continue;
        const wasMine = state.selected.includes(change.seatId);
        const mineNow = change.status === 'locked';
        if (wasMine && !mineNow && change.status !== 'booked') {
          state.selected = state.selected.filter((id) => id !== change.seatId);
          state.error = 'A seat you held was released or taken — reselect it.';
          if (state.selected.length === 0) state.expiresAt = null;
        }
        cell.status = change.status;
      }
    },
    lockAccepted(state, action: PayloadAction<{ seatIds: string[]; timeoutSec: number }>) {
      state.selected = action.payload.seatIds;
      state.expiresAt = Date.now() + action.payload.timeoutSec * 1000;
      state.error = null;
    },
    lockReleased(state, action: PayloadAction<string[]>) {
      state.selected = state.selected.filter((id) => !action.payload.includes(id));
      if (state.selected.length === 0) state.expiresAt = null;
    },
    selectionCleared(state) {
      state.selected = [];
      state.expiresAt = null;
    },
    mapError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const { mapLoaded, seatChanges, lockAccepted, lockReleased, selectionCleared, mapError } =
  seatMapSlice.actions;

export default seatMapSlice.reducer;
