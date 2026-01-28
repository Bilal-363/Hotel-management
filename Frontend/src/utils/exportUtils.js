export const exportToCSV = (filename, columns, rows) => {
  const header = columns.map(c => '"' + c.replace(/"/g, '""') + '"').join(',');
  const body = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : filename + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToXLSX = async (filename, columns, rows) => {
  try {
    const xlsx = await import('xlsx');
    const data = [columns, ...rows];
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
  } catch (e) {
    console.warn('xlsx not available, falling back to CSV', e);
    exportToCSV(filename, columns, rows);
  }
};

export const pagePrintStyle = `
  @page { size: A4; margin: 16mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; }
`;

