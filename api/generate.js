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

2. **Chunks (数量灵活)**：
   - 真实自然的例句/语块，长度可短可长
   - 至少1个是包含该词固定搭配的长句
   - ⚠️ 同一语义类别+同一句型的合并为一条，用「/」分隔。例：tener hambre / sed / frío / calor / sueño（都是身体感受）可合并。tener razón / suerte / prisa 是另一类（状态/属性），分开写。tener miedo 也另开一条。禁止把不同语义类别的全部塞进一条，也禁止同类别拆成多条凑数。

3. **高亮规则 (highlight)**：
   - ⚠️ REGLA Nº1 (LA MÁS IMPORTANTE): Cada estructura fija se resalta UNA SOLA VEZ en el chunk más representativo. En los demás chunks de la misma palabra, aunque aparezca la misma estructura, NO se resalta. Ejemplo: si ya resaltaste "renunciar a" en "renunciar a algo", NO lo resaltes en "renunciar a un derecho" ni en "No pienso renunciar a...".
   - Solo se resalta: verbo+preposición fija, verbo+conjunción fija, o perífrasis verbal. Ejemplos:
     ✅ "aprovechar para" / "aprovechar que" / "renunciar a" / "tener que"
   - NO se resalta:
     ❌ verbo + sustantivo cualquiera (coger una flor, tener tiempo)
     ❌ nombre + de + nombre (hora de la comida, día de trabajo)
     ❌ frase corta auto-explicativa (estar agotado/a, tener hambre)
     ❌ colocación frecuente sin estructura gramatical fija (tener razón, aprovechar el tiempo)
   - El highlight marca un "gancho gramatical" que el alumno debe aprender, no marca vocabulario
   - highlight debe ser subcadena exacta del chunk.text; si son varias, unirlas con "..."
   - Ante la duda, NO resaltar (mejor pecar de menos que de más)

4. **解释规则 (explain)**：
   - explain 是 chunk 里最重要的教学字段，用来解释该语法块的构成逻辑
   - 有值得说明的语法/结构/固定搭配就加 explain，简短讲结构功能
   - 例：tener hambre/sed/frío/calor/sueño → explain: "tener + 名词 表示身体感受，非 ser/estar + adj"
   - 使用场景和注意事项放在 notes 里
   - 没有 highlight 也可以有 explain
   - explain 字段可选，但有教学价值的结构不要省略

5. **Related words (4-6个)**：
   - 近义词、反义词、同根词、分词形式、场景搭配词
   - 只收高频常用词，拒绝生僻词
   - ⚠️ 禁止放：①同一个词的不同变位（tengo/tiene/tuvo…）②语法结构（tener que）③与chunks/native_expressions重复的内容
   - related_words 是关联的独立词汇，不是变位表。正确例：tener→["haber","poseer","carecer","contar con"]

6. **Nuance (3-4个近义词辨析)**

7. **Native expressions (0-2个，可选)**

8. **Notes (2-3条)**：
   - 使用场景、常见错误、文化背景
   - 用 \\n 在逻辑断点处分段，每条1-2句
   - 🚫 PROHIBIDO escribir conjugaciones verbales en notas. Las conjugaciones van en verb_forms, no en notas. No repitas la tabla de conjugación aquí.

9. **Verb forms**：
   - 规则动词（renunciar, hablar, comer, vivir 等）：{}
   - ⚠️ Antes de llenar verb_forms, verifica SIEMPRE: ¿este verbo sigue TODAS las conjugaciones regulares sin ninguna excepción? Si sí, DEBE ser {}.
   - 不规则动词，按以下格式：
   {
     "presente": "yo形 / tú形 / él形 / nosotros形 / vosotros形 / ellos形",
     "pretérito": "...",
     "futuro": "...",
     "subjuntivo presente": "...",
     "subjuntivo imperfecto": "...",
     "imperativo": "tú形 / usted形 / nosotros形 / vosotros形 / ustedes形",
     "otros": ["Participio pasado: 过去分词", "Gerundio: 副动词"],
     "_irreg_note": "简短说明（仅拼写改音动词填写，其余不填）"
   }
   - 只填真正不规则的时态，规则时态不填
   - 不规则人称，前端会自动检测并高亮，无需额外标记。
   - ⚠️ _irreg_note：仅拼写改音动词填写，如 "拼写变化：g→j 在 a/o 前"。真正不规则动词（tener, ir, ser 等）不填此字段。规则动词 verb_forms={} 也不填。
   - 拼写改音动词（-ger/-gir → j, -car → qu, -gar → gu, -zar → c, -guir → g）属于不规则，必须填对应时态，禁止在 notas 中称之为"规则动词"。
   - ⚠️ NO escribas conjugaciones en las notas. Las conjugaciones ya se muestran en la tabla de verbo. Las notas son solo para uso, contexto, errores comunes.

10. **Nivel**: 根据词频和使用难度判断 A1/A2/B1/B2/C1/C2

11. **Idioma**: core_meaning, situations, tags, nuance.desc, notes, native_expressions.zh 用中文。word, chunks.text, related_words, native_expressions.text 用西语。

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

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
        max_tokens: 2000
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

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

    // Deduplicate highlights across chunks
    if (card.chunks && card.chunks.length) {
      const seen = new Set();
      for (const ch of card.chunks) {
        const h = (ch.highlight || '').trim();
        if (!h) continue;
        const key = h.toLowerCase();
        if (seen.has(key)) { ch.highlight = ''; }
        else { seen.add(key); }
      }
    }

    // Strip conjugation boilerplate from notes
    if (card.notes && card.notes.length) {
      const conjKeywords = ['现在时','过去时','将来时','虚拟式','命令式','过去分词','副动词',
        'presente','pretérito','futuro','subjuntivo','imperativo','participio','gerundio',
        'tengo','tienes','tuviera','conjugación','变位','规则动词','不规则动词',
        '遵循','ir 动词','er 动词','ar 动词'];
      card.notes = card.notes.filter(n => {
        const lower = n.toLowerCase();
        const hits = conjKeywords.filter(k => lower.includes(k.toLowerCase()));
        if (hits.length >= 3) return false;
        const t = n.trim();
        if (/规则动词/.test(t) && /变位/.test(t)) return false;
        if (/不规则动词/.test(t) && /变位/.test(t)) return false;
        if (/变位遵循/.test(t)) return false;
        if (/es un verbo regular/.test(lower) && /conjugación/.test(lower)) return false;
        return true;
      });
    }

    // Strip verb conjugations from related_words
    if (card.related_words && card.related_words.length) {
      card.related_words = card.related_words.filter(rw => rw.toLowerCase() !== card.word.toLowerCase());
      if (card.related_words.length && (card.type || '').startsWith('v')) {
        const stem = card.word.toLowerCase().replace(/(ar|er|ir)$/, '');
        const prefix = stem.slice(0, 3);
        const suspects = card.related_words.filter(rw => rw.toLowerCase().startsWith(prefix));
        if (suspects.length >= 3) {
          card.related_words = card.related_words.filter(rw => !rw.toLowerCase().startsWith(prefix));
        }
      }
    }

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
