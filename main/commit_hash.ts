import { readFileSync } from "fs";

export default readFileSync(`${__MAGICCAP_DIST_FOLDER__}/commit_hash`).toString();
