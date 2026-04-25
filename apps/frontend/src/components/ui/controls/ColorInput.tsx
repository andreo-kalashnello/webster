import { FC, InputHTMLAttributes } from "react";

interface ColorInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  showHex?: boolean;
}

export const ColorInput: FC<ColorInputProps> = ({ label, showHex = true, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-700">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded-md border border-slate-300"
          {...props}
        />
        {showHex && (
          <input
            type="text"
            placeholder="#000000"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            pattern="^#[0-9A-Fa-f]{6}$"
            {...props}
          />
        )}
      </div>
    </div>
  );
};
