# Billing and access

Stripe integration is disabled by default. The application will not create customers, Checkout Sessions, Portal Sessions, or subscriptions until the owner supplies all Stripe variables and explicitly sets `STRIPE_BILLING_ENABLED=true`. Repository setup does not create or purchase anything.

## Owner-completed Stripe setup

You must personally create or select the Stripe account, create monthly and annual recurring Prices, choose prices and trial settings, configure the Customer Portal, register the webhook endpoint, and copy credentials into encrypted deployment variables. Configure the webhook endpoint as `/api/stripe/webhook` and subscribe to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.

Required variables are `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, and `STRIPE_ANNUAL_PRICE_ID`. Enable billing only after reviewing the prices and test-mode behavior. Begin in Stripe test mode.

Checkout return URLs never grant access. Verified webhooks are authoritative. Webhook signatures are verified against the raw request, events are stored by Stripe event ID, successfully processed duplicates are ignored, and failed events can retry. Browser clients cannot write Stripe customers, subscriptions, or events.

Subscription access is granted only for active or trialing status within the current period. Complimentary access is granted through unrevoked, started, unexpired access grants. Owners have administrative access independently.

`FREEFORME` is normalized by trimming and uppercasing, then compared by SHA-256 hash. It is permanent by default, requires no Stripe transaction, records user and time, rejects duplicate redemption, and can be deactivated, limited, or changed to a duration by the owner. Raw promo codes are never stored.
