import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as phone from '../src/lib/auth/phone.js'

const source = new SourceTextModule(await readFile(new URL('../src/lib/server/adminStudents.js', import.meta.url), 'utf8'))
await source.link(() => new SyntheticModule(Object.keys(phone), function () {
  for (const [key, value] of Object.entries(phone)) this.setExport(key, value)
}))
await source.evaluate()
const { shapeStudent, searchText } = source.namespace

test('real email contact survives shaping for list and details', () => {
 const student = shapeStudent({id:'student', email:'student@example.com', full_name:' Ada ', state:'free'})
 assert.equal(student.email,'student@example.com')
 assert.equal(student.name,'Ada')
})
test('phone login keeps phone but hides synthetic email', () => {
 const student=shapeStudent({id:'phone-student',email:'2348012345678@phone.examprep.ng',phone_number:'+2348012345678',state:'trial'})
 assert.equal(student.email,null)
 assert.equal(student.phone,'+2348012345678')
})
test('anonymous identity remains identifiable without fabricated contact', () => {
 const guest=shapeStudent({id:'guest-identity',state:'anonymous',created_at:'2026-10-20T12:00:00Z'})
 assert.equal(guest.id,'guest-identity')
 assert.equal(guest.state,'anonymous')
 assert.equal(guest.joined,'2026-10-20T12:00:00Z')
 assert.equal(guest.email,null)
 assert.equal(guest.phone,null)
})
test('email search stays intact while phone search is normalized', () => {
 assert.equal(searchText(' student@example.com '),'student@example.com')
 assert.equal(searchText('0801 234 5678'),'8012345678')
})
