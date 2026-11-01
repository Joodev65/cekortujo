// Vercel Serverless Function: POST /api/quiz
// Tidak butuh express / dotenv / node-fetch (Node 18+ sudah punya fetch).
const MODEL = 'openai/gpt-oss-20b';
const LEVELS = {
  mudah: 'MUDAH (setara SMP kelas 7-8, konsep dasar)',
  sedang: 'SEDANG (setara SMP kelas 9 / olimpiade tingkat kabupaten)',
  sulit: 'SULIT (olimpiade tingkat provinsi, ada distraktor yang menjebak)',
  olimpiade: 'OLIMPIADE NASIONAL (sangat sulit, nuansa halus, jebakan tingkat tinggi)'
};

function shuffleQuestion(q) {
  const idx = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return {
    ...q,
    options: idx.map(i => q.options[i]),
    answer: idx.indexOf(q.answer)
  };
}

function parseQuestions(text) {
  const clean = String(text).replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  const data = JSON.parse(clean.slice(start, end + 1));
  return (data.questions || [])
    .filter(q =>
      q && typeof q.question === 'string' &&
      Array.isArray(q.options) && q.options.length === 4 &&
      q.options.every(o => typeof o === 'string') &&
      Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3 &&
      typeof q.explanation === 'string')
    .map(q => shuffleQuestion({
      topic: String(q.topic || ''),
      passage: q.passage ? String(q.passage) : '',
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation
    }));
}

async function askGroq(prompt, key) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
      max_completion_tokens: 8000,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Kamu pembuat soal olimpiade Bahasa Inggris. Balas HANYA dengan JSON valid.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY belum diatur di Vercel (Settings > Environment Variables).' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const level = LEVELS[body.level] ? body.level : 'sedang';
  const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 1), 20);
  const topics = (Array.isArray(body.topics) ? body.topics : [])
    .map(t => String(t).slice(0, 80)).slice(0, 20);
  if (!topics.length) return res.status(400).json({ error: 'Pilih minimal satu materi.' });

  const prompt = `Buat ${count} soal pilihan ganda Bahasa Inggris untuk persiapan olimpiade siswa Indonesia.
Tingkat kesulitan: ${LEVELS[level]}.
Materi (bagi rata, boleh bervariasi): ${topics.join('; ')}.

Aturan:
- Soal dan opsi dalam Bahasa Inggris. Tiap soal tepat 4 opsi (tanpa huruf A/B/C/D di depan opsi).
- Hanya 1 jawaban benar, opsi lain harus masuk akal sebagai pengecoh. Pastikan jawabannya 100% benar secara kebahasaan.
- Untuk materi reading / text types / cloze / dialogue, sertakan teks pendek (maks 120 kata) di field "passage". Selain itu "passage" boleh "".
- "answer" = indeks jawaban benar (0-3).
- "explanation" dalam Bahasa Indonesia santai, 2-4 kalimat: jelaskan kenapa jawaban benar itu benar dan kenapa opsi lain salah.
- "topic" = nama materi soal tersebut.
- WAJIB: setiap soal hanya boleh menguji materi dari daftar di atas, jangan keluar dari materi itu. Field "topic" harus persis salah satu nama materi di daftar.
- Jangan ulangi soal yang mirip.

Format JSON persis:
{"questions":[{"topic":"","passage":"","question":"","options":["","","",""],"answer":0,"explanation":""}]}`;

  try {
    let qs = [];
    for (let attempt = 0; attempt < 2 && qs.length < 1; attempt++) {
      try { qs = parseQuestions(await askGroq(prompt, key)); }
      catch (e) { if (attempt === 1) throw e; }
    }
    if (!qs.length) return res.status(502).json({ error: 'AI tidak mengembalikan soal valid. Coba lagi.' });
    return res.json({ questions: qs.slice(0, count) });
  } catch (e) {
    console.error('Quiz error:', e.message);
    return res.status(500).json({ error: 'Gagal membuat soal. Coba lagi sebentar.' });
  }
};
