import { FC, InputHTMLAttributes } from "react";

interface SliderInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
}

export const SliderInput: FC<SliderInputProps> = ({
  label,
  min = 0,
  max = 100,
  step = 1,
  unit,
  showValue = true,
  value,
  className = "",
  ...props
}) => {
  const safeValue = value ?? min;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {label && <label className="text-xs font-medium text-slate-700">{label}</label>}
        {showValue && (
          <span className="text-xs font-medium text-slate-600">
            {safeValue}
            {unit}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-500 ${className}`}
        {...props}
      />
    </div>
  );
};