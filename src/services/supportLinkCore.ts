export type ExternalUrlOpener = {
  canOpenURL: (url: string) => Promise<boolean>;
  openURL: (url: string) => Promise<unknown>;
};

export async function openExternalUrl(url: string, opener: ExternalUrlOpener) {
  try {
    if (!(await opener.canOpenURL(url))) return false;
    await opener.openURL(url);
    return true;
  } catch {
    return false;
  }
}
