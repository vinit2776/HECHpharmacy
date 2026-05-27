-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('counter_pharmacist', 'purchase_pharmacist', 'manager', 'super_admin');

-- CreateEnum
CREATE TYPE "DrugDosageForm" AS ENUM ('eye_drop', 'eye_ointment', 'oral_tablet', 'oral_syrup', 'injection', 'ointment', 'other');

-- CreateEnum
CREATE TYPE "DrugPackUnit" AS ENUM ('bottle', 'strip', 'vial', 'tube', 'box', 'sachet', 'unit');

-- CreateEnum
CREATE TYPE "DrugSchedule" AS ENUM ('otc', 'g', 'h', 'h1', 'e1');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('distributor', 'manufacturer', 'wholesaler');

-- CreateEnum
CREATE TYPE "PatientCategory" AS ENUM ('bpl', 'general');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "DoctorType" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "PrescriptionSource" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('cash', 'upi', 'card', 'credit');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('active', 'cancelled', 'returned');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('pending_approval', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PurchaseReturnReason" AS ENUM ('expired', 'damaged', 'short_expiry', 'quality', 'excess');

-- CreateEnum
CREATE TYPE "GrnStatus" AS ENUM ('draft', 'confirmed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'paid');

-- CreateEnum
CREATE TYPE "SugamUploadStatus" AS ENUM ('pending', 'uploaded', 'failed');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('queued', 'generating', 'ready', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand_name" TEXT,
    "manufacturer" TEXT,
    "category" TEXT NOT NULL,
    "dosage_form" "DrugDosageForm" NOT NULL,
    "strength" TEXT,
    "pack_size" TEXT,
    "pack_unit" "DrugPackUnit" NOT NULL,
    "schedule" "DrugSchedule" NOT NULL,
    "hsn_code" TEXT NOT NULL,
    "gst_rate" DECIMAL(5,2) NOT NULL,
    "cold_chain_required" BOOLEAN NOT NULL DEFAULT false,
    "cold_chain_min_temp" DECIMAL(4,1),
    "cold_chain_max_temp" DECIMAL(4,1),
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "barcode" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_discount_configs" (
    "id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "discount_applicable" BOOLEAN NOT NULL DEFAULT false,
    "bpl_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "general_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_discount_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "drug_license_no" TEXT,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_no" TEXT NOT NULL,
    "specialisation" TEXT NOT NULL DEFAULT 'Ophthalmology',
    "type" "DoctorType" NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "hospital_patient_id" TEXT,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "phone" TEXT,
    "address" TEXT,
    "patient_category" "PatientCategory" NOT NULL,
    "bpl_card_no" TEXT,
    "doctor_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "manufactured_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "mrp_per_unit" DECIMAL(10,2) NOT NULL,
    "purchase_rate_per_unit" DECIMAL(10,2) NOT NULL,
    "quantity_received" INTEGER NOT NULL,
    "quantity_available" INTEGER NOT NULL,
    "supplier_id" TEXT,
    "grn_id" TEXT,
    "is_quarantined" BOOLEAN NOT NULL DEFAULT false,
    "quarantine_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_grns" (
    "id" TEXT NOT NULL,
    "grn_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_invoice_no" TEXT NOT NULL,
    "supplier_invoice_date" TIMESTAMP(3) NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "received_by" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "total_gst_amount" DECIMAL(12,2) NOT NULL,
    "total_discount_amount" DECIMAL(12,2) NOT NULL,
    "net_payable" DECIMAL(12,2) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "status" "GrnStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_grn_items" (
    "id" TEXT NOT NULL,
    "grn_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "manufactured_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "free_quantity" INTEGER NOT NULL DEFAULT 0,
    "mrp_per_unit" DECIMAL(10,2) NOT NULL,
    "purchase_rate_per_unit" DECIMAL(10,2) NOT NULL,
    "trade_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gst_rate" DECIMAL(5,2) NOT NULL,
    "gst_amount" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "purchase_grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_bills" (
    "id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL,
    "patient_id" TEXT NOT NULL,
    "patient_category" TEXT NOT NULL,
    "doctor_id" TEXT,
    "prescription_no" TEXT,
    "prescription_date" TIMESTAMP(3),
    "prescription_source" "PrescriptionSource" NOT NULL,
    "served_by" TEXT NOT NULL,
    "subtotal_mrp" DECIMAL(12,2) NOT NULL,
    "total_discount_amount" DECIMAL(12,2) NOT NULL,
    "taxable_amount" DECIMAL(12,2) NOT NULL,
    "total_gst_amount" DECIMAL(12,2) NOT NULL,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "payment_reference" TEXT,
    "status" "BillStatus" NOT NULL DEFAULT 'active',
    "cancellation_reason" TEXT,
    "cancelled_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_bill_items" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "hsn_code" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "mrp_per_unit" DECIMAL(10,2) NOT NULL,
    "discount_pct_applied" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(10,2) NOT NULL,
    "gst_rate" DECIMAL(5,2) NOT NULL,
    "gst_amount" DECIMAL(10,2) NOT NULL,
    "line_net_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sales_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "original_bill_id" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "return_reason" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'pending_approval',
    "total_refund_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "bill_item_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "quantity_returned" INTEGER NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "return_to_stock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "original_grn_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "return_reason" "PurchaseReturnReason" NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'pending_approval',
    "total_return_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "quantity_returned" INTEGER NOT NULL,
    "return_value" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_form17" (
    "id" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "grn_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_dl_no" TEXT,
    "supplier_invoice_no" TEXT NOT NULL,
    "supplier_invoice_date" TIMESTAMP(3) NOT NULL,
    "batch_no" TEXT NOT NULL,
    "manufactured_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity_received" INTEGER NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,
    "purchase_rate" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "register_form17_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_form18" (
    "id" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "bill_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "quantity_sold" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "patient_age" INTEGER,
    "patient_gender" TEXT,
    "doctor_name" TEXT NOT NULL,
    "doctor_reg_no" TEXT NOT NULL,
    "prescription_no" TEXT,
    "prescription_date" TIMESTAMP(3),
    "is_h1" BOOLEAN NOT NULL DEFAULT false,
    "sugam_upload_status" "SugamUploadStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "register_form18_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "report_def_id" TEXT NOT NULL,
    "report_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'queued',
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "params" JSONB NOT NULL,
    "period_label" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "file_path" TEXT,
    "file_size_bytes" INTEGER,
    "generated_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drug_discount_configs_drug_id_key" ON "drug_discount_configs"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_grns_grn_number_key" ON "purchase_grns"("grn_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_bills_bill_number_key" ON "sales_bills"("bill_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_return_number_key" ON "sales_returns"("return_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_return_number_key" ON "purchase_returns"("return_number");

-- AddForeignKey
ALTER TABLE "drug_discount_configs" ADD CONSTRAINT "drug_discount_configs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "purchase_grns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_grn_items" ADD CONSTRAINT "purchase_grn_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "purchase_grns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_grn_items" ADD CONSTRAINT "purchase_grn_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bills" ADD CONSTRAINT "sales_bills_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bills" ADD CONSTRAINT "sales_bills_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bills" ADD CONSTRAINT "sales_bills_served_by_fkey" FOREIGN KEY ("served_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bills" ADD CONSTRAINT "sales_bills_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bill_items" ADD CONSTRAINT "sales_bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "sales_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bill_items" ADD CONSTRAINT "sales_bill_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_bill_items" ADD CONSTRAINT "sales_bill_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_original_bill_id_fkey" FOREIGN KEY ("original_bill_id") REFERENCES "sales_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "sales_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_bill_item_id_fkey" FOREIGN KEY ("bill_item_id") REFERENCES "sales_bill_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_original_grn_id_fkey" FOREIGN KEY ("original_grn_id") REFERENCES "purchase_grns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "purchase_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_form17" ADD CONSTRAINT "register_form17_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "purchase_grns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_form17" ADD CONSTRAINT "register_form17_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_form18" ADD CONSTRAINT "register_form18_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "sales_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_form18" ADD CONSTRAINT "register_form18_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
