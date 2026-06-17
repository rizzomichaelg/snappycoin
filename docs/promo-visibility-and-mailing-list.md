# Promo Visibility and Mailing List Backend Notes

## Promo visibility

Use `promo_campaigns.active` as the single operations flag for the free wash promotion.

When `active = 0`, the backend must:

- Return `active: false` from `GET /api/promotions/:slug/public`.
- Reject `POST /api/promotions/:slug/claim/start` with `409 promotion_paused`.
- Reject `POST /api/promotions/:slug/claim/resend` with `409 promotion_paused`.
- Reject `POST /api/promotions/:slug/claim/verify-phone` with `409 promotion_paused`.

The current frontend treats `active: false` as a presentation flag: promo-only navigation, hero copy, and claim form are hidden, and a non-promo visit/services panel is shown instead. Do not rely on the frontend as the security boundary; keep the backend rejection in place.

Operational SQL:

```sql
UPDATE promo_campaigns
SET active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'free-weekday-wash';
```

Reopen:

```sql
UPDATE promo_campaigns
SET active = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'free-weekday-wash';
```

Current July 2026 offer schedule:

```sql
UPDATE promo_campaigns
SET
  valid_days_json = '[1,2,3,4]',
  valid_start_minute = 540,
  valid_end_minute = 1080,
  starts_at = '2026-07-06T05:00:00.000Z',
  ends_at = '2026-07-31T04:59:59.000Z',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'free-weekday-wash';
```

This represents July 6-30, 2026, Monday-Thursday, 9 AM-6 PM in America/Chicago.

## Mailing list signup endpoint

The website posts standalone email signups to:

```http
POST /api/marketing/signup
```

Expected request body:

```json
{
  "firstName": "Ada",
  "email": "ada@example.com",
  "source": "website_contact_section",
  "emailMarketingConsent": true,
  "turnstileToken": "cloudflare-turnstile-token",
  "attribution": {}
}
```

Required backend behavior:

- Verify Turnstile before accepting the signup.
- Require a valid email and `emailMarketingConsent === true`.
- Normalize the email for HMAC and provider upsert.
- Encrypt plaintext email and first name if stored locally.
- Store `email_hmac` for uniqueness and lookups.
- Rate limit by IP HMAC and email HMAC.
- If the email is locally suppressed or suppressed in the email provider, do not re-subscribe it silently; return a neutral success message or a clear resubscribe path.
- Upsert the contact in the email provider list with source and consent timestamp metadata.
- Record a consent event with the exact consent text/version and attribution snapshot.
- Return a generic success response:

```json
{
  "ok": true,
  "message": "You're on the list."
}
```

Every marketing email sent to this list must include the existing unsubscribe link flow, and provider unsubscribe webhooks should keep the local suppression table in sync.
