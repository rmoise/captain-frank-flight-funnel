import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency } from '@/utils/helpers';

export const CompensationSummary: React.FC = () => {
  const compensationAmount = useAppSelector(
    (state) => state.compensation.compensationAmount
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-2">Compensation Summary</h3>
      <div className="text-2xl font-bold text-[#F54538]">
        {formatCurrency(compensationAmount || 0)}
      </div>
    </div>
  );
};