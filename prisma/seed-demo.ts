/**
 * Demo seed — creates realistic sample data across all sections.
 * Run: npx ts-node --project tsconfig.json -e "require('./prisma/seed-demo.ts')"
 * Or: npx tsx prisma/seed-demo.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { subDays, subMonths, addMonths, addDays } from 'date-fns'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── helpers ──────────────────────────────────────────────────────────────────
const d = (offset: number) => subDays(new Date(), offset)       // days ago
const m = (months: number) => addMonths(new Date(), months)     // months from now
const dm = (months: number) => subMonths(new Date(), months)    // months ago

function calcLine(qty: number, rate: number, discPct: number, gstRate: number) {
  const taxable = qty * rate * (1 - discPct / 100)
  const gst = taxable * gstRate / 100
  const net = taxable + gst
  return { taxable: +taxable.toFixed(2), gstAmount: +gst.toFixed(2), net: +net.toFixed(2) }
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  Seeding demo data…\n')

  // ── look up existing seed records ──────────────────────────────────────────
  const [adminUser, managerUser, counterUser, purchaseUser] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { email: 'admin@eyehospital.com' } }),
    prisma.user.findFirstOrThrow({ where: { email: 'manager@eyehospital.com' } }),
    prisma.user.findFirstOrThrow({ where: { email: 'counter@eyehospital.com' } }),
    prisma.user.findFirstOrThrow({ where: { email: 'purchase@eyehospital.com' } }),
  ])
  const [doctor1, doctor2] = await Promise.all([
    prisma.doctor.findFirstOrThrow({ where: { id: 'seed-doctor-1' } }),
    prisma.doctor.findFirstOrThrow({ where: { id: 'seed-doctor-2' } }),
  ])
  const [supplier1, supplier2] = await Promise.all([
    prisma.supplier.findFirstOrThrow({ where: { id: 'seed-supplier-1' } }),
    prisma.supplier.findFirstOrThrow({ where: { id: 'seed-supplier-2' } }),
  ])
  const drugs = await prisma.drug.findMany({ orderBy: { id: 'asc' } })
  const drugMap = Object.fromEntries(drugs.map(d => [d.id, d]))

  // ── 1. Additional patients ─────────────────────────────────────────────────
  console.log('👥  Creating patients…')
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'demo-patient-1' },
      update: {},
      create: {
        id: 'demo-patient-1',
        hospitalPatientId: 'HOS-2001',
        name: 'Annamalai Suresh',
        age: 65,
        gender: 'male',
        phone: '9444123456',
        patientCategory: 'general',
        doctorId: doctor1.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'demo-patient-2' },
      update: {},
      create: {
        id: 'demo-patient-2',
        hospitalPatientId: 'HOS-2002',
        name: 'Vijayalakshmi Iyer',
        age: 54,
        gender: 'female',
        phone: '9444123457',
        patientCategory: 'bpl',
        bplCardNo: 'BPL-TN-2024-010',
        doctorId: doctor2.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'demo-patient-3' },
      update: {},
      create: {
        id: 'demo-patient-3',
        hospitalPatientId: 'HOS-2003',
        name: 'Karthikeyan Mani',
        age: 42,
        gender: 'male',
        phone: '9444123458',
        patientCategory: 'general',
        doctorId: doctor1.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'demo-patient-4' },
      update: {},
      create: {
        id: 'demo-patient-4',
        hospitalPatientId: 'HOS-2004',
        name: 'Shanthi Devi Nair',
        age: 78,
        gender: 'female',
        phone: '9444123459',
        patientCategory: 'bpl',
        bplCardNo: 'BPL-TN-2024-011',
        doctorId: doctor2.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'demo-patient-5' },
      update: {},
      create: {
        id: 'demo-patient-5',
        hospitalPatientId: 'HOS-2005',
        name: 'Balasubramanian Raja',
        age: 49,
        gender: 'male',
        phone: '9444123460',
        patientCategory: 'general',
        doctorId: doctor1.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'demo-patient-6' },
      update: {},
      create: {
        id: 'demo-patient-6',
        hospitalPatientId: 'HOS-2006',
        name: 'Meenakshi Pillai',
        age: 63,
        gender: 'female',
        phone: '9444123461',
        patientCategory: 'general',
        doctorId: doctor2.id,
      },
    }),
  ])
  console.log(`   ✓ ${patients.length} patients created\n`)

  // ── 2. GRN-1: Confirmed, 30 days ago — Apex Medical ──────────────────────
  console.log('📦  Creating GRNs…')

  const grn1 = await prisma.purchaseGrn.upsert({
    where: { grnNumber: 'GRN-202504-0001' },
    update: {},
    create: {
      grnNumber: 'GRN-202504-0001',
      supplierId: supplier1.id,
      supplierInvoiceNo: 'APEX-INV-3421',
      supplierInvoiceDate: d(35),
      receivedDate: d(30),
      receivedBy: purchaseUser.id,
      totalAmount: 12400,
      totalGstAmount: 1488,
      totalDiscountAmount: 0,
      netPayable: 13888,
      status: 'confirmed',
    },
  })

  // GRN1 items (will create batches below)
  const grn1Items = [
    // drug-1: Moxifloxacin H1, 50 bottles, MRP 85, rate 62
    { drugId: 'seed-drug-1', batchNo: 'MX-2401', expiryDate: m(18), qty: 50, freeQty: 5, mrp: 85, rate: 62, disc: 0, gstRate: 12 },
    // drug-2: Timolol H, 40 bottles, MRP 120, rate 90
    { drugId: 'seed-drug-2', batchNo: 'TM-2401', expiryDate: m(24), qty: 40, freeQty: 0, mrp: 120, rate: 90, disc: 0, gstRate: 12 },
    // drug-4: Prednisolone H, 30 bottles, near-expiry (70 days from now)
    { drugId: 'seed-drug-4', batchNo: 'PD-2303', expiryDate: addDays(new Date(), 70), qty: 30, freeQty: 0, mrp: 95, rate: 70, disc: 5, gstRate: 12 },
    // drug-6: CMC OTC, 60 bottles
    { drugId: 'seed-drug-6', batchNo: 'CMC-2401', expiryDate: m(30), qty: 60, freeQty: 0, mrp: 55, rate: 40, disc: 0, gstRate: 12 },
  ]

  for (const item of grn1Items) {
    await prisma.purchaseGrnItem.upsert({
      where: {
        // Prisma doesn't have a unique constraint — use findFirst + create pattern
        id: `grn1-item-${item.batchNo}`,
      },
      update: {},
      create: {
        id: `grn1-item-${item.batchNo}`,
        grnId: grn1.id,
        drugId: item.drugId,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantity: item.qty,
        freeQuantity: item.freeQty,
        mrpPerUnit: item.mrp,
        purchaseRatePerUnit: item.rate,
        tradeDiscountPct: item.disc,
        gstRate: item.gstRate,
        gstAmount: +(item.qty * item.rate * (1 - item.disc / 100) * item.gstRate / 100).toFixed(2),
        lineTotal: +(item.qty * item.rate * (1 - item.disc / 100) * (1 + item.gstRate / 100)).toFixed(2),
      },
    })
  }

  // GRN-2: Confirmed, 15 days ago — Chennai Eye Pharma
  const grn2 = await prisma.purchaseGrn.upsert({
    where: { grnNumber: 'GRN-202504-0002' },
    update: {},
    create: {
      grnNumber: 'GRN-202504-0002',
      supplierId: supplier2.id,
      supplierInvoiceNo: 'CEP-INV-887',
      supplierInvoiceDate: d(18),
      receivedDate: d(15),
      receivedBy: purchaseUser.id,
      totalAmount: 8200,
      totalGstAmount: 984,
      totalDiscountAmount: 0,
      netPayable: 9184,
      status: 'confirmed',
    },
  })

  const grn2Items = [
    // drug-3: Latanoprost H (cold chain), 20 bottles, MRP 350
    { drugId: 'seed-drug-3', batchNo: 'LAT-2402', expiryDate: m(12), qty: 20, freeQty: 0, mrp: 350, rate: 260, disc: 0, gstRate: 12 },
    // drug-7: Tobradex H, 35 bottles
    { drugId: 'seed-drug-7', batchNo: 'TBX-2401', expiryDate: m(20), qty: 35, freeQty: 0, mrp: 180, rate: 135, disc: 0, gstRate: 12 },
    // drug-8: Brimonidine H, 25 bottles
    { drugId: 'seed-drug-8', batchNo: 'BRM-2401', expiryDate: m(22), qty: 25, freeQty: 0, mrp: 145, rate: 110, disc: 0, gstRate: 12 },
    // drug-10: Dorzolamide+Timolol H, only 6 bottles left → low stock
    { drugId: 'seed-drug-10', batchNo: 'DT-2401', expiryDate: m(16), qty: 6, freeQty: 0, mrp: 220, rate: 165, disc: 0, gstRate: 12 },
  ]

  for (const item of grn2Items) {
    await prisma.purchaseGrnItem.upsert({
      where: { id: `grn2-item-${item.batchNo}` },
      update: {},
      create: {
        id: `grn2-item-${item.batchNo}`,
        grnId: grn2.id,
        drugId: item.drugId,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantity: item.qty,
        freeQuantity: item.freeQty,
        mrpPerUnit: item.mrp,
        purchaseRatePerUnit: item.rate,
        tradeDiscountPct: item.disc,
        gstRate: item.gstRate,
        gstAmount: +(item.qty * item.rate * item.gstRate / 100).toFixed(2),
        lineTotal: +(item.qty * item.rate * (1 + item.gstRate / 100)).toFixed(2),
      },
    })
  }

  // GRN-3: Draft — supplier2, partially filled
  const grn3 = await prisma.purchaseGrn.upsert({
    where: { grnNumber: 'GRN-202505-0001' },
    update: {},
    create: {
      grnNumber: 'GRN-202505-0001',
      supplierId: supplier1.id,
      supplierInvoiceNo: 'APEX-INV-3509',
      supplierInvoiceDate: d(2),
      receivedDate: d(1),
      receivedBy: purchaseUser.id,
      totalAmount: 4800,
      totalGstAmount: 576,
      totalDiscountAmount: 0,
      netPayable: 5376,
      status: 'draft',
    },
  })

  await prisma.purchaseGrnItem.upsert({
    where: { id: 'grn3-item-TRP-2501' },
    update: {},
    create: {
      id: 'grn3-item-TRP-2501',
      grnId: grn3.id,
      drugId: 'seed-drug-5',
      batchNo: 'TRP-2501',
      expiryDate: m(15),
      quantity: 40,
      freeQuantity: 0,
      mrpPerUnit: 75,
      purchaseRatePerUnit: 55,
      tradeDiscountPct: 0,
      gstRate: 12,
      gstAmount: +(40 * 55 * 0.12).toFixed(2),
      lineTotal: +(40 * 55 * 1.12).toFixed(2),
    },
  })

  console.log('   ✓ GRN-202504-0001 (confirmed, Apex, 4 drugs)')
  console.log('   ✓ GRN-202504-0002 (confirmed, Chennai Eye Pharma, 4 drugs)')
  console.log('   ✓ GRN-202505-0001 (draft, Apex, 1 drug — awaiting confirmation)\n')

  // ── 3. Inventory batches ──────────────────────────────────────────────────
  console.log('🏪  Creating inventory batches…')

  // Batch specs: drugId, batchNo, expiryDate, mrp, rate, qtyReceived, qtyAvail, grnId, supplierId, quarantine?
  type BatchSpec = {
    id: string; drugId: string; batchNo: string; expiryDate: Date
    mrp: number; rate: number; qtyReceived: number; qtyAvail: number
    grnId: string; supplierId: string; isQuarantined?: boolean; quarantineReason?: string
  }

  const batchSpecs: BatchSpec[] = [
    // Moxifloxacin — good stock
    { id: 'batch-MX-2401', drugId: 'seed-drug-1', batchNo: 'MX-2401', expiryDate: m(18), mrp: 85, rate: 62, qtyReceived: 55, qtyAvail: 48, grnId: grn1.id, supplierId: supplier1.id },
    // Timolol — adequate
    { id: 'batch-TM-2401', drugId: 'seed-drug-2', batchNo: 'TM-2401', expiryDate: m(24), mrp: 120, rate: 90, qtyReceived: 40, qtyAvail: 32, grnId: grn1.id, supplierId: supplier1.id },
    // Latanoprost — cold chain, adequate
    { id: 'batch-LAT-2402', drugId: 'seed-drug-3', batchNo: 'LAT-2402', expiryDate: m(12), mrp: 350, rate: 260, qtyReceived: 20, qtyAvail: 16, grnId: grn2.id, supplierId: supplier2.id },
    // Prednisolone — near expiry (70 days)
    { id: 'batch-PD-2303', drugId: 'seed-drug-4', batchNo: 'PD-2303', expiryDate: addDays(new Date(), 70), mrp: 95, rate: 70, qtyReceived: 30, qtyAvail: 22, grnId: grn1.id, supplierId: supplier1.id },
    // Tropicamide — adequate
    { id: 'batch-TRP-2401', drugId: 'seed-drug-5', batchNo: 'TRP-2401', expiryDate: m(15), mrp: 75, rate: 55, qtyReceived: 30, qtyAvail: 25, grnId: grn1.id, supplierId: supplier1.id },
    // CMC Tears — OTC, good stock
    { id: 'batch-CMC-2401', drugId: 'seed-drug-6', batchNo: 'CMC-2401', expiryDate: m(30), mrp: 55, rate: 40, qtyReceived: 60, qtyAvail: 50, grnId: grn1.id, supplierId: supplier1.id },
    // Tobradex — adequate
    { id: 'batch-TBX-2401', drugId: 'seed-drug-7', batchNo: 'TBX-2401', expiryDate: m(20), mrp: 180, rate: 135, qtyReceived: 35, qtyAvail: 28, grnId: grn2.id, supplierId: supplier2.id },
    // Brimonidine — adequate
    { id: 'batch-BRM-2401', drugId: 'seed-drug-8', batchNo: 'BRM-2401', expiryDate: m(22), mrp: 145, rate: 110, qtyReceived: 25, qtyAvail: 20, grnId: grn2.id, supplierId: supplier2.id },
    // Ketorolac — low stock (reorderLevel=10, only 7 left)
    { id: 'batch-KTR-2401', drugId: 'seed-drug-9', batchNo: 'KTR-2401', expiryDate: m(14), mrp: 110, rate: 82, qtyReceived: 20, qtyAvail: 7, grnId: grn2.id, supplierId: supplier2.id },
    // Dorzolamide+Timolol — low stock (only 6, reorderLevel=10)
    { id: 'batch-DT-2401', drugId: 'seed-drug-10', batchNo: 'DT-2401', expiryDate: m(16), mrp: 220, rate: 165, qtyReceived: 6, qtyAvail: 6, grnId: grn2.id, supplierId: supplier2.id },
    // Latanoprost extra batch — quarantined (cold chain failure)
    { id: 'batch-LAT-2301', drugId: 'seed-drug-3', batchNo: 'LAT-2301', expiryDate: m(8), mrp: 350, rate: 260, qtyReceived: 10, qtyAvail: 10, grnId: grn2.id, supplierId: supplier2.id, isQuarantined: true, quarantineReason: 'Cold chain breach detected — temperature exceeded 12°C during transit' },
  ]

  for (const b of batchSpecs) {
    await prisma.inventoryBatch.upsert({
      where: { id: b.id },
      update: { quantityAvailable: b.qtyAvail },
      create: {
        id: b.id,
        drugId: b.drugId,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        mrpPerUnit: b.mrp,
        purchaseRatePerUnit: b.rate,
        quantityReceived: b.qtyReceived,
        quantityAvailable: b.qtyAvail,
        supplierId: b.supplierId,
        grnId: b.grnId,
        isQuarantined: b.isQuarantined ?? false,
        quarantineReason: b.quarantineReason,
      },
    })
  }
  console.log(`   ✓ ${batchSpecs.length} batches (includes 1 near-expiry, 2 low-stock, 1 quarantined)\n`)

  // ── 4. Form 17 entries (H/H1 drugs from confirmed GRNs) ───────────────────
  console.log('📋  Creating Form 17 (purchase register) entries…')
  const form17Entries = [
    { grnId: grn1.id, drugId: 'seed-drug-1', drugName: 'Moxifloxacin', schedule: 'h1', batchNo: 'MX-2401', expiryDate: m(18), qty: 55, mrp: 85, rate: 62, invDate: d(35) },
    { grnId: grn1.id, drugId: 'seed-drug-2', drugName: 'Timolol Maleate', schedule: 'h', batchNo: 'TM-2401', expiryDate: m(24), qty: 40, mrp: 120, rate: 90, invDate: d(35) },
    { grnId: grn1.id, drugId: 'seed-drug-4', drugName: 'Prednisolone Acetate', schedule: 'h', batchNo: 'PD-2303', expiryDate: addDays(new Date(), 70), qty: 30, mrp: 95, rate: 70, invDate: d(35) },
    { grnId: grn2.id, drugId: 'seed-drug-3', drugName: 'Latanoprost', schedule: 'h', batchNo: 'LAT-2402', expiryDate: m(12), qty: 20, mrp: 350, rate: 260, invDate: d(18) },
    { grnId: grn2.id, drugId: 'seed-drug-7', drugName: 'Tobramycin + Dexamethasone', schedule: 'h', batchNo: 'TBX-2401', expiryDate: m(20), qty: 35, mrp: 180, rate: 135, invDate: d(18) },
    { grnId: grn2.id, drugId: 'seed-drug-8', drugName: 'Brimonidine', schedule: 'h', batchNo: 'BRM-2401', expiryDate: m(22), qty: 25, mrp: 145, rate: 110, invDate: d(18) },
    { grnId: grn2.id, drugId: 'seed-drug-10', drugName: 'Dorzolamide + Timolol', schedule: 'h', batchNo: 'DT-2401', expiryDate: m(16), qty: 6, mrp: 220, rate: 165, invDate: d(18) },
  ]
  for (const e of form17Entries) {
    const id = `f17-${e.grnId.slice(-4)}-${e.batchNo}`
    await prisma.registerForm17.upsert({
      where: { id },
      update: {},
      create: {
        id,
        entryDate: e.invDate,
        grnId: e.grnId,
        drugId: e.drugId,
        drugName: e.drugName,
        schedule: e.schedule,
        supplierName: e.grnId === grn1.id ? supplier1.name : supplier2.name,
        supplierDlNo: e.grnId === grn1.id ? supplier1.drugLicenseNo ?? '' : supplier2.drugLicenseNo ?? '',
        supplierInvoiceNo: e.grnId === grn1.id ? 'APEX-INV-3421' : 'CEP-INV-887',
        supplierInvoiceDate: e.invDate,
        batchNo: e.batchNo,
        expiryDate: e.expiryDate,
        quantityReceived: e.qty,
        mrp: e.mrp,
        purchaseRate: e.rate,
      },
    })
  }
  console.log(`   ✓ ${form17Entries.length} Form 17 entries\n`)

  // ── 5. Sales bills ─────────────────────────────────────────────────────────
  console.log('🧾  Creating sales bills…')

  // Helper: create a bill + items + Form 18 entries
  async function createBill(spec: {
    id: string
    billNumber: string
    billDate: Date
    patientId: string
    patientCategory: string
    doctorId: string
    prescriptionNo?: string
    servedBy: string
    paymentMode: 'cash' | 'upi' | 'card' | 'credit'
    status?: 'active' | 'cancelled'
    items: Array<{
      id: string
      drugId: string
      batchId: string
      batchNo: string
      expiryDate: Date
      qty: number
      mrpPerUnit: number
      discPct: number
      gstRate: number
      schedule: string
    }>
  }) {
    let subtotalMrp = 0, totalDiscount = 0, totalTaxable = 0, totalGst = 0, netAmount = 0

    const lineCalcs = spec.items.map(item => {
      const mrpLine = item.qty * item.mrpPerUnit
      const discAmt = mrpLine * item.discPct / 100
      const taxable = mrpLine - discAmt
      const gst = taxable * item.gstRate / 100
      const net = taxable + gst
      subtotalMrp += mrpLine
      totalDiscount += discAmt
      totalTaxable += taxable
      totalGst += gst
      netAmount += net
      return { ...item, discAmt: +discAmt.toFixed(2), taxable: +taxable.toFixed(2), gst: +gst.toFixed(2), net: +net.toFixed(2) }
    })

    const drug = await prisma.drug.findUniqueOrThrow({ where: { id: spec.items[0].drugId } })
    const patient = await prisma.patient.findUniqueOrThrow({ where: { id: spec.patientId } })
    const doctor = await prisma.doctor.findUniqueOrThrow({ where: { id: spec.doctorId } })

    const bill = await prisma.salesBill.upsert({
      where: { billNumber: spec.billNumber },
      update: {},
      create: {
        id: spec.id,
        billNumber: spec.billNumber,
        billDate: spec.billDate,
        patientId: spec.patientId,
        patientCategory: spec.patientCategory,
        doctorId: spec.doctorId,
        prescriptionNo: spec.prescriptionNo,
        prescriptionSource: 'internal',
        servedBy: spec.servedBy,
        subtotalMrp: +subtotalMrp.toFixed(2),
        totalDiscountAmount: +totalDiscount.toFixed(2),
        taxableAmount: +totalTaxable.toFixed(2),
        totalGstAmount: +totalGst.toFixed(2),
        netAmount: +netAmount.toFixed(2),
        paymentMode: spec.paymentMode,
        status: spec.status ?? 'active',
      },
    })

    for (const line of lineCalcs) {
      await prisma.salesBillItem.upsert({
        where: { id: line.id },
        update: {},
        create: {
          id: line.id,
          billId: bill.id,
          drugId: line.drugId,
          batchId: line.batchId,
          drugName: drugMap[line.drugId]?.name ?? '',
          batchNo: line.batchNo,
          expiryDate: line.expiryDate,
          hsnCode: drugMap[line.drugId]?.hsnCode ?? '30049099',
          schedule: line.schedule,
          quantity: line.qty,
          mrpPerUnit: line.mrpPerUnit,
          discountPctApplied: line.discPct,
          discountAmount: line.discAmt,
          taxableAmount: line.taxable,
          gstRate: line.gstRate,
          gstAmount: line.gst,
          lineNetAmount: line.net,
        },
      })

      // Form 18 entry for H / H1 drugs
      if (line.schedule === 'h' || line.schedule === 'h1') {
        const f18Id = `f18-${line.id}`
        await prisma.registerForm18.upsert({
          where: { id: f18Id },
          update: {},
          create: {
            id: f18Id,
            entryDate: spec.billDate,
            billId: bill.id,
            drugId: line.drugId,
            drugName: drugMap[line.drugId]?.name ?? '',
            schedule: line.schedule,
            batchNo: line.batchNo,
            quantitySold: line.qty,
            patientName: patient.name,
            patientAge: patient.age ?? undefined,
            patientGender: patient.gender ?? undefined,
            doctorName: doctor.name,
            doctorRegNo: doctor.registrationNo,
            prescriptionNo: spec.prescriptionNo,
            isH1: line.schedule === 'h1',
          },
        })
      }
    }

    return bill
  }

  const bill1 = await createBill({
    id: 'demo-bill-1',
    billNumber: 'BILL-202504-0001',
    billDate: d(28),
    patientId: 'demo-patient-1',
    patientCategory: 'general',
    doctorId: doctor1.id,
    prescriptionNo: 'RX-2025-001',
    servedBy: counterUser.id,
    paymentMode: 'cash',
    items: [
      { id: 'bi-1-1', drugId: 'seed-drug-1', batchId: 'batch-MX-2401', batchNo: 'MX-2401', expiryDate: m(18), qty: 2, mrpPerUnit: 85, discPct: 30, gstRate: 12, schedule: 'h1' },
      { id: 'bi-1-2', drugId: 'seed-drug-6', batchId: 'batch-CMC-2401', batchNo: 'CMC-2401', expiryDate: m(30), qty: 1, mrpPerUnit: 55, discPct: 0, gstRate: 12, schedule: 'otc' },
    ],
  })

  const bill2 = await createBill({
    id: 'demo-bill-2',
    billNumber: 'BILL-202504-0002',
    billDate: d(25),
    patientId: 'demo-patient-2',
    patientCategory: 'bpl',
    doctorId: doctor2.id,
    prescriptionNo: 'RX-2025-002',
    servedBy: counterUser.id,
    paymentMode: 'upi',
    items: [
      { id: 'bi-2-1', drugId: 'seed-drug-3', batchId: 'batch-LAT-2402', batchNo: 'LAT-2402', expiryDate: m(12), qty: 1, mrpPerUnit: 350, discPct: 100, gstRate: 12, schedule: 'h' },
      { id: 'bi-2-2', drugId: 'seed-drug-8', batchId: 'batch-BRM-2401', batchNo: 'BRM-2401', expiryDate: m(22), qty: 1, mrpPerUnit: 145, discPct: 100, gstRate: 12, schedule: 'h' },
    ],
  })

  const bill3 = await createBill({
    id: 'demo-bill-3',
    billNumber: 'BILL-202504-0003',
    billDate: d(22),
    patientId: 'demo-patient-3',
    patientCategory: 'general',
    doctorId: doctor1.id,
    prescriptionNo: 'RX-2025-003',
    servedBy: counterUser.id,
    paymentMode: 'card',
    items: [
      { id: 'bi-3-1', drugId: 'seed-drug-2', batchId: 'batch-TM-2401', batchNo: 'TM-2401', expiryDate: m(24), qty: 2, mrpPerUnit: 120, discPct: 20, gstRate: 12, schedule: 'h' },
      { id: 'bi-3-2', drugId: 'seed-drug-4', batchId: 'batch-PD-2303', batchNo: 'PD-2303', expiryDate: addDays(new Date(), 70), qty: 1, mrpPerUnit: 95, discPct: 20, gstRate: 12, schedule: 'h' },
    ],
  })

  const bill4 = await createBill({
    id: 'demo-bill-4',
    billNumber: 'BILL-202504-0004',
    billDate: d(18),
    patientId: 'demo-patient-4',
    patientCategory: 'bpl',
    doctorId: doctor2.id,
    prescriptionNo: 'RX-2025-004',
    servedBy: counterUser.id,
    paymentMode: 'cash',
    items: [
      { id: 'bi-4-1', drugId: 'seed-drug-7', batchId: 'batch-TBX-2401', batchNo: 'TBX-2401', expiryDate: m(20), qty: 1, mrpPerUnit: 180, discPct: 100, gstRate: 12, schedule: 'h' },
      { id: 'bi-4-2', drugId: 'seed-drug-6', batchId: 'batch-CMC-2401', batchNo: 'CMC-2401', expiryDate: m(30), qty: 2, mrpPerUnit: 55, discPct: 0, gstRate: 12, schedule: 'otc' },
    ],
  })

  const bill5 = await createBill({
    id: 'demo-bill-5',
    billNumber: 'BILL-202504-0005',
    billDate: d(12),
    patientId: 'demo-patient-5',
    patientCategory: 'general',
    doctorId: doctor1.id,
    prescriptionNo: 'RX-2025-005',
    servedBy: counterUser.id,
    paymentMode: 'upi',
    items: [
      { id: 'bi-5-1', drugId: 'seed-drug-1', batchId: 'batch-MX-2401', batchNo: 'MX-2401', expiryDate: m(18), qty: 3, mrpPerUnit: 85, discPct: 30, gstRate: 12, schedule: 'h1' },
      { id: 'bi-5-2', drugId: 'seed-drug-9', batchId: 'batch-KTR-2401', batchNo: 'KTR-2401', expiryDate: m(14), qty: 1, mrpPerUnit: 110, discPct: 15, gstRate: 12, schedule: 'h' },
    ],
  })

  const bill6 = await createBill({
    id: 'demo-bill-6',
    billNumber: 'BILL-202504-0006',
    billDate: d(8),
    patientId: 'demo-patient-6',
    patientCategory: 'general',
    doctorId: doctor2.id,
    prescriptionNo: 'RX-2025-006',
    servedBy: counterUser.id,
    paymentMode: 'cash',
    items: [
      { id: 'bi-6-1', drugId: 'seed-drug-10', batchId: 'batch-DT-2401', batchNo: 'DT-2401', expiryDate: m(16), qty: 1, mrpPerUnit: 220, discPct: 20, gstRate: 12, schedule: 'h' },
      { id: 'bi-6-2', drugId: 'seed-drug-2', batchId: 'batch-TM-2401', batchNo: 'TM-2401', expiryDate: m(24), qty: 1, mrpPerUnit: 120, discPct: 20, gstRate: 12, schedule: 'h' },
    ],
  })

  // Bill 7 — cancelled
  const bill7 = await createBill({
    id: 'demo-bill-7',
    billNumber: 'BILL-202504-0007',
    billDate: d(5),
    patientId: 'demo-patient-1',
    patientCategory: 'general',
    doctorId: doctor1.id,
    prescriptionNo: 'RX-2025-007',
    servedBy: counterUser.id,
    paymentMode: 'cash',
    status: 'cancelled',
    items: [
      { id: 'bi-7-1', drugId: 'seed-drug-5', batchId: 'batch-TRP-2401', batchNo: 'TRP-2401', expiryDate: m(15), qty: 2, mrpPerUnit: 75, discPct: 15, gstRate: 12, schedule: 'h' },
    ],
  })
  await prisma.salesBill.update({
    where: { id: 'demo-bill-7' },
    data: { cancellationReason: 'Patient requested cancellation — wrong prescription', cancelledBy: managerUser.id },
  })

  // Bill 8 — today
  const bill8 = await createBill({
    id: 'demo-bill-8',
    billNumber: 'BILL-202505-0001',
    billDate: d(0),
    patientId: 'demo-patient-3',
    patientCategory: 'general',
    doctorId: doctor1.id,
    prescriptionNo: 'RX-2025-008',
    servedBy: counterUser.id,
    paymentMode: 'card',
    items: [
      { id: 'bi-8-1', drugId: 'seed-drug-4', batchId: 'batch-PD-2303', batchNo: 'PD-2303', expiryDate: addDays(new Date(), 70), qty: 1, mrpPerUnit: 95, discPct: 20, gstRate: 12, schedule: 'h' },
      { id: 'bi-8-2', drugId: 'seed-drug-8', batchId: 'batch-BRM-2401', batchNo: 'BRM-2401', expiryDate: m(22), qty: 1, mrpPerUnit: 145, discPct: 20, gstRate: 12, schedule: 'h' },
    ],
  })

  console.log(`   ✓ 8 bills created (6 active, 1 cancelled, 1 today)`)
  console.log('   ✓ Form 18 entries auto-populated for H/H1 drugs\n')

  // ── 6. Sales returns ────────────────────────────────────────────────────────
  console.log('↩️   Creating sales returns…')

  // SR-1: Approved — patient returned 1 bottle of Moxifloxacin from bill1
  await prisma.salesReturn.upsert({
    where: { returnNumber: 'SR-202504-0001' },
    update: {},
    create: {
      returnNumber: 'SR-202504-0001',
      originalBillId: bill1.id,
      returnDate: d(21),
      returnReason: 'Adverse reaction reported — patient discontinued on doctor advice',
      initiatedBy: counterUser.id,
      approvedBy: managerUser.id,
      approvedAt: d(20),
      status: 'approved',
      totalRefundAmount: 85 * 0.7 * 1.12, // 1 unit, 30% disc, 12% GST
      items: {
        create: [{
          billItemId: 'bi-1-1',
          drugId: 'seed-drug-1',
          batchId: 'batch-MX-2401',
          quantityReturned: 1,
          refundAmount: +(85 * 0.7 * 1.12).toFixed(2),
          returnToStock: true,
        }],
      },
    },
  })

  // SR-2: Pending approval — patient returned Tobradex from bill4
  await prisma.salesReturn.upsert({
    where: { returnNumber: 'SR-202504-0002' },
    update: {},
    create: {
      returnNumber: 'SR-202504-0002',
      originalBillId: bill4.id,
      returnDate: d(3),
      returnReason: 'Doctor changed prescription — Tobradex not required',
      initiatedBy: counterUser.id,
      status: 'pending_approval',
      totalRefundAmount: 0, // BPL patient — free
      items: {
        create: [{
          billItemId: 'bi-4-1',
          drugId: 'seed-drug-7',
          batchId: 'batch-TBX-2401',
          quantityReturned: 1,
          refundAmount: 0,
          returnToStock: true,
        }],
      },
    },
  })

  // SR-3: Rejected
  await prisma.salesReturn.upsert({
    where: { returnNumber: 'SR-202504-0003' },
    update: {},
    create: {
      returnNumber: 'SR-202504-0003',
      originalBillId: bill3.id,
      returnDate: d(14),
      returnReason: 'Patient says wrong medicine dispensed',
      initiatedBy: counterUser.id,
      approvedBy: managerUser.id,
      approvedAt: d(13),
      rejectionReason: 'Bill verified — correct medicine dispensed as per prescription. Patient claims dismissed.',
      status: 'rejected',
      totalRefundAmount: 0,
      items: {
        create: [{
          billItemId: 'bi-3-1',
          drugId: 'seed-drug-2',
          batchId: 'batch-TM-2401',
          quantityReturned: 1,
          refundAmount: 0,
          returnToStock: false,
        }],
      },
    },
  })
  console.log('   ✓ SR-202504-0001 (approved — Moxifloxacin return)')
  console.log('   ✓ SR-202504-0002 (pending approval — Tobradex return)')
  console.log('   ✓ SR-202504-0003 (rejected — Timolol claim dismissed)\n')

  // ── 7. Purchase returns ────────────────────────────────────────────────────
  console.log('↩️   Creating purchase returns…')

  await prisma.purchaseReturn.upsert({
    where: { returnNumber: 'PR-202504-0001' },
    update: {},
    create: {
      returnNumber: 'PR-202504-0001',
      originalGrnId: grn1.id,
      supplierId: supplier1.id,
      returnDate: d(20),
      returnReason: 'short_expiry',
      initiatedBy: purchaseUser.id,
      approvedBy: managerUser.id,
      approvedAt: d(19),
      status: 'approved',
      totalReturnAmount: 10 * 70 * 0.95, // 10 units, rate 70, 5% disc
      notes: 'Prednisolone batch PD-2303 has only 70 days remaining — returning 10 units to supplier',
      items: {
        create: [{
          drugId: 'seed-drug-4',
          batchId: 'batch-PD-2303',
          quantityReturned: 10,
          returnValue: +(10 * 70 * 0.95).toFixed(2),
        }],
      },
    },
  })

  await prisma.purchaseReturn.upsert({
    where: { returnNumber: 'PR-202505-0001' },
    update: {},
    create: {
      returnNumber: 'PR-202505-0001',
      originalGrnId: grn2.id,
      supplierId: supplier2.id,
      returnDate: d(1),
      returnReason: 'quality',
      initiatedBy: purchaseUser.id,
      status: 'pending_approval',
      totalReturnAmount: 5 * 260,
      notes: 'Latanoprost batch LAT-2301 — suspected counterfeit packaging, pending quality check',
      items: {
        create: [{
          drugId: 'seed-drug-3',
          batchId: 'batch-LAT-2301',
          quantityReturned: 5,
          returnValue: +(5 * 260).toFixed(2),
        }],
      },
    },
  })
  console.log('   ✓ PR-202504-0001 (approved — Prednisolone short expiry)')
  console.log('   ✓ PR-202505-0001 (pending — Latanoprost quality issue)\n')

  // ── 8. Reports (sample queued/ready) ──────────────────────────────────────
  console.log('📊  Creating sample reports…')

  await prisma.report.upsert({
    where: { id: 'demo-report-1' },
    update: {},
    create: {
      id: 'demo-report-1',
      reportDefId: 'daily-sales-summary',
      reportName: 'Daily Sales Summary',
      category: 'management',
      status: 'ready',
      requestedBy: managerUser.id,
      requestedAt: d(1),
      params: { date: d(1).toISOString() },
      periodLabel: 'Yesterday',
      format: 'pdf',
      filePath: '/PharmacyReports/daily-sales-summary-yesterday.pdf',
      fileSizeBytes: 48200,
      generatedAt: d(1),
    },
  })

  await prisma.report.upsert({
    where: { id: 'demo-report-2' },
    update: {},
    create: {
      id: 'demo-report-2',
      reportDefId: 'monthly-purchase-register',
      reportName: 'Monthly Purchase Register (Form 17)',
      category: 'compliance',
      status: 'ready',
      requestedBy: managerUser.id,
      requestedAt: dm(1),
      params: { from: dm(1).toISOString(), to: new Date().toISOString() },
      periodLabel: 'Apr 2025',
      format: 'excel',
      filePath: '/PharmacyReports/form17-apr-2025.xlsx',
      fileSizeBytes: 32100,
      generatedAt: dm(1),
    },
  })

  await prisma.report.upsert({
    where: { id: 'demo-report-3' },
    update: {},
    create: {
      id: 'demo-report-3',
      reportDefId: 'h1-sugam-export',
      reportName: 'H1 Sugam CSV Export',
      category: 'compliance',
      status: 'ready',
      requestedBy: managerUser.id,
      requestedAt: d(3),
      params: { from: dm(1).toISOString(), to: new Date().toISOString() },
      periodLabel: 'Apr 2025',
      format: 'csv',
      filePath: '/PharmacyReports/h1-sugam-apr-2025.csv',
      fileSizeBytes: 4800,
      generatedAt: d(3),
    },
  })

  await prisma.report.upsert({
    where: { id: 'demo-report-4' },
    update: {},
    create: {
      id: 'demo-report-4',
      reportDefId: 'gst-summary',
      reportName: 'GST Summary Report',
      category: 'gst',
      status: 'failed',
      requestedBy: adminUser.id,
      requestedAt: d(2),
      params: { from: dm(1).toISOString(), to: new Date().toISOString() },
      periodLabel: 'Apr 2025',
      format: 'excel',
      errorMessage: 'Report generation failed: no GST entries found for selected period',
    },
  })
  console.log('   ✓ 4 reports (2 ready, 1 failed, 1 compliance)\n')

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('━'.repeat(60))
  console.log('✅  Demo seed complete!\n')
  console.log('What you can explore now:')
  console.log('')
  console.log('  Purchasing   → GRN-202504-0001, -0002 (confirmed) + -0003 (draft)')
  console.log('  Inventory    → 11 batches: 1 quarantined, 1 near-expiry, 2 low-stock')
  console.log('  Billing      → 8 bills (BILL-202504-0001 to -0007, BILL-202505-0001)')
  console.log('  Returns      → 3 sales (approved/pending/rejected) + 2 purchase returns')
  console.log('  Form 17      → 7 H/H1 entries from confirmed GRNs')
  console.log('  Form 18      → entries auto-created for all H/H1 dispensing')
  console.log('  Reports      → 3 ready + 1 failed in report centre')
  console.log('')
  console.log('  Counter login → bills for BPL patients show 100% discount')
  console.log('  Manager login → can approve SR-202504-0002 (pending)')
  console.log('━'.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
