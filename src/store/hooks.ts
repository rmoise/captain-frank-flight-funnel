import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState } from './store';
import type { AppDispatch } from './store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Add a type guard for checking if a slice exists in the state
export const hasSlice = <K extends keyof RootState>(
  state: RootState,
  slice: K
): state is RootState & Required<Pick<RootState, K>> => {
  return slice in state;
};
