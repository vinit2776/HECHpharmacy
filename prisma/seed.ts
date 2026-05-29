import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import bcrypt from 'bcryptjs'

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL!
  if (url?.includes('neon.tech')) {
    neonConfig.webSocketConstructor = ws
    const adapter = new PrismaNeon({ connectionString: url })
    return new PrismaClient({ adapter })
  }
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

const prisma = createClient()

async function main() {
  console.log('Seeding database...')

  // Users
  const password = await bcrypt.hash('pharmacy123', 12)
  const adminPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eyehospital.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@eyehospital.com',
      passwordHash: adminPassword,
      role: 'super_admin',
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@eyehospital.com' },
    update: {},
    create: {
      name: 'Pharmacy Manager',
      email: 'manager@eyehospital.com',
      passwordHash: password,
      role: 'manager',
    },
  })

  await prisma.user.upsert({
    where: { email: 'counter@eyehospital.com' },
    update: {},
    create: {
      name: 'Counter Staff',
      email: 'counter@eyehospital.com',
      passwordHash: password,
      role: 'counter_pharmacist',
    },
  })

  await prisma.user.upsert({
    where: { email: 'purchase@eyehospital.com' },
    update: {},
    create: {
      name: 'Purchase Staff',
      email: 'purchase@eyehospital.com',
      passwordHash: password,
      role: 'purchase_pharmacist',
    },
  })

  // Suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-1' },
    update: {},
    create: {
      id: 'seed-supplier-1',
      name: 'Apex Medical Distributors',
      type: 'distributor',
      contactPerson: 'Ramesh Kumar',
      phone: '9876543210',
      email: 'apex@medical.com',
      gstin: '33AAACA1234C1Z5',
      drugLicenseNo: 'TN-DL-20001',
      paymentTermsDays: 30,
    },
  })

  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-2' },
    update: {},
    create: {
      id: 'seed-supplier-2',
      name: 'Chennai Eye Pharma',
      type: 'wholesaler',
      contactPerson: 'Suresh Patel',
      phone: '9988776655',
      gstin: '33BBBCA5678D1Z3',
      drugLicenseNo: 'TN-DL-20002',
      paymentTermsDays: 15,
    },
  })

  // Doctors
  const doctor1 = await prisma.doctor.upsert({
    where: { id: 'seed-doctor-1' },
    update: {},
    create: {
      id: 'seed-doctor-1',
      name: 'Dr. Meena Sundaram',
      registrationNo: 'TNMC-12345',
      type: 'internal',
      specialisation: 'Ophthalmology',
      phone: '9876500001',
    },
  })

  const doctor2 = await prisma.doctor.upsert({
    where: { id: 'seed-doctor-2' },
    update: {},
    create: {
      id: 'seed-doctor-2',
      name: 'Dr. Rajan Krishnamurthy',
      registrationNo: 'TNMC-67890',
      type: 'internal',
      specialisation: 'Ophthalmology',
      phone: '9876500002',
    },
  })

  // Drugs
  const drugs = [
    {
      id: 'seed-drug-1',
      name: 'Moxifloxacin',
      brandName: 'Moxicip',
      manufacturer: 'Cipla',
      category: 'Antibiotic Eye Drop',
      dosageForm: 'eye_drop' as const,
      strength: '0.5% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h1' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 20,
      discount: { applicable: true, bpl: 100, general: 30 },
    },
    {
      id: 'seed-drug-2',
      name: 'Timolol Maleate',
      brandName: 'Timoptic',
      manufacturer: 'Merck',
      category: 'Anti-glaucoma',
      dosageForm: 'eye_drop' as const,
      strength: '0.5% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 15,
      discount: { applicable: true, bpl: 100, general: 20 },
    },
    {
      id: 'seed-drug-3',
      name: 'Latanoprost',
      brandName: 'Xalatan',
      manufacturer: 'Pfizer',
      category: 'Anti-glaucoma',
      dosageForm: 'eye_drop' as const,
      strength: '0.005% w/v',
      packSize: '2.5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      coldChainRequired: true,
      coldChainMinTemp: 2,
      coldChainMaxTemp: 8,
      reorderLevel: 10,
      discount: { applicable: true, bpl: 100, general: 25 },
    },
    {
      id: 'seed-drug-4',
      name: 'Prednisolone Acetate',
      brandName: 'Pred Forte',
      manufacturer: 'Allergan',
      category: 'Steroid Eye Drop',
      dosageForm: 'eye_drop' as const,
      strength: '1% w/v',
      packSize: '10ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 15,
      discount: { applicable: true, bpl: 100, general: 20 },
    },
    {
      id: 'seed-drug-5',
      name: 'Tropicamide',
      brandName: 'Tropicacyl',
      manufacturer: 'Sunways',
      category: 'Mydriatic',
      dosageForm: 'eye_drop' as const,
      strength: '1% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 10,
      discount: { applicable: true, bpl: 100, general: 15 },
    },
    {
      id: 'seed-drug-6',
      name: 'Carboxymethylcellulose Sodium',
      brandName: 'Refresh Tears',
      manufacturer: 'Allergan',
      category: 'Lubricant',
      dosageForm: 'eye_drop' as const,
      strength: '0.5% w/v',
      packSize: '10ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'otc' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 25,
      discount: { applicable: false, bpl: 0, general: 0 },
    },
    {
      id: 'seed-drug-7',
      name: 'Tobramycin + Dexamethasone',
      brandName: 'Tobradex',
      manufacturer: 'Alcon',
      category: 'Combo Antibiotic + Steroid',
      dosageForm: 'eye_drop' as const,
      strength: '0.3%+0.1% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 10,
      discount: { applicable: true, bpl: 100, general: 20 },
    },
    {
      id: 'seed-drug-8',
      name: 'Brimonidine',
      brandName: 'Alphagan',
      manufacturer: 'Allergan',
      category: 'Anti-glaucoma',
      dosageForm: 'eye_drop' as const,
      strength: '0.2% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 10,
      discount: { applicable: true, bpl: 100, general: 20 },
    },
    {
      id: 'seed-drug-9',
      name: 'Ketorolac Tromethamine',
      brandName: 'Ketorol',
      manufacturer: 'Dr. Reddy\'s',
      category: 'NSAID Eye Drop',
      dosageForm: 'eye_drop' as const,
      strength: '0.5% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 10,
      discount: { applicable: true, bpl: 100, general: 15 },
    },
    {
      id: 'seed-drug-10',
      name: 'Dorzolamide + Timolol',
      brandName: 'Cosopt',
      manufacturer: 'Merck',
      category: 'Anti-glaucoma',
      dosageForm: 'eye_drop' as const,
      strength: '2%+0.5% w/v',
      packSize: '5ml bottle',
      packUnit: 'bottle' as const,
      schedule: 'h' as const,
      hsnCode: '30049099',
      gstRate: 12,
      reorderLevel: 10,
      discount: { applicable: true, bpl: 100, general: 20 },
    },
  ]

  for (const drug of drugs) {
    const created = await prisma.drug.upsert({
      where: { id: drug.id },
      update: {},
      create: {
        id: drug.id,
        name: drug.name,
        brandName: drug.brandName,
        manufacturer: drug.manufacturer,
        category: drug.category,
        dosageForm: drug.dosageForm,
        strength: drug.strength,
        packSize: drug.packSize,
        packUnit: drug.packUnit,
        schedule: drug.schedule,
        hsnCode: drug.hsnCode,
        gstRate: drug.gstRate,
        coldChainRequired: drug.coldChainRequired ?? false,
        coldChainMinTemp: drug.coldChainMinTemp,
        coldChainMaxTemp: drug.coldChainMaxTemp,
        reorderLevel: drug.reorderLevel,
      },
    })

    await prisma.drugDiscountConfig.upsert({
      where: { drugId: drug.id },
      update: {},
      create: {
        drugId: drug.id,
        discountApplicable: drug.discount.applicable,
        bplDiscountPct: drug.discount.bpl,
        generalDiscountPct: drug.discount.general,
      },
    })
  }

  // Walk-in sentinel patient — referenced by all un-registered walk-in bills
  await prisma.patient.upsert({
    where: { id: 'walkin-patient' },
    update: {},
    create: {
      id: 'walkin-patient',
      name: 'Walk-in Patient',
      patientCategory: 'general',
    },
  })

  // Sample patients
  await prisma.patient.upsert({
    where: { id: 'seed-patient-1' },
    update: {},
    create: {
      id: 'seed-patient-1',
      hospitalPatientId: 'HOS-1001',
      name: 'Ravi Kumar',
      age: 58,
      gender: 'male',
      phone: '9876543001',
      patientCategory: 'bpl',
      bplCardNo: 'BPL-TN-2024-001',
      doctorId: 'seed-doctor-1',
    },
  })

  await prisma.patient.upsert({
    where: { id: 'seed-patient-2' },
    update: {},
    create: {
      id: 'seed-patient-2',
      hospitalPatientId: 'HOS-1002',
      name: 'Lakshmi Devi',
      age: 72,
      gender: 'female',
      phone: '9876543002',
      patientCategory: 'general',
      doctorId: 'seed-doctor-2',
    },
  })

  await prisma.patient.upsert({
    where: { id: 'seed-patient-3' },
    update: {},
    create: {
      id: 'seed-patient-3',
      hospitalPatientId: 'HOS-1003',
      name: 'Murugan Selvam',
      age: 45,
      gender: 'male',
      phone: '9876543003',
      patientCategory: 'bpl',
      bplCardNo: 'BPL-TN-2024-002',
      doctorId: 'seed-doctor-1',
    },
  })

  console.log('Seed complete.')
  console.log('\nLogin credentials:')
  console.log('  Super Admin:  admin@eyehospital.com / admin123')
  console.log('  Manager:      manager@eyehospital.com / pharmacy123')
  console.log('  Counter:      counter@eyehospital.com / pharmacy123')
  console.log('  Purchase:     purchase@eyehospital.com / pharmacy123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
