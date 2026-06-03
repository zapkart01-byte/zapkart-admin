/**
 * Generates ZapKart Admin learning guide as .docx (and PDF if possible).
 * Run: node scripts/generate-learning-docx.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
  AlignmentType,
  ShadingType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'docs', 'output')
const diagramDir = path.join(root, 'docs', 'diagrams')

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

const PAGE_META = {
  LoginPage: { route: '/login', purpose: 'Super-admin sign-in with email and password.' },
  DashboardPage: { route: '/dashboard', purpose: 'KPIs, live orders, pending store KYC, map, alerts.' },
  StoresPage: { route: '/stores', purpose: 'Store directory with filters and status actions.' },
  StoreDetailPage: { route: '/stores/:id', purpose: 'Single store profile, KYC, products, stats.' },
  RidersPage: { route: '/riders', purpose: 'Rider directory with approve/suspend actions.' },
  RiderDetailPage: { route: '/riders/:id', purpose: 'Rider profile, KYC docs, deliveries, earnings.' },
  OrdersPage: { route: '/orders', purpose: 'Order list/kanban, filters, realtime updates.' },
  OrderDetailPage: { route: '/orders/:id', purpose: 'Order items, timeline, rider assign, status.' },
  ProductsPage: { route: '/products', purpose: 'Cross-store product monitoring and moderation.' },
  CategoriesPage: { route: '/categories', purpose: 'Category CRUD with drag reorder.' },
  OffersPage: { route: '/offers', purpose: 'Coupons and promotional offers.' },
  BannersPage: { route: '/banners', purpose: 'Marketing banners with image upload and ordering.' },
  AnalyticsPage: { route: '/analytics', purpose: 'Charts, date filters, CSV export.' },
  FinancePage: { route: '/finance', purpose: 'Payouts, COD reconciliation, settlements.' },
  NotificationsPage: { route: '/notifications', purpose: 'Broadcast push notifications and history.' },
  SettingsPage: { route: '/settings', purpose: 'Platform commission, fees, payout settings.' },
}

function explainLine(line) {
  const t = line.trim()
  if (t === '') return 'Blank line.'
  if (t.startsWith('//')) return `Comment: ${t.slice(2).trim()}`
  if (t.startsWith('/*') || t.startsWith('*') || t.endsWith('*/')) return 'Doc comment.'
  if (t.startsWith('import ')) {
    if (t.includes("from 'react'")) return 'Import React hooks.'
    if (t.includes('react-router')) return 'Import routing.'
    if (t.includes('lucide-react')) return 'Import icons.'
    if (t.includes('/services/')) return 'Import API/database service.'
    if (t.includes('/components/')) return 'Import UI component.'
    if (t.includes('/context/')) return 'Import auth context.'
    if (t.includes('/utils/')) return 'Import helper utilities.'
    if (t.includes('/constants/')) return 'Import constants.'
    return 'Import dependency.'
  }
  if (t.startsWith('export default')) return 'Default export (main module).'
  if (t.startsWith('export function') || t.startsWith('export async')) return 'Named export function.'
  if (t.includes('useState(')) return 'React state variable.'
  if (t.includes('useEffect(')) return 'Side effect (fetch, subscribe, redirect).'
  if (t.includes('useCallback(')) return 'Memoized callback function.'
  if (t.includes('useRef(')) return 'Ref (value without re-render).'
  if (t.includes('useNavigate(')) return 'Programmatic navigation hook.'
  if (t.includes('useAuth(')) return 'Auth state and login/logout.'
  if (t.startsWith('async function') || (t.startsWith('const') && t.includes('= async')))
    return 'Async function for network calls.'
  if (t.includes('await ')) return 'Wait for async operation.'
  if (t.includes('try {')) return 'Try block start.'
  if (t.startsWith('} catch')) return 'Catch errors.'
  if (t.includes('finally')) return 'Finally block (cleanup).'
  if (t.includes('return (')) return 'Return JSX UI.'
  if (t.includes('className=')) return 'CSS/Tailwind styling.'
  if (t.includes('onClick=') || t.includes('onSubmit=') || t.includes('onChange='))
    return 'User event handler.'
  if (t.includes('<Route')) return 'Route definition.'
  if (t.includes('toast.')) return 'Toast notification.'
  if (t.includes('navigate(')) return 'Navigate to route.'
  if (t.startsWith('<') && t.endsWith('/>')) return 'Self-closing JSX element.'
  if (t.startsWith('<')) return 'JSX element opening tag.'
  return 'Logic or UI structure — read with surrounding lines.'
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } })
}

function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } })
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 100 },
  })
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } })
}

function imageParagraph(pngPath, width = 520, height = 320) {
  if (!fs.existsSync(pngPath)) {
    return p(`[Diagram: ${path.basename(pngPath, '.png')} — see docs/diagrams/]`, { italics: true })
  }
  const data = fs.readFileSync(pngPath)
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        type: 'png',
        data,
        transformation: { width, height },
      }),
    ],
  })
}

function cell(text, header = false, width = 2000, mono = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: 'E8EEF7', type: ShadingType.CLEAR } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text || ' ',
            bold: header,
            font: mono ? 'Consolas' : 'Calibri',
            size: header ? 20 : 18,
          }),
        ],
      }),
    ],
  })
}

