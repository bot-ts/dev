import { Listener } from "#core/listener"
import * as logger from "#core/logger"

export default new Listener({
  event: "messageCreate",
  description: "Example listener from the example module",
  async run(message) {
    if (message.content === "!example-ping") {
      logger.log("example module received a ping")
    }
  },
})
