import { readFile, mkdir, writeFile } from 'node:fs/promises'

// The Dashboard editor can deploy a single index.ts. Generate that artifact
// from the maintained modules so the two deployment methods never drift.
const source = new URL('../src/supabase/functions/send-notifications/', import.meta.url)
const output = new URL('../src/supabase/deploy/send-notifications.ts', import.meta.url)
const [personalization, messages, index] = await Promise.all(
  ['personalization.js', 'messages.ts', 'index.ts'].map(name => readFile(new URL(name, source), 'utf8')),
)
const messageExport = "export { fillName } from './personalization.js'"
const messageImport = "import { buildMessage, lagosWeekday, lagosDayNumber, userKey, fillName, type Context, type Slot } from './messages.ts'"
const versionImport = "import { PERSONALIZATION_VERSION } from './personalization.js'"
for (const [text, expected] of [[messages, messageExport], [index, messageImport], [index, versionImport]]) {
  if (!text.includes(expected)) throw new Error(`Source changed; update the deployment generator: ${expected}`)
}
const artifact = '// GENERATED: run node scripts/prepare-notification-deploy.mjs to refresh.\n'
  + '// Supabase Dashboard: paste this entire file into send-notifications/index.ts.\n'
  + '// Includes all local dependencies; keep JWT verification disabled.\n\n'
  + personalization + '\n' + messages.replace(messageExport, '') + '\n'
  + index.replace(messageImport, '').replace(versionImport, '')
if (/^(?:import|export).*from\s+['"]\./m.test(artifact)) throw new Error('Artifact still imports a local file')
if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== artifact) throw new Error('Deployment artifact is stale; regenerate it')
  console.log('Notification deployment artifact is current')
} else {
  await mkdir(new URL('.', output), { recursive: true })
  await writeFile(output, artifact)
  console.log('Prepared src/supabase/deploy/send-notifications.ts for the Supabase Dashboard')
}
