import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  subtitle?: string;
}

interface NotificationState {
  notification: Notification | null;
}

const initialState: NotificationState = {
  notification: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (state, action: PayloadAction<Notification>) => {
      state.notification = action.payload;
    },
    clearNotification: (state) => {
      state.notification = null;
    },
  },
});

export const { showNotification, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer;