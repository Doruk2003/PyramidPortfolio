import { loadEnv } from 'vite'

// Read-only checks. Never print the URL, API key, user data, or server error bodies.
const env = loadEnv('development', process.cwd(), 'VITE_')
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Supabase URL veya public anahtar eksik.')
  process.exit(1)
}
let publicKey = key.startsWith('sb_publishable_')
try {
  publicKey ||=
    JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role === 'anon'
} catch {
  /* A publishable key is not a JWT. */
}
if (!publicKey) {
  console.error('Yalnızca publishable/anon anahtar kullanılabilir.')
  process.exit(1)
}
async function read(path) {
  const response = await fetch(new URL(path, url), {
    headers: {
      apikey: key,
      ...(key.startsWith('sb_publishable_') ? {} : { Authorization: `Bearer ${key}` }),
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}
try {
  const settings = await read('/auth/v1/settings')
  const categories = await read('/rest/v1/categories?select=id,slug&order=id')
  const projects = await read(
    '/rest/v1/projects?select=id,request_id,created_by,title,slug,version,updated_at,description,location,year,status,created_at,categories:project_categories(category:categories(id,name,slug)),media:project_media(id,project_id,kind,object_path,position)&limit=1',
  )
  const expected = [
    'bioclimatic-sistemleri',
    'tente-ve-golgelendirme',
    'cam-tavan-sistemleri',
    'giyotin-sistemleri',
    'isicamli-surme-sistemleri',
    'cam-balkon-sistemleri',
    'ruzgar-kirici-sistemleri',
  ]
  const categoriesValid =
    Array.isArray(categories) &&
    expected.every((slug) => categories.some((item) => item.slug === slug))
  console.log(
    JSON.stringify(
      {
        signupDisabled: settings.disable_signup === true,
        categoriesReady: categoriesValid,
        projectRelationsReadable: Array.isArray(projects),
        dataSource: env.VITE_DATA_SOURCE || 'example',
      },
      null,
      2,
    ),
  )
  if (settings.disable_signup !== true || !categoriesValid || !Array.isArray(projects))
    process.exitCode = 1
} catch (error) {
  const reason =
    error instanceof Error && /^HTTP \d+$/.test(error.message)
      ? error.message
      : 'Bağlantı sağlanamadı'
  console.error(`Doğrulama tamamlanamadı: ${reason}. Migration ve proje bağlantısını kontrol edin.`)
  process.exitCode = 1
}
