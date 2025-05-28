interface ProgressStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface ProgressProps {
  progress: number;
  steps: ProgressStep[];
}

export function Progress({ progress, steps }: ProgressProps) {
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${
              step.isCurrent
                ? 'text-blue-600'
                : step.isCompleted
                  ? 'text-green-600'
                  : 'text-gray-400'
            }`}
          >
            {/* Step number */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 border-2 ${
                step.isCurrent
                  ? 'border-blue-600 bg-white'
                  : step.isCompleted
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white'
              }`}
            >
              {step.isCompleted ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                step.order
              )}
            </div>

            {/* Step title */}
            <span className="text-sm font-medium">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
