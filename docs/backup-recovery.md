# Backup and recovery

Local Docker volumes are not production backups. For local snapshots, stop writes, run `supabase db dump --local --file backup.sql`, protect the file as sensitive data, and test restoration into a separate disposable local project. Never commit dumps.

For production, the owner must choose and pay for any hosted backup plan personally. Enable point-in-time recovery appropriate to the service tier, encrypt exports, restrict operators, document retention, and perform scheduled restore drills. Recovery order is authentication/database, storage objects, application deployment, webhook reconciliation, and provider-cache refresh.

Before a migration, create a verified backup, test migrations against a production-like copy, confirm rollback or forward-fix procedures, and record the migration version. Historical diary and recipe snapshots must not be rewritten during recovery.

Suggested objectives for owner review: document an acceptable recovery point objective and recovery time objective, assign incident roles, and retain evidence from quarterly restore tests.
