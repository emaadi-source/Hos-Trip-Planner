import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import type { TripPlan } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, MapPin, Clock, Truck, FileText, Printer } from 'lucide-react';
import { RouteMap } from '@/components/route-map';
import { StopsList } from '@/components/stops-list';
import { EldLogsView } from '@/components/eld-logs-view';
import { TripSummaryCard } from '@/components/trip-summary-card';

export default function Results() {
  const [, setLocation] = useLocation();
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tripPlan');
    if (stored) {
      try {
        setTripPlan(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse trip plan:', error);
      }
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!tripPlan) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Trip Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                No trip plan found. Please create a new trip plan first.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setLocation('/')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trip Planner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  New Trip
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Trip Plan Results</h1>
                <p className="text-sm text-muted-foreground">
                  {tripPlan.route.totalDistanceMiles.toFixed(1)} miles · {tripPlan.summary.totalDays} days
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} variant="outline" size="sm" data-testid="button-print">
              <Printer className="w-4 h-4 mr-2" />
              Print Logs
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Warnings */}
        {tripPlan.summary.warnings.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {tripPlan.summary.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <TripSummaryCard
            icon={Truck}
            label="Total Distance"
            value={`${tripPlan.route.totalDistanceMiles.toFixed(1)} mi`}
            data-testid="card-total-distance"
          />
          <TripSummaryCard
            icon={Clock}
            label="Driving Time"
            value={`${tripPlan.route.totalDrivingHours.toFixed(1)} hrs`}
            data-testid="card-driving-time"
          />
          <TripSummaryCard
            icon={MapPin}
            label="Total Stops"
            value={`${tripPlan.stops.length}`}
            data-testid="card-total-stops"
          />
          <TripSummaryCard
            icon={FileText}
            label="Trip Days"
            value={`${tripPlan.summary.totalDays}`}
            data-testid="card-trip-days"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Route Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RouteMap route={tripPlan.route} stops={tripPlan.stops} />
            </CardContent>
          </Card>

          {/* Tabbed Info Panel */}
          <Card className="lg:col-span-1">
            <Tabs defaultValue="overview" className="w-full">
              <CardHeader className="pb-3">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="overview" data-testid="tab-overview">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="stops" data-testid="tab-stops">
                    Stops
                  </TabsTrigger>
                  <TabsTrigger value="logs" data-testid="tab-logs">
                    ELD Logs
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Total Days</span>
                      <span className="text-sm font-mono font-semibold">{tripPlan.summary.totalDays}</span>
                    </div>
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Total Distance</span>
                      <span className="text-sm font-mono font-semibold">
                        {tripPlan.route.totalDistanceMiles.toFixed(1)} miles
                      </span>
                    </div>
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Total Driving Hours</span>
                      <span className="text-sm font-mono font-semibold">
                        {tripPlan.summary.totalDrivingHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Total On-Duty Hours</span>
                      <span className="text-sm font-mono font-semibold">
                        {tripPlan.summary.totalOnDutyHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">HOS Compliant</span>
                      <span
                        className={`text-sm font-semibold ${
                          tripPlan.summary.hosCompliant ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tripPlan.summary.hosCompliant ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Rest Stops</span>
                      <span className="text-sm font-mono font-semibold">{tripPlan.summary.restStops}</span>
                    </div>
                    <div className="flex justify-between items-start pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Fuel Stops</span>
                      <span className="text-sm font-mono font-semibold">{tripPlan.summary.fuelStops}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Break Stops</span>
                      <span className="text-sm font-mono font-semibold">{tripPlan.summary.breakStops}</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="stops" className="mt-0">
                  <StopsList stops={tripPlan.stops} />
                </TabsContent>
                <TabsContent value="logs" className="mt-0">
                  <div className="text-sm text-muted-foreground mb-4">
                    {tripPlan.eldLogs.length} daily log sheet{tripPlan.eldLogs.length !== 1 ? 's' : ''} generated. Use
                    Print button to print all logs.
                  </div>
                  <EldLogsView logs={tripPlan.eldLogs} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
