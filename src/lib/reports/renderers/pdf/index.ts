// PDF renderer placeholder — each report gets its own template
// Using @react-pdf/renderer server-side

export async function renderPDF(reportId: string, data: any): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { createElement } = await import('react')

  let template: any
  try {
    const mod = await import(`./${reportId}`)
    template = mod.default
  } catch {
    const { DefaultPDFTemplate } = await import('./default')
    template = DefaultPDFTemplate
  }

  const element = createElement(template, { data }) as any
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
