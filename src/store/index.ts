import { configureStore } from '@reduxjs/toolkit';
import bookingReducer from './slices/bookingSlice';
import progressReducer from './slices/progressSlice';
import locationReducer from './slices/locationSlice';
import flightReducer from './slices/flightSlice';
import compensationReducer from './slices/compensationSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    booking: bookingReducer,
    progress: progressReducer,
    location: locationReducer,
    flight: flightReducer,
    compensation: compensationReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
