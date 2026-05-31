# SnappyCoin Promo System Agent Instructions

## Project context

This repository contains the SnappyCoin Laundry static website and DexterLive machine availability frontend integration.

The new feature is a promotional campaign system:
- customers land on a promo page from paid ads
  - customers submit name, email, mobile phone, ZIP, optional apartment / community
    - phone is verified before a code is issued
      - customer receives a unique code by email
        - staff redeem the code in person through a staff dashboard
          - redemption is manual; do not integrate with DexterPay or automatic machine control
            - codes are valid Monday–Thursday, 9 AM–7 PM, America / Chicago
              - offer is one free 20 - or 30 - pound washer load
                - one code per person / email / phone per promotion

## Architecture decision

Default database: Cloudflare D1.

Do not use MongoDB unless explicitly switched in the implementation plan.If MongoDB is used, implement a clean repository / data - access abstraction and use unique indexes and atomic updates.

  Use:
- Cloudflare Workers for backend API
  - Cloudflare D1 for database
    - Cloudflare Turnstile for bot prevention
      - Twilio Verify for phone verification
        - Brevo for transactional coupon email and marketing list management
          - Cloudflare Access or equivalent auth for staff dashboard

## Existing site constraints

Do not break:
- homepage layout
  - existing styles
    - DexterLive availability widget
      - GA4 tracking
        - static deployment

Keep the DexterLive status worker separate from promotion logic.

## Security constraints

  - Never store plaintext promo codes.
- Never store plaintext phone / email unless encrypted.
- Store HMACs for lookup and uniqueness checks.
- Staff dashboard should show phone last 4 only.
- Admin / staff routes must require authentication.
- All staff actions must create audit logs.
- No secrets in source code.
- Use Wrangler secrets for production secrets.
- Add rate limits for signup and verification endpoints.

## Compliance constraints

  - Marketing email consent must be explicit.
- SMS marketing consent must be separate from phone verification.
- Every marketing email must have an unsubscribe link.
- Local suppression table must be kept in sync with Brevo unsubscribe state.
- Privacy and terms pages must be added.

## Testing expectations

Add tests where the repo has a test framework.If no framework exists, add Vitest for backend logic.

Required tests:
  - duplicate email claim blocked
    - duplicate phone claim blocked
      - no code issued before phone verification
        - code hash lookup works
          - redemption is atomic
            - already - redeemed code cannot redeem again
              - expired code cannot redeem
                - outside - hours redemption requires override
                  - unsubscribe suppresses marketing email
                    - attribution parameters are captured

## Done means

The feature is done only when:
- frontend promo page works
  - backend API works locally
    - D1 migrations apply
      - phone verification can be mocked in tests
        - coupon email can be mocked in tests
          - staff dashboard can look up and redeem codes
            - tests pass
              - build passes
                - manual end - to - end test script is documented
                  - no secrets are committed
