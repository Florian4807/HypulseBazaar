BEGIN;

ALTER TABLE "Snapshots" DROP CONSTRAINT IF EXISTS "FK_Snapshots_Items_BazaarItemId";

ALTER TABLE "Items"
  ALTER COLUMN "Id" TYPE integer USING "Id"::integer,
  ALTER COLUMN "CreatedAt" TYPE timestamp with time zone USING "CreatedAt"::timestamptz,
  ALTER COLUMN "UpdatedAt" TYPE timestamp with time zone USING "UpdatedAt"::timestamptz;

ALTER TABLE "Snapshots"
  ALTER COLUMN "Id" TYPE integer USING "Id"::integer,
  ALTER COLUMN "BazaarItemId" TYPE integer USING "BazaarItemId"::integer,
  ALTER COLUMN "Timestamp" TYPE timestamp with time zone USING "Timestamp"::timestamptz,
  ALTER COLUMN "BuyPrice" TYPE numeric(20,4) USING "BuyPrice"::numeric(20,4),
  ALTER COLUMN "SellPrice" TYPE numeric(20,4) USING "SellPrice"::numeric(20,4),
  ALTER COLUMN "BuyOrdersCount" TYPE integer USING "BuyOrdersCount"::integer,
  ALTER COLUMN "SellOrdersCount" TYPE integer USING "SellOrdersCount"::integer;

ALTER TABLE "Snapshots" ALTER COLUMN "IsExternalImport" DROP DEFAULT;
ALTER TABLE "Snapshots"
  ALTER COLUMN "IsExternalImport" TYPE boolean USING (CASE WHEN "IsExternalImport" = 1 THEN true ELSE false END),
  ALTER COLUMN "IsExternalImport" SET DEFAULT false;

ALTER TABLE "Snapshots"
  ADD CONSTRAINT "FK_Snapshots_Items_BazaarItemId"
  FOREIGN KEY ("BazaarItemId") REFERENCES "Items"("Id") ON DELETE CASCADE;

COMMIT;
