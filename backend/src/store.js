const tenants = new Map();

export function getTenantStore(tenantId) {
  if (!tenants.has(tenantId)) {
    tenants.set(tenantId, {
      datasets: [],
      premises: new Map(),
      tasks: []
    });
  }
  return tenants.get(tenantId);
}
