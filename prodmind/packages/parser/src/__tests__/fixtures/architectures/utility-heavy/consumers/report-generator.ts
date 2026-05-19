import { capitalize, truncate } from '../utils/string-utils';
import { formatDate, daysBetween } from '../utils/date-utils';
import { groupBy } from '../utils/array-utils';

export interface ReportEntry {
  title: string;
  date: Date;
  content: string;
}

export function generateSummaryReport(entries: ReportEntry[]): string {
  const grouped = groupBy(entries, (e) => formatDate(e.date));
  let report = '';
  for (const [date, items] of Object.entries(grouped)) {
    report += `## ${date}\n`;
    for (const item of items) {
      report += `- ${capitalize(item.title)}: ${truncate(item.content, 50)}\n`;
    }
  }
  return report;
}
