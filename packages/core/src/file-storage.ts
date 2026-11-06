/** Shared by the Node application and the private Cloudflare outbound handler. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_STORAGE_HOST = "bootstrap-files.internal";
export const FILE_STORAGE_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
