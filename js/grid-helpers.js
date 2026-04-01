import { PAGE_SIZE } from './constants.js';

const { createGrid } = agGrid;

export const DEFAULT_COL = {
  sortable:  true,
  resizable: true,
  filter:    true,
  minWidth:  80,
};

export const SHARED_GRID_OPTIONS = {
  defaultColDef:           DEFAULT_COL,
  rowGroupPanelShow:       'always',
  groupIncludeFooter:      true,
  groupIncludeTotalFooter: true,
  sideBar:                 { toolPanels: ['columns', 'filters'] },
  animateRows:             true,
  pagination:              true,
  paginationPageSize:      PAGE_SIZE,
};

export function makeGrid(elementId, columnDefs, rowData) {
  createGrid(document.getElementById(elementId), {
    ...SHARED_GRID_OPTIONS,
    columnDefs,
    rowData,
  });
}

export function stateCellRenderer({ value }) {
  if (!value) return '';
  return `<span class="state-label" data-state="${value}">${value.replace(/_/g, ' ')}</span>`;
}

export function githubLink(href, label) {
  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
}
