// Handle pure file exports.
export { elixire } from "./implementations/elixire";
export { imgur } from "./implementations/imgur";
export { novus } from "./implementations/novus";
export { pomf } from "./implementations/pomf";
export { reupload } from "./implementations/reupload";
export { rlme } from "./implementations/rlme";
export { shutter } from "./implementations/shutter";
export { ultrashare } from "./implementations/ultrashare";
export { sharex } from "./implementations/sharex";
export { dropbox } from "./implementations/dropbox";
export { gdrive } from "./implementations/gdrive";
export { s3 } from "./implementations/s3";
export { spaces } from "./implementations/spaces";

// Handle renamed exports.
import { ftpImpl } from "./implementations/ftp";
export const ftp = ftpImpl;
import { sftpImpl } from "./implementations/sftp";
export const sftp = sftpImpl;

// Handle exporting secret keys.
import getSecretKeys from "./get_secret_keys";
export const secretKeys = getSecretKeys(module.exports);
