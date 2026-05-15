import { Cron } from "#core/cron"
import * as logger from "#core/logger"

export default new Cron({
  name: "example",
  description: "Example cron from the example module",
  schedule: "daily",
  async run() {
    logger.log("example cron ran")
  },
})
