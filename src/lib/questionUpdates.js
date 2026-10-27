// Older deployed question tables do not have updated_at. Preserve compatibility
// without swallowing authorization, validation or other database errors.
export async function updateQuestionWithTimestamp(write, changes) {
  let result = await write({ ...changes, updated_at: new Date().toISOString() })
  if (result.error?.code === 'PGRST204' && /updated_at/.test(result.error.message ?? '')) {
    result = await write(changes)
  }
  return result
}

// Legacy deployments lack the optional provider ID column. Keep the identity in
// existing JSON metadata, and retry only this specific schema-cache failure.
export async function insertQuestionsWithSourceId(write, rows) {
  const result = await write(rows)
  if (result.error?.code !== 'PGRST204' || !/['"]sdash_id['"]/.test(result.error.message ?? '')) return result
  const compatible = row => {
    const { sdash_id, ...rest } = row
    return sdash_id ? { ...rest, explanation: { ...(row.explanation ?? {}), import_source_id: sdash_id } } : rest
  }
  return write(Array.isArray(rows) ? rows.map(compatible) : compatible(rows))
}
