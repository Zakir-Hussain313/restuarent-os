# Restaurant Management SaaS - Project Brief

## Overview

This project is a production-grade Restaurant Management SaaS platform.

The platform is designed to be sold to multiple restaurants as a subscription-based software product.

The system serves as the central operational platform for restaurants and supports real-time collaboration between staff members.

The platform is not a demo project, tutorial project, or portfolio application.

Every decision must prioritize:

* scalability
* maintainability
* reliability
* performance
* security
* production readiness

---

## Current Status

The frontend application already exists.

Implemented systems include:

* Marketing Website
* Online Ordering
* Dashboard (includes analytics reporting)
* POS
* Orders
* Tables
* Menu Management
* Receipt Printing UI
* Staff Management UI
* Rider Management UI

The goal is to evolve the existing frontend into a complete production-grade SaaS.

---

## Business Model

The platform is deployed per-tenant: each restaurant gets its own
dedicated server and its own dedicated database. There is no shared
infrastructure between restaurants.

`tenant_id` is still present on every major entity for schema
consistency, portability, and future flexibility, but the isolation
guarantee comes from physical separation (separate DB per restaurant),
not from tenant_id filtering.

Within a single restaurant's database, roles must still be strictly
separated:

* Super Admin
* Staff
* Rider

No role should be able to access data or actions outside its
permitted scope, even if application code has a bug.

---

## Roles

### Super Admin

Can:

* Manage staff
* Manage riders
* Manage attendance
* Manage menu
* Manage tables
* Manage orders
* Manage settings
* View dashboard analytics (all branches or a selected branch)
* Access reports
* Access audit logs
* Access POS

### Staff

Can:

* Access POS
* Create orders
* Manage tables
* Assign riders
* View orders
* Update order status
* Print receipts
* Print kitchen tickets
* Mark menu items available/unavailable

Cannot:

* Manage staff
* Access settings
* Access audit logs

### Rider

Can:

* View assigned deliveries
* View delivery details
* Update delivery status
* Mark delivered
* Mark cancelled
* View delivery history

Cannot:

* Access POS
* Access menu management
* Access settings

---

## Core Modules

* Authentication
* User Management
* Staff Management
* Rider Management
* Attendance
* Menu Management
* POS
* Order Management
* Table Management
* Delivery Management
* Dashboard (analytics & reporting)
* Reports
* Settings
* Audit Logs

---

## Real-Time Requirements

The system is a central operational platform.

When one user updates:

* Orders
* Tables
* Riders
* Menu Availability
* Attendance

all connected users of the same tenant must receive updates immediately.

Realtime synchronization is mandatory.

---

## Offline Requirements

POS must continue operating without internet.

Offline-created orders must synchronize automatically once connectivity returns.

---

## Development Philosophy

Always extend existing architecture.

Avoid rewriting existing frontend systems.

Maintain architectural consistency.

Prefer evolution over replacement.