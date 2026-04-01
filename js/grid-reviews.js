import { GITHUB_BASE_URL } from './constants.js';
import { githubLink, makeGrid, stateCellRenderer } from './grid-helpers.js';

export function initReviewsGrid(rowData) {
  const columnDefs = [
    {
      field:      'date',
      headerName: 'Date',
      filter:     'agDateColumnFilter',
      width:      120,
    },
    {
      field:        'pr_title',
      headerName:   'PR Title',
      filter:       'agTextColumnFilter',
      flex:         1,
      minWidth:     220,
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
      field:        'body_length',
      headerName:   'Review Length (chars)',
      filter:       'agNumberColumnFilter',
      aggFunc:      'avg',
      width:        180,
      cellRenderer: ({ value }) => (value != null ? value.toLocaleString() : ''),
    },
  ];

  makeGrid('grid-reviews', columnDefs, rowData);
}
