import { useState, useEffect } from 'react';
import { Truck, MapPin, FileText, CheckCircle2 } from 'lucide-react';

const steps = [
  { label: 'Geocoding locations', icon: MapPin },
  { label: 'Calculating route', icon: Truck },
  { label: 'Applying HOS rules', icon: CheckCircle2 },
  { label: 'Generating ELD logs', icon: FileText },
];

export function LoadingProgress() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 mb-4 animate-pulse">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Planning your trip</h2>
          <p className="text-sm text-muted-foreground">This may take a few moments</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div
                key={step.label}
                className="flex items-center gap-4 transition-all duration-300"
                style={{
                  opacity: isActive || isComplete ? 1 : 0.4,
                }}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    isComplete
                      ? 'bg-primary border-primary'
                      : isActive
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted border-border'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-300 ${
                      isComplete
                        ? 'text-primary-foreground'
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {isActive && (
                  <div className="w-6 h-6">
                    <div className="w-full h-full border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {isComplete && <CheckCircle2 className="w-6 h-6 text-primary" />}
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
