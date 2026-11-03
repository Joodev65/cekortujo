const MODEL = 'openai/gpt-oss-20b';
const LEVELS = {
  mudah: 'MUDAH (konsep dasar SMP)',
  sedang: 'SEDANG (olimpiade tingkat kabupaten)',
  sulit: 'SULIT (olimpiade provinsi, pengecoh menjebak)',
  olimpiade: 'OLIMPIADE NASIONAL (sangat sulit, multi-langkah)'
};
const SUBJ = {
  eng: { name: 'Bahasa Inggris', lang: 'Soal dan opsi dalam Bahasa Inggris.', extra: 'Untuk materi reading, paragraph, cloze, text organization, dsb. sertakan teks (maks 130 kata) di "passage". Kosongkan "formula".', effort: 'low' },
  ipa: { name: 'IPA (Fisika, Kimia, Biologi)', lang: 'Soal dan opsi dalam Bahasa Indonesia.', extra: 'Untuk soal hitungan (fisika/kimia) tulis data "Diketahui" lengkap dengan satuan di dalam soal, dan isi "formula" dengan rumus yang relevan (teks biasa/Unicode, contoh: V = I × R). Untuk soal konsep biologi, "formula" boleh "". "passage" boleh "".', effort: 'medium' },
  mat: { name: 'Matematika', lang: 'Soal dan opsi dalam Bahasa Indonesia.', extra: 'Soal cerita/hitungan harus lengkap dengan semua data. Isi "formula" dengan rumus kunci yang dipakai (teks biasa/Unicode, contoh: Luas = ½ × a × t). Kalau soal tidak butuh rumus, isi "". "passage" boleh "". Hitung dengan teliti dan pastikan jawaban benar-benar sesuai perhitungan.', effort: 'medium' }
};

function shuffleQ(q) {
  const idx = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { ...q, options: idx.map(i => q.options[i]), answer: idx.indexOf(q.answer) };
}

function parse(text) {
  const c = String(text).replace(/```json|```/g, '');
  const data = JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1));
  return (data.questions || []).filter(q =>
    q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every(o => typeof o === 'string' || typeof o === 'number') &&
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3 && typeof q.explanation === 'string'
  ).map(q => shuffleQ({
    topic: String(q.topic || ''), passage: q.passage ? String(q.passage) : '', formula: q.formula ? String(q.formula) : '',
    question: q.question, options: q.options.map(String), answer: q.answer, explanation: q.explanation
  }));
}

async function ask(prompt, key, effort) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL, temperature: 0.7, max_completion_tokens: 9000, reasoning_effort: effort,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Kamu pembuat soal olimpiade SMP yang teliti. Balas HANYA dengan JSON valid.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).choices?.[0]?.message?.content || '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY belum diatur di Vercel.' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const sj = SUBJ[b.subject] || SUBJ.eng;
  const level = LEVELS[b.level] ? b.level : 'sedang';
  const count = Math.min(Math.max(parseInt(b.count, 10) || 10, 1), 20);
  const topics = (Array.isArray(b.topics) ? b.topics : []).map(t => String(t).slice(0, 90)).slice(0, 20);
  if (!topics.length) return res.status(400).json({ error: 'Pilih materi dulu.' });

  const prompt = `Buat ${count} soal pilihan ganda ${sj.name} untuk persiapan olimpiade siswa SMP Indonesia.
Tingkat: ${LEVELS[level]}.
Materi (bagi rata): ${topics.join('; ')}.

Aturan:
- ${sj.lang} Tiap soal tepat 4 opsi (tanpa huruf A/B/C/D), hanya 1 benar, pengecoh masuk akal.
- ${sj.extra}
- "answer" = indeks jawaban benar (0-3).
- "explanation" dalam Bahasa Indonesia: jelaskan langkah/perhitungan singkat dan kenapa jawaban benar, serta kenapa pengecoh salah.
- "topic" harus persis salah satu nama materi di daftar. Soal hanya menguji materi itu. Jangan ulangi soal mirip.

Format JSON:
{"questions":[{"topic":"","passage":"","formula":"","question":"","options":["","","",""],"answer":0,"explanation":""}]}`;

  try {
    let qs = [];
    for (let a = 0; a < 2 && !qs.length; a++) {
      try { qs = parse(await ask(prompt, key, sj.effort)); } catch (e) { if (a === 1) throw e; }
    }
    if (!qs.length) return res.status(502).json({ error: 'AI tidak mengembalikan soal valid. Coba lagi.' });
    return res.json({ questions: qs.slice(0, count) });
  } catch (e) {
    console.error('Quiz error:', e.message);
    return res.status(500).json({ error: 'Gagal membuat soal. Coba lagi sebentar.' });
  }
};
