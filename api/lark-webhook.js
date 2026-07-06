import * as lark from '@larksuiteoapi/node-sdk';
import { callAgent } from '../lib/chatgpt-agent.js';
import { replyText, getMessageResource } from '../lib/lark.js';

function parseMessageContent(content) {
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

function extractTextAndAttachments(message) {
  const content = parseMessageContent(message?.content);
  const messageType = message?.message_type;

  let text = '';
  const attachments = [];

  if (messageType === 'text') {
    text = content.text || '';
  }

  if (messageType === 'image') {
    attachments.push({
      type: 'image',
      fileKey: content.image_key,
      name: 'image',
      mimeType: 'image'
    });
    text = '画像レビューをお願いします。';
  }

  if (messageType === 'file') {
    attachments.push({
      type: 'file',
      fileKey: content.file_key,
      name: content.file_name || 'file',
      mimeType: content.file_type || 'file'
    });
    text = content.file_name
      ? `添付ファイル「${content.file_name}」をレビューしてください。`
      : '添付ファイルをレビューしてください。';
  }

  return { text, attachments, messageType };
}

async function resolveImages({ messageId, attachments }) {
  const images = [];

  for (const attachment of attachments) {
    if (attachment.type !== 'image' || !attachment.fileKey) continue;

    const resource = await getMessageResource({
      messageId,
      fileKey: attachment.fileKey,
      type: 'image'
    });

    images.push({
      fileKey: attachment.fileKey,
      name: attachment.name,
      mimeType: attachment.mimeType,
      raw: resource
    });
  }

  return images;
}

const dispatcher = new lark.EventDispatcher({
  verificationToken: process.env.LARK_VERIFICATION_TOKEN,
  encryptKey: process.env.LARK_ENCRYPT_KEY
}).register({
  'im.message.receive_v1': async (data) => {
    const { message } = data;
    const messageId = message.message_id;
    const { text, attachments, messageType } = extractTextAndAttachments(message);

    try {
      const images = await resolveImages({ messageId, attachments });

      if (!text && images.length === 0) {
        await replyText({
          messageId,
          text: 'メッセージ内容を受け取れませんでした。まずはテキストか画像を送ってください。'
        });
        return { ok: true, skipped: 'empty_message' };
      }

      const answer = await callAgent({ input: text, images });
      await replyText({ messageId, text: answer || '返答を生成できませんでした。' });

      return { ok: true, messageType, imagesCount: images.length };
    } catch (error) {
      console.error(error);
      try {
        await replyText({
          messageId,
          text: 'エージェント連携でエラーが発生しました。画像取得権限・設定値・ログを確認してください。'
        });
      } catch (replyError) {
        console.error('failed to send error notification to Lark:', replyError);
      }
      return { ok: false, error: error.message };
    }
  }
});

const handleEvent = lark.adaptExpress(dispatcher, { autoChallenge: true });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await handleEvent(req, res);
}
