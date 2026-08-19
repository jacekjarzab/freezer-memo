# ADR-001: Use Supabase RPCs for household inventory mutations

## Status

Accepted

## Context

Freezer Memo is local-first, but the optional shared-household MVP needs a hosted inventory projection. Members must only access their household, retries must not duplicate a mutation, and server revisions must create one deterministic sync cursor. Direct client writes cannot atomically enforce all three constraints.

## Decision

Use Supabase Postgres with `profiles`, `households`, `household_members`, `household_invites`, `freezer_items`, and `inventory_mutations`.

RLS permits only membership-scoped reads. Client mutation writes go through narrow authenticated RPCs: household creation, invite creation/revocation/acceptance, and `apply_freezer_mutation`. A unique membership constraint enforces the one-household MVP rule. The mutation RPC verifies membership, de-duplicates a client mutation UUID, increments a household-local revision, and persists an item or tombstone. The client pulls `freezer_items` by `(household_id, server_revision)`; it never receives service-role credentials.

## Consequences

This makes direct backend requests from non-members fail and makes retry-after-timeout safe. It also centralizes revision allocation and keeps the PWA adapter simple.

The trade-off is that RPC payload validation is part of the database contract, and the migration needs Supabase SQL tests before production. Presets remain device-local and accounts cannot switch households in this MVP.
