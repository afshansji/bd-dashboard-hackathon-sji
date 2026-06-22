import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useSequences } from "@/hooks/useSequences";
import { useSequenceEnrollments, useSequenceMetrics } from "@/hooks/useSequenceEnrollments";
import { SequenceExecutionMetrics } from "./SequenceExecutionMetrics";
import { SequenceEnrollmentTable } from "./SequenceEnrollmentTable";
import { SequenceExecutionLogStream } from "./SequenceExecutionLogStream";
import { LiveStatusIndicator } from "./LiveStatusIndicator";
import { ExecutionLogViewer } from "./ExecutionLogViewer";
import { EmailDiagnostics } from "./EmailDiagnostics";
import { useToast } from "@/hooks/use-toast";

export function SequenceExecutionDashboard() {
  const [selectedSequence, setSelectedSequence] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const { toast } = useToast();
  const { data: sequences, isLoading: loadingSequences } = useSequences();
  const prevDataRef = useRef<any>(null);
  
  const filters = {
    sequenceId: selectedSequence !== "all" ? selectedSequence : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
    dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
  };

  const { data: enrollments, isLoading: loadingEnrollments, dataUpdatedAt } = useSequenceEnrollments(filters);
  const { data: metrics, isLoading: loadingMetrics } = useSequenceMetrics(
    selectedSequence !== "all" ? selectedSequence : undefined
  );

  // Track updates and show notifications
  useEffect(() => {
    if (enrollments && prevDataRef.current && enrollments !== prevDataRef.current) {
      setLastUpdated(new Date());
      
      // Show toast notification for data updates
      const prevLength = prevDataRef.current?.length || 0;
      const currentLength = enrollments.length || 0;
      
      if (currentLength > prevLength) {
        toast({
          title: "New enrollment detected",
          description: `${currentLength - prevLength} new enrollment(s) added`,
          duration: 3000,
        });
      }
    }
    prevDataRef.current = enrollments;
  }, [enrollments, toast, dataUpdatedAt]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const timeSinceUpdate = Date.now() - lastUpdated.getTime();
      if (timeSinceUpdate > 60000) { // 1 minute without updates
        setIsReconnecting(true);
        setTimeout(() => {
          setIsConnected(true);
          setIsReconnecting(false);
        }, 2000);
      }
    };

    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleClearFilters = () => {
    setSelectedSequence("all");
    setSelectedStatus("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sequence Execution Monitor</h2>
          <p className="text-muted-foreground">
            Real-time tracking of sequence performance and execution
          </p>
        </div>
        <LiveStatusIndicator 
          isConnected={isConnected} 
          isReconnecting={isReconnecting}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Tabs for Live vs History */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList>
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
          <TabsTrigger value="history">History Explorer</TabsTrigger>
          <TabsTrigger value="diagnostics">Email Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6 mt-6">

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter enrollments by sequence, status, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Sequence</label>
              <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                <SelectTrigger>
                  <SelectValue placeholder="All sequences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sequences</SelectItem>
                  {sequences?.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      {metrics && (
        <SequenceExecutionMetrics metrics={metrics} isLoading={loadingMetrics} />
      )}

          {/* Enrollments Table and Live Log */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Status</CardTitle>
                <CardDescription>
                  Track each contact's progress through the sequence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SequenceEnrollmentTable 
                  enrollments={enrollments || []} 
                  isLoading={loadingEnrollments}
                />
              </CardContent>
            </Card>

            <SequenceExecutionLogStream />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ExecutionLogViewer />
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-6">
          <EmailDiagnostics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
