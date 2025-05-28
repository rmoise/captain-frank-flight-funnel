import { useStore } from "../index";
export { useStore };
export { useValidation } from "./useValidation";

// Re-export other store hooks
export const useUserStore = () => {
  const store = useStore();
  return {
    ...store.user,
    ...store.actions.user,
  };
};

export const useValidationStore = () => {
  const store = useStore();
  return {
    ...store.validation,
    ...store.actions.validation,
  };
};
