export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Animated VR Digital logo mark */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-brand animate-glow" />
          <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
            <span className="font-display font-bold text-lg text-primary">VR</span>
          </div>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
