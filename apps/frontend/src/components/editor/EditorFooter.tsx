import { FC } from "react";
import { Save, Download, Share2 } from "lucide-react";

export const EditorFooter: FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Status Info */}
        <div className="text-xs text-slate-600">
          <span className="font-medium">Version:</span> 1.0 • <span className="font-medium">Last saved:</span> Just now
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors text-slate-700 text-sm font-medium">
            <Save size={16} />
            Save
          </button>
          <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors text-slate-700 text-sm font-medium">
            <Download size={16} />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors text-slate-700 text-sm font-medium">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </footer>
  );
};