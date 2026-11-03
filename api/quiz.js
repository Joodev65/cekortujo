const MODEL = 'openai/gpt-oss-20b';
const LEVELS = {
  mudah: 'MUDAH (konsep dasar SMP, 1-2 langkah)',
  sedang: 'SEDANG (olimpiade tingkat kabupaten, 2-3 langkah)',
  sulit: 'SULIT (olimpiade provinsi, 3-4 langkah, pengecoh menjebak)',
  olimpiade: 'OLIMPIADE NASIONAL (sangat sulit, 4+ langkah, banyak informasi pengalih, pengecoh sangat dekat)'
};
const MIX = { mudah: 30, sedang: 50, sulit: 70, olimpiade: 85 };

function story(level, key) {
  const ctx = key === 'eng'
    ? 'teks atau skenario berbahasa Inggris (cerita, email, dialog, pengumuman, artikel) yang pertanyaannya menuntut inferensi dan pemahaman, bukan sekadar mencari kata. Taruh teksnya di "passage"'
    : key === 'ipa'
      ? 'skenario percobaan atau kejadian sehari-hari yang harus dianalisis (data pengukuran, tabel hasil percobaan, kasus nyata). Taruh ceritanya langsung di "question"'
      : 'soal cerita kontekstual (uang, jarak-waktu, usia, rata-rata, bangun datar, perbandingan, dsb.). Taruh ceritanya langsung di "question"';
  return `KOMPOSISI SOAL: sekitar ${MIX[level]}% soal berbentuk ${ctx}. Variasikan panjangnya: cerita PANJANG (80-150 kata, multi-langkah, banyak data dan informasi pengalih), cerita SEDANG (2-4 kalimat), dan cerita PENDEK (1-2 kalimat). Sisanya soal singkat: pengertian/konsep berbasis kasus, "pernyataan mana yang benar/salah", membaca tabel data, atau analisis. Jangan membuat soal satu langkah yang trivial. Pengecoh harus berasal dari kesalahan konsep atau hitung yang umum, dengan nilai/pilihan yang mirip. Tingkat kesulitan harus benar-benar menantang untuk level ${level}. Pisahkan paragraf cerita panjang dengan baris baru.`;
}

const MATH = `Tulis SEMUA ekspresi matematika/rumus dengan LaTeX di antara tanda dolar tunggal, contoh: $\\frac{3}{4}$, $x^{2}$, $\\sqrt{49}$, $v = \\frac{s}{t}$, $15 \\times 4$, $12\\ \\text{cm}$. Karena balasanmu adalah JSON, SETIAP backslash LaTeX WAJIB ditulis ganda: \\\\frac, \\\\times, \\\\sqrt, \\\\text. Untuk ≠, ≤, ≥, °, ² pakai karakter Unicode langsung (jangan \\\\neq). Angka biasa tanpa operasi boleh ditulis biasa tanpa $.`;

function subj(key, mode) {
  const prac = mode === 'practice';
  if (key === 'ipa' || key === 'mat') {
    const name = key === 'ipa' ? 'IPA (Fisika, Kimia, Biologi)' : 'Matematika';
    const data = key === 'ipa'
      ? 'Untuk soal hitungan tulis data "Diketahui" lengkap dengan satuan di dalam soal. Soal konsep biologi tidak perlu hitungan.'
      : 'Soal cerita/hitungan harus lengkap dengan semua data di dalam soal. Hitung dengan teliti dan pastikan jawaban benar-benar sesuai hasil perhitungan.';
    const formula = prac
      ? '"formula": rumus kunci yang dipakai dalam LaTeX, contoh "$L = \\\\frac{1}{2} \\\\times a \\\\times t$" (boleh beberapa rumus dipisah koma). Kosongkan "" jika soal tidak butuh rumus.'
      : '"formula": WAJIB "" (ini mode ujian: jangan memberi rumus/petunjuk apa pun).';
    return {
      name, lang: 'Soal dan opsi dalam Bahasa Indonesia.', effort: 'medium',
      extra: `${data}\n- ${MATH}\n- ${formula}\n- "passage" boleh "".`
    };
  }
  return {
    name: 'Bahasa Inggris', lang: 'Soal dan opsi dalam Bahasa Inggris.', effort: 'low',
    extra: 'Untuk materi reading, paragraph, cloze, text organization, dsb. sertakan teks (maks 130 kata) di "passage". "formula" WAJIB "".'
  };
}

