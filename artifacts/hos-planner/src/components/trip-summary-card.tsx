import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TripSummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  'data-testid'?: string;
}

export function TripSummaryCard({ icon: Icon, label, value, 'data-testid': testId }: TripSummaryCardProps) {
  return (
    <Card className="border-card-border" data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold font-mono text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
