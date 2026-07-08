# Stage 01-05 Validation Report

## 1. Environment Validation Output
- **Config Reading Status:** SUCCESS
- **Mandatory Environment Variables Found:** DB_HOST, DB_PORT, DB_NAME, DB_USER, PORT
- **Database Connection Status:** SUCCESSFUL

## 2. Deployment Lock Acquisition Log
- **Lock File Status:** CREATED
- **Lock File Location:** `/home/vayunexs/api.sdk.vayunexsolution.com/tmp/deployment.lock`
- **Acquired by Process PID:** 1871117

## 3. mysqldump Exit Code
- **Exit Code:** `0` (Success)
- **Target Dump Path:** `/tmp/backup_vayunexs_npc.sql`

## 4. Backup SHA-256 Verification Output
- **File Integrity Status:** VERIFIED (Readable, non-empty)
- **File Size:** `66878` bytes
- **SHA-256 Checksum:** `ec1cd920a939a1552aaa8c56cbce9a2a296d6c4d4e7a6aae2251f7ace1243381`
- **SQL Preview Validation:**
  ```sql
  /*M!999999\- enable the sandbox mode */
  -- MariaDB dump 10.19  Distrib 10.11.14-MariaDB, for Linux (x86_64)
  --
  ```

## 5. Database Safety Audit Output
- **Production Tenant Count:** `0`
- **Active Application Count:** `0`
- **Identity Users Count:** `1` (Seed admin user `yashkr4748@gmail.com`)
- **Safety Verdict:** SAFE

## 6. Current SequelizeMeta Entries
- **Executed Migrations registered:**
  - `20260705000000-create-platform-tables.js`

## 7. Total Platform Tables Detected
- **Total Tables Count:** `55` (54 platform tables + `users` table)

## 8. Total Rows in every Platform Table
- `plat_tenants`: `0`
- `plat_businesses`: `0`
- `plat_branches`: `0`
- `plat_departments`: `0`
- `plat_platform_settings`: `0`
- `plat_tenant_settings`: `0`
- `plat_user_sessions`: `0`
- `plat_refresh_tokens`: `0`
- `plat_login_histories`: `0`
- `plat_api_keys`: `0`
- `plat_password_resets`: `0`
- `plat_subscriptions`: `0`
- `plat_licenses`: `0`
- `plat_features`: `0`
- `plat_limits`: `0`
- `plat_roles`: `0`
- `plat_permissions`: `0`
- `plat_role_permissions`: `0`
- `plat_platform_audits`: `0`
- `plat_tenant_audits`: `0`
- `plat_user_memberships`: `0`
- `plat_login_rate_limits`: `0`
- `plat_api_key_scopes`: `0`
- `plat_branch_settings`: `0`
- `plat_branch_branding`: `0`
- `plat_branch_contacts`: `0`
- `plat_branch_addresses`: `0`
- `plat_branch_preferences`: `0`
- `plat_branch_metadata`: `0`
- `plat_branch_memberships`: `0`
- `plat_applications`: `0`
- `plat_application_memberships`: `0`
- `plat_application_api_keys`: `0`
- `plat_application_sdk_credentials`: `0`
- `plat_application_webhooks`: `0`
- `plat_application_oauth_clients`: `0`
- `plat_application_feature_flags`: `0`
- `plat_application_rate_limits`: `0`
- `plat_application_logs`: `0`
- `plat_application_health`: `0`
- `plat_application_analytics`: `0`
- `plat_application_domains`: `0`
- `plat_application_environments`: `0`
- `plat_application_secrets`: `0`
- `plat_business_settings`: `0`
- `plat_business_branding`: `0`
- `plat_business_contacts`: `0`
- `plat_business_addresses`: `0`
- `plat_business_preferences`: `0`
- `plat_business_metadata`: `0`
- `plat_business_memberships`: `0`
- `plat_outbox`: `0`
- `plat_processed_events`: `0`
- `plat_user_password_histories`: `0`
- `users`: `1`

## 9. Identity Tables Preserved List
The following identity and RBAC tables must be preserved during safe cleanup by default:
- `users`
- `plat_roles`
- `plat_permissions`
- `plat_role_permissions`

## 10. SAFE_TO_REBUILD Value
- **SAFE_TO_REBUILD:** `true`

---

## 11. Final Readiness Verdict
**READY_FOR_STAGE_06 = true**
