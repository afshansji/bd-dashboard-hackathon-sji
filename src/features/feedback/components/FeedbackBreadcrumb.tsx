import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface FeedbackBreadcrumbProps {
  parentLabel: string;
  parentPath: string;
  currentLabel: string;
  type?: "bug" | "feature";
}

export function FeedbackBreadcrumb({
  parentLabel,
  parentPath,
  currentLabel,
  type,
}: FeedbackBreadcrumbProps) {
  const typeLabel = type === "bug" ? "Bug" : type === "feature" ? "Feature" : "";
  const displayLabel = typeLabel ? `${typeLabel}: ${currentLabel}` : currentLabel;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={parentPath}>{parentLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage className="max-w-[300px] truncate">
            {displayLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
