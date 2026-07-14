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
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Gemini error')
  return data
}
