import type { ReportInput, ReportOutput, ReportType, ArchitectureReport } from './reporting-types.ts';
import { buildArchitectureReport, buildReportSection } from './report-builder.ts';
import { buildArchitectureSummarySection, buildRiskSummarySection, buildPatternSummarySection, buildHotspotSection, buildRecommendationSection } from './report-sections.ts';

const REPORT_TYPES_LIST: ReportType[] = ['ARCHITECTURE_REPORT', 'RISK_REPORT', 'HEALTH_REPORT', 'COMPREHENSIVE_REPORT'];

export class ReportingEngine {
  generate(input: ReportInput, types?: ReportType[]): ReportOutput {
    const requested = types ?? REPORT_TYPES_LIST;
    const reports: ArchitectureReport[] = [];

    for (const reportType of requested) {
      const report = this.buildReportForType(reportType, input);
      if (report) reports.push(report);
    }

    return {
      snapshotId: input.snapshotId,
      reports: reports.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
      generatedAt: new Date().toISOString(),
    };
  }

  private buildReportForType(reportType: ReportType, input: ReportInput): ArchitectureReport | null {
    const globalSnap = input.cognitionSnapshots.find(c => c.cognitionType === 'GLOBAL');

    switch (reportType) {
      case 'COMPREHENSIVE_REPORT': {
        const hotspots = globalSnap?.criticalHotspots ?? [];
        const sections = [
          buildArchitectureSummarySection(globalSnap ?? { architectureSummary: 'No data', healthScore: { overall: 0, label: 'LOW' } }),
          buildRiskSummarySection(input.risks),
          buildPatternSummarySection(input.patterns),
          buildHotspotSection(hotspots),
          buildRecommendationSection(input.recommendations),
        ];
        const title = 'Comprehensive Architecture Report';
        const summary = globalSnap?.architectureSummary ?? 'Architecture analysis complete.';
        const jsonContent: Record<string, unknown> = {
          title, summary, reportType,
          snapshotId: input.snapshotId,
          sectionCount: sections.length,
          narrativeCount: input.narratives.length,
        };
        return buildArchitectureReport({
          reportType, snapshotId: input.snapshotId, title, summary,
          sections, jsonContent,
          metadata: { narrativeCount: input.narratives.length, sections: sections.length },
        });
      }
      case 'ARCHITECTURE_REPORT': {
        const sections = [
          buildArchitectureSummarySection(globalSnap ?? { architectureSummary: 'No data', healthScore: { overall: 0, label: 'LOW' } }),
          buildPatternSummarySection(input.patterns),
        ];
        const title = 'Architecture Report';
        const summary = globalSnap?.architectureSummary ?? 'Architecture analysis complete.';
        const jsonContent: Record<string, unknown> = {
          title, summary, reportType,
          snapshotId: input.snapshotId,
          sectionCount: sections.length,
        };
        return buildArchitectureReport({
          reportType, snapshotId: input.snapshotId, title, summary,
          sections, jsonContent,
          metadata: { sectionCount: sections.length },
        });
      }
      case 'RISK_REPORT': {
        const sections = [
          buildRiskSummarySection(input.risks),
          buildHotspotSection(input.cognitionSnapshots.flatMap(c => c.criticalHotspots)),
        ];
        const title = 'Risk Report';
        const summary = `${input.risks.length} risks and ${input.cognitionSnapshots.flatMap(c => c.criticalHotspots).length} hotspots identified.`;
        const jsonContent: Record<string, unknown> = {
          title, summary, reportType,
          snapshotId: input.snapshotId,
          riskCount: input.risks.length,
        };
        return buildArchitectureReport({
          reportType, snapshotId: input.snapshotId, title, summary,
          sections, jsonContent,
          metadata: { riskCount: input.risks.length },
        });
      }
      case 'HEALTH_REPORT': {
        const sections: ReturnType<typeof buildReportSection>[] = [];
        if (globalSnap) {
          sections.push(buildReportSection({
            title: 'Health Score', content: `Overall: ${(globalSnap.healthScore.overall * 100).toFixed(0)}/100 (${globalSnap.healthScore.label})`,
            severity: globalSnap.healthScore.label === 'CRITICAL' ? 'CRITICAL' : globalSnap.healthScore.label === 'AT_RISK' ? 'HIGH' : 'MODERATE',
            metrics: [{ metricType: 'HEALTH_SCORE', metricValue: globalSnap.healthScore.overall }],
          }));
          sections.push(buildReportSection({
            title: 'Severity Distribution',
            content: `Critical: ${globalSnap.severityDistribution.critical}, High: ${globalSnap.severityDistribution.high}, Moderate: ${globalSnap.severityDistribution.moderate}, Low: ${globalSnap.severityDistribution.low}`,
            severity: 'MODERATE',
            metrics: [
              { metricType: 'CRITICAL_FINDINGS', metricValue: globalSnap.severityDistribution.critical },
              { metricType: 'HIGH_FINDINGS', metricValue: globalSnap.severityDistribution.high },
            ],
          }));
        }
        const title = 'Architecture Health Report';
        const summary = `Health: ${globalSnap ? `${(globalSnap.healthScore.overall * 100).toFixed(0)}/100` : 'N/A'}`;
        const jsonContent: Record<string, unknown> = {
          title, summary, reportType,
          snapshotId: input.snapshotId,
          healthScore: globalSnap?.healthScore.overall,
        };
        return buildArchitectureReport({
          reportType, snapshotId: input.snapshotId, title, summary,
          sections, jsonContent,
          metadata: { healthScore: globalSnap?.healthScore.overall },
        });
      }
      default:
        return null;
    }
  }
}
