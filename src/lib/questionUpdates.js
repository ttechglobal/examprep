// Older deployed question tables do not have updated_at. Preserve compatibility
// without swallowing authorization, validation or other database errors.
export async function updateQuestionWithTimestamp(write, changes) {
  let result = await write({ ...changes, updated_at: new Date().toISOString() })
  if (result.error?.code === 'PGRST204' && /updated_at/.test(result.error.message ?? '')) {
    result = await write(changes)
  }
  return result
}
