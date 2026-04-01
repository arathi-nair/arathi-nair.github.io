#!/usr/bin/env node
// Scrapes PRs authored by GITHUB_USERNAME and appends new ones to data/pull_requests.json.
// On first run fetches everything available; subsequent runs fetch only PRs
// created after the most recent entry already in the file.
//
// Note: state changes on already-scraped PRs (e.g. open → merged) are not
// back-filled. Re-delete the file and re-run to get a full refresh if needed.
//
// Requires: Node 18+ (uses built-in fetch), no npm install needed.
// Env vars:
//   GH_PAT           — Personal Access Token (read:user + public_repo scopes)
//   GITHUB_USERNAME  — GitHub username to scrape

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath }    from 'node:url';
import {
  GH_API_VERSION,
  USER_AGENT,
  ACCEPT_JSON,
  SEARCH_ISSUES_URL,
  SEARCH_PAGE_SIZE,
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
  return new URL(apiUrl).pathname.replace('/repos/', '');
}

// ── Scrape ────────────────────────────────────────────────────────────────────

async function fetchNewPRs(sinceDate, existingKeys) {
  const newPRs = [];
  let page = 1;
  let done = false;

  console.log(sinceDate
    ? `Fetching PRs for ${USERNAME} created after ${sinceDate}…`
    : `Fetching all PRs for ${USERNAME} (first run)…`
  );

  while (!done) {
    const url = [
      SEARCH_ISSUES_URL,
      `?q=author:${USERNAME}+is:pr`,
      `&sort=created&order=desc`,
      `&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    ].join('');

    const data = await ghGet(url);

    for (const item of data.items) {
      const createdAt = item.created_at.slice(0, 10);

      // Items are sorted newest-first; once we're past the cutoff we're done
      if (sinceDate && createdAt < sinceDate) { done = true; break; }

      const repo = repoFromUrl(item.repository_url);
      const key  = `${repo}#${item.number}`;
      if (!existingKeys.has(key)) {
        newPRs.push({
          number:     item.number,
          title:      item.title,
          repo,
          state:      prState(item),
          created_at: createdAt,
          merged_at:  item.pull_request?.merged_at?.slice(0, 10) ?? null,
          closed_at:  item.closed_at?.slice(0, 10)               ?? null,
          comments:   item.comments,
          url:        item.html_url,
        });
      }
    }

    console.log(`  page ${page}: ${data.items.length} fetched, ${newPRs.length} new so far`);

    if (data.items.length < SEARCH_PAGE_SIZE) break;

    page++;
    await sleep(SEARCH_DELAY_MS);
  }

  return newPRs;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let existing = { pull_requests: [] };
  try { existing = JSON.parse(readFileSync(OUT_PATH, 'utf8')); } catch {}

  const sinceDate   = existing.pull_requests[0]?.created_at ?? null;
  const existingKeys = new Set(existing.pull_requests.map(pr => `${pr.repo}#${pr.number}`));

  const newPRs = await fetchNewPRs(sinceDate, existingKeys);

  const output = {
    generated_at:  new Date().toISOString(),
    pull_requests: [...newPRs, ...existing.pull_requests],
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Done. ${newPRs.length} new PRs added (${output.pull_requests.length} total) → ${OUT_PATH}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
