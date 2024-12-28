import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency } from '@/utils/helpers';

export const CompensationCalculator: React.FC = () => {
  const compensationAmount = useAppSelector(
    (state) => state.compensation.compensationAmount
  );
  const compensationLoading = useAppSelector(
    (state) => state.compensation.compensationLoading
  );
  const compensationError = useAppSelector(
    (state) => state.compensation.compensationError
  );

  if (compensationLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="w-8 h-8 border-4 border-[#F54538] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (compensationError) {
    return <div className="text-red-500">{compensationError}</div>;
  }

  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Estimated Compensation
      </h2>
      <p className="text-4xl font-bold text-[#F54538]">
        {formatCurrency(compensationAmount || 0)}
      </p>
    </div>
  );
};
