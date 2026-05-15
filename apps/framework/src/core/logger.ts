import { Logger, logger } from "@ghom/logger"

import config from "#config"

export const systemLogger = config.logger ? new Logger(config.logger) : logger

const log = systemLogger.log.bind(systemLogger)
const warn = systemLogger.warn.bind(systemLogger)
const error = systemLogger.error.bind(systemLogger)
const success = systemLogger.success.bind(systemLogger)

export type * from "@ghom/logger"

export {
  defaultLoggerColors,
  defaultLoggerPattern,
  defaultLoggerRenders,
  Logger,
  LoggerLevels,
  loggerLevelName,
} from "@ghom/logger"
export { error, log, success, warn }

export default systemLogger
