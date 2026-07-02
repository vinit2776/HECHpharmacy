-- AddIndex: performance indexes for FK columns and frequently filtered fields

-- inventory_batches
CREATE INDEX IF NOT EXISTS "inventory_batches_drug_id_idx" ON "inventory_batches"("drug_id");
CREATE INDEX IF NOT EXISTS "inventory_batches_supplier_id_idx" ON "inventory_batches"("supplier_id");
CREATE INDEX IF NOT EXISTS "inventory_batches_grn_id_idx" ON "inventory_batches"("grn_id");
CREATE INDEX IF NOT EXISTS "inventory_batches_expiry_date_idx" ON "inventory_batches"("expiry_date");

-- sales_bills
CREATE INDEX IF NOT EXISTS "sales_bills_bill_date_idx" ON "sales_bills"("bill_date");
CREATE INDEX IF NOT EXISTS "sales_bills_status_idx" ON "sales_bills"("status");
CREATE INDEX IF NOT EXISTS "sales_bills_patient_id_idx" ON "sales_bills"("patient_id");
CREATE INDEX IF NOT EXISTS "sales_bills_served_by_idx" ON "sales_bills"("served_by");
CREATE INDEX IF NOT EXISTS "sales_bills_doctor_id_idx" ON "sales_bills"("doctor_id");

-- patients
CREATE INDEX IF NOT EXISTS "patients_name_idx" ON "patients"("name");
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients"("phone");
CREATE INDEX IF NOT EXISTS "patients_doctor_id_idx" ON "patients"("doctor_id");

-- purchase_grns
CREATE INDEX IF NOT EXISTS "purchase_grns_supplier_id_idx" ON "purchase_grns"("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_grns_status_idx" ON "purchase_grns"("status");
CREATE INDEX IF NOT EXISTS "purchase_grns_received_date_idx" ON "purchase_grns"("received_date");
CREATE INDEX IF NOT EXISTS "purchase_grns_received_by_idx" ON "purchase_grns"("received_by");

-- purchase_grn_items
CREATE INDEX IF NOT EXISTS "purchase_grn_items_grn_id_idx" ON "purchase_grn_items"("grn_id");
CREATE INDEX IF NOT EXISTS "purchase_grn_items_drug_id_idx" ON "purchase_grn_items"("drug_id");

-- sales_bill_items
CREATE INDEX IF NOT EXISTS "sales_bill_items_bill_id_idx" ON "sales_bill_items"("bill_id");
CREATE INDEX IF NOT EXISTS "sales_bill_items_drug_id_idx" ON "sales_bill_items"("drug_id");
CREATE INDEX IF NOT EXISTS "sales_bill_items_batch_id_idx" ON "sales_bill_items"("batch_id");

-- sales_returns
CREATE INDEX IF NOT EXISTS "sales_returns_original_bill_id_idx" ON "sales_returns"("original_bill_id");
CREATE INDEX IF NOT EXISTS "sales_returns_status_idx" ON "sales_returns"("status");
CREATE INDEX IF NOT EXISTS "sales_returns_initiated_by_idx" ON "sales_returns"("initiated_by");

-- sales_return_items
CREATE INDEX IF NOT EXISTS "sales_return_items_return_id_idx" ON "sales_return_items"("return_id");
CREATE INDEX IF NOT EXISTS "sales_return_items_drug_id_idx" ON "sales_return_items"("drug_id");
CREATE INDEX IF NOT EXISTS "sales_return_items_batch_id_idx" ON "sales_return_items"("batch_id");

-- purchase_returns
CREATE INDEX IF NOT EXISTS "purchase_returns_original_grn_id_idx" ON "purchase_returns"("original_grn_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_supplier_id_idx" ON "purchase_returns"("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_status_idx" ON "purchase_returns"("status");
CREATE INDEX IF NOT EXISTS "purchase_returns_initiated_by_idx" ON "purchase_returns"("initiated_by");

-- purchase_return_items
CREATE INDEX IF NOT EXISTS "purchase_return_items_return_id_idx" ON "purchase_return_items"("return_id");
CREATE INDEX IF NOT EXISTS "purchase_return_items_drug_id_idx" ON "purchase_return_items"("drug_id");
CREATE INDEX IF NOT EXISTS "purchase_return_items_batch_id_idx" ON "purchase_return_items"("batch_id");

-- drugs
CREATE INDEX IF NOT EXISTS "drugs_barcode_idx" ON "drugs"("barcode");
CREATE INDEX IF NOT EXISTS "drugs_schedule_idx" ON "drugs"("schedule");

-- register_form17
CREATE INDEX IF NOT EXISTS "register_form17_grn_id_idx" ON "register_form17"("grn_id");
CREATE INDEX IF NOT EXISTS "register_form17_drug_id_idx" ON "register_form17"("drug_id");
CREATE INDEX IF NOT EXISTS "register_form17_entry_date_idx" ON "register_form17"("entry_date");

-- register_form18
CREATE INDEX IF NOT EXISTS "register_form18_bill_id_idx" ON "register_form18"("bill_id");
CREATE INDEX IF NOT EXISTS "register_form18_drug_id_idx" ON "register_form18"("drug_id");
CREATE INDEX IF NOT EXISTS "register_form18_entry_date_idx" ON "register_form18"("entry_date");
CREATE INDEX IF NOT EXISTS "register_form18_is_h1_sugam_idx" ON "register_form18"("is_h1", "sugam_upload_status");

-- reports
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "reports_requested_by_idx" ON "reports"("requested_by");
CREATE INDEX IF NOT EXISTS "reports_requested_at_idx" ON "reports"("requested_at");

-- audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- internal_requisition_items
CREATE INDEX IF NOT EXISTS "internal_requisition_items_requisition_id_idx" ON "internal_requisition_items"("requisition_id");
CREATE INDEX IF NOT EXISTS "internal_requisition_items_drug_id_idx" ON "internal_requisition_items"("drug_id");
CREATE INDEX IF NOT EXISTS "internal_requisition_items_batch_id_idx" ON "internal_requisition_items"("batch_id");
