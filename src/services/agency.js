import agencyConfig from '../../config/agency-roles.json'

export function getAgencyRoles() {
  return agencyConfig.roles
}

export function getAgencyRole(id) {
  return agencyConfig.roles.find(r => r.id === id) || agencyConfig.roles[0]
}

export function systemPromptForRole(roleId) {
  return getAgencyRole(roleId)?.systemPrompt || getAgencyRole('general').systemPrompt
}

export function modelKeyForAgencyRole(roleId) {
  return getAgencyRole(roleId)?.modelKey || 'gemma'
}
