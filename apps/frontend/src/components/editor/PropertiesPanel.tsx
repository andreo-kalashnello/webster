import { FC } from "react";
import { X, ChevronDown } from "lucide-react";

import { useEditorStore } from "@/shared/stores/editor.store";
import { ColorInput, NumberInput, SelectInput, SliderInput } from "@/components/ui/controls";

export const PropertiesPanel: FC = () => {
  const { propertiesPanel, updateProperties, clearSelection, togglePropertiesPanel } =
    useEditorStore();

  const { selectedNodeIds, properties, isOpen } = propertiesPanel;

  if (!isOpen || selectedNodeIds.length === 0 || !properties) {
    return null;
  }

  const isMultipleSelection = selectedNodeIds.length > 1;

  return (
    <aside className="fixed right-0 top-[60px] bottom-0 w-full sm:w-80 border-l border-slate-200 bg-white shadow-lg flex flex-col overflow-hidden z-40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">
          {isMultipleSelection ? `${selectedNodeIds.length} objects` : "Properties"}
        </h3>
        <button
          onClick={clearSelection}
          className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
          title="Close (Esc)"
        >
          <X size={18} className="text-slate-700" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Position & Size Section */}
        <section>
          <h4 className="mb-3 flex items-center gap-2 font-medium text-xs uppercase tracking-wider text-slate-600">
            <ChevronDown size={14} />
            Position & Size
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="X"
                value={properties.x ?? 0}
                onChange={(e) => updateProperties({ x: Number(e.target.value) })}
                unit="px"
              />
              <NumberInput
                label="Y"
                value={properties.y ?? 0}
                onChange={(e) => updateProperties({ y: Number(e.target.value) })}
                unit="px"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Width"
                value={properties.width ?? 100}
                onChange={(e) => updateProperties({ width: Number(e.target.value) })}
                min={1}
                unit="px"
              />
              <NumberInput
                label="Height"
                value={properties.height ?? 100}
                onChange={(e) => updateProperties({ height: Number(e.target.value) })}
                min={1}
                unit="px"
              />
            </div>
            <NumberInput
              label="Rotation"
              value={properties.rotation ?? 0}
              onChange={(e) => updateProperties({ rotation: Number(e.target.value) })}
              min={0}
              max={360}
              unit="°"
            />
          </div>
        </section>

        {/* Fill & Stroke Section */}
        <section>
          <h4 className="mb-3 flex items-center gap-2 font-medium text-xs uppercase tracking-wider text-slate-600">
            <ChevronDown size={14} />
            Fill & Stroke
          </h4>
          <div className="space-y-3">
            <ColorInput
              label="Fill Color"
              value={properties.fill ?? "#000000"}
              onChange={(e) => updateProperties({ fill: e.target.value })}
            />
            <ColorInput
              label="Stroke Color"
              value={properties.stroke ?? "#000000"}
              onChange={(e) => updateProperties({ stroke: e.target.value })}
            />
            <NumberInput
              label="Stroke Width"
              value={properties.strokeWidth ?? 1}
              onChange={(e) => updateProperties({ strokeWidth: Number(e.target.value) })}
              min={0}
              step={0.5}
              unit="px"
            />
          </div>
        </section>

        {/* Transparency Section */}
        <section>
          <h4 className="mb-3 flex items-center gap-2 font-medium text-xs uppercase tracking-wider text-slate-600">
            <ChevronDown size={14} />
            Transparency
          </h4>
          <SliderInput
            label="Opacity"
            min={0}
            max={100}
            value={Math.round((properties.opacity ?? 1) * 100)}
            onChange={(e) => updateProperties({ opacity: Number(e.target.value) / 100 })}
            unit="%"
          />
        </section>

        {/* Text Section (if applicable) */}
        {properties.fontSize !== undefined && (
          <section>
            <h4 className="mb-3 flex items-center gap-2 font-medium text-xs uppercase tracking-wider text-slate-600">
              <ChevronDown size={14} />
              Text
            </h4>
            <div className="space-y-3">
              <SelectInput
                label="Font Family"
                value={properties.fontFamily ?? "Arial"}
                onChange={(e) => updateProperties({ fontFamily: e.target.value })}
                options={[
                  { value: "Arial", label: "Arial" },
                  { value: "Helvetica", label: "Helvetica" },
                  { value: "Times New Roman", label: "Times New Roman" },
                  { value: "Courier New", label: "Courier New" },
                  { value: "Georgia", label: "Georgia" },
                ]}
              />
              <NumberInput
                label="Font Size"
                value={properties.fontSize ?? 16}
                onChange={(e) => updateProperties({ fontSize: Number(e.target.value) })}
                min={8}
                max={128}
                unit="px"
              />
              <ColorInput
                label="Text Color"
                value={properties.textColor ?? "#000000"}
                onChange={(e) => updateProperties({ textColor: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateProperties({ fontBold: !properties.fontBold })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    properties.fontBold
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => updateProperties({ fontItalic: !properties.fontItalic })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold italic transition-colors ${
                    properties.fontItalic
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  I
                </button>
                <button
                  onClick={() => updateProperties({ fontUnderline: !properties.fontUnderline })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold underline transition-colors ${
                    properties.fontUnderline
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  U
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};