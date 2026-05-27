import { prisma } from '../../prisma'
import { startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from 'date-fns'

type QueryFn = (params: Record<string, string>) => Promise<any>

function parseDateRange(params: Record<string, string>) {
  const from = params.from_date ? startOfDay(parseISO(params.from_date)) : startOfDay(new Date())
  const to = params.to_date ? endOfDay(parseISO(params.to_date)) : endOfDay(new Date())
  return { from, to }
}

function parseMonth(params: Record<string, string>) {
  const d = params.month ? parseISO(`${params.month}-01`) : new Date()
  return { from: startOfMonth(d), to: endOfMonth(d) }
}

async function dailySalesSummary(params: Record<string, string>) {
  const date = params.date ? parseISO(params.date) : new Date()
  const from = startOfDay(date)
  const to = endOfDay(date)

  const bills = await prisma.salesBill.findMany({
    where: { billDate: { gte: from, lte: to }, status: 'active' },
    include: { patient: true, items: true, servedByUser: true },
  })

  const totals = bills.reduce(
    (acc, b) => ({
      count: acc.count + 1,
      mrp: acc.mrp + Number(b.subtotalMrp),
      discount: acc.discount + Number(b.totalDiscountAmount),
      gst: acc.gst + Number(b.totalGstAmount),
      net: acc.net + Number(b.netAmount),
    }),
    { count: 0, mrp: 0, discount: 0, gst: 0, net: 0 }
  )

  const byPaymentMode = bills.reduce((acc: any, b) => {
    acc[b.paymentMode] = (acc[b.paymentMode] ?? 0) + Number(b.netAmount)
    return acc
  }, {})

  return { date: params.date, bills, totals, byPaymentMode }
}

async function form17Report(params: Record<string, string>) {
  const { from, to } = parseDateRange(params)
  return prisma.registerForm17.findMany({
    where: { entryDate: { gte: from, lte: to } },
    include: { drug: true, grn: { include: { supplier: true } } },
    orderBy: { entryDate: 'asc' },
  })
}

async function form18Report(params: Record<string, string>) {
  const { from, to } = parseDateRange(params)
  return prisma.registerForm18.findMany({
    where: { entryDate: { gte: from, lte: to } },
    include: { drug: true },
    orderBy: { entryDate: 'asc' },
  })
}

async function h1Register(params: Record<string, string>) {
  const { from, to } = parseMonth(params)
  return prisma.registerForm18.findMany({
    where: { entryDate: { gte: from, lte: to }, isH1: true },
    include: { drug: true },
    orderBy: { entryDate: 'asc' },
  })
}

async function nearExpiry(params: Record<string, string>) {
  const asOf = params.date ? parseISO(params.date) : new Date()
  const in90 = new Date(asOf.getTime() + 90 * 24 * 60 * 60 * 1000)
  return prisma.inventoryBatch.findMany({
    where: {
      expiryDate: { gt: asOf, lte: in90 },
      quantityAvailable: { gt: 0 },
      isQuarantined: false,
    },
    include: { drug: true, supplier: true },
    orderBy: { expiryDate: 'asc' },
  })
}

async function stockValuation(params: Record<string, string>) {
  const batches = await prisma.inventoryBatch.findMany({
    where: { quantityAvailable: { gt: 0 } },
    include: { drug: true },
    orderBy: [{ drug: { name: 'asc' } }, { expiryDate: 'asc' }],
  })
  return batches.map((b) => ({
    ...b,
    mrpValue: Number(b.mrpPerUnit) * b.quantityAvailable,
    purchaseValue: Number(b.purchaseRatePerUnit) * b.quantityAvailable,
  }))
}

async function monthlyCharity(params: Record<string, string>) {
  const { from, to } = parseMonth(params)
  const bills = await prisma.salesBill.findMany({
    where: {
      billDate: { gte: from, lte: to },
      status: 'active',
      patientCategory: 'bpl',
    },
    include: { patient: true },
  })
  const totals = bills.reduce(
    (acc, b) => ({
      count: acc.count + 1,
      discount: acc.discount + Number(b.totalDiscountAmount),
      net: acc.net + Number(b.netAmount),
    }),
    { count: 0, discount: 0, net: 0 }
  )
  return { month: params.month, bills, totals }
}

async function bplSummary(params: Record<string, string>) {
  const { from, to } = parseMonth(params)
  const bills = await prisma.salesBill.findMany({
    where: { billDate: { gte: from, lte: to }, status: 'active', patientCategory: 'bpl' },
    include: { patient: true },
  })
  const uniquePatients = new Set(bills.map((b) => b.patientId))
  return { month: params.month, bills, patientCount: uniquePatients.size }
}

async function gstr1Export(params: Record<string, string>) {
  const { from, to } = parseMonth(params)
  const items = await prisma.salesBillItem.findMany({
    where: { bill: { billDate: { gte: from, lte: to }, status: 'active' } },
    include: { bill: true },
  })
  const hsnMap = new Map<string, { hsnCode: string; taxable: number; gst: number; cgst: number; sgst: number }>()
  for (const item of items) {
    const existing = hsnMap.get(item.hsnCode)
    const taxable = Number(item.taxableAmount)
    const gst = Number(item.gstAmount)
    hsnMap.set(item.hsnCode, {
      hsnCode: item.hsnCode,
      taxable: (existing?.taxable ?? 0) + taxable,
      gst: (existing?.gst ?? 0) + gst,
      cgst: (existing?.cgst ?? 0) + gst / 2,
      sgst: (existing?.sgst ?? 0) + gst / 2,
    })
  }
  return { month: params.month, hsnSummary: Array.from(hsnMap.values()) }
}

async function gstr3bInput(params: Record<string, string>) {
  const { from, to } = parseMonth(params)
  const bills = await prisma.salesBill.findMany({
    where: { billDate: { gte: from, lte: to }, status: 'active' },
  })
  const totals = bills.reduce(
    (acc, b) => ({
      taxable: acc.taxable + Number(b.taxableAmount),
      gst: acc.gst + Number(b.totalGstAmount),
      cgst: acc.cgst + Number(b.totalGstAmount) / 2,
      sgst: acc.sgst + Number(b.totalGstAmount) / 2,
    }),
    { taxable: 0, gst: 0, cgst: 0, sgst: 0 }
  )
  return { month: params.month, totals }
}

async function monthlyOperations(params: Record<string, string>) {
  const { from, to } = parseMonth(params)
  const bills = await prisma.salesBill.findMany({
    where: { billDate: { gte: from, lte: to } },
  })
  const grns = await prisma.purchaseGrn.findMany({
    where: { receivedDate: { gte: from, lte: to }, status: 'confirmed' },
  })
  const returns = await prisma.salesReturn.findMany({
    where: { returnDate: { gte: from, lte: to }, status: 'approved' },
  })
  return { month: params.month, bills, grns, returns }
}

async function grossMargin(params: Record<string, string>) {
  const { from, to } = parseDateRange(params)
  const items = await prisma.salesBillItem.findMany({
    where: { bill: { billDate: { gte: from, lte: to }, status: 'active' } },
    include: { drug: true, batch: true },
  })
  return items.map((item) => ({
    drugName: item.drugName,
    quantity: item.quantity,
    mrpTotal: Number(item.mrpPerUnit) * item.quantity,
    purchaseCost: Number(item.batch.purchaseRatePerUnit) * item.quantity,
    saleAmount: Number(item.lineNetAmount),
    margin: Number(item.lineNetAmount) - Number(item.batch.purchaseRatePerUnit) * item.quantity,
  }))
}

async function drugSales(params: Record<string, string>) {
  const { from, to } = parseDateRange(params)
  const items = await prisma.salesBillItem.findMany({
    where: { bill: { billDate: { gte: from, lte: to }, status: 'active' } },
    include: { drug: true },
  })
  const drugMap = new Map<string, any>()
  for (const item of items) {
    const existing = drugMap.get(item.drugId)
    drugMap.set(item.drugId, {
      drugName: item.drugName,
      schedule: item.drug.schedule,
      qty: (existing?.qty ?? 0) + item.quantity,
      net: (existing?.net ?? 0) + Number(item.lineNetAmount),
    })
  }
  return Array.from(drugMap.values()).sort((a, b) => b.net - a.net)
}

async function doctorPrescriptions(params: Record<string, string>) {
  const { from, to } = parseDateRange(params)
  const bills = await prisma.salesBill.findMany({
    where: { billDate: { gte: from, lte: to }, status: 'active', prescriptionSource: 'internal' },
    include: { doctor: true, patient: true },
  })
  const docMap = new Map<string, any>()
  for (const bill of bills) {
    if (!bill.doctorId) continue
    const existing = docMap.get(bill.doctorId)
    docMap.set(bill.doctorId, {
      doctorName: bill.doctor?.name,
      regNo: bill.doctor?.registrationNo,
      billCount: (existing?.billCount ?? 0) + 1,
      netAmount: (existing?.netAmount ?? 0) + Number(bill.netAmount),
    })
  }
  return Array.from(docMap.values()).sort((a, b) => b.billCount - a.billCount)
}

async function patientHistory(params: Record<string, string>) {
  const { from, to } = parseDateRange(params)
  return prisma.salesBill.findMany({
    where: { billDate: { gte: from, lte: to } },
    include: { patient: true, items: { include: { drug: true } }, doctor: true },
    orderBy: { billDate: 'desc' },
  })
}

async function deadStock(params: Record<string, string>) {
  const asOf = params.date ? parseISO(params.date) : new Date()
  const cutoff = new Date(asOf.getTime() - 60 * 24 * 60 * 60 * 1000)
  const activeBatchIds = await prisma.salesBillItem.findMany({
    where: { bill: { billDate: { gte: cutoff } } },
    select: { batchId: true },
    distinct: ['batchId'],
  })
  const activeIds = new Set(activeBatchIds.map((b) => b.batchId))
  const batches = await prisma.inventoryBatch.findMany({
    where: { quantityAvailable: { gt: 0 } },
    include: { drug: true },
  })
  return batches.filter((b) => !activeIds.has(b.id))
}

async function annualStatement(params: Record<string, string>) {
  const year = parseInt(params.year ?? String(new Date().getFullYear()))
  const from = new Date(year, 0, 1)
  const to = new Date(year, 11, 31, 23, 59, 59)
  const [bills, grns, salesReturns] = await Promise.all([
    prisma.salesBill.findMany({ where: { billDate: { gte: from, lte: to }, status: 'active' } }),
    prisma.purchaseGrn.findMany({ where: { receivedDate: { gte: from, lte: to }, status: 'confirmed' } }),
    prisma.salesReturn.findMany({ where: { returnDate: { gte: from, lte: to }, status: 'approved' } }),
  ])
  const salesTotal = bills.reduce((acc, b) => acc + Number(b.netAmount), 0)
  const purchaseTotal = grns.reduce((acc, g) => acc + Number(g.netPayable), 0)
  const discountTotal = bills.reduce((acc, b) => acc + Number(b.totalDiscountAmount), 0)
  return { year, salesTotal, purchaseTotal, discountTotal, billCount: bills.length, grnCount: grns.length, returnCount: salesReturns.length }
}

export const reportQueries: Record<string, QueryFn> = {
  'daily-sales-summary': dailySalesSummary,
  'monthly-operations': monthlyOperations,
  'gross-margin': grossMargin,
  'drug-sales': drugSales,
  'doctor-prescriptions': doctorPrescriptions,
  'patient-history': patientHistory,
  'near-expiry': nearExpiry,
  'dead-stock': deadStock,
  'stock-valuation': stockValuation,
  'form-17': form17Report,
  'form-18': form18Report,
  'h1-register': h1Register,
  'gstr1-export': gstr1Export,
  'gstr3b-input': gstr3bInput,
  'monthly-charity': monthlyCharity,
  'bpl-summary': bplSummary,
  'annual-statement': annualStatement,
}
