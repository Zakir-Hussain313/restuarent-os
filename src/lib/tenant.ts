export function getTenantId(): string {
  const tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    throw new Error(
      "TENANT_ID is not set. This deployment cannot serve public ordering requests without it."
    );
  }
  return tenantId;
}