-- CreateTable
-- Additive migration: existing youth profiles remain unchanged, without fake resumes.
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "youth_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_skills" (
    "id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "resume_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_educations" (
    "id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "institution" VARCHAR(200) NOT NULL,
    "course" VARCHAR(200) NOT NULL,
    "level" VARCHAR(100) NOT NULL,
    "start_month" VARCHAR(7) NOT NULL,
    "end_month" VARCHAR(7),
    "in_progress" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "resume_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_experiences" (
    "id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "organization" VARCHAR(200) NOT NULL,
    "start_month" VARCHAR(7) NOT NULL,
    "end_month" VARCHAR(7),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(2000),

    CONSTRAINT "resume_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resumes_youth_profile_id_key" ON "resumes"("youth_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "resume_skills_resume_id_name_key" ON "resume_skills"("resume_id", "name");

-- CreateIndex
CREATE INDEX "resume_educations_resume_id_idx" ON "resume_educations"("resume_id");

-- CreateIndex
CREATE INDEX "resume_experiences_resume_id_idx" ON "resume_experiences"("resume_id");

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_youth_profile_id_fkey" FOREIGN KEY ("youth_profile_id") REFERENCES "youth_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_educations" ADD CONSTRAINT "resume_educations_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_experiences" ADD CONSTRAINT "resume_experiences_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drafts may have no entries. Added entries must contain real text and valid periods.
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_name_check"
CHECK ("name" ~ '[^[:space:]]');

ALTER TABLE "resume_educations"
ADD CONSTRAINT "resume_educations_text_check" CHECK (
    "institution" ~ '[^[:space:]]' AND "course" ~ '[^[:space:]]' AND "level" ~ '[^[:space:]]'
),
ADD CONSTRAINT "resume_educations_period_check" CHECK (
    "start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("start_month", 4) <> '0000'
    AND (
        ("in_progress" AND "end_month" IS NULL)
        OR (NOT "in_progress" AND "end_month" IS NOT NULL
            AND "end_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("end_month", 4) <> '0000'
            AND "end_month" >= "start_month")
    )
);

ALTER TABLE "resume_experiences"
ADD CONSTRAINT "resume_experiences_text_check" CHECK (
    "title" ~ '[^[:space:]]' AND "organization" ~ '[^[:space:]]'
),
ADD CONSTRAINT "resume_experiences_period_check" CHECK (
    "start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("start_month", 4) <> '0000'
    AND (
        ("is_current" AND "end_month" IS NULL)
        OR (NOT "is_current" AND "end_month" IS NOT NULL
            AND "end_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("end_month", 4) <> '0000'
            AND "end_month" >= "start_month")
    )
);
