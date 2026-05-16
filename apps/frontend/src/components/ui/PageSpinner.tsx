export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      <p className="text-sm font-medium text-violet-700">{label}</p>
    </div>
  );
}

export function AppPageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-cyan-300" />
      <p className="text-sm font-medium text-violet-100">{label}</p>
    </div>
  );
}
