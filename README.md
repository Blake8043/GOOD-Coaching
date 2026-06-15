# GOOD Coaching — Production Launch Guide

This guide is for the person responsible for launching and operating GOOD Coaching. It explains the services that must be configured and the checks that must be completed before customers are invited to use the site.

## 1. Accounts and access you will need

Create or confirm access to the following accounts before beginning:

- A GitHub account with access to the GOOD Coaching repository.
- A Railway account for the website and API.
- A MongoDB Atlas account for the production database. Railway MongoDB can also be used, but MongoDB Atlas is recommended for clearer backups, access controls, and monitoring.
- A Cloudflare account with Stream enabled for customer video uploads.
- A Stripe account with Connect enabled for customer payments and coach payouts.
- Access to the domain registrar for the GOOD Coaching domain.
- An email inbox that will be monitored for customer support.

Use separate production credentials. Do not reuse passwords, database users, or API tokens from development or testing.

## 2. Prepare the production MongoDB database

1. In MongoDB Atlas, create a dedicated production project and cluster.
2. Create a database user used only by the GOOD Coaching Railway service. Give it read and write access to the GOOD Coaching database, but do not give it organization-owner access.
3. Create a strong, unique password for that database user.
4. In Atlas Network Access, allow Railway to connect. If the Railway plan provides a static outbound IP, allow only that IP. Otherwise, temporarily allow connections from anywhere and rely on the strong database username and password until a static IP is available.
5. Turn on automated backups and choose a retention period appropriate for the business.
6. Enable Atlas alerts for connection failures, high storage usage, and unusual activity.
7. Copy the production MongoDB connection string. Keep it private and never send it through ordinary email or chat.

If Railway MongoDB is used instead of Atlas, provision the MongoDB service inside the same Railway project, copy its private connection URL, and confirm backups before launch.

## 3. Create the Railway production service

1. Create a new Railway project for production.
2. Connect the GitHub repository and select the production branch.
3. Confirm Railway uses the repository’s existing build and start configuration.
4. Add the core production environment variables listed below in the Railway web service’s Variables section.
5. Deploy the service and wait for the deployment to become healthy. The production server refuses to start only when a core variable is missing. Stripe, Cloudflare Stream, and a custom domain can be connected afterward without keeping the website offline.
6. Open the Railway service health address ending in `/health`. Confirm the response reports that MongoDB is connected. The `integrations` section shows which optional services are ready.

### Core Railway variables required to start

- `NODE_ENV`: Set to production.
- `MONGO_URI`: Paste the private production MongoDB connection string.
- `JWT_SECRET`: Use a long, randomly generated secret that is unique to production. Changing it later signs every user out.
- `JWT_EXPIRES_IN`: Choose the desired login duration, such as seven days.

### Optional variables that activate additional features

- `CLIENT_URL`: Set this to the final public website address using HTTPS when the custom domain is ready. Until then, the app automatically uses Railway’s public domain.
- `STRIPE_SECRET_KEY`: Activates Stripe Connect onboarding and checkout. Use a Stripe test-mode key until live payments are approved.
- `STRIPE_WEBHOOK_SECRET`: Activates verified Stripe payment completion webhooks.
- `CLOUDFLARE_ACCOUNT_ID`: Used with the Stream token to activate customer video uploads.
- `CLOUDFLARE_STREAM_TOKEN`: Use a restricted Cloudflare API token that can create and manage Stream uploads.
- `SUPPORT_EMAIL`: Contact-form destination. Production should use `blake@goodmanpickleball.com`.
- `EMAIL_FROM`: Verified sender address for contact-form email, such as `GOOD Coaching <support@goodmanpickleball.com>`.
- `RESEND_API_KEY` or `SENDGRID_API_KEY`: Activates the contact support form email delivery. Configure one provider before launch.

If an optional integration is missing, the website still starts and its unrelated pages remain available. A customer who attempts to use that unavailable feature receives a clear setup message instead of the whole deployment failing. Contact support submissions are saved only as tickets unless one of the email provider keys is configured; the contact form will not show a false success message if email delivery is unavailable.

Do not put secrets in GitHub files, screenshots, support tickets, or the public website.

## 4. Configure Cloudflare Stream for customer videos

1. In Cloudflare, enable Stream on the production account.
2. Create a restricted API token for Stream. Grant only the permissions needed to upload and manage Stream videos.
3. Copy the Cloudflare account ID and the restricted Stream token into the matching Railway variables.
4. In Cloudflare Stream settings, restrict allowed origins to the final GOOD Coaching domain.
5. Set reasonable storage and delivery spending alerts in Cloudflare.
6. After Railway redeploys, create a real customer account, purchase a plan, and upload a video shorter than 15 minutes.
7. Confirm the video opens for the assigned coach and is not displayed to unrelated signed-in users.

The live site intentionally refuses video uploads when Cloudflare Stream is not configured. This prevents customer videos from appearing to upload successfully when they were not actually stored.

## 5. Configure Stripe payments and coach payouts

