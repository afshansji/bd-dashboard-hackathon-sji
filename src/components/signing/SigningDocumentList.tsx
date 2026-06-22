import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileX } from "lucide-react";
import { SigningDocumentCard } from "./SigningDocumentCard";
import type { SigningDocument } from "@/types/signing";

interface SigningDocumentListProps {
  documents?: SigningDocument[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export const SigningDocumentList = ({
  documents = [],
  isLoading = false,
  emptyMessage = "No documents found",
}: SigningDocumentListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Filter documents by search query
  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.client?.name?.toLowerCase().includes(query) ||
      doc.deal?.title?.toLowerCase().includes(query) ||
      doc.signing_document_recipients?.some(
        (r) =>
          r.email.toLowerCase().includes(query) ||
          r.first_name?.toLowerCase().includes(query) ||
          r.last_name?.toLowerCase().includes(query)
      )
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            disabled
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, client, or recipient..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">
            {searchQuery ? "No matching documents" : emptyMessage}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Create your first document to get started"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((document) => (
              <SigningDocumentCard
                key={document.id}
                document={document}
                onViewClick={() => navigate(`/signing-documents/${document.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// TABLE VIEW (Alternative)
// ============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { SigningStatusBadge, DocumentTypeBadge } from "./SigningStatusBadge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface SigningDocumentTableProps {
  documents?: SigningDocument[];
  isLoading?: boolean;
}

export const SigningDocumentTable = ({
  documents = [],
  isLoading = false,
}: SigningDocumentTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No documents found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          const signers = doc.signing_document_recipients?.filter((r) => r.role === "signer") || [];
          const signedCount = signers.filter((r) => r.status === "signed").length;

          return (
            <TableRow key={doc.id}>
              <TableCell>
                <Link
                  to={`/signing-documents/${doc.id}`}
                  className="font-medium hover:underline"
                >
                  {doc.title}
                </Link>
              </TableCell>
              <TableCell>
                <DocumentTypeBadge type={doc.document_type} size="sm" />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {doc.client?.name || doc.deal?.title || "-"}
              </TableCell>
              <TableCell>
                <SigningStatusBadge status={doc.status} size="sm" />
              </TableCell>
              <TableCell>
                {signers.length > 0 ? (
                  <span className="text-sm">
                    {signedCount}/{signers.length} signed
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Link to={`/signing-documents/${doc.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