function lineTable(lines) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell('Line', true, 800),
        cell('Code', true, 3200),
        cell('Explanation', true, 3600),
      ],
    }),
  ]

  lines.forEach((line, i) => {
    const code = line.length > 120 ? line.slice(0, 117) + '...' : line || ' '
    rows.push(
      new TableRow({
        children: [
          cell(String(i + 1), false, 800),
          cell(code, false, 3200, true),
          cell(explainLine(line), false, 3600),
        ],
      })
    )
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

function renderDiagrams() {
  fs.mkdirSync(diagramDir, { recursive: true })
  const mmds = ['architecture', 'auth-flow', 'routes', 'folder-structure']
  for (const name of mmds) {
    const mmd = path.join(diagramDir, `${name}.mmd`)
    const png = path.join(diagramDir, `${name}.png`)
    if (!fs.existsSync(mmd)) continue
    try {
      execSync(`npx --yes @mermaid-js/mermaid-cli@11.4.0 -i "${mmd}" -o "${png}" -b white -w 1200`, {
        cwd: root,
        stdio: 'pipe',
        timeout: 180000,
      })
      console.log('Diagram:', png)
    } catch {
      console.warn('Mermaid CLI failed for', name)
    }
  }
}

async function buildDocument() {
  const children = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 400 },
      children: [new TextRun({ text: 'ZapKart Admin', bold: true, size: 56, color: '1E40AF' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Complete Code Learning Guide', size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: 'Line-by-line explanations • Architecture diagrams • Test plan',
          size: 22,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, size: 20, color: '666666' }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  )

  children.push(h1('1. Introduction'))
  children.push(
    p(
      'ZapKart Admin is a React single-page application (SPA) for managing a quick-commerce platform: stores, riders, orders, products, finance, and more.'
    )
  )
  children.push(h2('1.1 Tech stack'))
  children.push(bullet('React 19 — UI components'))
  children.push(bullet('Vite — build tool and dev server'))
  children.push(bullet('React Router — page URLs (/login, /orders, etc.)'))
  children.push(bullet('Tailwind CSS — styling via className'))
  children.push(bullet('Firebase Auth — email/password login'))
  children.push(bullet('Supabase — PostgreSQL database (admins, orders, stores)'))
  children.push(bullet('MapLibre — maps on dashboard'))
  children.push(h2('1.2 How the app starts'))
  children.push(bullet('Browser loads index.html → empty div#root'))
  children.push(bullet('main.jsx checks .env variables'))
  children.push(bullet('App.jsx sets up routes and auth'))
  children.push(bullet('User sees LoginPage or Dashboard depending on login state'))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  children.push(h1('2. Architecture diagrams'))
  children.push(h2('2.1 System architecture'))
  children.push(imageParagraph(path.join(diagramDir, 'architecture.png'), 560, 420))
  children.push(
    p('The browser loads React. Pages call Supabase/API. Login uses Firebase first, then Supabase verifies admin role.')
  )
  children.push(h2('2.2 Login flow (sequence)'))
  children.push(imageParagraph(path.join(diagramDir, 'auth-flow.png'), 560, 380))
  children.push(h2('2.3 App routes'))
  children.push(imageParagraph(path.join(diagramDir, 'routes.png'), 560, 300))
  children.push(h2('2.4 Folder structure'))
  children.push(imageParagraph(path.join(diagramDir, 'folder-structure.png'), 560, 360))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  children.push(h1('3. All admin pages'))
  const routeRows = [
    new TableRow({
      tableHeader: true,
      children: [cell('URL', true), cell('File', true), cell('Purpose', true)],
    }),
  ]
  for (const [name, meta] of Object.entries(PAGE_META)) {
    routeRows.push(
      new TableRow({
        children: [cell(meta.route), cell(`src/pages/${name}.jsx`), cell(meta.purpose)],
      })
    )
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: routeRows }))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  children.push(h1('4. TestSprite — what to run next'))
  children.push(
    p('After TC001 and TC002 (login) pass, run tests in batches of 3–5 with npm run preview on port 5173.')
  )
  ;[
    ['TC003–TC005', 'Logout and protected routes'],
    ['TC008, TC014, TC018', 'Dashboard and sidebar'],
    ['TC009–TC012, TC020, TC026', 'Orders module'],
    ['TC015, TC021, TC023, TC027', 'Stores module'],
    ['TC019, TC024, TC025', 'Riders module'],
    ['TC013, TC016, TC017, TC022', 'Finance module'],
  ].forEach(([ids, desc]) => children.push(bullet(`${ids}: ${desc}`)))

  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(h1('5. Line-by-line source code reference'))
  children.push(
    p('Every line of each core file and page is listed below with a short explanation.')
  )

  for (const rel of FILES) {
    const abs = path.join(root, rel)
    if (!fs.existsSync(abs)) continue
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/)
    const base = path.basename(rel, path.extname(rel))
    const meta = PAGE_META[base]

    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(h2(`${base} (${rel})`))
    children.push(p(`Total lines: ${lines.length}`))
    if (meta) {
      children.push(p(`Route: ${meta.route}`))
      children.push(p(`Purpose: ${meta.purpose}`))
    }
    children.push(lineTable(lines))
  }

  const doc = new Document({
    creator: 'ZapKart Admin Learning Generator',
    title: 'ZapKart Admin Code Learning Guide',
    description: 'Line-by-line code guide with architecture diagrams',
    sections: [{ properties: {}, children }],
  })

  fs.mkdirSync(outDir, { recursive: true })
  const docxPath = path.join(outDir, 'ZapKart-Admin-Learning-Guide.docx')
  fs.writeFileSync(docxPath, await Packer.toBuffer(doc))
  console.log('Created:', docxPath)
  return docxPath
}

console.log('Rendering diagrams...')
renderDiagrams()
console.log('Building Word document (may take 1–2 minutes)...')
buildDocument().catch((err) => {
  console.error(err)
  process.exit(1)
})
