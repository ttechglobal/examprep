import test from 'node:test'
import assert from 'node:assert/strict'
import { createComputerOpponent } from '../src/lib/battleAI.js'

test('computer returns the actual option for letter, index, and text answer keys', () => {
  for (const answer of ['B',1,'four']) {
    const question = {options:{D:'six',B:'four',A:'three',C:'five'},correct_answer:answer}
    assert.equal(createComputerOpponent('easy',()=>0).decide(question),'four')
    const pick = createComputerOpponent('easy',()=>0.9).decide(question)
    assert.notEqual(pick,'four')
    assert.ok(['three','five','six'].includes(pick))
  }
})

test('object options keep their display text as the computer selection', () => {
  assert.equal(createComputerOpponent('easy',()=>0).decide({options:[{text:'three'},{text:'four'}],correct_answer:'B'}),'four')
})
