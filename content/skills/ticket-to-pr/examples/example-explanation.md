# Example PR explanation

## Engineer's explanation

This PR adds a `getVoyageHistory` endpoint to the voyage-service. It returns past voyages for a given guest, ordered newest-first, paginated 20 per page. I followed the existing `getReservationHistory` pattern because the query shape is analogous, and used the ship-shore-sync caching pattern from the domain bundle since historical voyage data doesn't need to reflect onboard state in real time.

## AI notes

- Engineer's explanation matches the diff. All new code paths are described.
- Not mentioned: the migration adds a composite index on `(guest_id, voyage_end_date)`. Worth calling out to the reviewer in case they want to discuss index cost at scale.
- Confirmed: the use of `ship-shore sync` is appropriate per the domain bundle's definition (reconciliation under intermittent connectivity, deterministic merge). The historical-read caching follows correctly.
