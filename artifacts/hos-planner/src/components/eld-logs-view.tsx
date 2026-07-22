import { useRef, useEffect } from 'react';
import type { EldLog } from '@workspace/api-client-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EldLogsViewProps {
  logs: EldLog[];
}

export function EldLogsView({ logs }: EldLogsViewProps) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6">
        {logs.map((log, idx) => (
          <EldLogSheet key={idx} log={log} index={idx} />
        ))}
      </div>
    </ScrollArea>
  );
}

interface EldLogSheetProps {
  log: EldLog;
  index: number;
}

function EldLogSheet({ log, index }: EldLogSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = 800;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px "DM Sans", sans-serif';
    ctx.fillText('DRIVER DAILY LOG - FMCSA COMPLIANT', 20, 30);

    ctx.font = '12px "DM Sans", sans-serif';
    ctx.fillText(`Date: ${log.date}`, 20, 50);
    ctx.fillText(`Day: ${log.dayNumber}`, 200, 50);
    ctx.fillText(`From: ${log.startLocation}`, 20, 70);
    ctx.fillText(`To: ${log.endLocation}`, 20, 85);
    ctx.fillText(`Total Miles: ${log.totalMilesToday.toFixed(1)}`, 500, 70);
    ctx.fillText(`Driving Miles: ${log.totalMilesDriving.toFixed(1)}`, 500, 85);

    // Grid settings
    const gridTop = 110;
    const gridHeight = 240;
    const gridLeft = 120;
    const gridWidth = 660;
    const rowHeight = gridHeight / 4;
    const hourWidth = gridWidth / 24;

    // Draw grid border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridLeft, gridTop, gridWidth, gridHeight);

    // Draw horizontal lines (4 rows)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cbd5e1';
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(gridLeft, gridTop + i * rowHeight);
      ctx.lineTo(gridLeft + gridWidth, gridTop + i * rowHeight);
      ctx.stroke();
    }

    // Draw vertical lines (24 hours)
    for (let i = 1; i < 24; i++) {
      ctx.beginPath();
      ctx.moveTo(gridLeft + i * hourWidth, gridTop);
      ctx.lineTo(gridLeft + i * hourWidth, gridTop + gridHeight);
      ctx.stroke();
    }

    // Draw hour labels
    ctx.fillStyle = '#475569';
    ctx.font = '9px "Space Mono", monospace';
    const hours = ['Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    hours.forEach((hour, i) => {
      const x = gridLeft + i * hourWidth + hourWidth / 2;
      ctx.save();
      ctx.translate(x, gridTop - 5);
      ctx.textAlign = 'center';
      ctx.fillText(hour, 0, 0);
      ctx.restore();
    });

    // Draw row labels
    ctx.font = '11px "DM Sans", sans-serif';
    ctx.textAlign = 'right';
    const rowLabels = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty (Not Driving)'];
    rowLabels.forEach((label, i) => {
      ctx.fillText(label, gridLeft - 10, gridTop + i * rowHeight + rowHeight / 2 + 4);
    });

    // Draw duty status entries
    const statusToRow: Record<string, number> = {
      offDuty: 0,
      sleeperBerth: 1,
      driving: 2,
      onDutyNotDriving: 3,
    };

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e40af';

    log.entries.forEach((entry) => {
      const row = statusToRow[entry.status];
      if (row === undefined) return;

      const startX = gridLeft + entry.startHour * hourWidth;
      const endX = gridLeft + entry.endHour * hourWidth;
      const y = gridTop + row * rowHeight + rowHeight / 2;

      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();

      // Draw vertical lines at transitions
      ctx.beginPath();
      ctx.moveTo(startX, gridTop + row * rowHeight + 5);
      ctx.lineTo(startX, gridTop + (row + 1) * rowHeight - 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(endX, gridTop + row * rowHeight + 5);
      ctx.lineTo(endX, gridTop + (row + 1) * rowHeight - 5);
      ctx.stroke();
    });

    // Draw totals section
    const totalsTop = gridTop + gridHeight + 20;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "DM Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL HOURS', 20, totalsTop);

    ctx.font = '10px "Space Mono", monospace';
    ctx.fillText(`Off Duty: ${log.totalHoursOffDuty.toFixed(1)}h`, 20, totalsTop + 20);
    ctx.fillText(`Sleeper Berth: ${log.totalHoursSleeperBerth.toFixed(1)}h`, 20, totalsTop + 35);
    ctx.fillText(`Driving: ${log.totalHoursDriving.toFixed(1)}h`, 20, totalsTop + 50);
    ctx.fillText(`On Duty (Not Driving): ${log.totalHoursOnDutyNotDriving.toFixed(1)}h`, 20, totalsTop + 65);

    // Draw remarks
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "DM Sans", sans-serif';
    ctx.fillText('REMARKS', 300, totalsTop);
    ctx.font = '9px "DM Sans", sans-serif';
    ctx.fillStyle = '#475569';
    const remarkLines = log.remarks.split('\n').slice(0, 4);
    remarkLines.forEach((line, i) => {
      ctx.fillText(line.substring(0, 60), 300, totalsTop + 20 + i * 15);
    });

    // Draw recap
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "DM Sans", sans-serif';
    ctx.fillText('70-HR/8-DAY RECAP', 20, totalsTop + 90);
    ctx.font = '9px "Space Mono", monospace';
    ctx.fillText(`On-Duty Today: ${log.recap.totalOnDutyToday.toFixed(1)}h`, 20, totalsTop + 110);
    ctx.fillText(`On-Duty Last 7 Days: ${log.recap.totalOnDutyLast7Days.toFixed(1)}h`, 20, totalsTop + 125);
    ctx.fillText(`Cycle Hours Used: ${log.recap.cycleHoursUsed.toFixed(1)}h`, 20, totalsTop + 140);
    ctx.fillText(`Cycle Hours Remaining: ${log.recap.cycleHoursRemaining.toFixed(1)}h`, 20, totalsTop + 155);
  }, [log]);

  return (
    <div className="mb-6" data-testid={`eld-log-${index}`}>
      <div className="text-sm font-semibold mb-2 text-foreground">
        Day {log.dayNumber}  {log.date}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full border border-border rounded-md bg-white"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
