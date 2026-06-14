// NODE_ID_REGEX enforces the narration-slug::node-id format.
// Both halves are lowercase alphanumeric words joined by single hyphens.
export const NODE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidNodeId(id) {
  return typeof id === 'string' && NODE_ID_REGEX.test(id)
}

export function parseNodeId(id) {
  const sep = id.indexOf('::')
  if (sep === -1) return { slug: '', localId: id }
  return { slug: id.slice(0, sep), localId: id.slice(sep + 2) }
}

export function buildNodeId(slug, localId) {
  return `${slug}::${localId}`
}
