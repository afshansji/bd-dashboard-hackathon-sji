import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Shield, Plus, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Settings } from "lucide-react";
import { useSigningDocuments, useSigningDocumentStats } from "@/hooks/useSigningDocuments";
import { usePandaDocIntegration } from "@/hooks/usePandaDocIntegration";
import { SigningDocumentDialog, SigningDocumentList } from "@/components/signing";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import type { SigningDocumentStatus, DocumentType } from "@/types/signing";

export default function SigningDocuments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  
  const { data: integration, isLoading: integrationLoading } = usePandaDocIntegration();
  const isIntegrationConfigured = integration?.is_active === true;

  const { data: documents, isLoading } = useSigningDocuments({
    status: statusFilter !== "all" ? (statusFilter as SigningDocumentStatus) : undefined,
  });

  const { data: stats } = useSigningDocumentStats();

  const openDialog = (type?: DocumentType) => {
    setDocumentType(type);
    setDialogOpen(true);
  };

  // Calculate stats from documents
  const docStats = {
    total: documents?.length || 0,
    draft: documents?.filter((d) => d.status === "draft").length || 0,
    pending: documents?.filter((d) => ["sent", "viewed"].includes(d.status)).length || 0,
    completed: documents?.filter((d) => d.status === "completed").length || 0,
    declined: documents?.filter((d) => d.status === "declined").length || 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Integration Not Configured Banner */}
      {!integrationLoading && !isIntegrationConfigured && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Document Signing Not Set Up</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p className="mb-2">
              To create and send SOWs and NDAs, the PandaDoc integration needs to be configured first.
            </p>
            {isAdmin ? (
              <Button asChild variant="outline" size="sm" className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                <Link to="/adminpanel/integrations">
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Integration Manager
                </Link>
              </Button>
            ) : (
              <p className="text-sm">Please contact an administrator to set up the PandaDoc integration.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Signing Documents</h1>
          <p className="text-muted-foreground">
            Create and manage SOWs and NDAs with embedded e-signatures
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => openDialog("nda")}
            disabled={!isIntegrationConfigured}
            title={!isIntegrationConfigured ? "PandaDoc integration not configured" : undefined}
          >
            <Shield className="h-4 w-4 mr-2" />
            New NDA
          </Button>
          <Button 
            onClick={() => openDialog("sow")}
            disabled={!isIntegrationConfigured}
            title={!isIntegrationConfigured ? "PandaDoc integration not configured" : undefined}
          >
            <FileText className="h-4 w-4 mr-2" />
            New SOW
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Documents"
          value={docStats.total}
          icon={<FileText className="h-4 w-4" />}
          description="All time"
        />
        <StatsCard
          title="Pending Signature"
          value={docStats.pending}
          icon={<Clock className="h-4 w-4" />}
          description="Awaiting action"
          highlight={docStats.pending > 0}
        />
        <StatsCard
          title="Completed"
          value={docStats.completed}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          description="Fully signed"
        />
        <StatsCard
          title="Completion Rate"
          value={`${stats?.completionRate?.toFixed(0) || 0}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Of sent documents"
        />
      </div>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {docStats.total > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 rounded px-1.5">
                {docStats.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft
            {docStats.draft > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 rounded px-1.5">
                {docStats.draft}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="viewed">Viewed</TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {docStats.completed > 0 && (
              <span className="ml-1.5 text-xs bg-green-500/20 text-green-700 dark:text-green-400 rounded px-1.5">
                {docStats.completed}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="voided">Voided</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          <SigningDocumentList
            documents={documents}
            isLoading={isLoading}
            emptyMessage={
              statusFilter === "all"
                ? "No signing documents yet. Create your first SOW or NDA to get started."
                : `No ${statusFilter} documents`
            }
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <SigningDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        documentType={documentType}
      />
    </div>
  );
}

// ============================================================================
// STATS CARD
// ============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  highlight?: boolean;
}

const StatsCard = ({ title, value, icon, description, highlight = false }: StatsCardProps) => {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};
