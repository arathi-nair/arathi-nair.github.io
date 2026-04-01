// Shared constants for all GitHub activity scrapers.

export const GH_API_VERSION  = '2022-11-28';
export const USER_AGENT      = 'github-activity-scraper';

// Accept headers — commits search requires a preview header; all other endpoints use the standard one
export const ACCEPT_JSON     = 'application/vnd.github+json';
export const ACCEPT_COMMITS  = 'application/vnd.github.cloak-preview+json';

// API endpoints
export const GRAPHQL_URL        = 'https://api.github.com/graphql';
export const SEARCH_COMMITS_URL = 'https://api.github.com/search/commits';
export const SEARCH_ISSUES_URL  = 'https://api.github.com/search/issues';

// Pagination
export const SEARCH_PAGE_SIZE = 100;

// Rate-limit courtesy delays
export const SEARCH_DELAY_MS  = 300;      // search API: 30 req/min with a PAT
export const GRAPHQL_DELAY_MS = 200;

// Rolling window used by the reviews scraper (GitHub's contributionsCollection max is 366 days)
export const ROLLING_WINDOW_DAYS = 365;

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
