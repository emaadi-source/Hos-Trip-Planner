import { useState } from 'react';
import { useLocation } from 'wouter';
import { usePlanTrip } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

    if (
      !currentLocation.trim() ||
      !pickupLocation.trim() ||
      !dropoffLocation.trim()
    ) {
      setValidationError('All location fields are required.');
      return;
    }

    const cycleHours = Number(currentCycleUsed);

    if (isNaN(cycleHours) || cycleHours < 0 || cycleHours > 70) {
      setValidationError('Cycle hours must be between 0 and 70.');
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
        onError: () => {
          // Leave empty.
          // We'll show our own professional message below.
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

          <h1 className="text-3xl font-bold text-foreground mb-2">
            HOS Trip Planner
          </h1>

          <p className="text-muted-foreground">
            Plan FMCSA compliant routes with automated ELD log generation
          </p>
        </div>

        <Card className="border-card-border shadow-md">
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>

            <CardDescription>
              Enter your current location, pickup, dropoff, and cycle hours
              used.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Validation Errors */}
              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Friendly API Error */}
              {planTrip.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <strong>Unable to locate one or more locations.</strong>

                    <br />
                    <br />

                    This application uses the free OpenStreetMap geocoding
                    service. Occasionally it may not recognize short or
                    incomplete place names.

                    <br />
                    <br />

                    <strong>Please try entering:</strong>

                    <ul className="list-disc ml-6 mt-2">
                      <li>Exact GPS Coordinates of desired location (Latitude, Longitude)</li>
                    </ul>

                    <br />

                    Example:
                    <br />
                    <strong>33.7077°N, 73.0499°E</strong>
                    <br />
                    instead of
                    <br />
                    <strong>Islamabad</strong>

                    <br />
                    <br />

                    Thank you for your understanding.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentLocation">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Current Location
                  </div>
                </Label>

                <Input
                  id="currentLocation"
                  placeholder="City, State or full address"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupLocation">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    Pickup Location
                  </div>
                </Label>

                <Input
                  id="pickupLocation"
                  placeholder="City, State or full address"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoffLocation">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Dropoff Location
                  </div>
                </Label>

                <Input
                  id="dropoffLocation"
                  placeholder="City, State or full address"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycleUsed">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Current Cycle Hours Used (70hr/8-day)
                  </div>
                </Label>

                <Input
                  id="cycleUsed"
                  type="number"
                  min="0"
                  max="70"
                  step="0.1"
                  value={currentCycleUsed}
                  onChange={(e) => setCurrentCycleUsed(e.target.value)}
                />

                <p className="text-xs text-muted-foreground">
                  Enter hours already used in your current 70-hour / 8-day cycle.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
              >
                Plan Trip
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Compliant with FMCSA regulations: 11-hour drive limit, 14-hour
          window, 30-minute break, and 70-hour / 8-day cycle.
        </div>
      </div>
    </div>
  );
}