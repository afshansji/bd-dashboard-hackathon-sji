import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ReportSectionProps {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ReportSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: ReportSectionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? id : undefined}
      className="rounded-lg border bg-card"
    >
      <AccordionItem value={id} className="border-none">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="text-left">
            <div className="text-base font-semibold">{title}</div>
            {description ? (
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
