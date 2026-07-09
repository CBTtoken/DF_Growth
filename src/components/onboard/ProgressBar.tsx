export function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className="w-full max-w-md">
      <p className="text-xs text-gray-500 mb-1">
        Step {step} of {totalSteps}
      </p>
      <div className="h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-brand transition-all"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
