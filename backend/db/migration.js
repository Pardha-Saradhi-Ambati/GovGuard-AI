const { pool } = require('../config/db');

async function runMigration() {
  console.log('Starting Database Migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const migrationSql = `
      DO $$
      BEGIN
          -- Check column type of fraud_reasons in financial_records
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_records' AND column_name='fraud_reasons') THEN
              IF (SELECT data_type FROM information_schema.columns WHERE table_name='financial_records' AND column_name='fraud_reasons') != 'jsonb' THEN
                  ALTER TABLE financial_records ALTER COLUMN fraud_reasons DROP DEFAULT;
                  ALTER TABLE financial_records ALTER COLUMN fraud_reasons TYPE JSONB USING to_jsonb(fraud_reasons);
                  ALTER TABLE financial_records ALTER COLUMN fraud_reasons SET DEFAULT '[]'::jsonb;
                  RAISE NOTICE 'Converted financial_records.fraud_reasons to JSONB.';
              END IF;
          ELSE
              ALTER TABLE financial_records ADD COLUMN fraud_reasons JSONB DEFAULT '[]'::jsonb;
              RAISE NOTICE 'Added financial_records.fraud_reasons as JSONB.';
          END IF;

          -- Add prediction column to financial_records if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_records' AND column_name='prediction') THEN
              ALTER TABLE financial_records ADD COLUMN prediction VARCHAR(50);
              RAISE NOTICE 'Added financial_records.prediction.';
          END IF;

          -- Add confidence column to financial_records if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_records' AND column_name='confidence') THEN
              ALTER TABLE financial_records ADD COLUMN confidence INTEGER;
              RAISE NOTICE 'Added financial_records.confidence.';
          END IF;

          -- Add recommendation column to financial_records if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_records' AND column_name='recommendation') THEN
              ALTER TABLE financial_records ADD COLUMN recommendation TEXT DEFAULT '';
              RAISE NOTICE 'Added financial_records.recommendation.';
          END IF;

          -- Check column type of reasons in fraud_alerts
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fraud_alerts' AND column_name='reasons') THEN
              IF (SELECT data_type FROM information_schema.columns WHERE table_name='fraud_alerts' AND column_name='reasons') != 'jsonb' THEN
                  ALTER TABLE fraud_alerts ALTER COLUMN reasons DROP DEFAULT;
                  ALTER TABLE fraud_alerts ALTER COLUMN reasons TYPE JSONB USING to_jsonb(reasons);
                  ALTER TABLE fraud_alerts ALTER COLUMN reasons SET DEFAULT '[]'::jsonb;
                  RAISE NOTICE 'Converted fraud_alerts.reasons to JSONB.';
              END IF;
          ELSE
              ALTER TABLE fraud_alerts ADD COLUMN reasons JSONB DEFAULT '[]'::jsonb;
              RAISE NOTICE 'Added fraud_alerts.reasons as JSONB.';
          END IF;

          -- Add prediction column to fraud_alerts if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fraud_alerts' AND column_name='prediction') THEN
              ALTER TABLE fraud_alerts ADD COLUMN prediction VARCHAR(50);
              RAISE NOTICE 'Added fraud_alerts.prediction.';
          END IF;

          -- Add confidence column to fraud_alerts if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fraud_alerts' AND column_name='confidence') THEN
              ALTER TABLE fraud_alerts ADD COLUMN confidence INTEGER;
              RAISE NOTICE 'Added fraud_alerts.confidence.';
          END IF;

          -- Add recommendation column to fraud_alerts if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fraud_alerts' AND column_name='recommendation') THEN
              ALTER TABLE fraud_alerts ADD COLUMN recommendation TEXT DEFAULT '';
              RAISE NOTICE 'Added fraud_alerts.recommendation.';
          END IF;

          -- Add recommendation column to investigations if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investigations' AND column_name='recommendation') THEN
              ALTER TABLE investigations ADD COLUMN recommendation TEXT DEFAULT '';
              RAISE NOTICE 'Added investigations.recommendation.';
          END IF;
      END $$;
    `;

    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('Database Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error executing migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
