import { StateCreator } from "zustand";
import { Store, ClaimData, ClaimActions } from "../types";

export interface ClaimState {
  claimId: string | null;
  claimSubmitted: boolean;
  lastUpdate: number;
}

const initialState: ClaimState = {
  claimId: null,
  claimSubmitted: false,
  lastUpdate: Date.now(),
};

export const createClaimSlice: StateCreator<Store, [], [], ClaimActions> = (
  set
) => ({
  setClaimId: (id) =>
    set(
      (state) =>
        ({
          claimData: {
            ...(state.claimData || initialState),
            claimId: id,
            lastUpdate: Date.now(),
          },
        } as Partial<Store>)
    ),
  setClaimSubmitted: (submitted) =>
    set(
      (state) =>
        ({
          claimData: {
            ...(state.claimData || initialState),
            claimSubmitted: submitted,
            lastUpdate: Date.now(),
          },
        } as Partial<Store>)
    ),
  resetClaim: () =>
    set(
      (_state) =>
        ({
          claimData: {
            ...initialState,
            lastUpdate: Date.now(),
          },
        } as Partial<Store>)
    ),
});
