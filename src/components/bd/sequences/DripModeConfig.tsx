import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus } from "lucide-react";

export interface BatchConfig {
  messagesPerBatch: number;
  repeatInterval: number;
  repeatUnit: 'minutes' | 'hours' | 'days';
  sendDays: string[];
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

interface DripModeConfigProps {
  config: BatchConfig;
  onChange: (config: BatchConfig) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function DripModeConfig({ config, onChange }: DripModeConfigProps) {
  const updateBatchSize = (delta: number) => {
    const newSize = Math.max(1, Math.min(1000, config.messagesPerBatch + delta));
    onChange({ ...config, messagesPerBatch: newSize });
  };

  const toggleDay = (day: string) => {
    const newDays = config.sendDays.includes(day)
      ? config.sendDays.filter(d => d !== day)
      : [...config.sendDays, day];
    onChange({ ...config, sendDays: newDays });
  };

  const selectAllDays = () => {
    onChange({ ...config, sendDays: [...DAYS] });
  };

  const selectWeekdays = () => {
    onChange({ ...config, sendDays: [...WEEKDAYS] });
  };

  return (
    <div className="space-y-6">
      {/* Messages per batch */}
      <div className="space-y-2">
        <Label>Number of Messages per Batch</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => updateBatchSize(-10)}
            className="h-10 w-10"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={config.messagesPerBatch}
            onChange={(e) => onChange({
              ...config,
              messagesPerBatch: Math.max(1, Math.min(1000, parseInt(e.target.value) || 25))
            })}
            className="text-center"
            min={1}
            max={1000}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => updateBatchSize(10)}
            className="h-10 w-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended: 25-50 emails per batch for best deliverability
        </p>
      </div>

      {/* Repeat interval */}
      <div className="space-y-2">
        <Label>Repeat After</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={config.repeatInterval}
            onChange={(e) => onChange({
              ...config,
              repeatInterval: Math.max(1, parseInt(e.target.value) || 1)
            })}
            className="flex-1"
            min={1}
          />
          <Select
            value={config.repeatUnit}
            onValueChange={(value: 'minutes' | 'hours' | 'days') => 
              onChange({ ...config, repeatUnit: value })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Send on days */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Send On</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectWeekdays}
              className="h-8 text-xs"
            >
              Weekdays
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllDays}
              className="h-8 text-xs"
            >
              All Days
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex flex-col items-center gap-1"
            >
              <Checkbox
                id={day}
                checked={config.sendDays.includes(day)}
                onCheckedChange={() => toggleDay(day)}
              />
              <Label
                htmlFor={day}
                className="text-xs cursor-pointer"
              >
                {day}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Time window (optional) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Time Window (Optional)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="start-time" className="text-xs text-muted-foreground">
              Start From
            </Label>
            <Input
              id="start-time"
              type="time"
              value={config.timeWindowStart || ''}
              onChange={(e) => onChange({
                ...config,
                timeWindowStart: e.target.value || undefined
              })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-time" className="text-xs text-muted-foreground">
              End At
            </Label>
            <Input
              id="end-time"
              type="time"
              value={config.timeWindowEnd || ''}
              onChange={(e) => onChange({
                ...config,
                timeWindowEnd: e.target.value || undefined
              })}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-3 bg-muted rounded-lg text-sm">
        <div className="font-medium mb-1">Preview:</div>
        <div className="text-muted-foreground">
          Will send {config.messagesPerBatch} emails every {config.repeatInterval}{' '}
          {config.repeatUnit} on {config.sendDays.join(', ')}
          {config.timeWindowStart && config.timeWindowEnd && (
            <> between {config.timeWindowStart} - {config.timeWindowEnd}</>
          )}
        </div>
      </div>
    </div>
  );
}