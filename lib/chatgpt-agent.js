export async function callAgent({ input, images = [] }) {
  const apiUrl = process.env.CHATGPT_AGENT_API_URL;
  const accessToken = process.env.CHATGPT_AGENT_ACCESS_TOKEN;

  if (!apiUrl || !accessToken) {
    throw new Error('Missing CHATGPT_AGENT_API_URL or CHATGPT_AGENT_ACCESS_TOKEN');
  }

  const payload = buildPayload({ input, images });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent API failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return extractText(data);
}

function buildPayload({ input, images }) {
  // この会話で確認できている最小仕様は { input: "..." } のみ。
  // そのため、まずは画像情報をテキストに畳み込む安全版にしています。
  // 画像をネイティブに渡せるAPI仕様が分かったら、ここを差し替えてください。

  let mergedInput = input || '';

  if (images.length > 0) {
    const imageSummary = images
      .map((img, index) => {
        return `画像${index + 1}: ${img.name || 'image'} (${img.mimeType || 'unknown'})`;
      })
      .join('\n');

    mergedInput += `\n\n[添付画像あり]\n${imageSummary}\n画像を前提にレビューしてください。`;
  }

  return { input: mergedInput };
}

function extractText(data) {
  if (typeof data === 'string') return data;
  if (data.output_text) return data.output_text;

  if (Array.isArray(data.output)) {
    const texts = [];
    for (const item of data.output) {
      if (item?.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content?.type === 'output_text' && content.text) texts.push(content.text);
          if (content?.type === 'text' && content.text) texts.push(content.text);
        }
      }
      if (item?.text) texts.push(item.text);
    }
    if (texts.length) return texts.join('\n\n');
  }

  return JSON.stringify(data, null, 2);
}