1. Complete Stripe business verification and enable Stripe Connect.
2. Keep Stripe in test mode until the full purchase and payout process has been verified.
3. Add the Stripe test secret key to Railway first.
4. In Stripe, create a webhook endpoint using the public Railway or custom-domain address followed by `/api/payments/webhook`.
5. Subscribe the webhook to checkout completion events.
6. Copy the webhook signing secret into Railway as `STRIPE_WEBHOOK_SECRET`.
7. Have a coach complete Stripe Connect onboarding from the coach dashboard.
8. Make a test purchase and confirm all of the following: the customer reaches Stripe Checkout, the order changes to paid, the video upload becomes available, and the coach payout destination is correct.
9. Only after the test succeeds, replace the test Stripe secret and webhook secret with live-mode values and repeat a small real payment.

The live site refuses paid checkout when Stripe is missing or when a coach has not completed payment onboarding. This prevents orders from being incorrectly marked as paid.

## 6. Configure contact support email

1. Choose either Resend or SendGrid for transactional contact-form email.
2. Verify the sending domain or sender address with that provider.
3. Set `SUPPORT_EMAIL=blake@goodmanpickleball.com` in Railway.
4. Set `EMAIL_FROM` to the verified sender address.
5. Add either `RESEND_API_KEY` or `SENDGRID_API_KEY` in Railway and redeploy.
6. Submit a test contact form and confirm Blake receives the message. The API returns an error instead of a success message if the email provider is not configured or rejects the send.

## 7. Connect the production domain through Cloudflare

1. Add the GOOD Coaching domain to Cloudflare and follow Cloudflare’s instructions to update the domain’s nameservers.
2. In Railway, add the custom domain to the production web service.
3. Add the DNS record Railway provides in Cloudflare DNS.
4. Keep Cloudflare SSL/TLS mode set to Full or Full (strict). Never use Flexible mode.
5. Enable automatic HTTPS redirects.
6. After the domain works, update Railway’s `CLIENT_URL` to the final HTTPS address and redeploy.
7. Confirm sign-in, coach profiles, Stripe redirects, video uploads, and emails all use the final domain rather than a Railway or localhost address.

## 8. Create the first administrator and approve coaches

The first administrator must be created deliberately in the production database. Use MongoDB Atlas’s data viewer to locate the intended user and change only that user’s role to admin. Do not share administrator accounts.

After signing in as the administrator:

1. Review every coach application.
2. Confirm the coach’s identity, profile photo, biography, contact information, DUPR details, services, pricing, and payout setup.
3. Approve only complete profiles.
4. Confirm that unapproved coaches do not appear publicly.
5. Keep the database viewer restricted to administrators.

## 9. Replace final business content before launch

Before sending the website to customers, review every public page and confirm:

- The GOOD Coaching logo and business name are correct.
- The support contact page reaches a monitored inbox.
- Coach profile photos, biographies, pricing, and social links are real.
- No test coaches, test orders, or test conversations remain in MongoDB.
- FAQ answers match the actual service and response times.
- Refund, cancellation, privacy, terms of service, and video-retention policies have been reviewed by the business owner and an appropriate legal professional.
- The footer and all navigation links go to useful pages.

## 10. Final launch test

Complete this test from a phone and a desktop browser using brand-new accounts:

1. Create a customer account and confirm the required name, phone, email, and password rules work.
2. Create a coach account, complete the coach application, upload a profile image, and verify an administrator can approve it.
3. Confirm the approved coach appears in the coach marketplace.
4. Start a conversation with the coach and confirm both accounts can reply.
5. Create a coaching plan with a real price and complete Stripe checkout.
6. Upload a video shorter than 15 minutes and confirm a longer video is rejected.
7. Complete the coach review and confirm the customer can download any attached voice recording or PDF.
8. Check `/health` and confirm MongoDB remains connected.
9. Review Railway, MongoDB, Cloudflare, and Stripe logs for errors.

Do not announce the site until every step succeeds.

## 11. Ongoing operations after launch

- Check Railway deployment and error logs daily during the first week.
- Review MongoDB and Cloudflare storage usage weekly.
- Review Stripe disputes, failed payments, and payout status regularly.
- Rotate API tokens and secrets whenever staff access changes or a credential may have been exposed.
- Test database restoration from backup before relying on backups.
- Keep dependencies updated and review security alerts before each deployment.
- Maintain a documented customer-support and incident-response process.

## Temporary role test accounts

Only use these accounts briefly in a private staging environment. They intentionally use weak passwords and must be removed before launch.

1. In the Railway web service variables, temporarily add `ALLOW_INSECURE_ROLE_TEST_ACCOUNTS=true`.
2. Open a Railway shell for the deployed service and run `npm run seed:role-accounts --prefix server`.
3. Test the role-specific portals with:
   - Username `user`, password `user` → customer dashboard
   - Username `coach`, password `coach` → coach operations dashboard
   - Username `admin`, password `admin` → admin command center
4. Delete the three `@goodcoaching.test` users from MongoDB immediately after testing.
5. Remove `ALLOW_INSECURE_ROLE_TEST_ACCOUNTS` from Railway variables.

The seed command refuses to run unless the temporary opt-in variable is exactly `true`.
