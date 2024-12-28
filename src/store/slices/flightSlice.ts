import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Flight } from '@/types';

interface FlightState {
  selectedFlights: Flight[];
  selectedDate: string | null;
  flightType: 'direct' | 'multi';
}

const initialState: FlightState = {
  selectedFlights: [],
  selectedDate: null,
  flightType: 'direct',
};

const flightSlice = createSlice({
  name: 'flight',
  initialState,
  reducers: {
    setSelectedFlights: (state, action: PayloadAction<Flight[]>) => {
      state.selectedFlights = action.payload;
    },
    addSelectedFlight: (state, action: PayloadAction<Flight>) => {
      state.selectedFlights.push(action.payload);
    },
    removeSelectedFlight: (state, action: PayloadAction<string>) => {
      state.selectedFlights = state.selectedFlights.filter(
        (flight) => flight.id !== action.payload
      );
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    setFlightType: (state, action: PayloadAction<'direct' | 'multi'>) => {
      state.flightType = action.payload;
    },
  },
});

export const {
  setSelectedFlights,
  addSelectedFlight,
  removeSelectedFlight,
  setSelectedDate,
  setFlightType,
} = flightSlice.actions;
export default flightSlice.reducer;
