import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', borderBottom: '1pt solid #eee', paddingVertical: 4 },
  cell: { flex: 1 },
  header: { fontFamily: 'Helvetica-Bold', backgroundColor: '#f0f0f0' },
})

export function DefaultPDFTemplate({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Eye Hospital Pharmacy Report</Text>
        <Text style={styles.section}>{JSON.stringify(data, null, 2)}</Text>
      </Page>
    </Document>
  )
}

export default DefaultPDFTemplate
