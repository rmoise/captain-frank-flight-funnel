import type { RootState } from '@/store';

export const selectFromLocation = (state: RootState) =>
  state.location.fromLocation;
export const selectToLocation = (state: RootState) => state.location.toLocation;
