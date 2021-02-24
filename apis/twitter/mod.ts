import type { TwitterAPIOptions } from "./types.ts";

import { TwitterAPIBase } from "./models.ts";

export default class TwitterAPI extends TwitterAPIBase {
  constructor(options: TwitterAPIOptions) {
    super(options);
  }

  public async sendDirectMessage(
    message: string,
    userId: string,
  ): Promise<void> {
    const endpointUrl = new URL("1.1/direct_messages/events/new", this.baseUrl);
    const response = await this._fetch(endpointUrl, {
      body: JSON.stringify({
        event: {
          message_create: {
            message_data: { text: message },
            target: { recipient_id: userId },
          },
          type: "message_create",
        },
      }),
    });
    const data = await response.json();
    console.log(data.event.type, data.event.id);
  }
}
