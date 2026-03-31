function requireEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} must be configured`)
  }

  return value
}

function getAuthConfig() {
  return {
    adminUsername: requireEnv('ADMIN_USERNAME'),
    adminPassword: requireEnv('ADMIN_PASSWORD'),
    jwtSecret: requireEnv('JWT_SECRET'),
  }
}

module.exports = {
  requireEnv,
  getAuthConfig,
}
