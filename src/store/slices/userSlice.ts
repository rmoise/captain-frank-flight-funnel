import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  salutation: 'Mr' | 'Mrs' | 'Ms';
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface UserState {
  personalDetails: UserDetails | null;
  wizardAnswers: Record<string, string | boolean>;
}

const initialState: UserState = {
  personalDetails: null,
  wizardAnswers: {},
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setPersonalDetails: (state, action: PayloadAction<UserDetails>) => {
      state.personalDetails = action.payload;
    },
    setWizardAnswer: (
      state,
      action: PayloadAction<{ key: string; value: string | boolean }>
    ) => {
      state.wizardAnswers[action.payload.key] = action.payload.value;
    },
  },
});

export const { setPersonalDetails, setWizardAnswer } = userSlice.actions;
export default userSlice.reducer;
