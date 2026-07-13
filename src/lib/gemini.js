const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function geminiGenerate(contents, model = 'gemini-2.5-flash') {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ contents, model }),
  })
  return res.json()
}
