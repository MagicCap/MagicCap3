// Import the exception handler.
import "./exception_handler";

// Ensure migrations are ran before the application initialisation.
import { applicationMigrations } from "./migrations";
applicationMigrations.forEach(f => f());

// Now we can load the application.
import "./init";
