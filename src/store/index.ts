import { configureStore } from '@reduxjs/toolkit';
import bookingReducer, { BookingState } from './bookingSlice';

const reducer = {
  booking: bookingReducer,
};

export const store = configureStore({
  reducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type { BookingState };