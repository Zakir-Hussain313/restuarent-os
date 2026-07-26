# Restaurant Management SaaS - Database Brief

## Database

PostgreSQL

ORM:
Drizzle ORM

---

## Database Philosophy

The database is designed around multi-tenancy.

Every major business entity must belong to a tenant.

Use:

tenant_id

for all tenant-owned entities.

---

## Core Entities

### tenants

Represents restaurants.

Stores:

* name
* branding
* settings
* subscription information

---

### users

Authentication and staff records.

Roles:

* super_admin
* staff
* rider

Stores:

* tenant_id
* role
* name
* email
* phone
* status

---

### attendance

Tracks employee attendance.

Stores:

* user_id
* tenant_id
* check_in
* check_out
* status
* notes

Statuses:

* present
* absent
* late
* leave
* half_day

---

### menu_categories

Menu grouping.

Examples:

* Burgers
* Drinks
* Desserts

---

### menu_items

Stores:

* category
* price
* availability
* description
* image
* tax information

---

### tables

Stores:

* table_number
* capacity
* status

Statuses:

* available
* occupied
* reserved

---

### orders

Stores:

* customer_phone
* table
* rider
* order_type
* order_status
* totals
* taxes
* discounts

Order Types:

* dine_in
* takeaway
* delivery

Statuses:

* pending
* confirmed
* preparing
* ready
* out_for_delivery
* completed
* cancelled

---

### order_items

Stores:

* order_id
* menu_item_id
* quantity
* price
* notes

---

### audit_logs

Tracks all important actions.

Stores:

* actor
* actor_name (denormalized snapshot)
* resource
* resource_id
* action
* old_value
* new_value
* description
* timestamp

---

## Security

Implement:

* Row Level Security
* Tenant Isolation
* Role-Based Access Control
* Server-side Validation

Never trust client-side data.

---

## Realtime

Use Supabase Realtime.

Realtime entities:

* Orders
* Tables
* Attendance
* Riders
* Menu Availability

Channels must be tenant-scoped.

---

## Offline Strategy

POS should support:

* local persistence
* sync queues
* conflict resolution
* automatic synchronization

Design offline-first where possible.

---

## Performance Requirements

Use:

* indexes
* foreign keys
* constraints
* transactions

Optimize for:

* order queries
* dashboard queries
* realtime updates