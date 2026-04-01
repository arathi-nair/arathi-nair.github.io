import { COMMITS_URL, PULL_REQUESTS_URL, REVIEWS_URL } from './constants.js';
import { initCommitsGrid }  from './grid-commits.js';
import { initPRsGrid }      from './grid-prs.js';
import { initReviewsGrid }  from './grid-reviews.js';

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
      window.dispatchEvent(new Event('resize'));
    });
  });
}

function updateCounts(commits, pullRequests, reviews) {
  document.getElementById('cnt-commits').textContent = commits.length;
  document.getElementById('cnt-prs').textContent     = pullRequests.length;
  document.getElementById('cnt-reviews').textContent = reviews.length;
}

function updateTimestamp(...datasets) {
  const timestamps = datasets.map(d => d.generated_at).filter(Boolean);
  const el = document.getElementById('data-timestamp');
  if (!timestamps.length) { el.textContent = 'Data snapshot · not yet populated'; return; }
  const latest = timestamps.map(t => new Date(t)).reduce((a, b) => (a > b ? a : b));
  el.textContent = `Data snapshot · last updated ${latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

async function init() {
  const [commitsData, pullRequestsData, reviewsData] = await Promise.all([
    fetch(COMMITS_URL).then(r => r.json()),
    fetch(PULL_REQUESTS_URL).then(r => r.json()),
    fetch(REVIEWS_URL).then(r => r.json()),
  ]);

  updateCounts(commitsData.commits, pullRequestsData.pull_requests, reviewsData.reviews);
  updateTimestamp(commitsData, pullRequestsData, reviewsData);
  setupTabs();
  initCommitsGrid(commitsData.commits);
  initPRsGrid(pullRequestsData.pull_requests);
  initReviewsGrid(reviewsData.reviews);
}

init().catch(err => console.error('Failed to load GitHub activity data:', err));
