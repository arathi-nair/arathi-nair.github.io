#!/usr/bin/env node
// Scrapes commits authored by GITHUB_USERNAME and appends new ones to data/commits.json.
// On first run fetches everything available; subsequent runs fetch only commits
// newer than the most recent entry already in the file.
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
  ACCEPT_COMMITS,
  SEARCH_COMMITS_URL,
  SEARCH_PAGE_SIZE,
  SEARCH_DELAY_MS,
  sleep,
} from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH  = resolve(__dirname, '../data/commits.json');

const TOKEN    = process.env.GH_PAT;
const USERNAME = process.env.GITHUB_USERNAME;

if (!TOKEN)    throw new Error('GH_PAT env var is required');
if (!USERNAME) throw new Error('GITHUB_USERNAME env var is required');

// ── GitHub API helper ─────────────────────────────────────────────────────────

async function ghGet(url) {
  const res = await fetch(url, {
    headers: {
      Authorization:          `Bearer ${TOKEN}`,
      Accept:                 ACCEPT_COMMITS,
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

// ── Scrape ────────────────────────────────────────────────────────────────────

async function fetchNewCommits(sinceDate, existingShas) {
  const newCommits = [];
  let page = 1;
  let done = false;

  console.log(sinceDate
    ? `Fetching commits for ${USERNAME} newer than ${sinceDate}…`
    : `Fetching all commits for ${USERNAME} (first run)…`
  );

  while (!done) {
    const url = [
      SEARCH_COMMITS_URL,
      `?q=author:${USERNAME}`,
      `&sort=committer-date&order=desc`,
      `&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    ].join('');

    const data = await ghGet(url);

    for (const item of data.items) {
      const date = item.commit.committer.date.slice(0, 10);

      // Items are sorted newest-first; once we're past the cutoff we're done
      if (sinceDate && date < sinceDate) { done = true; break; }

      const sha = item.sha.slice(0, 7);
      if (!existingShas.has(sha)) {
        newCommits.push({
          sha,
          message: item.commit.message.split('\n')[0],
          date,
          repo:    item.repository.full_name,
          url:     item.html_url,
        });
      }
    }

    console.log(`  page ${page}: ${data.items.length} fetched, ${newCommits.length} new so far`);

    if (data.items.length < SEARCH_PAGE_SIZE) break;

    page++;
    await sleep(SEARCH_DELAY_MS);
  }

  return newCommits;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load existing data (empty shell on first run)
  let existing = { commits: [] };
  try { existing = JSON.parse(readFileSync(OUT_PATH, 'utf8')); } catch {}

  const sinceDate   = existing.commits[0]?.date ?? null;
  const existingShas = new Set(existing.commits.map(c => c.sha));

  const newCommits = await fetchNewCommits(sinceDate, existingShas);

  const output = {
    generated_at: new Date().toISOString(),
    commits:      [...newCommits, ...existing.commits],
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Done. ${newCommits.length} new commits added (${output.commits.length} total) → ${OUT_PATH}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
