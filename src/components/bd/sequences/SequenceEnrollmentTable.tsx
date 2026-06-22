import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Mail, Linkedin, Phone, MessageSquare, CheckCircle2 } from "lucide-react";

interface EnrollmentData {
  id: string;
  status: string;
  enrolled_at: string;
  last_step_executed_at: string | null;
  next_step_scheduled_at: string | null;
  total_sent?: number;
  contact: {
    contact_name: string;
    contact_email: string | null;
    contact_company: string | null;
    status: string;
  } | null;
  sequence: {
    name: string;
    status: string;
  } | null;
  current_step: {
    step_order: number;
    channel: string;
    content_template: any;
  } | null;
}

interface SequenceEnrollmentTableProps {
  enrollments: EnrollmentData[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const channelIcons: Record<string, any> = {
  email: Mail,
  linkedin_connection: Linkedin,
  linkedin_message: Linkedin,
  phone_call: Phone,
  manual_task: MessageSquare,
};

export function SequenceEnrollmentTable({ enrollments, isLoading }: SequenceEnrollmentTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading enrollments...</div>;
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No enrollments found. Click the Play button on a sequence to start enrolling contacts.
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Contact</TableHead>
              <TableHead className="min-w-[150px]">Sequence</TableHead>
              <TableHead className="min-w-[120px]">Current Step</TableHead>
              <TableHead className="min-w-[150px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Enrolled</TableHead>
              <TableHead className="min-w-[130px]">Last Activity</TableHead>
              <TableHead className="min-w-[130px]">Next Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => {
              const Icon = enrollment.current_step?.channel 
                ? channelIcons[enrollment.current_step.channel] || MessageSquare
                : MessageSquare;
              
              const hasEmailsSent = enrollment.total_sent && enrollment.total_sent > 0;

              return (
                <TableRow key={enrollment.id}>
                  <TableCell className="min-w-[180px]">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {enrollment.contact?.contact_name || "Unknown"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {enrollment.contact?.contact_company || "—"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="font-medium">
                      {enrollment.sequence?.name || "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    {enrollment.current_step ? (
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">Step {enrollment.current_step.step_order}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not started</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="flex flex-col gap-1.5">
                      <Badge 
                        variant="outline" 
                        className={`${statusColors[enrollment.status] || ""} text-xs w-fit`}
                      >
                        {enrollment.status}
                      </Badge>
                      {hasEmailsSent && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="font-medium">
                            {enrollment.total_sent} Email{enrollment.total_sent > 1 ? 's' : ''} Sent
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px] text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(enrollment.enrolled_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="min-w-[130px] text-sm text-muted-foreground">
                    {enrollment.last_step_executed_at
                      ? formatDistanceToNow(new Date(enrollment.last_step_executed_at), { addSuffix: true })
                      : "—"}
                  </TableCell>
                  <TableCell className="min-w-[130px] text-sm text-muted-foreground">
                    {enrollment.next_step_scheduled_at
                      ? formatDistanceToNow(new Date(enrollment.next_step_scheduled_at), { addSuffix: true })
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
