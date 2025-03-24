import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";

interface FlightNotListedData {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FlightNotListedData) => void;
  prefilledData?: FlightNotListedData | null;
}

export const FlightNotListedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  prefilledData = null,
}) => {
  const [formData, setFormData] = useState<FlightNotListedData>({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    description: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when prefilledData changes or when modal opens
  useEffect(() => {
    if (isOpen && prefilledData) {
      console.log("Prefilling form with data:", prefilledData);
      setFormData({
        salutation: prefilledData.salutation || "",
        firstName: prefilledData.firstName || "",
        lastName: prefilledData.lastName || "",
        email: prefilledData.email || "",
        description: prefilledData.description || "",
      });
    }
  }, [isOpen, prefilledData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // Submit the data to the parent component
      await onSubmit(formData);
      // Reset form
      setFormData({
        salutation: "",
        firstName: "",
        lastName: "",
        email: "",
        description: "",
      });
      // Close the modal
      onClose();
    } catch (error) {
      console.error("Error submitting flight not listed data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <Dialog.Panel className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <Dialog.Title
            id={dialogTitleId}
            className="text-lg font-semibold mb-4"
          >
            Flight Not Listed?
          </Dialog.Title>
          <Dialog.Description
            id={dialogDescriptionId}
            className="text-gray-600 mb-6"
          >
            Please provide your contact details and flight information to help
            us find your flight.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="salutation"
                className="block text-sm font-medium text-gray-700"
              >
                Salutation
              </label>
              <select
                id="salutation"
                value={formData.salutation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    salutation: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select</option>
                <option value="herr">Mr.</option>
                <option value="frau">Mrs.</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Flight Details
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
                required
                placeholder="Please provide details about your flight such as flight number, departure date, departure airport, and arrival airport."
              />
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
