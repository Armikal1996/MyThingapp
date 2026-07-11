/**
 * Voice phrase checklist for live mic validation (Phase 3).
 * Run: node scripts/verifyVoicePhrases.js
 */

const PHRASES = [
  { id: 1, text: 'Add an event on the 19th to pay rent and set a reminder the day before', category: 'agent-calendar' },
  { id: 2, text: 'Open game-marketplace in Cursor', category: 'agent-os' },
  { id: 3, text: 'Update Elden Ring to playing on Steam with 120 hours', category: 'agent-media' },
  { id: 4, text: 'Create a task to fix the launcher scroll bug', category: 'agent-task' },
  { id: 5, text: "What's on my calendar next week?", category: 'chat' },
  { id: 6, text: 'Mark Cyberpunk 2077 as completed', category: 'agent-media' },
  { id: 7, text: 'Start the game-marketplace app', category: 'agent-os' },
  { id: 8, text: 'Open folder for mything project', category: 'agent-os' },
  { id: 9, text: 'Add reminder tomorrow at 9 AM to call dentist', category: 'agent-calendar' },
  { id: 10, text: 'Set Elden Ring status to playing platform Steam', category: 'agent-media' },
  { id: 11, text: 'Plan my week across tasks and calendar', category: 'chat' },
  { id: 12, text: 'What should I play or watch next?', category: 'chat' },
  { id: 13, text: 'Pay rent on July nineteenth with reminder', category: 'agent-calendar' },
  { id: 14, text: 'Complete info about Elden Ring in Media', category: 'agent-media' },
  { id: 15, text: 'Open the game marketplace repo in cursor', category: 'agent-os' }
]

console.log('MyThing Voice Validation Checklist\n')
console.log('Instructions:')
console.log('1. Open MyThing desktop → AI Chat → Agent mode ON')
console.log('2. For each phrase: tap Voice, speak, tap Stop')
console.log('3. Score transcript: E=Exact, U=Usable (minor edit), B=Broken')
console.log('4. Pass if ≥12/15 are E or U\n')
console.log('--- Phrases ---\n')

for (const p of PHRASES) {
  console.log(`${String(p.id).padStart(2)}. [${p.category}]`)
  console.log(`    Say: "${p.text}"`)
  console.log('    Score: ___\n')
}

const agentCount = PHRASES.filter(p => p.category.startsWith('agent')).length
console.log(`Total: ${PHRASES.length} phrases (${agentCount} agent-specific)`)
console.log('\nAlso verify:')
console.log('- Transcript fills composer (does NOT auto-send)')
console.log('- Speech status chip shows "ready" after first download')
console.log('- Browser preview: Voice button disabled')
console.log('- Latency <5s for ~10s recording on your PC')
