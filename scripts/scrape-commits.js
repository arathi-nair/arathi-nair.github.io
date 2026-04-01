#!/usr/bin/env node
// Scrapes all commits authored by GITHUB_USERNAME via the GitHub Search API
// and writes them to data/commits.json.
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
  ACCEPT_COMMITS,
  SEARCH_COMMITS_URL,
  SEARCH_PAGE_SIZE,
  SEARCH_MAX_RESULTS,
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

async function fetchCommits() {
  const commits = [];
  let page = 1;

  console.log(`Fetching commits for ${USERNAME}…`);

  while (true) {
    const url = [
      SEARCH_COMMITS_URL,
      `?q=author:${USERNAME}`,
      `&sort=committer-date&order=desc`,
      `&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    ].join('');

    const data = await ghGet(url);

    for (const item of data.items) {
      commits.push({
        sha:     item.sha.slice(0, 7),
        message: item.commit.message.split('\n')[0],
        date:    item.commit.committer.date.slice(0, 10),
        repo:    item.repository.full_name,
        url:     item.html_url,
      });
    }

    console.log(`  page ${page}: ${data.items.length} commits (${commits.length} total)`);

    if (data.items.length < SEARCH_PAGE_SIZE || commits.length >= SEARCH_MAX_RESULTS) break;

    page++;
    await sleep(SEARCH_DELAY_MS);
  }

  return commits;
}

// ── Write ─────────────────────────────────────────────────────────────────────

async function main() {
  const commits = await fetchCommits();

  writeFileSync(OUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    commits,
  }, null, 2));

  console.log(`Done. Wrote ${commits.length} commits → ${OUT_PATH}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
