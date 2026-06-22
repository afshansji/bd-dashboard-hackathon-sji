import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, AlertCircle, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { useDealFiles } from "@/hooks/useDealFiles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface AIAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  agentDescription: string;
  dealId: string;
  dealTitle: string;
  onExecute: (fileIds: string[], userContext: string) => Promise<void>;
  isLoading: boolean;
  result?: any;
}

export function AIAgentModal({
  open,
  onOpenChange,
  agentId,
  agentName,
  agentDescription,
  dealId,
  dealTitle,
  onExecute,
  isLoading,
  result,
}: AIAgentModalProps) {
  const { files, loading: filesLoading } = useDealFiles({ dealId, enabled: open });
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [userContext, setUserContext] = useState("");

  const handleFileToggle = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleExecute = async () => {
    if (selectedFileIds.length === 0) return;
    await onExecute(selectedFileIds, userContext);
  };

  const handleClose = () => {
    setSelectedFileIds([]);
    setUserContext("");
    onOpenChange(false);
  };

  const renderResult = () => {
    if (!result) return null;

    const output = result.structured_output || {};

    // Deal Status Intelligence
    if (agentId.includes('deal_analysis') || output.confidence_score !== undefined) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Summary</h4>
              <p className="text-sm text-muted-foreground">{output.summary}</p>
            </div>
            {output.confidence_score && (
              <Badge variant="secondary">
                Score: {output.confidence_score}/10
              </Badge>
            )}
          </div>

          {output.blockers && output.blockers.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Blockers</h4>
                  <ul className="space-y-1">
                    {output.blockers.map((blocker: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">• {blocker}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {output.next_steps && output.next_steps.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Next Steps</h4>
                  <div className="space-y-2">
                    {output.next_steps.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <Badge variant={step.priority === 'high' ? 'destructive' : step.priority === 'medium' ? 'default' : 'secondary'}>
                          {step.priority}
                        </Badge>
                        <p className="text-sm flex-1">{step.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {output.key_insights && output.key_insights.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Key Insights</h4>
                <ul className="space-y-1">
                  {output.key_insights.map((insight: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">• {insight}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      );
    }

    // Proposal Gap Analysis
    if (output.gaps || output.overall_score !== undefined) {
      return (
        <div className="space-y-4">
          {output.overall_score && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-semibold">Overall Proposal Score</span>
              <Badge variant="secondary" className="text-lg">{output.overall_score}/10</Badge>
            </div>
          )}

          {output.gaps && output.gaps.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Identified Gaps
                </h4>
                <div className="space-y-3">
                  {output.gaps.map((gap: any, i: number) => (
                    <div key={i} className="border-l-2 border-destructive pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{gap.impact} impact</Badge>
                      </div>
                      <p className="text-sm font-medium mb-1">{gap.gap}</p>
                      <p className="text-sm text-muted-foreground">→ {gap.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {output.strengths && output.strengths.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {output.strengths.map((strength: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">• {strength}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      );
    }

    // Client Objection Handler
    if (output.objection_analysis || output.recommended_response) {
      return (
        <div className="space-y-4">
          {output.objection_analysis && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Objection Type</span>
                <p className="text-sm font-semibold">{output.objection_analysis.objection_type}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Underlying Concern</span>
                <p className="text-sm">{output.objection_analysis.underlying_concern}</p>
              </div>
            </div>
          )}

          {output.recommended_response && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Recommended Response</h4>
                <div className="space-y-3 p-3 border rounded-lg bg-card">
                  <p className="text-sm leading-relaxed">{output.recommended_response.full_response}</p>
                </div>
              </div>
            </>
          )}

          {output.evidence_found && output.evidence_found.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Supporting Evidence</h4>
                <div className="space-y-2">
                  {output.evidence_found.map((evidence: any, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-primary pl-3">
                      <p className="font-medium">{evidence.document}</p>
                      <p className="text-muted-foreground italic">"{evidence.evidence}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {output.follow_up_actions && output.follow_up_actions.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Follow-up Actions</h4>
                <div className="space-y-2">
                  {output.follow_up_actions.map((action: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <Badge variant="outline">{action.timing}</Badge>
                      <p className="text-sm flex-1">{action.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Fallback for unknown format
    return (
      <div className="text-sm">
        <pre className="whitespace-pre-wrap bg-muted p-3 rounded-lg">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{agentName}</DialogTitle>
          <DialogDescription>{agentDescription}</DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Documents to Analyze
              </label>
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                {filesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2" />
                    <p className="text-sm">No documents available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => handleFileToggle(file.id)}
                      >
                        <Checkbox
                          checked={selectedFileIds.includes(file.id)}
                          onCheckedChange={() => handleFileToggle(file.id)}
                        />
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.drive_file_name || 'Untitled'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{file.drive_file_type || 'Unknown type'}</span>
                            {file.category ? (
                              <Badge variant="outline">{file.category}</Badge>
                            ) : (
                              <span className="italic">Uncategorized</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedFileIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedFileIds.length} file(s) selected
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Additional Context (Optional)
              </label>
              <Textarea
                placeholder="Add any specific questions, concerns, or context for the AI to consider..."
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {selectedFileIds.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one document to analyze
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleExecute}
                disabled={selectedFileIds.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Documents'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="pr-4">
                {renderResult()}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
