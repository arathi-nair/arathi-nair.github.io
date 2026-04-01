import { GITHUB_BASE_URL } from './constants.js';
import { githubLink, makeGrid, stateCellRenderer } from './grid-helpers.js';

export function initPRsGrid(rowData) {
  const columnDefs = [
    {
      field:        'number',
      headerName:   '#',
      filter:       'agNumberColumnFilter',
      width:        80,
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
      field:        'merged_at',
      headerName:   'Merged',
      filter:       'agDateColumnFilter',
      width:        120,
      cellRenderer: ({ value }) => value ?? '—',
    },
    {
      field:        'additions',
      headerName:   '+Lines',
      filter:       'agNumberColumnFilter',
      aggFunc:      'sum',
      width:        90,
      cellStyle:    { color: 'var(--accent-2)' },
      cellRenderer: ({ value }) => (value != null ? `+${value}` : ''),
    },
    {
      field:        'deletions',
      headerName:   '−Lines',
      filter:       'agNumberColumnFilter',
      aggFunc:      'sum',
      width:        90,
      cellStyle:    { color: 'var(--color-deletions)' },
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
