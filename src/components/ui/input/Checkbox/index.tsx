import { CheckboxClient } from "./CheckboxClient";
import type { ConsentType } from "@/types/shared/forms";

interface CheckboxProps {
  id?: string;
  label: string;
  type: "terms" | "privacy" | "marketing";
  required?: boolean;
  details?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Checkbox(props: CheckboxProps) {
  // Define URLs server-side to prevent client bundle bloat
  const termsUrl = {
    en: "https://captain-frank.com/terms",
    de: "https://captain-frank.com/de/terms",
  };

  const privacyUrl = {
    en: "https://captain-frank.com/privacy",
    de: "https://captain-frank.com/de/privacy",
  };

  return (
    <div className="w-full">
      {/* Client-side interactive form */}
      <CheckboxClient {...props} termsUrl={termsUrl} privacyUrl={privacyUrl} />
    </div>
  );
}

export default Checkbox;

export type { CheckboxProps };
