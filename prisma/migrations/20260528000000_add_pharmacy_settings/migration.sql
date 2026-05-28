-- CreateTable
CREATE TABLE "pharmacy_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "pharmacy_name" TEXT NOT NULL DEFAULT 'HCEH Eye Hospital Pharmacy',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "drug_license_no" TEXT,
    "cin_no" TEXT,
    "pan_no" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row so it always exists
INSERT INTO "pharmacy_settings" ("id", "pharmacy_name", "updated_at")
VALUES ('singleton', 'HCEH Eye Hospital Pharmacy', NOW())
ON CONFLICT ("id") DO NOTHING;
