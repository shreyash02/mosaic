import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { colors, typography, spacing, borders } from '../styles/tokens';
import type {
  SearchResponse,
  SearchResult,
  ConversationSearchResult,
  SeriesSearchResult,
  AnalysisSearchResult,
  SearchEntityType,
} from '../types';

const s = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: spacing[6],
  },
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--text-primary)',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--text-secondary)',
  },
  searchBox: {
    marginBottom: spacing[6],
  },
  searchInput: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.lg,
    border: `2px solid ${colors.primary[400]}`,
    borderRadius: borders.radius.lg,
    backgroundColor: colors.primary[50],
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  searchInputFocus: {
    borderColor: colors.interactive.focus,
  },
  filters: {
    display: 'flex',
    gap: spacing[2],
    marginBottom: spacing[4],
    flexWrap: 'wrap' as const,
  },
  filterBtn: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: `1px solid var(--border-color)`,
    borderRadius: borders.radius.full,
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterBtnActive: {
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    borderColor: colors.primary[900],
  },
  stats: {
    display: 'flex',
    gap: spacing[4],
    marginBottom: spacing[4],
    fontSize: typography.fontSize.sm,
    color: 'var(--text-secondary)',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  },
  results: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  resultCard: {
    padding: spacing[4],
    border: `1px solid var(--border-color)`,
    borderRadius: borders.radius.lg,
    backgroundColor: 'var(--bg-primary)',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  },
  resultCardHover: {
    borderColor: 'var(--text-secondary)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  resultTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--text-primary)',
    margin: 0,
  },
  resultBadge: {
    fontSize: typography.fontSize.xs,
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase' as const,
  },
  conversationBadge: {
    backgroundColor: colors.semantic.info.light,
    color: colors.semantic.info.text,
  },
  seriesBadge: {
    backgroundColor: colors.semantic.success.light,
    color: colors.semantic.success.text,
  },
  analysisBadge: {
    backgroundColor: colors.semantic.warning.light,
    color: colors.semantic.warning.text,
  },
  resultMeta: {
    fontSize: typography.fontSize.sm,
    color: 'var(--text-secondary)',
    marginBottom: spacing[2],
  },
  resultHeadline: {
    fontSize: typography.fontSize.sm,
    color: 'var(--text-secondary)',
    lineHeight: typography.lineHeight.relaxed,
  },
  highlight: {
    backgroundColor: colors.semantic.warning.light,
    padding: '0 2px',
    borderRadius: '2px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: spacing[12],
    color: 'var(--text-secondary)',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
    color: 'var(--text-primary)',
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[12],
    color: 'var(--text-secondary)',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
  },
  pageBtn: {
    padding: `${spacing[2]} ${spacing[3]}`,
    border: `1px solid var(--border-color)`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderHeadline(headline?: string): React.ReactNode {
  if (!headline) return null;

  // Convert <mark> tags to highlighted spans
  const parts = headline.split(/(<mark>.*?<\/mark>)/g);
  return parts.map((part, i) => {
    if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
      const text = part.slice(6, -7);
      return <span key={i} style={s.highlight}>{text}</span>;
    }
    return part;
  });
}

function getResultLink(result: SearchResult): string {
  switch (result.entity_type) {
    case 'conversation':
      return `/conversations/${result.id}`;
    case 'series':
      return `/collections/${result.id}`;
    case 'analysis':
      return `/conversations/${(result as AnalysisSearchResult).conversation_id}/analysis`;
    default:
      return '#';
  }
}

