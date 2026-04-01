#!/usr/bin/env node
// Scrapes all commits authored by GITHUB_USERNAME via the GitHub Search API
// and writes them to data/github_activity.json.
//
// Requires: Node 18+ (uses built-in fetch), no npm install needed.
// Env vars:
//   GH_PAT           — Personal Access Token (read:user + public_repo scopes)
//   GITHUB_USERNAME  — GitHub username to scrape

import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname }            from 'node:path';
import { fileURLToPath }               from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH  = resolve(__dirname, '../data/github_activity.json');

const TOKEN    = process.env.GH_PAT;
const USERNAME = process.env.GITHUB_USERNAME;

if (!TOKEN)    throw new Error('GH_PAT env var is required');
if (!USERNAME) throw new Error('GITHUB_USERNAME env var is required');

// ── GitHub API helper ────────────────────────────────────────────────────────

async function ghGet(url) {
  const res = await fetch(url, {
    headers: {
      Authorization:        `Bearer ${TOKEN}`,
      Accept:               'application/vnd.github.cloak-preview+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent':         'github-activity-scraper',
    },
  });

  if (res.status === 403) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw new Error(`Rate limited. Resets at ${new Date(reset * 1000).toISOString()}`);
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);

  return res.json();
}

// ── Scrape ───────────────────────────────────────────────────────────────────

async function fetchCommits() {
  const commits = [];
  let page = 1;

  console.log(`Fetching commits for ${USERNAME}…`);

  while (true) {
    const url = [
      'https://api.github.com/search/commits',
      `?q=author:${USERNAME}`,
      `&sort=committer-date&order=desc`,
      `&per_page=100&page=${page}`,
    ].join('');

    const data = await ghGet(url);

    for (const item of data.items) {
      commits.push({
        sha:     item.sha.slice(0, 7),
        message: item.commit.message.split('\n')[0],   // subject line only
        date:    item.commit.committer.date.slice(0, 10),
        repo:    item.repository.full_name,
        url:     item.html_url,
      });
    }

    console.log(`  page ${page}: ${data.items.length} commits (${commits.length} total)`);

    // Search API hard cap is 1 000 results; stop when page is undersized
    if (data.items.length < 100 || commits.length >= 1000) break;

    page++;
    await sleep(300); // stay well within the 30 search req/min rate limit
  }

  return commits;
}

// ── Write ────────────────────────────────────────────────────────────────────

async function main() {
  const commits = await fetchCommits();

  // Preserve existing pull_requests and reviews so the file stays valid
  // for the frontend while we haven't wired up those scrapers yet.
  let existing = { pull_requests: [], reviews: [] };
  try {
    existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    // file doesn't exist yet — that's fine
  }

  const output = {
    generated_at:  new Date().toISOString(),
    commits,
    pull_requests: existing.pull_requests ?? [],
    reviews:       existing.reviews       ?? [],
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Done. Wrote ${commits.length} commits → ${OUT_PATH}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error(err.message); process.exit(1); });
