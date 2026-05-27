export type ReportCategory = 'management' | 'compliance' | 'gst' | 'trust'
export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json'

export interface ReportParam {
  key: string
  label: string
  type: 'date' | 'date_range' | 'month' | 'year'
  required: boolean
}

export interface ReportDefinition {
  id: string
  name: string
  category: ReportCategory
  formats: ReportFormat[]
  params: ReportParam[]
  schedule?: string
  retention_days: number
  statutory: boolean
}

export const REPORT_REGISTRY: ReportDefinition[] = [
  {
    id: 'daily-sales-summary',
    name: 'Daily Sales Summary',
    category: 'management',
    formats: ['pdf', 'xlsx'],
    params: [{ key: 'date', label: 'Date', type: 'date', required: true }],
    schedule: '0 21 * * *',
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'monthly-operations',
    name: 'Monthly Operations Summary',
    category: 'management',
    formats: ['pdf'],
    params: [{ key: 'month', label: 'Month', type: 'month', required: true }],
    schedule: '0 8 1 * *',
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'gross-margin',
    name: 'Gross Margin Report',
    category: 'management',
    formats: ['xlsx'],
    params: [{ key: 'date_range', label: 'Date Range', type: 'date_range', required: true }],
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'drug-sales',
    name: 'Drug-wise Sales Report',
    category: 'management',
    formats: ['pdf', 'xlsx'],
    params: [{ key: 'date_range', label: 'Date Range', type: 'date_range', required: true }],
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'doctor-prescriptions',
    name: 'Doctor-wise Prescription Report',
    category: 'management',
    formats: ['pdf'],
    params: [{ key: 'date_range', label: 'Date Range', type: 'date_range', required: true }],
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'patient-history',
    name: 'Patient Purchase History',
    category: 'management',
    formats: ['pdf'],
    params: [{ key: 'date_range', label: 'Date Range', type: 'date_range', required: true }],
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'near-expiry',
    name: 'Near-Expiry Alert Report',
    category: 'management',
    formats: ['pdf'],
    params: [{ key: 'date', label: 'As Of Date', type: 'date', required: true }],
    retention_days: 90,
    statutory: false,
  },
  {
    id: 'dead-stock',
    name: 'Dead / Slow Moving Stock',
    category: 'management',
    formats: ['pdf'],
    params: [{ key: 'date', label: 'As Of Date', type: 'date', required: true }],
    retention_days: 90,
    statutory: false,
  },
  {
    id: 'stock-valuation',
    name: 'Stock Valuation',
    category: 'management',
    formats: ['xlsx'],
    params: [{ key: 'date', label: 'As Of Date', type: 'date', required: true }],
    retention_days: 365,
    statutory: false,
  },
  {
    id: 'form-17',
    name: 'Form 17 — Purchase Register',
    category: 'compliance',
    formats: ['pdf'],
    params: [{ key: 'date_range', label: 'Date Range', type: 'date_range', required: true }],
    retention_days: 3650,
    statutory: true,
  },
  {
    id: 'form-18',
    name: 'Form 18 — Sale Register',
    category: 'compliance',
    formats: ['pdf'],
    params: [{ key: 'date_range', label: 'Date Range', type: 'date_range', required: true }],
    retention_days: 3650,
    statutory: true,
  },
  {
    id: 'h1-register',
    name: 'H1 Register + Sugam Export',
    category: 'compliance',
    formats: ['pdf', 'csv'],
    params: [{ key: 'month', label: 'Month', type: 'month', required: true }],
    retention_days: 3650,
    statutory: true,
  },
  {
    id: 'gstr1-export',
    name: 'GSTR-1 Data Export',
    category: 'gst',
    formats: ['xlsx', 'json'],
    params: [{ key: 'month', label: 'Month', type: 'month', required: true }],
    schedule: '0 8 1 * *',
    retention_days: 2555,
    statutory: true,
  },
  {
    id: 'gstr3b-input',
    name: 'GSTR-3B Input Summary',
    category: 'gst',
    formats: ['pdf'],
    params: [{ key: 'month', label: 'Month', type: 'month', required: true }],
    schedule: '0 8 1 * *',
    retention_days: 2555,
    statutory: true,
  },
  {
    id: 'monthly-charity',
    name: 'Monthly Charity / Concession Statement',
    category: 'trust',
    formats: ['pdf'],
    params: [{ key: 'month', label: 'Month', type: 'month', required: true }],
    schedule: '0 8 1 * *',
    retention_days: 1825,
    statutory: false,
  },
  {
    id: 'bpl-summary',
    name: 'BPL Patients Served Summary',
    category: 'trust',
    formats: ['pdf'],
    params: [{ key: 'month', label: 'Month', type: 'month', required: true }],
    schedule: '0 8 1 * *',
    retention_days: 1825,
    statutory: false,
  },
  {
    id: 'annual-statement',
    name: 'Annual Pharmacy Statement',
    category: 'trust',
    formats: ['pdf'],
    params: [{ key: 'year', label: 'Year', type: 'year', required: true }],
    retention_days: 3650,
    statutory: false,
  },
]

export function getReportDef(id: string): ReportDefinition | undefined {
  return REPORT_REGISTRY.find((r) => r.id === id)
}
