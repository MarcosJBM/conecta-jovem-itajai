CREATE TYPE "JobApplicationStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'APPROVED', 'REJECTED');

ALTER TABLE "job_applications"
ADD COLUMN "status" "JobApplicationStatus" NOT NULL DEFAULT 'RECEIVED';

CREATE TABLE "job_application_status_changes" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "previous_status" "JobApplicationStatus" NOT NULL,
    "new_status" "JobApplicationStatus" NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_application_status_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_application_status_changes_application_id_changed_at_idx" ON "job_application_status_changes"("application_id", "changed_at");
CREATE INDEX "job_application_status_changes_company_id_idx" ON "job_application_status_changes"("company_id");

ALTER TABLE "job_application_status_changes" ADD CONSTRAINT "job_application_status_changes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_application_status_changes" ADD CONSTRAINT "job_application_status_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
