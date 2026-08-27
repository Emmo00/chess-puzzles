// Backend logger - re-exports from middleware/logging for backward compatibility
export { createLogger, maskAddress, getRequestId } from "../middleware/logging";
import { createLogger, maskAddress } from "../middleware/logging";

// Create a default logger instance for services that import `logger` directly
const defaultLogger = createLogger({ component: "app" });

export const logger = {
  info: (message: string, context?: Record<string, any>) => defaultLogger.info(message, context),
  error: (message: string, error?: Error, context?: Record<string, any>) => defaultLogger.error(message, error, context),
  warn: (message: string, context?: Record<string, any>) => defaultLogger.warn(message, context),
  debug: (message: string, context?: Record<string, any>) => defaultLogger.debug(message, context),
};
