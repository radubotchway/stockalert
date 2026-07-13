const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const toCsv = (columns, rows) => {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','))
    .join('\n');
  return `${header}\n${body}`;
};

export const sendCsv = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};
