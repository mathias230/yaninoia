/**
 * Represents an application that can be opened.
 */
export interface Application {
  /**
   * The name of the application.
   */
  name: string;
  /**
   * The path to the application executable.
   */
  executablePath: string;
}

/**
 * Asynchronously opens the specified application.
 *
 * @param applicationName The name of the application to open.
 * @returns A promise that resolves when the application is successfully opened.
 */
export async function openApplication(applicationName: string): Promise<void> {
  // TODO: Implement this by calling an API.

  console.log(`Opening application: ${applicationName}`);
  return;
}

/**
 * Asynchronously retrieves a list of installed applications.
 *
 * @returns A promise that resolves to an array of Application objects.
 */
export async function getInstalledApplications(): Promise<Application[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      name: 'Calculator',
      executablePath: '/usr/bin/calculator',
    },
    {
      name: 'Notepad',
      executablePath: '/usr/bin/notepad',
    },
  ];
}
