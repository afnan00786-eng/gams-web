/**
 * exportUtils.ts
 * 
 * Utilities to export application data to CSV format.
 */

/**
 * Converts an array of objects to a CSV string.
 */
export function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                const value = row[fieldName];
                // Escape quotes and wrap in quotes if contains comma
                const stringValue = typeof value === 'object' ? JSON.stringify(value).replace(/"/g, '""') : String(value).replace(/"/g, '""');
                return `"${stringValue}"`;
            }).join(',')
        )
    ];

    return csvRows.join('\n');
}

/**
 * Triggers a file download in the browser.
 */
export function downloadCSV(csvContent: string, fileName: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * High-level helper to export specific datasets.
 */
export function exportData(data: any[], fileNamePrefix: string) {
    const csv = convertToCSV(data);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `${fileNamePrefix}_${date}.csv`);
}
