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

export interface BillPDFProps {
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
  function BillPDF({ bill, className }, ref) {
    const billDate = format(new Date(bill.createdAt), 'dd/MM/yyyy HH:mm')

    return (
      <>
        {/* Print styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .bill-print-root,
            .bill-print-root * {
              visibility: visible;
            }
            .bill-print-root {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              margin: 0;
              padding: 0;
            }
            @page {
              size: A5 portrait;
              margin: 10mm;
            }
          }
        `}</style>

        <div
          ref={ref}
          className={`bill-print-root bg-white text-slate-900 font-mono text-[11px] leading-snug p-4 w-[148mm] mx-auto ${className ?? ''}`}
        >
          {/* Hospital Header */}
          <div className="text-center mb-2">
            <p className="text-[15px] font-bold tracking-wide">
              Sowcarpet Eye Hospital Pharmacy
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              Drug License No: TN-DL-XXXXX | GSTIN: 33AAACA1234C1Z5
            </p>
          </div>

          {/* Separator */}
          <div className="border-t border-b border-slate-800 py-0.5 my-2 text-center text-[9px] text-slate-500 tracking-widest uppercase">
            Cash Bill
          </div>

          {/* Bill Info + Patient Info */}
          <div className="grid grid-cols-2 gap-x-4 mb-3 text-[10px]">
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold">Bill No:</span>{' '}
                <span className="font-mono">{bill.billNumber}</span>
              </div>
              <div>
                <span className="font-semibold">Date:</span> {billDate}
              </div>
              <div>
                <span className="font-semibold">Payment:</span>{' '}
                <span className="capitalize">{bill.paymentMode}</span>
              </div>
              {bill.prescriptionNo && (
                <div>
                  <span className="font-semibold">Rx No:</span> {bill.prescriptionNo}
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold">Patient:</span> {bill.patient.name}
              </div>
              <div>
                <span className="font-semibold">UHID:</span>{' '}
                <span className="font-mono">{bill.patient.hospitalPatientId}</span>
              </div>
              {(bill.patient.age != null || bill.patient.gender) && (
                <div>
                  <span className="font-semibold">Age/Sex:</span>{' '}
                  {bill.patient.age != null ? `${bill.patient.age} yrs` : '—'}
                  {bill.patient.gender ? ` / ${bill.patient.gender}` : ''}
                </div>
              )}
              <div>
                <span className="font-semibold">Category:</span>{' '}
                <span className="capitalize">{bill.patient.patientCategory}</span>
              </div>
              {bill.doctor && (
                <div>
                  <span className="font-semibold">Doctor:</span> {bill.doctor.name}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-[9.5px] border-collapse mb-3">
            <thead>
              <tr className="border-t border-b border-slate-700">
                <th className="text-left py-1 pr-1 font-semibold w-5">#</th>
                <th className="text-left py-1 pr-1 font-semibold">Drug</th>
                <th className="text-center py-1 px-1 font-semibold">Batch</th>
                <th className="text-center py-1 px-1 font-semibold">Exp</th>
                <th className="text-center py-1 px-1 font-semibold">Qty</th>
                <th className="text-right py-1 px-1 font-semibold">MRP</th>
                <th className="text-right py-1 px-1 font-semibold">Disc%</th>
                <th className="text-right py-1 pl-1 font-semibold">Net</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-200"
                >
                  <td className="py-0.5 pr-1 text-slate-500">{idx + 1}</td>
                  <td className="py-0.5 pr-1">
                    <span className="font-medium">{item.drugName}</span>
                    {item.schedule && (
                      <span className="ml-1 text-[8px] bg-slate-100 border border-slate-300 rounded px-0.5 text-slate-600">
                        {scheduleLabels[item.schedule] ?? item.schedule.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-center font-mono text-slate-600">
                    {item.batchNo}
                  </td>
                  <td className="py-0.5 px-1 text-center text-slate-600">
                    {item.expiryDate}
                  </td>
                  <td className="py-0.5 px-1 text-center">{item.quantity}</td>
                  <td className="py-0.5 px-1 text-right">
                    {inr(item.mrpPerUnit)}
                  </td>
                  <td className="py-0.5 px-1 text-right text-slate-600">
                    {item.discountPct > 0 ? `${item.discountPct}%` : '—'}
                  </td>
                  <td className="py-0.5 pl-1 text-right font-medium">
                    {inr(item.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-4">
            <div className="w-48 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Amount</span>
                <span>{inr(bill.grossAmount)}</span>
              </div>
              {bill.totalDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Total Discount</span>
                  <span>- {inr(bill.totalDiscount)}</span>
                </div>
              )}
              {bill.totalGst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST</span>
                  <span>{inr(bill.totalGst)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[12px] border-t border-slate-700 pt-1 mt-1">
                <span>Net Payable</span>
                <span>{inr(bill.netPayable)}</span>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* Footer */}
          <div className="text-center text-[9px] text-slate-500 space-y-0.5">
            <p className="font-medium text-slate-700">
              Thank you for choosing Sowcarpet Eye Hospital
            </p>
            <p>This is a computer generated bill. No signature required.</p>
          </div>
        </div>
      </>
    )
  }
)

BillPDF.displayName = 'BillPDF'
