import React, { useState, useEffect } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Select } from "@/components/shared/Select";
import { useTranslation } from "@/hooks/useTranslation";

interface FlightNotListedFormProps {
  onSubmit: (data: FlightNotListedData) => void;
  initialData?: FlightNotListedData | null;
}

export interface FlightNotListedData {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
}

export const FlightNotListedForm: React.FC<FlightNotListedFormProps> = ({
  onSubmit,
  initialData = null,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FlightNotListedData>(() => {
    // Use initialData if provided, otherwise use empty values
    if (initialData) {
      console.log("Initializing form with provided data:", initialData);
      return {
        salutation: initialData.salutation || "",
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        description: "",
      };
    }
    return {
      salutation: "",
      firstName: "",
      lastName: "",
      email: "",
      description: "",
    };
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log("Updating form with new initialData:", initialData);
      setFormData((prev) => ({
        ...prev,
        salutation: initialData.salutation || "",
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
      }));
    }
  }, []);

  const [characterCount, setCharacterCount] = useState(
    initialData?.description?.length || 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const maxCharacters = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Directly call the onSubmit function passed as a prop
      await onSubmit(formData);

      setSuccess(true);

      // Reset form after successful submission
      setFormData({
        salutation: "",
        firstName: "",
        lastName: "",
        email: "",
        description: "",
      });
      setCharacterCount(0);
    } catch (err) {
      console.error("Error in FlightNotListedForm submit:", err);
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    (field: keyof FlightNotListedData) => (value: string) => {
      if (field === "description") {
        setCharacterCount(value.length);
      }
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear success/error messages when user starts typing again
      setSuccess(false);
      setError(null);
    };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="px-4 py-6">
          <p className="text-gray-600 text-sm">
            {t.flightSelector.flightNotListed.description}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="px-4 py-8 space-y-6">
          {error && (
            <div
              className="p-4 text-sm text-red-800 rounded-lg bg-red-50"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="p-4 text-sm text-green-800 rounded-lg bg-green-50"
              role="alert"
            >
              {t.flightSelector.flightNotListed.form.success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t.personalDetails.salutation}
              value={formData.salutation}
              onChange={handleInputChange("salutation")}
              options={[
                { value: "herr", label: t.salutation.mr },
                { value: "frau", label: t.salutation.mrs },
              ]}
              required
            />
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.flightSelector.flightNotListed.form.firstName}
              value={formData.firstName}
              onChange={handleInputChange("firstName")}
              required
              name="firstName"
            />
            <Input
              label={t.flightSelector.flightNotListed.form.lastName}
              value={formData.lastName}
              onChange={handleInputChange("lastName")}
              required
              name="lastName"
            />
          </div>

          <Input
            label={t.flightSelector.flightNotListed.form.email}
            type="email"
            value={formData.email}
            onChange={handleInputChange("email")}
            required
            name="email"
          />

          <div>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description")(e.target.value)}
              className="w-full min-h-[100px] max-h-[200px] px-4 py-3 pb-6 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-base text-[#4B626D] placeholder-[#9BA3AF] resize-y overflow-auto hover:border-blue-500"
              required
              maxLength={maxCharacters}
              placeholder={t.flightSelector.flightNotListed.form.description}
              name="description"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {t.flightSelector.flightNotListed.form.characterCount
                .replace("{count}", characterCount.toString())
                .replace("{max}", maxCharacters.toString())}
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="!w-full !min-h-[56px] !text-base !font-medium !bg-[#F54538] hover:!bg-[#F54538]/90 focus:!ring-[#F54538] disabled:!opacity-50 disabled:!cursor-not-allowed !rounded-xl"
            >
              {isSubmitting
                ? t.flightSelector.flightNotListed.form.submitting
                : t.flightSelector.flightNotListed.form.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
