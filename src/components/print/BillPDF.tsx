'use client'

import React from 'react'
import { format } from 'date-fns'

const inr = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

const scheduleLabels: Record<string, string> = {
  otc: 'OTC',
  g: 'G',
  h: 'H',
  h1: 'H1',
  e1: 'E1',
}

export interface PharmacyInfo {
  pharmacyName:  string
  address?:      string | null
  city?:         string | null
  state?:        string | null
  pincode?:      string | null
  phone?:        string | null
  gstin?:        string | null
  drugLicenseNo?: string | null
}

export interface BillPDFProps {
  pharmacy?: PharmacyInfo
  bill: {
    billNumber: string
    createdAt: string
    patient: {
      name: string
      hospitalPatientId: string
      age?: number
      gender?: string
      patientCategory: string
    }
    doctor?: { name: string }
    prescriptionNo?: string
    paymentMode: string
    items: Array<{
      drugName: string
      schedule: string
      batchNo: string
      expiryDate: string
      quantity: number
      mrpPerUnit: number
      discountPct: number
      netAmount: number
    }>
    grossAmount: number
    totalDiscount: number
    totalGst: number
    netPayable: number
  }
  className?: string
}

export const BillPDF = React.forwardRef<HTMLDivElement, BillPDFProps>(
  function BillPDF({ bill, pharmacy, className }, ref) {
    const billDate = format(new Date(bill.createdAt), 'dd/MM/yyyy HH:mm')

    const name    = pharmacy?.pharmacyName ?? 'HCEH Eye Hospital Pharmacy'
    const dlNo    = pharmacy?.drugLicenseNo ?? ''
    const gstin   = pharmacy?.gstin ?? ''
    const address = [pharmacy?.address, pharmacy?.city, pharmacy?.state, pharmacy?.pincode]
      .filter(Boolean).join(', ')
    const phone   = pharmacy?.phone ?? ''

    return (
      <>
        {/* Print styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .bill-print-root,
            .bill-print-root * { visibility: visible; }
            .bill-print-root {
              position: fixed;
              top: 0; left: 0;
              width: 100%;
              /* Let @page margin handle the safe zone; no extra padding needed */
              padding: 0 !important;
              margin: 0 !important;
            }
            @page {
              size: A5 portrait;
              margin: 14mm;   /* printer-safe zone on all sides */
            }
          }
        `}</style>

        <div
          ref={ref}
          className={`bill-print-root bg-white text-slate-900 font-mono text-[11px] leading-relaxed p-5 w-[148mm] mx-auto ${className ?? ''}`}
        >
          {/* Hospital Header */}
          <div className="text-center mb-3">
            <p className="text-[15px] font-bold tracking-wide uppercase">{name}</p>
            {(dlNo || gstin) && (
              <p className="text-[9px] text-slate-600 mt-0.5">
                {dlNo && <>Drug License No: {dlNo}</>}
                {dlNo && gstin && <>&nbsp;|&nbsp;</>}
                {gstin && <>GSTIN: {gstin}</>}
              </p>
            )}
            {(address || phone) && (
              <p className="text-[9px] text-slate-600">
                {address}
                {address && phone && <>&nbsp;|&nbsp;</>}
                {phone && <>Ph: {phone}</>}
              </p>
            )}
          </div>

          {/* Cash Bill strip */}
          <div className="border-t-2 border-b-2 border-slate-800 py-0.5 my-3 text-center text-[9px] text-slate-500 tracking-widest uppercase">
            Cash Bill
          </div>

          {/* Bill Info + Patient Info */}
          <div className="grid grid-cols-2 gap-x-5 mb-4 text-[10.5px]">
            <div className="space-y-1">
              <div><span className="font-bold">Bill No :</span> {bill.billNumber}</div>
              <div><span className="font-bold">Date    :</span> {billDate}</div>
              <div>
                <span className="font-bold">Payment :</span>{' '}
                <span className="capitalize">{bill.paymentMode}</span>
              </div>
              {bill.prescriptionNo && (
                <div><span className="font-bold">Rx No   :</span> {bill.prescriptionNo}</div>
              )}
            </div>
            <div className="space-y-1">
              <div><span className="font-bold">Patient  :</span> {bill.patient.name}</div>
              <div><span className="font-bold">UHID     :</span> {bill.patient.hospitalPatientId}</div>
              {(bill.patient.age != null || bill.patient.gender) && (
                <div>
                  <span className="font-bold">Age/Sex  :</span>{' '}
                  {bill.patient.age != null ? `${bill.patient.age} yrs` : '—'}
                  {bill.patient.gender ? ` / ${bill.patient.gender}` : ''}
                </div>
              )}
              <div>
                <span className="font-bold">Category :</span>{' '}
                <span className="capitalize">{bill.patient.patientCategory}</span>
              </div>
              {bill.doctor && (
                <div><span className="font-bold">Doctor   :</span> {bill.doctor.name}</div>
              )}
            </div>
          </div>

          {/* Items Table — fixed layout so columns don't shift */}
          <table className="w-full text-[10px] border-collapse mb-4" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '20px' }} />   {/* # */}
              <col />                              {/* Drug — fills remaining space */}
              <col style={{ width: '52px' }} />   {/* Batch */}
              <col style={{ width: '36px' }} />   {/* Exp */}
              <col style={{ width: '28px' }} />   {/* Qty */}
              <col style={{ width: '54px' }} />   {/* MRP */}
              <col style={{ width: '38px' }} />   {/* Disc% */}
              <col style={{ width: '58px' }} />   {/* Net */}
            </colgroup>
            <thead>
              <tr className="border-t-2 border-b-2 border-slate-700">
                <th className="text-left py-1.5 pr-1 font-bold text-[9.5px]">#</th>
                <th className="text-left py-1.5 pr-1 font-bold text-[9.5px]">Drug</th>
                <th className="text-center py-1.5 px-1 font-bold text-[9.5px]">Batch</th>
                <th className="text-center py-1.5 px-1 font-bold text-[9.5px]">Exp</th>
                <th className="text-center py-1.5 px-1 font-bold text-[9.5px]">Qty</th>
                <th className="text-right py-1.5 px-1 font-bold text-[9.5px]">MRP</th>
                <th className="text-right py-1.5 px-1 font-bold text-[9.5px]">Disc%</th>
                <th className="text-right py-1.5 pl-1 font-bold text-[9.5px]">Net</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-1 pr-1 text-slate-500 align-top">{idx + 1}</td>
                  <td className="py-1 pr-1 align-top leading-snug">
                    <span className="font-medium">{item.drugName}</span>
                    {item.schedule && (
                      <span className="ml-1 text-[8px] bg-slate-100 border border-slate-300 rounded px-0.5 text-slate-600 whitespace-nowrap align-middle">
                        {scheduleLabels[item.schedule] ?? item.schedule.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-1 text-center text-slate-600 whitespace-nowrap align-top">
                    {item.batchNo}
                  </td>
                  <td className="py-1 px-1 text-center text-slate-600 whitespace-nowrap align-top">
                    {item.expiryDate}
                  </td>
                  <td className="py-1 px-1 text-center align-top">{item.quantity}</td>
                  <td className="py-1 px-1 text-right whitespace-nowrap align-top" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {inr(item.mrpPerUnit)}
                  </td>
                  <td className="py-1 px-1 text-right text-slate-600 whitespace-nowrap align-top">
                    {item.discountPct > 0 ? `${item.discountPct}%` : '—'}
                  </td>
                  <td className="py-1 pl-1 text-right font-medium whitespace-nowrap align-top" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {inr(item.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-5">
            <div className="w-52 text-[10.5px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Gross Amount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(bill.grossAmount)}</span>
              </div>
              {bill.totalDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Total Discount</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>− {inr(bill.totalDiscount)}</span>
                </div>
              )}
              {bill.totalGst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(bill.totalGst)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[13px] border-t-2 border-slate-700 pt-1.5 mt-1">
                <span>Net Payable</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(bill.netPayable)}</span>
              </div>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="border-t border-dashed border-slate-400 my-3" />

          {/* Footer */}
          <div className="text-center text-[9.5px] text-slate-500 space-y-0.5">
            <p className="font-bold text-slate-700">
              Thank you for choosing HCEH Eye Hospital
            </p>
            <p>This is a computer generated bill. No signature required.</p>
          </div>
        </div>
      </>
    )
  }
)

BillPDF.displayName = 'BillPDF'
