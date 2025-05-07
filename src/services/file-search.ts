/**
 * Represents a file found during a search.
 */
export interface FileInfo {
  /**
   * The name of the file.
   */
  name: string;
  /**
   * The full path to the file.
   */
  path: string;
}

/**
 * Asynchronously searches for files matching the specified query.
 *
 * @param query The search query.
 * @returns A promise that resolves to an array of FileInfo objects.
 */
export async function searchFiles(query: string): Promise<FileInfo[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      name: 'report.docx',
      path: '/documents/reports/report.docx',
    },
    {
      name: 'image.png',
      path: '/pictures/image.png',
    },
  ];
}
