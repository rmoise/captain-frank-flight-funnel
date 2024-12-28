import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CompensationState {
  compensationAmount: number | null;
  compensationLoading: boolean;
  compensationError: string | null;
}

// Try to get initial compensation amount from localStorage
const getInitialCompensationAmount = (): number | null => {
  try {
    const savedAmount = localStorage.getItem('compensationAmount');
    if (savedAmount) {
      const amount = JSON.parse(savedAmount);
      if (typeof amount === 'number' && amount > 0) {
        return amount;
      }
    }
  } catch (error) {
    console.error(
      'Error reading compensation amount from localStorage:',
      error
    );
  }
  return null;
};

const initialState: CompensationState = {
  compensationAmount: getInitialCompensationAmount(),
  compensationLoading: false,
  compensationError: null,
};

const compensationSlice = createSlice({
  name: 'compensation',
  initialState,
  reducers: {
    setCompensationAmount: (state, action: PayloadAction<number>) => {
      state.compensationAmount = action.payload;
      state.compensationError = null;
      // Save to localStorage
      localStorage.setItem(
        'compensationAmount',
        JSON.stringify(action.payload)
      );
    },
    setCompensationLoading: (state, action: PayloadAction<boolean>) => {
      state.compensationLoading = action.payload;
    },
    setCompensationError: (state, action: PayloadAction<string>) => {
      state.compensationError = action.payload;
      state.compensationAmount = null;
      // Clear localStorage on error
      localStorage.removeItem('compensationAmount');
    },
    clearCompensation: (state) => {
      state.compensationAmount = null;
      state.compensationError = null;
      state.compensationLoading = false;
      // Clear localStorage
      localStorage.removeItem('compensationAmount');
      localStorage.removeItem('compensationRoute');
    },
  },
});

export const {
  setCompensationAmount,
  setCompensationLoading,
  setCompensationError,
  clearCompensation,
} = compensationSlice.actions;
export default compensationSlice.reducer;
