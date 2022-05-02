import { ConfigInterface } from "../../sharedTypes";
import { readFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const applicationMigration = () => {
    // Check if ~/magiccap.db exists.
    const oldPath = join(homedir(), "magiccap.db");
    if (existsSync(oldPath)) {
        // It does. Does ~/.magiccap/magiccap.db?
        const rootPath = join(homedir(), ".magiccap");
        const dbPath = join(rootPath, "magiccap.db");
        if (!existsSync(dbPath)) {
            // Nope. We should move ~/magiccap.db.
            mkdirSync(rootPath, {recursive: true});
            renameSync(oldPath, dbPath);
        }
    }

    // TODO: delete magiccap-updater
};

export const databaseMigration = (database: ConfigInterface) => {
    // Handle ShareX SXCU path migrations.
    const oldSxcuValue = database.getConfig("sharex_sxcu_path");
    if (typeof oldSxcuValue === "string") {
        // Check if the path is prefixed with "sxcu:".
        if (oldSxcuValue.startsWith("sxcu:")) {
            // Trim the first 5 characters and store that as the value.
            database.setConfig("sxcu_data", JSON.parse(oldSxcuValue.substr(5)));
        } else {
            // Try and load the file and write it to the key.
            try {
                database.setConfig("sxcu_data", JSON.parse(readFileSync(oldSxcuValue).toString()));
            } catch (_) {
                // Unable to read the file. Ignore it, probably an old config option.
            }
        }

        // Delete the key.
        database.setConfig("sharex_sxcu_path", undefined);
    }

    // Make sure the uploader isn't i.magiccap.
    if (database.getConfig("uploader_type") === "magiccap") database.setConfig("uploader_type", "imgur");

    // Check if update bits are configured.
    if (database.getConfig("update_bits") === undefined) {
        let bits = 0;
        const updatesOn = database.getConfig("autoupdate_on");

        if (updatesOn === undefined) {
            // Return here since the key was never set.
            return;
        }

        if (updatesOn !== false) {
            bits++;
            if (database.getConfig("beta_channel")) bits = 3;
        }
        database.setConfig("update_bits", bits);
    }

    // Handle if Google Drive uses the legacy format.
    const expiresAt = database.getConfig("google_drive_expires_at");
    if (expiresAt !== undefined) {
        // Check the actual token value is set.
        const token = database.getConfig("google_drive_token");
        if (token !== undefined) {
            // Transform the key into the new format.
            const newKey = JSON.stringify({
                expiresAt, token,
                refreshToken: database.getConfig("google_drive_refresh_token")
            });
            database.setConfig("google_drive_token", newKey);
            database.setConfig("google_drive_refresh_token", undefined);
        }

        // In any case, this key should not exist anymore.
        database.setConfig("google_drive_expires_at", undefined);
    }

    // Handle the DigitalOcean Spaces migration.
    if (!database.getConfig("do_spaces_migration_done")) {
        // Check the S3 endpoint.
        const reMatch = (database.getConfig("s3_endpoint") as string || "").match(/^https?:\/\/(nyc3|ams3|sfo3|spg1|fra1)\.digitaloceanspaces\.com\/?$/);
        if (reMatch) {
            // Move the region.
            const items = ["nyc3", "ams3", "sfo3", "spg1", "fra1"];
            const index = items.indexOf(reMatch[1]);
            database.setConfig("spaces_region", index);
            database.setConfig("s3_endpoint", undefined);

            // Move the access key ID.
            database.setConfig("spaces_access_key_id", database.getConfig("s3_access_key_id"));
            database.setConfig("s3_access_key_id", undefined);

            // Move the secret access key.
            database.setConfig("spaces_secret_access_key", database.getConfig("s3_secret_access_key"));
            database.setConfig("s3_secret_access_key", undefined);

            // Move the bucket name.
            database.setConfig("spaces_bucket_name", database.getConfig("s3_bucket_name"));
            database.setConfig("s3_bucket_name", undefined);

            // Move the bucket URL.
            database.setConfig("spaces_bucket_url", database.getConfig("s3_bucket_url"));
            database.setConfig("s3_bucket_url", undefined);

            // If the uploader type is S3, set it to Spaces.
            if (database.getConfig("uploader_type") === "s3") database.setConfig("uploader_type", "spaces");
        }

        // Mark the migration as done.
        database.setConfig("do_spaces_migration_done", true);
    }
};
