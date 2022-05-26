// Defines the type for a database instance to access the config.
import { ConfigInterface } from "../../sharedTypes";

// Import the migrations.
import * as MigrateFrom2 from "./migrate_from_2";

// Defines application migrations. These are ran in order before the application starts.
export const applicationMigrations = [
    MigrateFrom2.applicationMigration,
] as (() => void)[];

// Defines database migrations. These are ran in order after the database is initialised.
export const databaseMigrations = [
    MigrateFrom2.databaseMigration,
] as ((database: ConfigInterface) => void)[];
