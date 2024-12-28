import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CompensationState {
  compensationAmount: number | null;
  compensationLoading: boolean;
  compensationError: string | null;
}

const getInitialState = (): CompensationState => {
  if (typeof window === 'undefined') {
    return {
      compensationAmount: null,
      compensationLoading: false,
      compensationError: null,
    };
  }

  try {
    const savedAmount = localStorage.getItem('compensationAmount');
    return {
      compensationAmount: savedAmount ? JSON.parse(savedAmount) : null,
      compensationLoading: false,
      compensationError: null,
    };
  } catch (error) {
    console.error(
      'Error reading compensation amount from localStorage:',
      error
    );
    return {
      compensationAmount: null,
      compensationLoading: false,
      compensationError: null,
    };
  }
};

const initialState: CompensationState = getInitialState();

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
