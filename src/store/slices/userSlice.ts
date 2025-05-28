import { StateCreator } from "zustand";
import { Store, UserDetails, UserConsents } from "../types";

export interface UserState {
  details: UserDetails | null;
  consents: UserConsents;
  signature: string | null;
  hubspotContactId: string | null;
  hubspotDealId: string | null;
  compensationAmount: string | null;
  lastUpdate: number;
}

export interface UserActions {
  setUserDetails: (details: UserDetails) => void;
  updateConsents: (consents: Partial<UserConsents>) => void;
  setSignature: (signature: string) => void;
  setHubspotContactId: (id: string) => void;
  setHubspotDealId: (id: string) => void;
  setCompensationAmount: (amount: string) => void;
  resetUser: () => void;
}

const initialState: UserState = {
  details: null,
  consents: {
    terms: false,
    privacy: false,
    marketing: false,
  },
  signature: null,
  hubspotContactId: null,
  hubspotDealId: null,
  compensationAmount: null,
  lastUpdate: Date.now(),
};

export const createUserSlice: StateCreator<Store, [], [], UserActions> = (
  set
) => ({
  setUserDetails: (details) =>
    set((state) => ({
      user: {
        ...state.user,
        details,
        lastUpdate: Date.now(),
      },
    })),
  updateConsents: (consents) =>
    set((state) => ({
      user: {
        ...state.user,
        consents: { ...state.user.consents, ...consents },
        lastUpdate: Date.now(),
      },
    })),
  setSignature: (signature) =>
    set((state) => ({
      user: {
        ...state.user,
        signature,
        lastUpdate: Date.now(),
      },
    })),
  setHubspotContactId: (id) =>
    set((state) => ({
      user: {
        ...state.user,
        hubspotContactId: id,
        lastUpdate: Date.now(),
      },
    })),
  setHubspotDealId: (id) =>
    set((state) => ({
      user: {
        ...state.user,
        hubspotDealId: id,
        lastUpdate: Date.now(),
      },
    })),
  setCompensationAmount: (amount) =>
    set((state) => ({
      user: {
        ...state.user,
        compensationAmount: amount,
        lastUpdate: Date.now(),
      },
    })),
  resetUser: () =>
    set((state) => ({
      user: {
        ...initialState,
        lastUpdate: Date.now(),
      },
    })),
});
