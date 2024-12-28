import { combineReducers } from '@reduxjs/toolkit';
import locationReducer from './slices/locationSlice';
import flightReducer from './slices/flightSlice';
import progressReducer from './slices/progressSlice';
import compensationReducer from './slices/compensationSlice';
import userReducer from './slices/userSlice';

const rootReducer = combineReducers({
  location: locationReducer,
  flight: flightReducer,
  progress: progressReducer,
  compensation: compensationReducer,
  user: userReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
