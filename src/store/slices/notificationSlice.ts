import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationState {
  messages: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>;
}

const initialState: NotificationState = {
  messages: [],
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<{
        type: 'success' | 'error' | 'info' | 'warning';
        message: string;
      }>
    ) => {
      state.messages.push({
        id: Date.now().toString(),
        ...action.payload,
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(
        (message) => message.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.messages = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } =
  notificationSlice.actions;

export const notificationReducer = notificationSlice.reducer;