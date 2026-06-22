import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Calendar, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useAcceptSuggestion, useRejectSuggestion } from '@/hooks/useFollowUps';
import { useState } from 'react';
import { FollowUpDialog } from './FollowUpDialog';

const priorityColors = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export function SuggestionCard({ suggestion }: { suggestion: any }) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const acceptSuggestion = useAcceptSuggestion();
  const rejectSuggestion = useRejectSuggestion();

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{suggestion.metadata?.topic || 'Follow-up'}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(suggestion.suggested_date), 'MMM d, yyyy')}</span>
                  <Badge className={priorityColors[suggestion.suggested_priority]} variant="secondary">
                    {suggestion.suggested_priority}
                  </Badge>
                  <Badge variant="outline">{suggestion.suggested_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{suggestion.reasoning}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        {suggestion.ai_message_draft && (
          <CardContent className="pt-0">
            <div className="bg-background p-3 rounded-md mb-3">
              <p className="text-sm whitespace-pre-wrap">{suggestion.ai_message_draft}</p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptSuggestion.mutate(suggestion)}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomizeOpen(true)}
                className="flex-1"
              >
                Customize
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => rejectSuggestion.mutate(suggestion.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <FollowUpDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        dealId={suggestion.deal_id}
        contactId={suggestion.campaign_contact_id}
        aiDraft={suggestion.ai_message_draft}
      />
    </>
  );
}
