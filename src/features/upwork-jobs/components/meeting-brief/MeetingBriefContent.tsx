import type { ElementType } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { MeetingBrief } from "../../types/meetingBrief";

interface MeetingBriefContentProps {
  brief: MeetingBrief;
  generatedAt?: string | null;
  leadTitle?: string;
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-900 border-amber-200",
    low: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${styles[priority]}`}>
      {priority}
    </Badge>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None identified.</p>;
  }
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

export function MeetingBriefContent({
  brief,
  generatedAt,
  leadTitle,
}: MeetingBriefContentProps) {
  const snapshot = brief.companySnapshot;
  const opp = brief.opportunitySummary;
  const cheat = brief.cheatSheet;

  return (
    <div id="meeting-brief-print-root" className="space-y-5">
      <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-6 dark:from-slate-900 dark:to-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Executive Meeting Brief
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {brief.title || leadTitle || "Discovery Call Brief"}
            </h1>
            {generatedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Generated {formatRelativeTime(generatedAt)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {brief.dataSourcesUsed.slice(0, 4).map((source) => (
              <Badge key={source} variant="secondary" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{brief.executiveSummary}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={Building2} title="Company Snapshot">
          <dl className="grid gap-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Industry</dt>
              <dd className="text-right font-medium">{snapshot.industry || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Headquarters</dt>
              <dd className="text-right font-medium">{snapshot.headquarters || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Business model</dt>
              <dd className="text-right font-medium">{snapshot.businessModel || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Target customers</dt>
              <dd className="text-right font-medium">{snapshot.targetCustomers || "—"}</dd>
            </div>
            {snapshot.companySize ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Company size</dt>
                <dd className="text-right font-medium">{snapshot.companySize}</dd>
              </div>
            ) : null}
          </dl>
          {snapshot.products.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Products</p>
              <div className="flex flex-wrap gap-1">
                {snapshot.products.map((p) => (
                  <Badge key={p} variant="outline">{p}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          {snapshot.growthSignals.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Growth signals</p>
              <BulletList items={snapshot.growthSignals} />
            </div>
          ) : null}
        </SectionCard>

        <SectionCard icon={Target} title="Opportunity Summary">
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">Why discovered</dt>
              <dd className="mt-0.5">{opp.discoverySource || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Client looking for</dt>
              <dd className="mt-0.5">{opp.clientNeeds || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estimated scope</dt>
              <dd className="mt-0.5">{opp.estimatedScope || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Complexity</dt>
              <dd className="mt-0.5">{opp.estimatedComplexity || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Business value</dt>
              <dd className="mt-0.5 font-medium">{opp.estimatedBusinessValue || "—"}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      {brief.clientPainPoints.length > 0 ? (
        <SectionCard icon={AlertTriangle} title="Client Pain Points">
          <BulletList items={brief.clientPainPoints} />
        </SectionCard>
      ) : null}

      {brief.relevantExperience.length > 0 ? (
        <SectionCard icon={Briefcase} title="Relevant SJ Innovation Experience">
          <div className="space-y-4">
            {brief.relevantExperience.map((exp) => (
              <div key={exp.projectName} className="rounded-lg border bg-muted/20 p-4">
                <p className="font-semibold">{exp.projectName}</p>
                <p className="mt-1 text-muted-foreground">{exp.relevanceSummary}</p>
                {exp.technologies.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {exp.technologies.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                    ))}
                  </div>
                ) : null}
                {exp.similarProblems.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground">Similar problems solved</p>
                    <BulletList items={exp.similarProblems} />
                  </div>
                ) : null}
                <p className="mt-2 text-xs">
                  <span className="font-medium">Value delivered:</span> {exp.valueDelivered}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {brief.suggestedTalkingPoints.length > 0 ? (
        <SectionCard icon={MessageSquare} title="Suggested Talking Points">
          <div className="space-y-2">
            {brief.suggestedTalkingPoints.map((point) => (
              <div key={point} className="rounded-md border-l-4 border-primary/40 bg-primary/5 px-4 py-2 italic">
                &ldquo;{point}&rdquo;
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard icon={HelpCircle} title="Discovery Questions">
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["Business", brief.discoveryQuestions.business],
            ["Technical", brief.discoveryQuestions.technical],
            ["Timeline", brief.discoveryQuestions.timeline],
            ["Budget", brief.discoveryQuestions.budget],
            ["Success criteria", brief.discoveryQuestions.successCriteria],
            ["Decision process", brief.discoveryQuestions.decisionProcess],
            ["Current pain points", brief.discoveryQuestions.currentPainPoints],
          ] as const).map(([label, items]) =>
            items.length > 0 ? (
              <div key={label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <BulletList items={items} />
              </div>
            ) : null,
          )}
        </div>
      </SectionCard>

      {brief.possibleRisks.length > 0 ? (
        <SectionCard icon={Shield} title="Possible Risks">
          <div className="space-y-3">
            {brief.possibleRisks.map((risk) => (
              <div key={risk.risk} className="flex gap-3 rounded-lg border p-3">
                <PriorityBadge priority={risk.priority} />
                <div className="flex-1">
                  <p className="font-medium">{risk.risk}</p>
                  <p className="mt-1 text-muted-foreground">
                    Follow-up: {risk.followUpQuestion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {brief.objections.length > 0 ? (
        <SectionCard icon={Users} title="Objections You May Hear">
          <div className="space-y-4">
            {brief.objections.map((obj) => (
              <div key={obj.objection} className="rounded-lg border p-4">
                <p className="font-medium">&ldquo;{obj.objection}&rdquo;</p>
                <p className="mt-2">
                  <span className="font-medium">Response:</span> {obj.suggestedResponse}
                </p>
                <p className="mt-1 text-muted-foreground">{obj.supportingEvidence}</p>
                {obj.relevantCaseStudy ? (
                  <p className="mt-1 text-xs text-primary">Case study: {obj.relevantCaseStudy}</p>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {brief.upsellOpportunities.length > 0 ? (
        <SectionCard icon={TrendingUp} title="Upsell Opportunities">
          <div className="space-y-3">
            {brief.upsellOpportunities.map((upsell) => (
              <div key={upsell.service} className="flex gap-3 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="font-medium">{upsell.service}</p>
                  <p className="mt-1 text-muted-foreground">{upsell.rationale}</p>
                </div>
                <PriorityBadge priority={upsell.relevance} />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard icon={Lightbulb} title="Closing Strategy">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Recommended next steps
            </p>
            <BulletList items={brief.closingStrategy.recommendedNextSteps} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Suggestions
            </p>
            <BulletList items={brief.closingStrategy.suggestions} />
          </div>
        </div>
      </SectionCard>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Cheat Sheet — read in under 1 minute
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Top 5 to remember</p>
              <BulletList items={cheat.topThingsToRemember} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Top risks</p>
              <BulletList items={cheat.topRisks} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Top opportunities</p>
              <BulletList items={cheat.topOpportunities} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Top case studies</p>
              <BulletList items={cheat.topCaseStudies} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-background p-3 border">
              <p className="text-xs font-medium text-muted-foreground">Best opening line</p>
              <p className="mt-1 italic">&ldquo;{cheat.bestOpeningLine}&rdquo;</p>
            </div>
            <div className="rounded-md bg-background p-3 border">
              <p className="text-xs font-medium text-muted-foreground">Best closing line</p>
              <p className="mt-1 italic">&ldquo;{cheat.bestClosingLine}&rdquo;</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Questions you must ask</p>
            <BulletList items={cheat.questionsYouMustAsk} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
