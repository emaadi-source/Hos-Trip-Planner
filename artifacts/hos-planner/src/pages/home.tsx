import { useState } from 'react';
import { useLocation } from 'wouter';
import { usePlanTrip } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, MapPin, Package, Clock } from 'lucide-react';
import { LoadingProgress } from '@/components/loading-progress';

export default function Home() {
  const [, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [currentCycleUsed, setCurrentCycleUsed] = useState('0');
  const [validationError, setValidationError] = useState('');

  const planTrip = usePlanTrip();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!currentLocation.trim() || !pickupLocation.trim() || !dropoffLocation.trim()) {
      setValidationError('All location fields are required');
      return;
    }

    const cycleHours = Number(currentCycleUsed);
    if (isNaN(cycleHours) || cycleHours < 0 || cycleHours > 70) {
      setValidationError('Cycle hours must be between 0 and 70');
      return;
    }

    planTrip.mutate(
      {
        data: {
          currentLocation: currentLocation.trim(),
          pickupLocation: pickupLocation.trim(),
          dropoffLocation: dropoffLocation.trim(),
          currentCycleUsed: cycleHours,
        },
      },
      {
        onSuccess: (data) => {
          localStorage.setItem('tripPlan', JSON.stringify(data));
          setLocation('/results');
        },
        onError: (error: any) => {
          setValidationError(error?.message || 'Failed to plan trip. Please try again.');
        },
      }
    );
  };

  if (planTrip.isPending) {
    return <LoadingProgress />;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 mb-4">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">HOS Trip Planner</h1>
          <p className="text-muted-foreground">
            Plan FMCSA compliant routes with automated ELD log generation
          </p>
        </div>

        <Card className="border-card-border shadow-md">
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>
              Enter your current location, pickup, dropoff, and cycle hours used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {validationError && (
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {planTrip.isError && (
                <Alert variant="destructive" data-testid="alert-api-error">
                  <AlertDescription>
                    {(planTrip.error as any)?.message || 'An error occurred while planning your trip'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentLocation" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Current Location
                </Label>
                <Input
                  id="currentLocation"
                  data-testid="input-current-location"
                  placeholder="City, State or full address"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupLocation" className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Pickup Location
                </Label>
                <Input
                  id="pickupLocation"
                  data-testid="input-pickup-location"
                  placeholder="City, State or full address"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoffLocation" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Dropoff Location
                </Label>
                <Input
                  id="dropoffLocation"
                  data-testid="input-dropoff-location"
                  placeholder="City, State or full address"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycleUsed" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Current Cycle Hours Used (70hr/8-day)
                </Label>
                <Input
                  id="cycleUsed"
                  data-testid="input-cycle-used"
                  type="number"
                  min="0"
                  max="70"
                  step="0.1"
                  placeholder="0.0"
                  value={currentCycleUsed}
                  onChange={(e) => setCurrentCycleUsed(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter hours already used in your current 70 hour/8 day cycle (0-70)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                data-testid="button-plan-trip"
              >
                Plan Trip
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Compliant with FMCSA regulations: 11hr drive limit, 14hr window, 30min break, 70hr/8-day cycle
        </div>
      </div>
    </div>
  );
}
