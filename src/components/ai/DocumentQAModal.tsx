import { useState } from 'react';
import { MessageSquare, Send, Loader2, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useDealFiles } from '@/hooks/useDealFiles';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DocumentQAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealTitle: string;
}

export function DocumentQAModal({ open, onOpenChange, dealId, dealTitle }: DocumentQAModalProps) {
  const [phase, setPhase] = useState<'select' | 'chat'>('select');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { files, loading: filesLoading } = useDealFiles({ dealId, enabled: open });

  const handleStartChat = () => {
    if (selectedFileIds.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    setPhase('chat');
  };

  const handleBackToSelection = () => {
    setPhase('select');
    setMessages([]);
    setCurrentQuestion('');
  };

  const handleSendMessage = async () => {
    if (!currentQuestion.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: currentQuestion.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('run-ai-agent', {
        body: {
          agent_type: 'document_qa',
          execution_context: {
            deal_id: dealId,
            deal_title: dealTitle,
          },
          file_ids: selectedFileIds,
          current_question: userMessage.content,
          conversation_history: conversationHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || data.summary || 'I apologize, but I was unable to generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Q&A error:', error);
      toast.error('Failed to get response', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Document Q&A Assistant
          </DialogTitle>
          <DialogDescription>
            {phase === 'select'
              ? 'Select documents to analyze, then ask questions about their content'
              : 'Ask questions about the selected documents'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'select' ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {filesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No documents available</p>
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedFileIds.includes(file.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFileIds((prev) => [...prev, file.id]);
                          } else {
                            setSelectedFileIds((prev) => prev.filter((id) => id !== file.id));
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <p className="text-sm font-medium truncate">{file.drive_file_name || 'Untitled'}</p>
                        </div>
                        {file.category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {file.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {selectedFileIds.length} document{selectedFileIds.length !== 1 ? 's' : ''} selected
              </p>
              <Button onClick={handleStartChat} disabled={selectedFileIds.length === 0}>
                Start Conversation
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Selected Documents Badge */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
              <p className="text-xs text-muted-foreground mr-2">Analyzing:</p>
              {selectedFiles.map((file) => (
                <Badge key={file.id} variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {file.drive_file_name}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 ml-auto"
                onClick={handleBackToSelection}
              >
                <X className="h-3 w-3 mr-1" />
                Change Documents
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Ask a question to get started</p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">Analyzing documents...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask a question about the documents..."
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentQuestion.trim() || isLoading}
                size="icon"
                className="flex-shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
