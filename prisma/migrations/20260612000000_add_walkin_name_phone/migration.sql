-- Add walk-in patient name and phone to sales_bills
-- Captures name/mobile for unregistered (walk-in) customers at point of sale

ALTER TABLE "sales_bills" ADD COLUMN "walkin_name" TEXT;
ALTER TABLE "sales_bills" ADD COLUMN "walkin_phone" TEXT;
