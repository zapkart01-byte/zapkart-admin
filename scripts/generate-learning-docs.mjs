/**
 * Generates line-by-line learning markdown for src files.
 * Run: node scripts/generate-learning-docs.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'docs', 'line-by-line')

const FILES = [
  'src/main.jsx',
  'src/App.jsx',
  'src/context/AuthContext.jsx',
  'src/services/authService.js',
  'src/services/firebase.js',
  'src/services/supabase.js',
  'src/constants/routes.js',
  'src/components/layout/PageLayout.jsx',
  'src/components/layout/Sidebar.jsx',
  'src/components/layout/TopBar.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/DashboardPage.jsx',
  'src/pages/StoresPage.jsx',
  'src/pages/StoreDetailPage.jsx',
  'src/pages/RidersPage.jsx',
  'src/pages/RiderDetailPage.jsx',
  'src/pages/OrdersPage.jsx',
  'src/pages/OrderDetailPage.jsx',
  'src/pages/ProductsPage.jsx',
  'src/pages/CategoriesPage.jsx',
  'src/pages/OffersPage.jsx',
  'src/pages/BannersPage.jsx',
  'src/pages/AnalyticsPage.jsx',
  'src/pages/FinancePage.jsx',
  'src/pages/NotificationsPage.jsx',
  'src/pages/SettingsPage.jsx',
]

function explainLine(line, lineNum, filePath) {
  const t = line.trim()
  if (t === '') return 'Blank line (spacing for readability).'
  if (t.startsWith('//')) return `Comment: ${t.slice(2).trim()}`
  if (t.startsWith('/*') || t.startsWith('*') || t.endsWith('*/')) return 'Documentation comment block.'
  if (t.startsWith('import ')) {
    if (t.includes("from 'react'")) return 'Import React hooks or core API.'
    if (t.includes('react-router')) return 'Import routing (links, navigation, routes).'
    if (t.includes('lucide-react')) return 'Import icon component(s) for UI.'
    if (t.includes('../services/')) return 'Import service function(s) that talk to API/database.'
    if (t.includes('../components/')) return 'Import reusable UI component.'
    if (t.includes('../context/')) return 'Import auth context hook or provider.'
    if (t.includes('../utils/')) return 'Import helper (formatting, validation, etc.).'
    if (t.includes('../constants/')) return 'Import shared constants (routes, statuses).'
    return 'Import a dependency used in this file.'
  }
  if (t.startsWith('export default')) return 'Default export — this is the main component/module other files import.'
  if (t.startsWith('export function') || t.startsWith('export async')) return 'Named export — function available to other files.'
  if (t.includes('useState(')) return 'React state: value that changes and re-renders the UI when updated.'
  if (t.includes('useEffect(')) return 'Side effect: runs after render (fetch data, subscribe, redirect).'
  if (t.includes('useCallback(')) return 'Memoized function — stable reference between renders.'
  if (t.includes('useRef(')) return 'Mutable ref — holds value without causing re-render.'
  if (t.includes('useNavigate(')) return 'Hook to programmatically change URL (e.g. after login).'
  if (t.includes('useAuth(')) return 'Read login state and login/logout functions from AuthContext.'
  if (t.startsWith('async function') || t.startsWith('const') && t.includes('= async'))
    return 'Async function — can use await for network calls.'
  if (t.includes('await ')) return 'Wait for async operation (API, login, database) to finish.'
  if (t.includes('try {')) return 'Start try block — handle errors in catch.'
  if (t === '} catch' || t.startsWith('} catch')) return 'Catch errors from try block.'
  if (t.includes('finally')) return 'Runs whether try succeeded or failed (e.g. turn off loading).'
  if (t.includes('return (')) return 'Start of JSX returned to browser.'
  if (t.includes('className=')) return 'Tailwind/CSS classes for styling this element.'
  if (t.includes('onClick=') || t.includes('onSubmit=') || t.includes('onChange='))
    return 'Event handler — runs when user clicks/submits/changes input.'
  if (t.includes('<Route')) return 'React Router: maps URL path to a page component.'
  if (t.includes('toast.')) return 'Show popup notification to user.'
  if (t.includes('navigate(')) return 'Navigate to another route in the app.'
  if (t.startsWith('<') && t.endsWith('/>')) return 'Self-closing JSX element (component or HTML tag).'
  if (t.startsWith('<')) return 'Opening JSX tag — starts a UI element.'
  if (t === ')' || t === ');') return 'Close expression or return statement.'
  if (t === '}' || t === '},' || t === '})') return 'Close block (function, object, JSX expression).'
  return 'Code line — part of logic or UI structure; read with surrounding lines for full meaning.'
}

function generateDoc(relPath) {
  const abs = path.join(root, relPath)
  if (!fs.existsSync(abs)) return null
  const content = fs.readFileSync(abs, 'utf8')
  const lines = content.split(/\r?\n/)
  const base = path.basename(relPath, path.extname(relPath))
  const title = base

  let md = `# ${title} — Line-by-line\n\n`
  md += `**Source:** \`${relPath}\`  \n`
  md += `**Lines:** ${lines.length}  \n\n`
  md += `> Auto-generated learning reference. Read top to bottom like the source file.\n\n`
  md += `---\n\n`

  lines.forEach((line, i) => {
    const n = i + 1
    const exp = explainLine(line, n, relPath)
    md += `### Line ${n}\n\n`
    md += '```javascript\n'
    md += line === '' ? '\n' : line + '\n'
    md += '```\n\n'
    md += `**What it does:** ${exp}\n\n`
  })

  return { base, md }
}

fs.mkdirSync(outDir, { recursive: true })

const index = ['# ZapKart Admin — Line-by-line learning index\n']
index.push('\nOpen any file below. Each line of source code is shown with a short explanation.\n')
index.push('\n## Test plan (after TC001 & TC002)\n')
index.push('See [TEST-NEXT-STEPS.md](./TEST-NEXT-STEPS.md)\n')
index.push('\n## Core & layout\n')

for (const rel of FILES) {
  const result = generateDoc(rel)
  if (!result) continue
  const outPath = path.join(outDir, `${result.base}.md`)
  fs.writeFileSync(outPath, result.md, 'utf8')
  index.push(`- [${result.base}](./line-by-line/${result.base}.md) — \`${rel}\``)
  console.log('Wrote', outPath)
}

index.push('\n## How to use\n')
index.push('1. Start with `main`, `App`, `AuthContext`, `LoginPage`.\n')
index.push('2. Read `PageLayout`, `Sidebar`, `TopBar`.\n')
index.push('3. Pick one feature page (e.g. `OrdersPage`) and its service file in `src/services/`.\n')

fs.writeFileSync(path.join(root, 'docs', 'LEARNING_GUIDE.md'), index.join('\n'), 'utf8')
console.log('Wrote docs/LEARNING_GUIDE.md')
