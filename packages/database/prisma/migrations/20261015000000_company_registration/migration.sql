CREATE TYPE "CompanyValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Existing empty profiles are preserved; new registrations require these fields in the API.
ALTER TABLE "company_profiles"
  ADD COLUMN "cnpj" VARCHAR(14),
  ADD COLUMN "legal_name" VARCHAR(200),
  ADD COLUMN "trade_name" VARCHAR(200),
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "state" VARCHAR(2),
  ADD COLUMN "contact_name" VARCHAR(150),
  ADD COLUMN "contact_role" VARCHAR(100),
  ADD COLUMN "phone" VARCHAR(11);
CREATE UNIQUE INDEX "company_profiles_cnpj_key" ON "company_profiles"("cnpj");

CREATE TABLE "company_validations" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "status" "CompanyValidationStatus" NOT NULL DEFAULT 'PENDING',
  "rejection_reason" TEXT,
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_validations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_validations_rejection_reason_check" CHECK (
    "status" <> 'REJECTED' OR ("rejection_reason" IS NOT NULL AND length(trim("rejection_reason")) > 0)
  ),
  CONSTRAINT "company_validations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "company_validations_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "company_validations_company_id_key" ON "company_validations"("company_id");
CREATE INDEX "company_validations_status_created_at_idx" ON "company_validations"("status", "created_at");
