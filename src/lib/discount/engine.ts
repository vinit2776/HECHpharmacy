export interface DiscountInput {
  prescriptionSource: 'internal' | 'external'
  patientCategory: 'bpl' | 'general'
  discountApplicable: boolean
  bplDiscountPct: number
  generalDiscountPct: number
  mrpPerUnit: number
  quantity: number
  gstRate: number
}

export interface LineCalculation {
  discountPctApplied: number
  mrpLineTotal: number
  discountAmount: number
  taxableAmount: number
  gstAmount: number
  lineNetAmount: number
  discountLabel: string
}

const round = (n: number) => Math.round(n * 100) / 100

export function calculateLine(input: DiscountInput): LineCalculation {
  let pct = 0
  let discountLabel = 'No discount'

  if (input.prescriptionSource === 'external') {
    discountLabel = 'MRP (External)'
  } else if (!input.discountApplicable) {
    discountLabel = 'No discount'
  } else {
    if (input.patientCategory === 'bpl') {
      pct = input.bplDiscountPct
      discountLabel = pct > 0 ? `BPL ${pct}%` : 'No discount'
    } else {
      pct = input.generalDiscountPct
      discountLabel = pct > 0 ? `General ${pct}%` : 'No discount'
    }
  }

  const mrp = round(input.mrpPerUnit * input.quantity)
  const disc = round(mrp * pct / 100)
  // MRP is GST-inclusive: back-calculate base and GST from the MRP after discount
  const lineAfterDisc = round(mrp - disc)
  const taxable = round(lineAfterDisc / (1 + input.gstRate / 100))
  const gst = round(lineAfterDisc - taxable)

  return {
    discountPctApplied: pct,
    mrpLineTotal: mrp,
    discountAmount: disc,
    taxableAmount: taxable,
    gstAmount: gst,
    lineNetAmount: lineAfterDisc,  // patient pays MRP minus any discount
    discountLabel,
  }
}
