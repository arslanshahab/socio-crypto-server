import { doFetch, RequestData } from "../util/fetchRequest";

const { NODE_ENV = "development", SLACK_WEBHOOK_URL = "" } = process.env;

export class SlackClient {
    private static baseUrl = SLACK_WEBHOOK_URL;

    public static sendNotification = async (data: { name: string; error: any }) => {
        if (NODE_ENV === "production") {
            const { error, name } = data;
            const requestData: RequestData = {
                method: "POST",
                url: SlackClient.baseUrl,
                payload: {
                    text: `${error.message} <@murad>, <@arslan>, <@ray>`,
                    attachments: [
                        {
                            color: "danger",
                            fields: [{ title: name, value: error.toString(), short: false }],
                        },
                    ],
                },
            };
            return await doFetch(requestData);
        }
    };
}
