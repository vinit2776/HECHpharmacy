-- CreateEnum
CREATE TYPE "InternalDept" AS ENUM ('ot', 'general_ward', 'icu', 'casualty', 'pharmacy_own', 'other');

-- CreateEnum
CREATE TYPE "IssuePurpose" AS ENUM ('surgery', 'dept_stock', 'emergency', 'maintenance', 'other');

-- CreateEnum
CREATE TYPE "ReqStatus" AS ENUM ('draft', 'issued', 'cancelled');

-- CreateTable
CREATE TABLE "internal_requisitions" (
    "id" TEXT NOT NULL,
    "requisition_number" TEXT NOT NULL,
    "requisition_date" TIMESTAMP(3) NOT NULL,
    "department" "InternalDept" NOT NULL,
    "purpose" "IssuePurpose" NOT NULL,
    "doctor_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "status" "ReqStatus" NOT NULL DEFAULT 'draft',
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_requisition_items" (
    "id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "hsn_code" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "quantity_issued" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "internal_requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_requisitions_requisition_number_key" ON "internal_requisitions"("requisition_number");

-- CreateIndex
CREATE INDEX "internal_requisitions_status_idx" ON "internal_requisitions"("status");

-- CreateIndex
CREATE INDEX "internal_requisitions_department_idx" ON "internal_requisitions"("department");

-- CreateIndex
CREATE INDEX "internal_requisitions_requisition_date_idx" ON "internal_requisitions"("requisition_date");

-- AddForeignKey
ALTER TABLE "internal_requisitions" ADD CONSTRAINT "internal_requisitions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requisitions" ADD CONSTRAINT "internal_requisitions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requisitions" ADD CONSTRAINT "internal_requisitions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requisitions" ADD CONSTRAINT "internal_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "internal_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requisition_items" ADD CONSTRAINT "internal_requisition_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requisition_items" ADD CONSTRAINT "internal_requisition_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
