-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobContract" AS ENUM ('APPRENTICESHIP', 'INTERNSHIP', 'FORMAL_EMPLOYMENT');

-- CreateEnum
CREATE TYPE "WorkRegime" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "JobArea" AS ENUM ('ADMINISTRATION', 'SALES', 'TECHNOLOGY', 'LOGISTICS', 'INDUSTRY', 'HEALTH', 'EDUCATION', 'OTHER');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "requirements" VARCHAR(5000) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "area" "JobArea" NOT NULL,
    "contract" "JobContract" NOT NULL,
    "regime" "WorkRegime" NOT NULL,
    "deadline" DATE NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_company_id_created_at_id_idx" ON "jobs"("company_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "jobs_status_deadline_idx" ON "jobs"("status", "deadline");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Required text is enforced even on direct database writes; expiration is evaluated at read/write time.
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_required_text_check" CHECK (
  "title" ~ '[^[:space:]]' AND "description" ~ '[^[:space:]]'
  AND "requirements" ~ '[^[:space:]]' AND "city" ~ '[^[:space:]]'
  AND length("state") = 2
);
