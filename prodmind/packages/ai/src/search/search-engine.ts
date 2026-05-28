import type { SearchQuery, SearchResult, SearchIndex, SearchType } from './search-types.ts';
import { normalizeSearchQuery } from './search-normalizer.ts';
import { fingerprintSearchQuery } from './search-fingerprint.ts';
import { rankMatches } from './search-ranking.ts';
import { matchIndexEntries } from './search-index.ts';
import { SearchCache } from './search-cache.ts';

export class SearchEngine {
  private indexes = new Map<SearchType, SearchIndex>();
  private cache = new SearchCache();

  registerIndex(index: SearchIndex): void {
    this.indexes.set(index.searchType, index);
  }

  search(query: SearchQuery): SearchResult {
    const normalized = normalizeSearchQuery(query);
    const fp = fingerprintSearchQuery(normalized);

    const cached = this.cache.get(fp);
    if (cached) return cached;

    const index = this.indexes.get(normalized.searchType);
    if (!index) {
      const empty: SearchResult = {
        searchType: normalized.searchType, fingerprint: fp,
        term: normalized.term, matches: [], total: 0,
        executionTimeMs: 0,
      };
      return empty;
    }

    const start = Date.now();
    const candidates = matchIndexEntries(index, normalized.term);
    const ranked = rankMatches(candidates, normalized.term, normalized.mode);
    const sliced = ranked.slice(normalized.offset, normalized.offset + normalized.limit);

    const result: SearchResult = {
      searchType: normalized.searchType, fingerprint: fp,
      term: normalized.term, matches: sliced, total: ranked.length,
      executionTimeMs: Date.now() - start,
    };

    this.cache.set(fp, result);
    return result;
  }

  searchAll(query: Omit<SearchQuery, 'searchType'>): Map<SearchType, SearchResult> {
    const results = new Map<SearchType, SearchResult>();
    for (const [searchType] of this.indexes) {
      results.set(searchType, this.search({ ...query, searchType }));
    }
    return results;
  }

  clearIndexes(): void {
    this.indexes.clear();
  }

  clearCache(): void {
    this.cache.clear();
  }
}
