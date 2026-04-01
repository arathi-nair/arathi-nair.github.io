const { createGrid } = agGrid;

// ── Constants ─────────────────────────────────────────────────────────────────
const GITHUB_BASE_URL = 'https://github.com';
const DATA_URL        = '/data/github_activity.json';
const PAGE_SIZE       = 20;


// ── Shared column defaults ────────────────────────────────────────────────────
const DEFAULT_COL = {
  sortable:   true,
  resizable:  true,
  filter:     true,
  minWidth:   80,
};

const SHARED_GRID_OPTIONS = {
  defaultColDef:           DEFAULT_COL,
  rowGroupPanelShow:       'always',
  groupIncludeFooter:      true,
  groupIncludeTotalFooter: true,
  sideBar:                 { toolPanels: ['columns', 'filters'] },
  animateRows:             true,
  pagination:              true,
  paginationPageSize:      PAGE_SIZE,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function stateCellRenderer({ value }) {
  if (!value) return '';
  return `<span class="state-label" data-state="${value}">${value.replace(/_/g, ' ')}</span>`;
}

function githubLink(href, label) {
  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
}

function makeGrid(elementId, columnDefs, rowData) {
  createGrid(document.getElementById(elementId), {
    ...SHARED_GRID_OPTIONS,
    columnDefs,
    rowData,
  });
}

// ── Commits grid ──────────────────────────────────────────────────────────────
function initCommitsGrid(rowData) {
  const columnDefs = [
    {
      field:  'date',
      headerName: 'Date',
      filter: 'agDateColumnFilter',
      width:  120,
    },
    {
      field:       'repo',
      headerName:  'Repository',
      filter:      'agTextColumnFilter',
      enableRowGroup: true,
      width:       180,
    },
    {
      field:       'branch',
      headerName:  'Branch',
      filter:      'agTextColumnFilter',
      enableRowGroup: true,
      width:       110,
    },
    {
      field:       'message',
      headerName:  'Commit Message',
      filter:      'agTextColumnFilter',
      flex:        1,
      minWidth:    220,
      tooltipField: 'message',
      cellRenderer: ({ value, data }) =>
        data ? githubLink(`${GITHUB_BASE_URL}/${data.repo}/commit/${data.sha}`, value) : value,
    },
    {
      field:      'sha',
      headerName: 'SHA',
      filter:     'agTextColumnFilter',
      width:      90,
      cellRenderer: ({ value, data }) =>
        data ? `<code>${githubLink(`${GITHUB_BASE_URL}/${data.repo}/commit/${value}`, value)}</code>` : value,
    },
    {
      field:      'additions',
      headerName: '+Lines',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      90,
      cellStyle:  { color: 'var(--accent-2)' },
      cellRenderer: ({ value }) => (value != null ? `+${value}` : ''),
    },
    {
      field:      'deletions',
      headerName: '−Lines',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      90,
      cellStyle:  { color: 'var(--color-deletions)' },
      cellRenderer: ({ value }) => (value != null ? `−${value}` : ''),
    },
    {
      field:      'files_changed',
      headerName: 'Files',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      80,
    },
  ];

  makeGrid('grid-commits', columnDefs, rowData);
}

// ── PRs grid ──────────────────────────────────────────────────────────────────
function initPRsGrid(rowData) {
  const columnDefs = [
    {
      field:      'number',
      headerName: '#',
      filter:     'agNumberColumnFilter',
      width:      80,
      cellRenderer: ({ value, data }) =>
        data ? githubLink(`${GITHUB_BASE_URL}/${data.repo}/pull/${value}`, `#${value}`) : `#${value}`,
    },
    {
      field:      'title',
      headerName: 'Title',
      filter:     'agTextColumnFilter',
      flex:       1,
      minWidth:   220,
    },
    {
      field:          'repo',
      headerName:     'Repository',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          180,
    },
    {
      field:          'state',
      headerName:     'State',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          120,
      cellRenderer:   stateCellRenderer,
    },
    {
      field:      'created_at',
      headerName: 'Opened',
      filter:     'agDateColumnFilter',
      width:      120,
    },
    {
      field:      'merged_at',
      headerName: 'Merged',
      filter:     'agDateColumnFilter',
      width:      120,
      cellRenderer: ({ value }) => value ?? '—',
    },
    {
      field:      'additions',
      headerName: '+Lines',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      90,
      cellStyle:  { color: 'var(--accent-2)' },
      cellRenderer: ({ value }) => (value != null ? `+${value}` : ''),
    },
    {
      field:      'deletions',
      headerName: '−Lines',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      90,
      cellStyle:  { color: 'var(--color-deletions)' },
      cellRenderer: ({ value }) => (value != null ? `−${value}` : ''),
    },
    {
      field:      'comments',
      headerName: 'Comments',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      110,
    },
    {
      field:      'review_comments',
      headerName: 'Review Comments',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      150,
    },
  ];

  makeGrid('grid-prs', columnDefs, rowData);
}

// ── Reviews grid ──────────────────────────────────────────────────────────────
function initReviewsGrid(rowData) {
  const columnDefs = [
    {
      field:      'date',
      headerName: 'Date',
      filter:     'agDateColumnFilter',
      width:      120,
    },
    {
      field:      'pr_title',
      headerName: 'PR Title',
      filter:     'agTextColumnFilter',
      flex:       1,
      minWidth:   220,
      cellRenderer: ({ value, data }) =>
        data ? githubLink(`${GITHUB_BASE_URL}/${data.repo}/pull/${data.pr_number}`, value) : value,
    },
    {
      field:          'repo',
      headerName:     'Repository',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          180,
    },
    {
      field:          'pr_author',
      headerName:     'PR Author',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          130,
    },
    {
      field:          'state',
      headerName:     'Outcome',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          160,
      cellRenderer:   stateCellRenderer,
    },
    {
      field:      'comments_count',
      headerName: 'Comments Left',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      140,
    },
    {
      field:      'body_length',
      headerName: 'Review Length (chars)',
      filter:     'agNumberColumnFilter',
      aggFunc:    'avg',
      width:      180,
      cellRenderer: ({ value }) => (value != null ? value.toLocaleString() : ''),
    },
  ];

  makeGrid('grid-reviews', columnDefs, rowData);
}

// ── Tab switching ─────────────────────────────────────────────────────────────
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

// ── Stats bar ─────────────────────────────────────────────────────────────────
function updateStats(data) {
  document.getElementById('stat-commits').textContent  = data.commits.length;
  document.getElementById('stat-prs').textContent      = data.pull_requests.length;
  document.getElementById('stat-merged').textContent   = data.pull_requests.filter(pr => pr.state === 'merged').length;
  document.getElementById('stat-reviews').textContent  = data.reviews.length;

  document.getElementById('cnt-commits').textContent = data.commits.length;
  document.getElementById('cnt-prs').textContent     = data.pull_requests.length;
  document.getElementById('cnt-reviews').textContent = data.reviews.length;

  const updatedAt = new Date(data.generated_at);
  document.getElementById('data-timestamp').textContent =
    `Data snapshot · last updated ${updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  const res  = await fetch(DATA_URL);
  const data = await res.json();

  updateStats(data);
  setupTabs();
  initCommitsGrid(data.commits);
  initPRsGrid(data.pull_requests);
  initReviewsGrid(data.reviews);
}

init().catch(err => console.error('Failed to load GitHub activity data:', err));
