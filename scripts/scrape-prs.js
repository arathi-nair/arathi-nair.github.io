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
      Accept:                 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent':           'github-activity-scraper',
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
      'https://api.github.com/search/issues',
      `?q=author:${USERNAME}+is:pr`,
      `&sort=created&order=desc`,
      `&per_page=100&page=${page}`,
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

    if (data.items.length < 100 || pullRequests.length >= 1000) break;

    page++;
    await sleep(300);
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error(err.message); process.exit(1); });
