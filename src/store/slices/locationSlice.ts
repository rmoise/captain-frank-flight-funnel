import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LocationState {
  fromLocation: string | null;
  toLocation: string | null;
}

const initialState: LocationState = {
  fromLocation: null,
  toLocation: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setFromLocation: (state, action: PayloadAction<string | null>) => {
      console.log('\n=== setFromLocation Reducer ===');
      console.log('Previous state:', state.fromLocation);
      console.log('Action payload:', action.payload);
      state.fromLocation = action.payload;
      console.log('New state:', state.fromLocation);
      console.log('=== End setFromLocation Reducer ===\n');
    },
    setToLocation: (state, action: PayloadAction<string | null>) => {
      console.log('\n=== setToLocation Reducer ===');
      console.log('Previous state:', state.toLocation);
      console.log('Action payload:', action.payload);
      state.toLocation = action.payload;
      console.log('New state:', state.toLocation);
      console.log('=== End setToLocation Reducer ===\n');
    },
  },
});

export const { setFromLocation, setToLocation } = locationSlice.actions;
export default locationSlice.reducer;
