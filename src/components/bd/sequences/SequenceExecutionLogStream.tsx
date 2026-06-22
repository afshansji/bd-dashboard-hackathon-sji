import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSequenceExecutionLogs } from "@/hooks/useSequenceExecutionLogs";
import { Mail, Linkedin, Phone, CheckCircle2, XCircle, Clock, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef, useEffect } from "react";

interface SequenceExecutionLogStreamProps {
  enrollmentId?: string;
}

export function SequenceExecutionLogStream({ enrollmentId }: SequenceExecutionLogStreamProps) {
  const { data: logs, isLoading } = useSequenceExecutionLogs({ enrollmentId, limit: 50 });
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef(0);

  // Auto-scroll to top when new logs arrive (unless paused)
  useEffect(() => {
    if (!isPaused && logs && logs.length > prevLogsLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLogsLengthRef.current = logs?.length || 0;
  }, [logs, isPaused]);

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3.5 w-3.5" />;
      case 'linkedin':
        return <Linkedin className="h-3.5 w-3.5" />;
      case 'phone':
        return <Phone className="h-3.5 w-3.5" />;
      default:
        return <Mail className="h-3.5 w-3.5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Live Execution Log</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
          className="h-8"
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Pause
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Loading execution logs...
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No execution logs yet. Logs will appear when sequences are executed.
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border transition-all ${
                    getStatusColor(log.status)
                  } ${
                    !isPaused && logs.indexOf(log) === 0
                      ? 'ring-2 ring-primary/20 animate-in fade-in duration-300'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs h-5">
                            {getChannelIcon(log.step?.channel)}
                            <span className="ml-1 capitalize">{log.step?.channel || 'Unknown'}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Step {log.step?.step_order || 'N/A'}
                          </span>
                        </div>
                        <div className="text-sm font-medium truncate">
                          {log.enrollment?.contact?.contact_name || 'Unknown Contact'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.enrollment?.sequence?.name || 'Unknown Sequence'}
                        </div>
                        {log.error_message && (
                          <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.executed_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
