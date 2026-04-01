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

function updateStats(commits, pullRequests, reviews) {
  document.getElementById('stat-commits').textContent = commits.length;
  document.getElementById('stat-prs').textContent     = pullRequests.length;
  document.getElementById('stat-merged').textContent  = pullRequests.filter(pr => pr.state === 'merged').length;
  document.getElementById('stat-reviews').textContent = reviews.length;

  document.getElementById('cnt-commits').textContent = commits.length;
  document.getElementById('cnt-prs').textContent     = pullRequests.length;
  document.getElementById('cnt-reviews').textContent = reviews.length;
}

function updateTimestamp(...datasets) {
  const latest = datasets
    .map(d => new Date(d.generated_at))
    .reduce((a, b) => (a > b ? a : b));
  document.getElementById('data-timestamp').textContent =
    `Data snapshot · last updated ${latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

async function init() {
  const [commitsData, pullRequestsData, reviewsData] = await Promise.all([
    fetch(COMMITS_URL).then(r => r.json()),
    fetch(PULL_REQUESTS_URL).then(r => r.json()),
    fetch(REVIEWS_URL).then(r => r.json()),
  ]);

  updateStats(commitsData.commits, pullRequestsData.pull_requests, reviewsData.reviews);
  updateTimestamp(commitsData, pullRequestsData, reviewsData);
  setupTabs();
  initCommitsGrid(commitsData.commits);
  initPRsGrid(pullRequestsData.pull_requests);
  initReviewsGrid(reviewsData.reviews);
}

init().catch(err => console.error('Failed to load GitHub activity data:', err));
