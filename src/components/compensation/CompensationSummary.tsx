'use client';

import React from 'react';
import { Card } from '@/components/shared/Card';
import { getNextSteps } from '@/utils/compensation';

export function CompensationSummary() {
  const nextSteps = getNextSteps();

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <ul className="list-disc pl-5 space-y-2">
          {nextSteps.map((step, index) => (
            <li key={index}>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
