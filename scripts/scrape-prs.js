#!/usr/bin/env node
// Scrapes all pull requests authored by GITHUB_USERNAME via the GitHub Search API
// and writes them to data/pull_requests.json.
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
  ACCEPT_JSON,
  SEARCH_ISSUES_URL,
  SEARCH_PAGE_SIZE,
  SEARCH_MAX_RESULTS,
  SEARCH_DELAY_MS,
  sleep,
} from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH  = resolve(__dirname, '../data/pull_requests.json');

const TOKEN    = process.env.GH_PAT;
const USERNAME = process.env.GITHUB_USERNAME;

if (!TOKEN)    throw new Error('GH_PAT env var is required');
if (!USERNAME) throw new Error('GITHUB_USERNAME env var is required');

// ── GitHub API helper ─────────────────────────────────────────────────────────

async function ghGet(url) {
  const res = await fetch(url, {
    headers: {
      Authorization:          `Bearer ${TOKEN}`,
      Accept:                 ACCEPT_JSON,
      'X-GitHub-Api-Version': GH_API_VERSION,
      'User-Agent':           USER_AGENT,
    },
  });

  if (res.status === 403) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw new Error(`Rate limited. Resets at ${new Date(reset * 1000).toISOString()}`);
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);

  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function prState(item) {
  if (item.pull_request?.merged_at) return 'merged';
  if (item.state === 'open')        return 'open';
  return 'closed';
}

function repoFromUrl(apiUrl) {
  // "https://api.github.com/repos/owner/repo" → "owner/repo"
  return new URL(apiUrl).pathname.replace('/repos/', '');
}

// ── Scrape ────────────────────────────────────────────────────────────────────

async function fetchPullRequests() {
  const pullRequests = [];
  let page = 1;

  console.log(`Fetching pull requests for ${USERNAME}…`);

  while (true) {
    const url = [
      SEARCH_ISSUES_URL,
      `?q=author:${USERNAME}+is:pr`,
      `&sort=created&order=desc`,
      `&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    ].join('');

    const data = await ghGet(url);

    for (const item of data.items) {
      pullRequests.push({
        number:     item.number,
        title:      item.title,
        repo:       repoFromUrl(item.repository_url),
        state:      prState(item),
        created_at: item.created_at.slice(0, 10),
        merged_at:  item.pull_request?.merged_at?.slice(0, 10) ?? null,
        closed_at:  item.closed_at?.slice(0, 10)               ?? null,
        comments:   item.comments,
        url:        item.html_url,
      });
    }

    console.log(`  page ${page}: ${data.items.length} PRs (${pullRequests.length} total)`);

    if (data.items.length < SEARCH_PAGE_SIZE || pullRequests.length >= SEARCH_MAX_RESULTS) break;

    page++;
    await sleep(SEARCH_DELAY_MS);
  }

  return pullRequests;
}

// ── Write ─────────────────────────────────────────────────────────────────────

async function main() {
  const pullRequests = await fetchPullRequests();

  writeFileSync(OUT_PATH, JSON.stringify({
    generated_at:  new Date().toISOString(),
    pull_requests: pullRequests,
  }, null, 2));

  console.log(`Done. Wrote ${pullRequests.length} pull requests → ${OUT_PATH}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
