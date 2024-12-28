import { clsx } from 'clsx';

const baseSelectClasses = clsx(
  'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#F54538] sm:text-sm sm:leading-6'
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  className?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  className,
  options,
  ...props
}) => {
  return (
    <div>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {label}
        </label>
      )}
      <div className="mt-2">
        <select {...props} className={clsx(baseSelectClasses, className)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${props.id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};
