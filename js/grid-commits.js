import { GITHUB_BASE_URL } from './constants.js';
import { githubLink, makeGrid } from './grid-helpers.js';

export function initCommitsGrid(rowData) {
  const columnDefs = [
    {
      field:        'date',
      headerName:   'Date',
      filter:       'agDateColumnFilter',
      width:        120,
    },
    {
      field:          'repo',
      headerName:     'Repository',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          180,
    },
    {
      field:          'branch',
      headerName:     'Branch',
      filter:         'agTextColumnFilter',
      enableRowGroup: true,
      width:          110,
    },
    {
      field:        'message',
      headerName:   'Commit Message',
      filter:       'agTextColumnFilter',
      flex:         1,
      minWidth:     220,
      tooltipField: 'message',
      cellRenderer: ({ value, data }) =>
        data ? githubLink(`${GITHUB_BASE_URL}/${data.repo}/commit/${data.sha}`, value) : value,
    },
    {
      field:        'sha',
      headerName:   'SHA',
      filter:       'agTextColumnFilter',
      width:        90,
      cellRenderer: ({ value, data }) =>
        data ? `<code>${githubLink(`${GITHUB_BASE_URL}/${data.repo}/commit/${value}`, value)}</code>` : value,
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
      field:      'files_changed',
      headerName: 'Files',
      filter:     'agNumberColumnFilter',
      aggFunc:    'sum',
      width:      80,
    },
  ];

  makeGrid('grid-commits', columnDefs, rowData);
}
