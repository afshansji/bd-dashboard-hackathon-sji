import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { ReportSection } from "../intelligence-report/ReportSection";
import type { CompanyIntelligenceReport } from "../../types/companyIntelligence";

interface CompanyIntelligenceReportViewProps {
  report: CompanyIntelligenceReport;
  researchedAt?: string | null;
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-200",
    medium: "bg-amber-100 text-amber-900 border-amber-200",
    low: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${styles[level]}`}>
      {level}
    </Badge>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None identified.</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function CompanyIntelligenceReportView({
  report,
  researchedAt,
}: CompanyIntelligenceReportViewProps) {
  const overview = report.companyOverview;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">
              {overview.companyName || "Company Intelligence Report"}
            </h3>
            {researchedAt ? (
              <p className="text-xs text-muted-foreground mt-1">
                Researched {formatRelativeTime(researchedAt)}
              </p>
            ) : null}
          </div>
          {report.sourceWebsite ? (
            <a
              href={report.sourceWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {report.sourceWebsite}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        {report.executiveSummary ? (
          <p className="mt-3 text-sm leading-relaxed">{report.executiveSummary}</p>
        ) : null}
      </div>

      <ReportSection
        id="company-overview"
        title="Company Overview"
        description="Who they are and what they do."
        defaultOpen
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted-foreground">Industry</dt>
            <dd>{overview.industry || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Target customers</dt>
            <dd>{overview.targetCustomers || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-muted-foreground">What they do</dt>
            <dd>{overview.whatTheyDo || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-muted-foreground">Business summary</dt>
            <dd>{overview.businessSummary || "—"}</dd>
          </div>
          {overview.productsAndServices.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="mb-1 font-medium text-muted-foreground">Products & services</dt>
              <dd><BulletList items={overview.productsAndServices} /></dd>
            </div>
          ) : null}
          {overview.locations.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="mb-1 font-medium text-muted-foreground">Locations</dt>
              <dd><BulletList items={overview.locations} /></dd>
            </div>
          ) : null}
        </dl>
      </ReportSection>

      <ReportSection
        id="leadership"
        title="Leadership & Decision Makers"
        description="Publicly available leadership information."
      >
        {report.leadership.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {report.leadershipNote || "No public leadership information was found."}
          </p>
        ) : (
          <div className="space-y-3">
            {report.leadership.map((person, index) => (
              <div key={`${person.role}-${index}`} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{person.role}</span>
                  {person.name ? <span>— {person.name}</span> : null}
                  {person.title ? (
                    <span className="text-muted-foreground">({person.title})</span>
                  ) : null}
                </div>
                {person.linkedIn ? (
                  <a
                    href={person.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                {person.notes ? (
                  <p className="mt-1 text-muted-foreground">{person.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection
        id="contact-info"
        title="Contact Information"
        description="Public contact channels only."
      >
        {report.contactInformation.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No public contact information was found.
          </p>
        ) : (
          <div className="space-y-2">
            {report.contactInformation.map((channel, index) => (
              <div key={`${channel.type}-${index}`} className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{channel.type}</Badge>
                <span>{channel.value}</span>
                {channel.notes ? (
                  <span className="text-muted-foreground">— {channel.notes}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection id="social" title="Social Presence">
        {report.socialPresence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public social profiles found.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {report.socialPresence.map((profile, index) => (
              profile.url ? (
                <a
                  key={`${profile.platform}-${index}`}
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Badge variant="outline" className="gap-1 hover:bg-muted">
                    {profile.platform}
                    <ExternalLink className="h-3 w-3" />
                  </Badge>
                </a>
              ) : (
                <Badge key={`${profile.platform}-${index}`} variant="outline">
                  {profile.platform}
                </Badge>
              )
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection id="business-understanding" title="Business Understanding">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-muted-foreground">Problem solved</dt>
            <dd>{report.businessUnderstanding.problemSolved || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Target audience</dt>
            <dd>{report.businessUnderstanding.targetAudience || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Business model</dt>
            <dd>{report.businessUnderstanding.businessModel || "—"}</dd>
          </div>
          {report.businessUnderstanding.primaryOfferings.length > 0 ? (
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">Primary offerings</dt>
              <dd><BulletList items={report.businessUnderstanding.primaryOfferings} /></dd>
            </div>
          ) : null}
        </dl>
      </ReportSection>

      <ReportSection id="technology" title="Technology Signals">
        {report.technologySignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {report.technologyNote || "Technology stack could not be determined from public sources."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {report.technologySignals.map((tech) => (
              <div key={tech.name} className="flex items-center gap-1.5">
                <Badge variant="secondary">{tech.name}</Badge>
                <ConfidenceBadge level={tech.confidence} />
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection id="growth" title="Growth Signals">
        {report.growthSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No growth signals identified.</p>
        ) : (
          <div className="space-y-3">
            {report.growthSignals.map((signal) => (
              <div key={signal.signal} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{signal.signal}</p>
                <p className="mt-1 text-muted-foreground">{signal.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{signal.relevance}</p>
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection id="opportunities" title="Potential Opportunities">
        {report.potentialOpportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opportunities suggested yet.</p>
        ) : (
          <div className="space-y-3">
            {report.potentialOpportunities.map((opp) => (
              <div key={opp.area} className="flex gap-3 rounded-md border p-3 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{opp.area}</p>
                  <p className="mt-1 text-muted-foreground">{opp.rationale}</p>
                </div>
                <ConfidenceBadge level={opp.confidence} />
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection
        id="portfolio"
        title="Portfolio Match"
        description="Relevant SJ Innovation projects from Organizational Memory."
      >
        {report.portfolioMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching internal projects found. Index more repositories in Org Memory.
          </p>
        ) : (
          <div className="space-y-3">
            {report.portfolioMatches.map((match) => (
              <div key={match.projectId || match.projectName} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{match.projectName}</p>
                  <Badge variant="outline">{match.matchScore}% match</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{match.relevanceSummary}</p>
                {match.technologyOverlap.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.technologyOverlap.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {match.similarBusinessProblems.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground">Similar problems</p>
                    <BulletList items={match.similarBusinessProblems} />
                  </div>
                ) : null}
                {match.repositoryUrl ? (
                  <a
                    href={match.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View repository <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection id="outreach" title="Outreach Guidance" defaultOpen>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-muted-foreground">Conversation starter</dt>
            <dd className="mt-1">{report.outreachGuidance.conversationStarter || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Recommended contact</dt>
            <dd>{report.outreachGuidance.recommendedContact || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Outreach angle</dt>
            <dd>{report.outreachGuidance.outreachAngle || "—"}</dd>
          </div>
          {report.outreachGuidance.painPoints.length > 0 ? (
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">Pain points</dt>
              <dd><BulletList items={report.outreachGuidance.painPoints} /></dd>
            </div>
          ) : null}
          {report.outreachGuidance.capabilitiesToHighlight.length > 0 ? (
            <div>
              <dt className="mb-1 font-medium text-muted-foreground">Capabilities to highlight</dt>
              <dd><BulletList items={report.outreachGuidance.capabilitiesToHighlight} /></dd>
            </div>
          ) : null}
        </dl>
      </ReportSection>

      <ReportSection id="discovery" title="Discovery Call Preparation">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Suggested questions</p>
            <BulletList items={report.discoveryCallPrep.suggestedQuestions} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Business questions</p>
            <BulletList items={report.discoveryCallPrep.businessQuestions} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Technical questions</p>
            <BulletList items={report.discoveryCallPrep.technicalQuestions} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Risks to clarify</p>
            <BulletList items={report.discoveryCallPrep.risksToClarify} />
          </div>
          {report.discoveryCallPrep.upsellOpportunities.length > 0 ? (
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Upsell opportunities</p>
              <BulletList items={report.discoveryCallPrep.upsellOpportunities} />
            </div>
          ) : null}
        </div>
      </ReportSection>
    </div>
  );
}
