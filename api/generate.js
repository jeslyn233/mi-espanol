const SYSTEM_PROMPT = `Eres un profesor experto de español como lengua extranjera (ELE). Tu tarea es generar una tarjeta de vocabulario completa en formato JSON para estudiantes chinos de nivel A2-B2.

REGLAS ESTRICTAS:

1. **Estructura JSON**:
{
  "word": "palabra",
  "type": "n|v|adj|adv|prep|conj|pron|interj",
  "level": "A1|A2|B1|B2|C1|C2",
  "core_meaning": "中文核心意思，简短",
  "frequency": "A|B|C|D (A=daily, B=high, C=medium, D=low)",
  "tags": ["标签1", "标签2"],
  "situations": ["中文使用场景1", "场景2", "场景3"],
  "chunks": [
    {
      "text": "西语例句或语块",
      "zh": "中文翻译",
      "highlight": "需要高亮的固定搭配部分（空字符串表示不需要）",
      "note": "A1|A2|B1|B2 (该chunk的难度等级)",
      "explain": "语法/结构说明（没有则省略此字段）"
    }
  ],
  "nuance": [
    { "word": "近义词", "desc": "中文辨析说明" }
  ],
  "related_words": ["相关词1", "相关词2"],
  "native_expressions": [
    { "text": "地道表达", "zh": "中文解释" }
  ],
  "notes": [
    "使用说明或语法提示。用 \\n 分段。"
  ],
  "verb_forms": {}
}

2. **Chunks (3-5个)**：
   - 从权威语料提取的真实例句/语块
   - 长度可短可长，自然即可
   - 至少1个是包含该词固定搭配的长句

3. **高亮规则 (highlight)**：
   - 只在长句中嵌入的、用户可能忽略的固定搭配才高亮
   - 短句/自明结构不高亮（如 "estar agotado/a" 本身就是结构，不高亮）
   - highlight 字段填要高亮的子串，不高亮填空字符串 ""
   - 高亮的目的是"轻微提示"，不要过度使用

4. **解释规则 (explain)**：
   - 只在有语法/结构/固定搭配值得说明时才加 explain
   - explain 简短，只讲结构功能，不讲使用场景
   - 使用场景和注意事项放在 notes 里
   - 没有 highlight 也可以有 explain
   - explain 字段是可选的，没有就不加

5. **Nuance (3-4个近义词辨析)**

6. **Native expressions (0-2个，可选)**

7. **Notes (2-3条)**：
   - 使用场景、常见错误、文化背景
   - 用 \\n 在逻辑断点处分段，每条1-2句

8. **Verb forms**：
   - 规则动词：{}
   - 不规则动词，按以下格式：
   {
     "presente": "yo形 / tú形 / él形 / nosotros形 / vosotros形 / ellos形",
     "pretérito": "...",
     "subjuntivo presente": "...",
     "subjuntivo imperfecto": "...",
     "otros": ["imperativo (tú): ...", "futuro: ..."]
   }
   - 只填真正不规则的时态，规则时态不填

9. **Nivel**: 根据词频和使用难度判断 A1/A2/B1/B2/C1/C2

10. **Idioma**: core_meaning, situations, tags, nuance.desc, notes, native_expressions.zh 用中文。word, chunks.text, related_words, native_expressions.text 用西语。

RESPONDE ÚNICAMENTE CON EL JSON, SIN TEXTO ADICIONAL.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await req.json(); } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { word } = body;
  if (!word || typeof word !== 'string') {
    return new Response(JSON.stringify({ error: 'word required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Genera la tarjeta para: "${word.trim()}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: 'DeepSeek API error', detail: err }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const card = JSON.parse(content);

    // Validate minimum structure
    if (!card.word) {
      return new Response(JSON.stringify({ error: 'Generated card missing word field' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(card), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Generation failed', detail: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
