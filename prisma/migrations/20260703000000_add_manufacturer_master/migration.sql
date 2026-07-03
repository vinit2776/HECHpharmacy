-- CreateTable: Manufacturer master
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique code
CREATE UNIQUE INDEX "manufacturers_code_key" ON "manufacturers"("code");

-- AlterTable: add manufacturer_id FK to drugs
ALTER TABLE "drugs" ADD COLUMN "manufacturer_id" TEXT;

-- AddForeignKey
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_manufacturer_id_fkey"
    FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
