'use client'

import React from 'react'
import { format } from 'date-fns'

const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

const scheduleLabels: Record<string, string> = {
  otc: 'OTC', g: 'G', h: 'H', h1: 'H1', e1: 'E1',
}

// ─── Amount in Words ──────────────────────────────────────────────────────────

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function numToWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' And ' + numToWords(n % 100) : '')
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '')
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '')
  return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '')
}

function amountInWords(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const rupees = Math.floor(rounded)
  const paise = Math.round((rounded - rupees) * 100)
  let w = 'Rupees ' + (rupees === 0 ? 'Zero' : numToWords(rupees))
  if (paise > 0) w += ' And ' + numToWords(paise) + ' Paise'
  return w + ' Only'
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PharmacyInfo {
  pharmacyName:   string
  address?:       string | null
  city?:          string | null
  state?:         string | null
  pincode?:       string | null
  phone?:         string | null
  gstin?:         string | null
  drugLicenseNo?: string | null
  stateCode?:     string | null
  stateName?:     string | null
}

export interface BillPDFProps {
  pharmacy?: PharmacyInfo
  bill: {
    billNumber:     string
    createdAt:      string
    servedBy?:      string
    patient: {
      name:              string
      hospitalPatientId: string
      phone?:            string | null
      age?:              number
      gender?:           string
      patientCategory:   string
    }
    doctor?:        { name: string }
    prescriptionNo?: string
    paymentMode:    string
    items: Array<{
      drugName:      string
      schedule:      string
      hsnCode?:      string
      batchNo:       string
      expiryDate:    string
      quantity:      number
      mrpPerUnit:    number
      discountPct:   number
      taxableAmount?: number
      gstRate?:      number
      gstAmount?:    number
      netAmount:     number
    }>
    grossAmount:   number
    totalDiscount: number
    totalGst:      number
    netPayable:    number
  }
  className?: string
}

// ─── Table cell helpers ───────────────────────────────────────────────────────

const TD = ({
  children, right, center, bold, small, colSpan, rowSpan, style, className,
}: {
  children?: React.ReactNode
  right?: boolean; center?: boolean; bold?: boolean; small?: boolean
  colSpan?: number; rowSpan?: number
  style?: React.CSSProperties; className?: string
}) => (
  <td
    colSpan={colSpan}
    rowSpan={rowSpan}
    className={className}
    style={{
      border: '1px solid #475569',
      padding: '3px 5px',
      fontSize: small ? '10px' : '11px',
      fontWeight: bold ? 700 : 400,
      textAlign: right ? 'right' : center ? 'center' : 'left',
      verticalAlign: 'top',
      ...style,
    }}
  >
    {children}
  </td>
)

const TH = ({
  children, right, center, colSpan, style,
}: {
  children?: React.ReactNode
  right?: boolean; center?: boolean; colSpan?: number; style?: React.CSSProperties
}) => (
  <th
    colSpan={colSpan}
    style={{
      border: '1px solid #475569',
      padding: '4px 5px',
      fontSize: '10.5px',
      fontWeight: 700,
      textAlign: right ? 'right' : center ? 'center' : 'left',
      verticalAlign: 'middle',
      backgroundColor: '#f8fafc',
      ...style,
    }}
  >
    {children}
  </th>
)

// ─── Component ────────────────────────────────────────────────────────────────

export const BillPDF = React.forwardRef<HTMLDivElement, BillPDFProps>(
  function BillPDF({ bill, pharmacy, className }, ref) {
    const billDate  = format(new Date(bill.createdAt), 'dd/MM/yyyy')
    const billTime  = format(new Date(bill.createdAt), 'HH:mm')

    const name      = pharmacy?.pharmacyName ?? 'HCEH Eye Hospital Pharmacy'
    const dlNo      = pharmacy?.drugLicenseNo ?? ''
    const gstin     = pharmacy?.gstin ?? ''
    const stateCode = pharmacy?.stateCode ?? ''
    const stateName = pharmacy?.stateName ?? pharmacy?.state ?? ''
    const address   = [pharmacy?.address, pharmacy?.city, pharmacy?.state, pharmacy?.pincode]
      .filter(Boolean).join(', ')
    const pharmPhone = pharmacy?.phone ?? ''

    const totalQty   = bill.items.reduce((s, i) => s + i.quantity, 0)
    const baseAmount = bill.netPayable - bill.totalGst  // taxable total
    const cgst       = bill.totalGst / 2
    const sgst       = bill.totalGst / 2

    // GST category breakdown (group by gstRate)
    const gstGroups = bill.items.reduce<Record<number, { base: number; gst: number; amount: number }>>(
      (acc, item) => {
        const rate = item.gstRate ?? 0
        if (!acc[rate]) acc[rate] = { base: 0, gst: 0, amount: 0 }
        acc[rate].base   += item.taxableAmount ?? 0
        acc[rate].gst    += item.gstAmount ?? 0
        acc[rate].amount += item.netAmount
        return acc
      },
      {}
    )

    const isWalkIn = !bill.patient.hospitalPatientId
    const category = isWalkIn ? 'Walk-in' : bill.patient.patientCategory === 'bpl' ? 'BPL' : 'Registered'

    const tableStyle: React.CSSProperties = {
      width: '100%',
      borderCollapse: 'collapse',
      tableLayout: 'fixed',
    }

    return (
      <>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .bill-print-root,
            .bill-print-root * { visibility: visible; }
            .bill-print-root {
              position: fixed;
              top: 0; left: 0;
              width: 100%;
              padding: 0 !important;
              margin: 0 !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>

        <div
          ref={ref}
          className={`bill-print-root bg-white text-slate-900 font-sans text-[11px] leading-snug w-[190mm] mx-auto ${className ?? ''}`}
        >
          {/* ── 1. HOSPITAL HEADER ───────────────────────────────────────── */}
          <table style={tableStyle}>
            <tbody>
              <tr>
                {/* Left: hospital info */}
                <td style={{
                  border: '1px solid #475569', padding: '6px 10px',
                  width: '65%', verticalAlign: 'top',
                }}>
                  <p style={{ fontSize: '17px', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                    {name}
                  </p>
                  {address && (
                    <p style={{ fontSize: '10px', textAlign: 'center', color: '#475569' }}>{address}</p>
                  )}
                  {pharmPhone && (
                    <p style={{ fontSize: '10px', textAlign: 'center', color: '#475569' }}>Ph: {pharmPhone}</p>
                  )}
                  {dlNo && (
                    <p style={{ fontSize: '10px', textAlign: 'center', color: '#475569' }}>DL No: {dlNo}</p>
                  )}
                </td>
                {/* Right: state + GSTIN */}
                <td style={{
                  border: '1px solid #475569', padding: '6px 10px',
                  verticalAlign: 'top', textAlign: 'right',
                }}>
                  {stateCode && (
                    <p style={{ fontSize: '10.5px', marginBottom: '2px' }}>State Code : <strong>{stateCode}</strong></p>
                  )}
                  {stateName && (
                    <p style={{ fontSize: '10.5px', marginBottom: '2px' }}>State Name : <strong>{stateName}</strong></p>
                  )}
                  {gstin && (
                    <p style={{ fontSize: '10.5px', fontWeight: 700 }}>GSTIN : {gstin}</p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 2. BILL META ─────────────────────────────────────────────── */}
          <table style={{ ...tableStyle, marginTop: '-1px' }}>
            <tbody>
              {/* Row 1: patient "To", bill number, date, Tax Invoice label */}
              <tr>
                <td style={{ border: '1px solid #475569', padding: '4px 8px', width: '30%', verticalAlign: 'top' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>To</p>
                  <p style={{ fontSize: '12px', fontWeight: 700 }}>{bill.patient.name}</p>
                  {bill.patient.hospitalPatientId && (
                    <p style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                      UHID: {bill.patient.hospitalPatientId}
                    </p>
                  )}
                  {bill.patient.phone && (
                    <p style={{ fontSize: '10px', color: '#64748b' }}>Ph: {bill.patient.phone}</p>
                  )}
                  {(bill.patient.age != null || bill.patient.gender) && (
                    <p style={{ fontSize: '10px', color: '#64748b' }}>
                      {bill.patient.age != null ? `${bill.patient.age} yrs` : ''}
                      {bill.patient.age != null && bill.patient.gender ? ' / ' : ''}
                      {bill.patient.gender ?? ''}
                    </p>
                  )}
                  <p style={{ fontSize: '10px', color: '#64748b' }}>Category: {category}</p>
                </td>
                <td style={{ border: '1px solid #475569', padding: '4px 8px', width: '20%', verticalAlign: 'top' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Terms</p>
                  <p style={{ fontWeight: 700 }}>C-CASH BILL</p>
                  {bill.prescriptionNo && (
                    <p style={{ fontSize: '10px', color: '#64748b' }}>Rx No: {bill.prescriptionNo}</p>
                  )}
                  {bill.doctor && (
                    <p style={{ fontSize: '10px', color: '#64748b' }}>Dr. {bill.doctor.name}</p>
                  )}
                </td>
                <td style={{ border: '1px solid #475569', padding: '4px 8px', width: '20%', verticalAlign: 'top' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Bill No &amp; Page No</p>
                  <p style={{ fontWeight: 700, fontFamily: 'monospace' }}>{bill.billNumber} &nbsp; 1/1</p>
                </td>
                <td style={{ border: '1px solid #475569', padding: '4px 8px', width: '15%', verticalAlign: 'top' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Bill Date</p>
                  <p style={{ fontWeight: 700 }}>{billDate}</p>
                  <p style={{ fontSize: '10px', color: '#64748b' }}>{billTime}</p>
                </td>
                <td style={{ border: '1px solid #475569', padding: '4px 8px', width: '15%', verticalAlign: 'middle', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {gstin ? 'Tax Invoice' : 'Cash Bill'}
                  </p>
                </td>
              </tr>
              {/* Row 2: salesman */}
              <tr>
                <td style={{ border: '1px solid #475569', padding: '3px 8px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Payment Mode</p>
                  <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{bill.paymentMode}</p>
                </td>
                <td colSpan={2} style={{ border: '1px solid #475569', padding: '3px 8px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Salesman Name</p>
                  <p style={{ fontWeight: 600 }}>{bill.servedBy ?? '—'}</p>
                </td>
                <td colSpan={2} style={{ border: '1px solid #475569', padding: '3px 8px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Delivery Type</p>
                  <p style={{ fontWeight: 600 }}>Counter</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 3. ITEMS TABLE ───────────────────────────────────────────── */}
          <table style={{ ...tableStyle, marginTop: '-1px' }}>
            <colgroup>
              <col style={{ width: '22px' }} />   {/* S.No */}
              <col />                              {/* Description */}
              <col style={{ width: '52px' }} />   {/* HSN/SAC */}
              <col style={{ width: '44px' }} />   {/* Batch */}
              <col style={{ width: '28px' }} />   {/* Exp */}
              <col style={{ width: '24px' }} />   {/* Qty */}
              <col style={{ width: '56px' }} />   {/* Rate (MRP) */}
              <col style={{ width: '28px' }} />   {/* Dis */}
              <col style={{ width: '34px' }} />   {/* GST% */}
              <col style={{ width: '44px' }} />   {/* GST */}
              <col style={{ width: '52px' }} />   {/* Total */}
            </colgroup>
            <thead>
              <tr>
                <TH center>S.No</TH>
                <TH>Description &amp; Packing</TH>
                <TH center>HSN /<br />SAC</TH>
                <TH center>Batch<br />No.</TH>
                <TH center>Exp</TH>
                <TH center>Qty</TH>
                <TH right>Rate</TH>
                <TH right>Dis</TH>
                <TH center>GST%</TH>
                <TH right>GST</TH>
                <TH right>Total</TH>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={idx}>
                  <TD center>{idx + 1}</TD>
                  <TD>
                    <span style={{ fontWeight: 600 }}>{item.drugName}</span>
                    {item.schedule && (
                      <span style={{
                        marginLeft: '4px', fontSize: '9px',
                        background: '#f1f5f9', border: '1px solid #cbd5e1',
                        borderRadius: '2px', padding: '0 2px', color: '#475569',
                      }}>
                        {scheduleLabels[item.schedule.toLowerCase()] ?? item.schedule.toUpperCase()}
                      </span>
                    )}
                  </TD>
                  <TD center small>{item.hsnCode ?? '—'}</TD>
                  <TD center small style={{ fontFamily: 'monospace' }}>{item.batchNo}</TD>
                  <TD center small>{item.expiryDate}</TD>
                  <TD center>{item.quantity}</TD>
                  <TD right style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(item.mrpPerUnit)}</TD>
                  <TD right>
                    {item.discountPct > 0 ? `${item.discountPct}%` : '—'}
                  </TD>
                  <TD center>
                    {(item.gstRate ?? 0) > 0 ? `${item.gstRate}%` : '—'}
                  </TD>
                  <TD right style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {(item.gstAmount ?? 0) > 0 ? inr(item.gstAmount!) : '—'}
                  </TD>
                  <TD right bold style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(item.netAmount)}</TD>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── 4. TOTALS ROW ────────────────────────────────────────────── */}
          <table style={{ ...tableStyle, marginTop: '6px' }}>
            <tbody>
              <tr>
                <TD style={{ width: '50px', backgroundColor: '#f8fafc' }} bold>
                  ITEMS: {bill.items.length}
                </TD>
                <TD style={{ width: '50px', backgroundColor: '#f8fafc' }} bold>
                  QTY: {totalQty}
                </TD>
                <TD bold style={{ backgroundColor: '#f8fafc' }}>
                  BASE: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(baseAmount)}</span>
                </TD>
                <TD bold style={{ backgroundColor: '#f8fafc' }}>
                  SGST: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(sgst)}</span>
                </TD>
                <TD bold style={{ backgroundColor: '#f8fafc' }}>
                  CGST: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(cgst)}</span>
                </TD>
                <TD bold style={{ backgroundColor: '#f8fafc' }}>
                  GST: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(bill.totalGst)}</span>
                </TD>
                <TD bold right style={{ backgroundColor: '#f8fafc', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                  AMOUNT: {inr(bill.netPayable)}
                </TD>
              </tr>
            </tbody>
          </table>

          {/* ── 5. PAYMENT SUMMARY ───────────────────────────────────────── */}
          <table style={{ ...tableStyle, marginTop: '-1px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #475569', padding: '6px 10px', width: '55%', verticalAlign: 'top', fontSize: '10.5px', color: '#475569' }}>
                  {/* empty left cell for alignment */}
                </td>
                <td style={{ border: '1px solid #475569', padding: '6px 10px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10.5px', color: '#475569' }}>
                    <span>Gross Amount</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(bill.grossAmount)}</span>
                  </div>
                  {bill.totalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10.5px', color: '#16a34a' }}>
                      <span>Discount</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>− {inr(bill.totalDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10.5px', color: '#475569' }}>
                    <span>SGST</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(sgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10.5px', color: '#475569' }}>
                    <span>CGST</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(cgst)}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    borderTop: '1.5px solid #334155', marginTop: '4px', paddingTop: '4px',
                    fontSize: '14px', fontWeight: 800,
                  }}>
                    <span>Net Payable</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(bill.netPayable)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 6. AMOUNT IN WORDS ───────────────────────────────────────── */}
          <table style={{ ...tableStyle, marginTop: '-1px' }}>
            <tbody>
              <tr>
                <TD bold style={{ fontSize: '10.5px', backgroundColor: '#f8fafc' }}>Amount in Words :</TD>
                <TD style={{ fontSize: '10.5px' }}>{amountInWords(bill.netPayable)}</TD>
              </tr>
            </tbody>
          </table>

          {/* ── 7. FOOTER ────────────────────────────────────────────────── */}
          <table style={{ ...tableStyle, marginTop: '-1px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #475569', padding: '4px 8px', width: '40%', fontSize: '10px', color: '#64748b' }}>
                  Remarks: &nbsp;
                </td>
                <td colSpan={2} style={{ border: '1px solid #475569', padding: '4px 8px', fontSize: '10px', color: '#64748b', verticalAlign: 'top' }}>
                  E &amp; O.E
                  <br />
                  <em>Medicines once sold will not be taken back or exchanged without a valid receipt and original packaging. Refrigerated items cannot be returned.</em>
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ border: '1px solid #475569', padding: '4px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                  This is a computer generated bill. No signature required. &nbsp;|&nbsp; Thank you for choosing {name}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    )
  }
)

BillPDF.displayName = 'BillPDF'
