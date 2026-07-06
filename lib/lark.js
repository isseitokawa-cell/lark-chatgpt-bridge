import * as lark from '@larksuiteoapi/node-sdk';

export function createLarkClient() {
  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('Missing LARK_APP_ID or LARK_APP_SECRET');
  }

  return new lark.Client({
    appId,
    appSecret,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Lark
  });
}

export async function replyText({ messageId, text }) {
  const client = createLarkClient();

  const res = await client.im.message.reply({
    path: { message_id: messageId },
    data: {
      msg_type: 'text',
      content: JSON.stringify({ text })
    }
  });

  if (res.code !== 0) {
    throw new Error(`Lark reply failed: ${JSON.stringify(res)}`);
  }

  return res;
}

// messageResource.get() streams a file (image/video/file), not a {code,msg,data}
// response — it resolves to { writeFile, getReadableStream, headers }. The SDK's
// underlying HTTP client throws on non-2xx, so a failed fetch surfaces as a thrown
// error rather than a checkable success field.
export async function getMessageResource({ messageId, fileKey, type = 'image' }) {
  const client = createLarkClient();

  return client.im.messageResource.get({
    path: {
      message_id: messageId,
      file_key: fileKey
    },
    params: {
      type
    }
  });
}
