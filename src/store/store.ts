import { configureStore } from '@reduxjs/toolkit';
import locationReducer from './slices/locationSlice';
import flightReducer from './slices/flightSlice';
import progressReducer from './slices/progressSlice';
import compensationReducer from './slices/compensationSlice';
import userReducer from './slices/userSlice';
import bookingReducer from './slices/bookingSlice';

export const store = configureStore({
  reducer: {
    location: locationReducer,
    flight: flightReducer,
    progress: progressReducer,
    compensation: compensationReducer,
    user: userReducer,
    booking: bookingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
