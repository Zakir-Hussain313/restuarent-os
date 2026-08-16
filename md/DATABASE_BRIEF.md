Restaurant Management SaaS - Database Brief
Database

PostgreSQL

ORM: Drizzle ORM

Database Philosophy

Each restaurant (tenant) gets its own dedicated server and its own dedicated database. There is no shared database between restaurants — physical isolation is the primary tenant-separation mechanism, not row-level filtering.

tenant_id still exists on every major entity and must still be used consistently in every query. Reasons it's kept even in a single-tenant database:

Some restaurant businesses have multiple legal entities or brands that may eventually share infrastructure — tenant_id keeps that door open without a schema rewrite.
It keeps application code, queries, and this schema portable if the deployment model ever changes.
It is still required for any reporting/export tooling that expects a tenant_id to be present.

Since only one tenant's data ever exists in a given database, the security priority shifts from "prevent tenant A from seeing tenant B" (not applicable here) to "prevent one role from seeing data outside its permission level within that one restaurant" — e.g. a RIDER account should never be able to read staff salary data or tenant settings, even if application code has a bug.

Core Entities
tenants

Represents the restaurant running on this deployment.

Stores:

name
branding
settings
subscription information
users

Authentication and staff records.

Roles:

super_admin
staff
rider

Stores:

tenant_id
role
name
email
phone
status
attendance

Tracks employee attendance.

Stores:

user_id
tenant_id
check_in
check_out
status
notes

Statuses:

present
absent
late
leave
half_day
menu_categories

Menu grouping.

Examples:

Burgers
Drinks
Desserts
menu_items

Stores:

category
price
availability
description
image
tax information
tables

Stores:

table_number
capacity
status
branch_id
notes (e.g. reason for out-of-service)

Statuses:

available
occupied
reserved
out_of_service

Status changes:

Automatically set to occupied / available as a side effect of order lifecycle actions (order placed against a table, order completed or cancelled) — already covered by the order audit trail, no separate log needed for these transitions.
Manual changes (staff creating/editing/deleting a table, or manually overriding a table's status — e.g. marking it out_of_service or forcing it back to available) are direct table mutations and must be logged via logAudit with resource table.
orders

Stores:

customer_phone
table
rider
order_type
order_status
totals
taxes
discounts

Order Types:

dine_in
takeaway
delivery

Statuses:

pending
confirmed
preparing
ready
out_for_delivery
completed
cancelled
order_items

Stores:

order_id
menu_item_id
quantity
price
notes
audit_logs

Tracks all important actions.

Stores:

actor
actor_name (denormalized snapshot)
resource
resource_id
action
old_value
new_value
description
timestamp
Security

Implement:

Role-Based Access Control (RBAC) — enforced in application code
Server-side validation on every write
Row Level Security (RLS) — scoped to role-based permission boundaries within a single restaurant's database, not cross-tenant isolation (each restaurant has its own database, so cross-tenant leakage is not the threat model here)
Verify whether Supabase client connections use the service role key (which bypasses RLS entirely) vs. a scoped role — RLS policies are meaningless if every server action connects with a privilege-bypassing key

Never trust client-side data.

Realtime

Use Supabase Realtime.

Realtime entities:

Orders
Tables
Attendance
Riders
Menu Availability

Channels must be scoped to this restaurant's tenant_id (kept for consistency and forward compatibility, even though only one tenant exists per database).

Offline Strategy

POS should support:

local persistence
sync queues
conflict resolution
automatic synchronization

Design offline-first where possible.

Performance Requirements

Use:

indexes
foreign keys
constraints
transactions

Optimize for:

order queries
dashboard queries
realtime updates




