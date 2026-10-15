-- Nullable fields preserve existing profiles; new API registrations require all fields.
ALTER TABLE "youth_profiles"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "birthDate" DATE,
ADD COLUMN "phone" TEXT,
ADD COLUMN "cpf" VARCHAR(11),
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "street" TEXT,
ADD COLUMN "number" TEXT,
ADD COLUMN "complement" TEXT,
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT;
CREATE UNIQUE INDEX "youth_profiles_cpf_key" ON "youth_profiles"("cpf");
