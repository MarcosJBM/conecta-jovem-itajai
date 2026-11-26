CREATE TABLE "job_applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "youth_profile_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resume_snapshot" JSONB NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_applications_job_id_youth_profile_id_key" ON "job_applications"("job_id", "youth_profile_id");
CREATE INDEX "job_applications_youth_profile_id_idx" ON "job_applications"("youth_profile_id");

ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_youth_profile_id_fkey" FOREIGN KEY ("youth_profile_id") REFERENCES "youth_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
