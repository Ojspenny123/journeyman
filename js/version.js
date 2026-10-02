/** Single source of truth for the Journeyman release. */
export const VERSION = "2.0.0";

/** Footer label derived from VERSION, e.g. 1.0.0 → v1.0. */
export function footerVersion(version = VERSION) {
  const [major, minor] = version.split(".");
  return `v${major}.${minor}`;
}