const fixJSON = s => s.replace(/\\\\|\\(?=[bfrt][a-zA-Z])|\\(?!["\\\/bfnrtu])/g, m => (m === '\\\\' ? m : '\\\\'));

function shuffleQ(q) {
  const idx = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { ...q, options: idx.map(i => q.options[i]), answer: idx.indexOf(q.answer) };
}

function parse(text, keepFormula) {
  const c = String(text).replace(/```json|```/g, '');
  const data = JSON.parse(fixJSON(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1)));
  return (data.questions || []).filter(q =>
    q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every(o => typeof o === 'string' || typeof o === 'number') &&
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3 && typeof q.explanation === 'string'
  ).map(q => shuffleQ({
    topic: String(q.topic || ''), passage: q.passage ? String(q.passage) : '',
    formula: keepFormula && q.formula ? String(q.formula) : '',
    question: q.question, options: q.options.map(String), answer: q.answer, explanation: q.explanation
  }));
}

async function ask(prompt, key, effort) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL, temperature: 0.7, max_completion_tokens: 14000, reasoning_effort: effort,
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
  const mode = b.mode === 'practice' ? 'practice' : 'quiz';
  const sj = subj(b.subject, mode);
  const level = LEVELS[b.level] ? b.level : 'sedang';
  const count = Math.min(Math.max(parseInt(b.count, 10) || 10, 1), 20);
  const topics = (Array.isArray(b.topics) ? b.topics : []).map(t => String(t).slice(0, 90)).slice(0, 20);
  if (!topics.length) return res.status(400).json({ error: 'Pilih materi dulu.' });
  const isMath = b.subject === 'ipa' || b.subject === 'mat';

  const prompt = `Buat ${count} soal pilihan ganda ${sj.name} untuk persiapan olimpiade siswa SMP Indonesia.
Tingkat: ${LEVELS[level]}.
Materi (bagi rata): ${topics.join('; ')}.

Aturan:
- ${story(level, b.subject)}
- ${sj.lang} Tiap soal tepat 4 opsi (tanpa huruf A/B/C/D), hanya 1 benar, pengecoh masuk akal (misalnya hasil dari kesalahan hitung umum).
- ${sj.extra}
- "answer" = indeks jawaban benar (0-3).
- "explanation" dalam Bahasa Indonesia, rapi dan bertahap, pisahkan dengan baris baru:${isMath ? '\n  Langkah 1: (data/rumus) \\n Langkah 2: (substitusi dan hitung) \\n Langkah 3: (hasil akhir) \\n Jawaban: ... \\n Kenapa pengecoh salah: ... (gunakan LaTeX seperti aturan di atas)' : '\n  Jawaban benar dan alasannya, lalu kenapa tiap pengecoh salah.'}
- "topic" harus persis salah satu nama materi di daftar. Soal hanya menguji materi itu. Jangan ulangi soal mirip.

Format JSON:
{"questions":[{"topic":"","passage":"","formula":"","question":"","options":["","","",""],"answer":0,"explanation":""}]}`;

  try {
    let qs = [];
    for (let a = 0; a < 2 && !qs.length; a++) {
      try { qs = parse(await ask(prompt, key, sj.effort), mode === 'practice'); } catch (e) { if (a === 1) throw e; }
    }
    if (!qs.length) return res.status(502).json({ error: 'AI tidak mengembalikan soal valid. Coba lagi.' });
    return res.json({ questions: qs.slice(0, count) });
  } catch (e) {
    console.error('Quiz error:', e.message);
    return res.status(500).json({ error: 'Gagal membuat soal. Coba lagi sebentar.' });
  }
};
