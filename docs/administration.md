# Administration

Phase 7 uses database permissions for every administrative area; route visibility is not authorization. Owner grants include user management, food moderation, nutrient mappings, projections, analytics, content, feature flags, automations, system health, and audit access. Staff should receive only the permissions required for their role.

User suspension is an audited database function and cannot target the owner. The shared application authorization helper checks suspension on every protected request. Complimentary access can be revoked with a required reason. Internal support notes are private to authorized staff.

Access to private nutrition records requires `nutrition.private.read`, a reason of at least ten characters, a dedicated `admin_access_logs` record, and an audit event. The detail view verifies that the access record belongs to the current actor and target before using the server-only service role.

Food submissions and reports have explicit review states and audited decisions. Provider nutrient mappings store source code, internal nutrient, source unit, conversion factor, status, and creator. Projection recalculation uses current numeric references, returns the projection to pending review, preserves historical diary snapshots, and audits completion.

Analytics pages use aggregate counts and do not expose individual nutrition records. Content, feature flags, automation definitions/runs, incidents, and audit records are RLS-protected. Local automation tests only create run records; they do not send email, contact external services, or spend money.
