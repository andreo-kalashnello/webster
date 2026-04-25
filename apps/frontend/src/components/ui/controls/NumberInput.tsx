import { FC, InputHTMLAttributes } from "react";

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const NumberInput: FC<NumberInputProps> = ({
  label,
  min,
  max,
  step = 1,
  unit,
  className = "",
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-700">{label}</label>}
      <div className="relative flex items-center">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
          {...props}
        />
        {unit && <span className="absolute right-3 text-xs text-slate-500">{unit}</span>}
      </div>
    </div>
  );
};
