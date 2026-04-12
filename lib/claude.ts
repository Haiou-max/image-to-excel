export interface ExtractedItem {
  货号: string;
  内装: string;
  单价: string;
  尺寸: string;
}

export interface ExtractionResult {
  items: ExtractedItem[];
  raw?: string;
}

const EXTRACTION_PROMPT = `你是一个产品图片信息提取专家。请从这张产品图片中提取以下信息：

1. **货号** - 产品编号，通常是 X-X 格式（如 3-6, 3-7）
2. **内装** - 每箱内装数量，通常标注为 X pcs 或 Xpcs，只提取数字
3. **单价** - 单价（元），通常标注为 X ¥ 或 X￥，只提取数字
4. **尺寸** - 产品尺寸（cm），通常是 X × X 格式

注意事项：
- 手写字体可能不规范，需结合上下文推断
- pcs 不区分大小写
- ¥ 可能写成 ￥ 或只有数字
- 尺寸分隔符可能是 ×、x、X、*
- 如果某个字段无法识别，标记为 [待确认]
- 一张图片可能包含多个产品信息，请全部提取

请严格按以下 JSON 格式返回，不要添加其他文字：
{
  "items": [
    {"货号": "3-6", "内装": "12", "单价": "55", "尺寸": "30.5×24"},
    ...
  ]
}`;

export async function extractFromImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  apiKey: string,
  baseURL?: string,
  model?: string
): Promise<ExtractionResult> {
  const apiUrl = `${baseURL || "https://api.anthropic.com"}/v1/messages`;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const response = await res.json();
  const text =
    response.content?.[0]?.type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { items: parsed.items || [], raw: text };
    }
  } catch {
    // fallback
  }

  return { items: [], raw: text };
}
