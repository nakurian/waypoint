# Example PR explanation

## Engineer's explanation

This PR adds a `getBookingHistory` endpoint to the reservations-service. It returns past bookings for a given user, ordered newest-first, paginated 20 per page. I followed the existing `getPaymentHistory` pattern because the query shape is analogous, and used the read-through-cache pattern from the domain bundle since historical booking data doesn't need to reflect the write path in real time.

## AI notes

- Engineer's explanation matches the diff. All new code paths are described.
- Not mentioned: the migration adds a composite index on `(user_id, booking_end_date)`. Worth calling out to the reviewer in case they want to discuss index cost at scale.
- Confirmed: the use of `read-through cache` is appropriate per the domain bundle's definition (historical reads tolerate stale data up to the cache TTL). The pagination follows the project's standard `Pageable` parameters correctly.