function ResultCard({ result }: { result: SearchResult }) {
  const [isHovered, setIsHovered] = useState(false);

  const getBadgeStyle = () => {
    switch (result.entity_type) {
      case 'conversation': return { ...s.resultBadge, ...s.conversationBadge };
      case 'series': return { ...s.resultBadge, ...s.seriesBadge };
      case 'analysis': return { ...s.resultBadge, ...s.analysisBadge };
    }
  };

  const getTitle = () => {
    switch (result.entity_type) {
      case 'conversation': return (result as ConversationSearchResult).title;
      case 'series': return (result as SeriesSearchResult).name;
      case 'analysis': return (result as AnalysisSearchResult).conversation_title;
    }
  };

  const getMeta = () => {
    switch (result.entity_type) {
      case 'conversation': {
        const r = result as ConversationSearchResult;
        return `${r.state} • Created ${formatDate(r.created_at)}`;
      }
      case 'series': {
        const r = result as SeriesSearchResult;
        return `${r.conversation_count} conversations • Created ${formatDate(r.created_at)}`;
      }
      case 'analysis': {
        const r = result as AnalysisSearchResult;
        return `${r.total_responses_analyzed || 0} responses analyzed • ${formatDate(r.created_at)}`;
      }
    }
  };

  const getBadgeLabel = () => {
    switch (result.entity_type) {
      case 'conversation': return 'Conversation';
      case 'series': return 'Collection';
      case 'analysis': return 'Analysis';
    }
  };

  return (
    <Link
      to={getResultLink(result)}
      style={{
        ...s.resultCard,
        ...(isHovered ? s.resultCardHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={s.resultHeader}>
        <h3 style={s.resultTitle}>{getTitle()}</h3>
        <span style={getBadgeStyle()}>{getBadgeLabel()}</span>
      </div>
      <div style={s.resultMeta}>{getMeta()}</div>
      {result.headline && (
        <div style={s.resultHeadline}>{renderHeadline(result.headline)}</div>
      )}
    </Link>
  );
}

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(query);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SearchEntityType | 'all'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  usePageTitle(query ? `Search: ${query}` : 'Search');

  const performSearch = useCallback(async (searchQuery: string, pageNum: number, entityType?: SearchEntityType) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.search({
        query: searchQuery,
        page: pageNum,
        page_size: 20,
        entity_types: entityType ? [entityType] : undefined,
      });
      setResults(response);
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      performSearch(query, page, activeFilter === 'all' ? undefined : activeFilter);
    }
  }, [query, page, activeFilter, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
      setActiveFilter('all');
    }
  };

  const handleFilterChange = (filter: SearchEntityType | 'all') => {
    setActiveFilter(filter);
    setSearchParams({ q: query, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, page: String(newPage) });
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Search</h1>
        <p style={s.subtitle}>
          Find conversations, collections, and analyses
        </p>
      </div>

      <div style={s.searchBox}>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for anything..."
            style={{
              ...s.searchInput,
              ...(isSearchFocused ? s.searchInputFocus : {}),
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            autoFocus
          />
        </form>
      </div>

      {query && (
        <>
          <div style={s.filters}>
            <button
              style={{
                ...s.filterBtn,
                ...(activeFilter === 'all' ? s.filterBtnActive : {}),
              }}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              style={{
                ...s.filterBtn,
                ...(activeFilter === 'conversation' ? s.filterBtnActive : {}),
              }}
              onClick={() => handleFilterChange('conversation')}
            >
              Conversations
            </button>
            <button
              style={{
                ...s.filterBtn,
                ...(activeFilter === 'series' ? s.filterBtnActive : {}),
              }}
              onClick={() => handleFilterChange('series')}
            >
              Collections
            </button>
            <button
              style={{
                ...s.filterBtn,
                ...(activeFilter === 'analysis' ? s.filterBtnActive : {}),
              }}
              onClick={() => handleFilterChange('analysis')}
            >
              Analyses
            </button>
          </div>

          {results && !loading && (
            <div style={s.stats}>
              <span style={s.statItem}>
                {results.total} result{results.total !== 1 ? 's' : ''}
              </span>
              {results.entity_counts.conversation > 0 && (
                <span style={s.statItem}>
                  {results.entity_counts.conversation} conversation{results.entity_counts.conversation !== 1 ? 's' : ''}
                </span>
              )}
              {results.entity_counts.series > 0 && (
                <span style={s.statItem}>
                  {results.entity_counts.series} collection{results.entity_counts.series !== 1 ? 's' : ''}
                </span>
              )}
              {results.entity_counts.analysis > 0 && (
                <span style={s.statItem}>
                  {results.entity_counts.analysis} analys{results.entity_counts.analysis !== 1 ? 'es' : 'is'}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {loading && (
        <div style={s.loading}>
          Searching...
        </div>
      )}

      {error && (
        <div style={s.empty}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && results && results.results.length === 0 && (
        <div style={s.empty}>
          <div style={s.emptyTitle}>No results found</div>
          <p>Try different keywords or check your spelling</p>
        </div>
      )}

      {!loading && !error && results && results.results.length > 0 && (
        <>
          <div style={s.results}>
            {results.results.map((result) => (
              <ResultCard key={`${result.entity_type}-${result.id}`} result={result} />
            ))}
          </div>

          {results.total_pages > 1 && (
            <div style={s.pagination}>
              <button
                style={{
                  ...s.pageBtn,
                  ...(page <= 1 ? s.pageBtnDisabled : {}),
                }}
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span style={{ padding: spacing[2], color: 'var(--text-secondary)' }}>
                Page {page} of {results.total_pages}
              </span>
              <button
                style={{
                  ...s.pageBtn,
                  ...(page >= results.total_pages ? s.pageBtnDisabled : {}),
                }}
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= results.total_pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!query && !loading && (
        <div style={s.empty}>
          <div style={s.emptyTitle}>Start searching</div>
          <p>Enter a search term above to find conversations, collections, and analyses</p>
        </div>
      )}
    </div>
  );
}
