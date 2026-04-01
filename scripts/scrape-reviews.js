#!/usr/bin/env node
// Scrapes all pull request reviews given by GITHUB_USERNAME via the GitHub GraphQL API
// and writes them to data/reviews.json.
//
// Uses GraphQL because there is no REST endpoint for "reviews I've given across all repos".
// Covers a rolling 365-day window (GitHub's contributionsCollection max is 366 days).
//
// Requires: Node 18+ (uses built-in fetch), no npm install needed.
// Env vars:
//   GH_PAT           — Personal Access Token (read:user + public_repo scopes)
//   GITHUB_USERNAME  — GitHub username to scrape

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath }    from 'node:url';
import {
  GH_API_VERSION,
  USER_AGENT,
  GRAPHQL_URL,
  GRAPHQL_DELAY_MS,
  ROLLING_WINDOW_DAYS,
  sleep,
} from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH  = resolve(__dirname, '../data/reviews.json');

const TOKEN    = process.env.GH_PAT;
const USERNAME = process.env.GITHUB_USERNAME;

if (!TOKEN)    throw new Error('GH_PAT env var is required');
if (!USERNAME) throw new Error('GITHUB_USERNAME env var is required');

const DATE_TO   = new Date().toISOString();
const DATE_FROM = new Date(Date.now() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

// ── GitHub GraphQL helper ─────────────────────────────────────────────────────

async function ghGraphQL(query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method:  'POST',
    headers: {
      Authorization:          `Bearer ${TOKEN}`,
      'Content-Type':         'application/json',
      'X-GitHub-Api-Version': GH_API_VERSION,
      'User-Agent':           USER_AGENT,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 403) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw new Error(`Rate limited. Resets at ${new Date(reset * 1000).toISOString()}`);
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);

  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);

  return json.data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const REVIEW_STATE_MAP = {
  APPROVED:          'approved',
  CHANGES_REQUESTED: 'changes_requested',
  COMMENTED:         'commented',
  DISMISSED:         'commented',
  PENDING:           'commented',
};

const QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        pullRequestReviewContributions(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            occurredAt
            pullRequestReview {
              state
              url
              pullRequest {
                number
                title
                repository { nameWithOwner }
                author { login }
              }
            }
          }
        }
      }
    }
  }
`;

// ── Scrape ────────────────────────────────────────────────────────────────────

async function fetchReviews() {
  const reviews = [];
  let cursor = null;

  console.log(`Fetching reviews for ${USERNAME} (${DATE_FROM.slice(0, 10)} → ${DATE_TO.slice(0, 10)})…`);

  do {
    const data = await ghGraphQL(QUERY, {
      login: USERNAME,
      from:  DATE_FROM,
      to:    DATE_TO,
      after: cursor,
    });

    const page = data.user.contributionsCollection.pullRequestReviewContributions;

    for (const contrib of page.nodes) {
      const review = contrib.pullRequestReview;
      const pr     = review.pullRequest;

      // Skip reviews left on your own PRs
      if (pr.author?.login === USERNAME) continue;

      reviews.push({
        date:      contrib.occurredAt.slice(0, 10),
        pr_number: pr.number,
        pr_title:  pr.title,
        repo:      pr.repository.nameWithOwner,
        pr_author: pr.author?.login ?? 'ghost',
        state:     REVIEW_STATE_MAP[review.state] ?? 'commented',
        url:       review.url,
      });
    }

    console.log(`  page: ${page.nodes.length} reviews (${reviews.length} total)`);

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    if (cursor) await sleep(GRAPHQL_DELAY_MS);
  } while (cursor);

  return reviews;
}

// ── Write ─────────────────────────────────────────────────────────────────────

async function main() {
  const reviews = await fetchReviews();

  writeFileSync(OUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    reviews,
  }, null, 2));

  console.log(`Done. Wrote ${reviews.length} reviews → ${OUT_PATH}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
