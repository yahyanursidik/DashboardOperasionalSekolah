/**
 * Converts an array of objects into a CSV string and triggers a download in the browser.
 * 
 * @param data Array of objects to export
 * @param filename Name of the file to be downloaded (without .csv extension)
 */
export function exportToCsv<T extends Record<string, any>>(data: T[], filename: string) {
  if (!data || !data.length) {
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);

  // Convert data to CSV string
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName];
        
        // Handle nulls and undefined
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          // If the value is an object (like a nested relation), we might want to stringify or extract a common field like 'name'
          // For simplicity, we stringify it if it's not handled manually before passing to this function.
          // Ideally, data passed to exportToCsv is already flattened.
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }

        // Escape double quotes
        value = value.replace(/"/g, '""');

        // Wrap in double quotes to handle commas, line breaks, etc.
        return `"${value}"`;
      }).join(',')
    )
  ].join('\r\n');

  // Create a Blob from the CSV string
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM

  // Create a link element
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
