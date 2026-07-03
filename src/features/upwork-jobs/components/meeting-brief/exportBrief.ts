import type { MeetingBrief } from "../types/meetingBrief";

function section(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `\n${title}\n${"=".repeat(title.length)}\n${lines.join("\n")}\n`;
}

function bulletList(items: string[]): string[] {
  return items.map((item) => `• ${item}`);
}

export function briefToPlainText(brief: MeetingBrief, leadTitle?: string): string {
  const lines: string[] = [
    brief.title || `Meeting Brief${leadTitle ? `: ${leadTitle}` : ""}`,
    `Generated: ${new Date(brief.generatedAt).toLocaleString()}`,
    "",
    "EXECUTIVE SUMMARY",
    brief.executiveSummary,
  ];

  const snapshot = brief.companySnapshot;
  lines.push(
    section("COMPANY SNAPSHOT", [
      `Industry: ${snapshot.industry || "—"}`,
      `Headquarters: ${snapshot.headquarters || "—"}`,
      `Business model: ${snapshot.businessModel || "—"}`,
      `Target customers: ${snapshot.targetCustomers || "—"}`,
      snapshot.companySize ? `Company size: ${snapshot.companySize}` : "",
      snapshot.products.length ? `Products: ${snapshot.products.join(", ")}` : "",
      snapshot.growthSignals.length
        ? `Growth signals: ${snapshot.growthSignals.join("; ")}`
        : "",
    ].filter(Boolean)),
  );

  const opp = brief.opportunitySummary;
  lines.push(
    section("OPPORTUNITY SUMMARY", [
      `Discovery source: ${opp.discoverySource}`,
      `Client needs: ${opp.clientNeeds}`,
      `Estimated scope: ${opp.estimatedScope}`,
      `Complexity: ${opp.estimatedComplexity}`,
      `Business value: ${opp.estimatedBusinessValue}`,
    ]),
  );

  if (brief.clientPainPoints.length) {
    lines.push(section("CLIENT PAIN POINTS", bulletList(brief.clientPainPoints)));
  }

  if (brief.relevantExperience.length) {
    const expLines = brief.relevantExperience.flatMap((exp) => [
      `${exp.projectName}`,
      `  ${exp.relevanceSummary}`,
      exp.technologies.length ? `  Tech: ${exp.technologies.join(", ")}` : "",
      `  Value: ${exp.valueDelivered}`,
      "",
    ]);
    lines.push(section("RELEVANT SJ INNOVATION EXPERIENCE", expLines));
  }

  if (brief.suggestedTalkingPoints.length) {
    lines.push(section("SUGGESTED TALKING POINTS", bulletList(brief.suggestedTalkingPoints)));
  }

  const q = brief.discoveryQuestions;
  lines.push(
    section("DISCOVERY QUESTIONS", [
      q.business.length ? `Business:\n${bulletList(q.business).join("\n")}` : "",
      q.technical.length ? `Technical:\n${bulletList(q.technical).join("\n")}` : "",
      q.timeline.length ? `Timeline:\n${bulletList(q.timeline).join("\n")}` : "",
      q.budget.length ? `Budget:\n${bulletList(q.budget).join("\n")}` : "",
      q.successCriteria.length
        ? `Success criteria:\n${bulletList(q.successCriteria).join("\n")}`
        : "",
      q.decisionProcess.length
        ? `Decision process:\n${bulletList(q.decisionProcess).join("\n")}`
        : "",
      q.currentPainPoints.length
        ? `Current pain points:\n${bulletList(q.currentPainPoints).join("\n")}`
        : "",
    ].filter(Boolean)),
  );

  if (brief.possibleRisks.length) {
    const riskLines = brief.possibleRisks.map(
      (r) => `[${r.priority.toUpperCase()}] ${r.risk}\n  Ask: ${r.followUpQuestion}`,
    );
    lines.push(section("POSSIBLE RISKS", riskLines));
  }

  if (brief.objections.length) {
    const objLines = brief.objections.flatMap((o) => [
      `"${o.objection}"`,
      `  Response: ${o.suggestedResponse}`,
      `  Evidence: ${o.supportingEvidence}`,
      o.relevantCaseStudy ? `  Case study: ${o.relevantCaseStudy}` : "",
      "",
    ]);
    lines.push(section("OBJECTIONS YOU MAY HEAR", objLines));
  }

  if (brief.upsellOpportunities.length) {
    const upsellLines = brief.upsellOpportunities.map(
      (u) => `${u.service} (${u.relevance}): ${u.rationale}`,
    );
    lines.push(section("UPSELL OPPORTUNITIES", upsellLines));
  }

  const closing = brief.closingStrategy;
  lines.push(
    section("CLOSING STRATEGY", [
      ...bulletList(closing.recommendedNextSteps),
      "",
      ...bulletList(closing.suggestions),
    ]),
  );

  const cheat = brief.cheatSheet;
  lines.push(
    section("AI CHEAT SHEET — READ BEFORE THE CALL", [
      "Top things to remember:",
      ...bulletList(cheat.topThingsToRemember),
      "",
      "Top risks:",
      ...bulletList(cheat.topRisks),
      "",
      "Top opportunities:",
      ...bulletList(cheat.topOpportunities),
      "",
      "Top case studies:",
      ...bulletList(cheat.topCaseStudies),
      "",
      `Best opening: ${cheat.bestOpeningLine}`,
      `Best closing: ${cheat.bestClosingLine}`,
      "",
      "Questions you must ask:",
      ...bulletList(cheat.questionsYouMustAsk),
    ]),
  );

  return lines.join("\n");
}

export async function copyBriefToClipboard(
  brief: MeetingBrief,
  leadTitle?: string,
): Promise<void> {
  const text = briefToPlainText(brief, leadTitle);
  await navigator.clipboard.writeText(text);
}

export function printBrief(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Meeting Brief</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 32px; color: #111; line-height: 1.5; }
          h1 { font-size: 22px; margin-bottom: 8px; }
          h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          h3 { font-size: 14px; margin-top: 16px; }
          p, li { font-size: 13px; }
          ul { padding-left: 20px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px; }
          .high { background: #fee2e2; }
          .medium { background: #fef3c7; }
          .low { background: #f1f5f9; }
          .callout { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 12px 0; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function buildSavedNotesBlock(brief: MeetingBrief): string {
  const cheat = brief.cheatSheet;
  return [
    "---",
    `Meeting Brief saved — ${new Date(brief.generatedAt).toLocaleString()}`,
    "",
    brief.executiveSummary,
    "",
    `Opening line: ${cheat.bestOpeningLine}`,
    `Closing line: ${cheat.bestClosingLine}`,
    "",
    "Must-ask questions:",
    ...cheat.questionsYouMustAsk.map((q) => `• ${q}`),
    "---",
  ].join("\n");
}
