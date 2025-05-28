import React from "react";
import { BottomSheet } from "@/components/ui/layout/BottomSheet";
import type { Flight } from "@/store/types";
import { motion } from "framer-motion";

interface FlightSearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onSelect: (flight: Flight) => void;
}

export const FlightSearchResults: React.FC<FlightSearchResultsProps> = ({
  isOpen,
  onClose,
  flights,
  onSelect,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Available Flights">
      <div className="space-y-4">
        {flights.map((flight, index) => (
          <motion.div
            key={flight.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
            onClick={() => {
              onSelect(flight);
              onClose();
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">
                {flight.airline?.name || "Unknown Airline"}{" "}
                {flight.flightNumber}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <span>
                {flight.from?.city || "N/A"} ({flight.from?.iata || "???"})
              </span>
              <span className="mx-2">→</span>
              <span>
                {flight.to?.city || "N/A"} ({flight.to?.iata || "???"})
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </BottomSheet>
  );
};
