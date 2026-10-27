# Legacy booking access

The former application is available separately at https://snappycoinlaundry.com/legacy/pickup-delivery/.
Order status: https://snappycoinlaundry.com/legacy/pickup-delivery/status/.
Recovery: https://snappycoinlaundry.com/legacy/pickup-delivery/recover/.

Restored from public revision 21d4839 with isolated assets and frontend navigation remapped into /legacy/. Production API endpoints, capability handling, customer storage keys and payment integrations are unchanged. The backend still uses $1.50/lb with a $15 minimum, independently of the new $30 per bag booking system. This is a working legacy application, not a read-only archive. No homepage link or sitemap entry advertises it; pages are noindex/nofollow, which is not access control. Existing authentication/capability requirements still apply.

The main booking/order links and former public paths continue to send customers to the new booking root. Legacy generated email links may still use the former public paths; use legacy status recovery for access rather than altering production Worker settings in this frontend release. Do not forward old capabilities to the new booking site.

Marketing analytics are not loaded on the legacy booking entry. Legacy policies and consent controls remain specific to the old application. Worker, database, DNS and new booking system were not changed. Intentional legacy orders will appear in the existing post-cutover legacy-order monitoring.

Rollback this restoration with git revert of its release commit and push main; the original cutover remains in place.
