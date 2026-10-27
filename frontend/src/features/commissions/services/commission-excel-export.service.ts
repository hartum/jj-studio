import ExcelJS from 'exceljs'
import type { EmpleadoComisionResumen, DetalleVentaItem } from '@/features/home/ui/dashboards/components/ContableComisionesTab.vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'

export interface CommissionExcelExportOptions {
  usuarios: EmpleadoComisionResumen[]
  getDetalleData: (row: EmpleadoComisionResumen) => DetalleVentaItem[]
  dateRange: [string, string]
  tipoCambio: number
  hotelNames?: string
}

/**
 * Convierte la imagen del usuario (o genera un avatar circular con sus iniciales en canvas)
 * a una cadena base64 limpia en formato PNG compatible con ExcelJS.
 */
async function getAvatarImageForExcel(
  imageUrl: string | null | undefined,
  nombre: string,
  apellidos: string,
  color?: string | null,
): Promise<{ base64: string; extension: 'png' }> {
  if (typeof document === 'undefined') {
    return { base64: '', extension: 'png' }
  }

  const canvas = document.createElement('canvas')
  canvas.width = 72
  canvas.height = 72
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { base64: '', extension: 'png' }
  }

  const drawInitials = () => {
    ctx.clearRect(0, 0, 72, 72)
    ctx.beginPath()
    ctx.arc(36, 36, 34, 0, Math.PI * 2)
    ctx.fillStyle = getUserBgColor(color) || '#3b82f6'
    ctx.fill()

    const initials = getUserInitials(nombre, apellidos)
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials, 36, 38)
  }

  if (imageUrl && imageUrl.trim()) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        setTimeout(() => reject(new Error('Timeout loading image')), 2500)
        img.src = imageUrl
      })

      ctx.clearRect(0, 0, 72, 72)
      ctx.save()
      ctx.beginPath()
      ctx.arc(36, 36, 34, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 0, 0, 72, 72)
      ctx.restore()

      // Borde circular suave
      ctx.beginPath()
      ctx.arc(36, 36, 34, 0, Math.PI * 2)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2
      ctx.stroke()
    } catch {
      drawInitials()
    }
  } else {
    drawInitials()
  }

  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  return { base64, extension: 'png' }
}

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
}

const BORDER_TOTAL: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'double', color: { argb: 'FF0F172A' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
}

export async function exportComisionesToExcel(
  options: CommissionExcelExportOptions,
): Promise<void> {
  const { usuarios, getDetalleData, dateRange, tipoCambio, hotelNames } = options

  if (!usuarios || usuarios.length === 0) {
    throw new Error('No hay usuarios o comisiones para exportar.')
  }

  // 1. Precargar avatares en paralelo
  const avatarResults = await Promise.all(
    usuarios.map(async (u) => {
      try {
        const avatar = await getAvatarImageForExcel(u.imagen, u.nombre, u.apellidos, u.color)
        return { usuarioId: u.usuarioId, avatar }
      } catch {
        return { usuarioId: u.usuarioId, avatar: null }
      }
    }),
  )
  const avatarMap = new Map(avatarResults.map((r) => [r.usuarioId, r.avatar]))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JJ Studio'
  workbook.lastModifiedBy = 'JJ Studio'
  workbook.created = new Date()
  workbook.modified = new Date()

  const [dateFrom, dateTo] = dateRange || []
  const periodLabel = dateFrom && dateTo ? `${dateFrom} al ${dateTo}` : 'Todos los registros'
  const hotelsLabel = hotelNames && hotelNames.trim() ? hotelNames : 'Todos tus Hoteles'
  const tcLabel = `$${Number(tipoCambio || 18).toFixed(2)} MXN / USD`
  const genDateLabel = new Date().toLocaleString()

  // ==========================================
  // TAB 1: RESUMEN DE COMISIONES (TABLA PRINCIPAL)
  // ==========================================
  const wsResumen = workbook.addWorksheet('Resumen de Comisiones', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  })

  wsResumen.columns = [
    { key: 'empleado', width: 26 },
    { key: 'roles', width: 20 },
    { key: 'contrato', width: 16 },
    { key: 'ventasBrutas', width: 20 },
    { key: 'impuesto', width: 18 },
    { key: 'baseNeta', width: 20 },
    { key: 'comisionFoto', width: 18 },
    { key: 'comisionVenta', width: 18 },
    { key: 'otrasComis', width: 18 },
    { key: 'totalComisionesUsd', width: 22 },
    { key: 'totalComisionesMxn', width: 22 },
    { key: 'estado', width: 16 },
  ]

  // Fila 1: Título principal
  const rTitle1 = wsResumen.addRow(['JJ STUDIO — LIQUIDACIÓN Y CONTROL DE COMISIONES'])
  rTitle1.height = 30
  rTitle1.font = { bold: true, size: 13, color: { argb: 'FF0F172A' } }
  rTitle1.alignment = { vertical: 'middle', horizontal: 'left' }
  wsResumen.mergeCells(1, 1, 1, 12)

  // Fila 2: Metadatos del periodo y filtros
  const rMeta1 = wsResumen.addRow([
    `Periodo: ${periodLabel}   |   Tipo de Cambio: ${tcLabel}   |   Hoteles: ${hotelsLabel}   |   Generado: ${genDateLabel}`,
  ])
  rMeta1.height = 20
  rMeta1.font = { italic: true, size: 9.5, color: { argb: 'FF64748B' } }
  rMeta1.alignment = { vertical: 'middle', horizontal: 'left' }
  wsResumen.mergeCells(2, 1, 2, 12)

  // Fila 3: Espaciador
  const rBlank1 = wsResumen.addRow([])
  rBlank1.height = 8

  // Fila 4: Cabecera de la tabla
  const rHeader1 = wsResumen.addRow([
    'Empleado',
    'Rol(es)',
    'Tipo Contrato',
    'Ventas Brutas USD',
    'IVA / Retención USD',
    'Base Neta USD',
    'Comisión Foto USD',
    'Comisión Venta USD',
    'Otras Comis. USD',
    'Total Comisiones USD',
    'Total a Pagar MXN',
    'Estado General',
  ])
  rHeader1.height = 28
  rHeader1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }
  rHeader1.alignment = { vertical: 'middle', horizontal: 'center' }

  for (let c = 1; c <= 12; c++) {
    const cell = rHeader1.getCell(c)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate 800
    }
    cell.border = BORDER_THIN
    if (c === 1 || c === 2) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
    } else if (c >= 4 && c <= 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
    }
  }

  // Datos de filas de resumen
  let sumVentasBrutas = 0
  let sumImpuesto = 0
  let sumBaseNeta = 0
  let sumFoto = 0
  let sumVenta = 0
  let sumOtras = 0
  let sumTotalUsd = 0
  let sumTotalMxn = 0

  usuarios.forEach((u, idx) => {
    sumVentasBrutas += u.totalVentasBrutasUsd || 0
    sumImpuesto += u.totalImpuestoUsd || 0
    sumBaseNeta += u.totalBaseNetaUsd || 0
    sumFoto += u.comisionFotografoUsd || 0
    sumVenta += u.comisionVendedorUsd || 0
    sumOtras += u.comisionOtrasUsd || 0
    sumTotalUsd += u.totalComisionesUsd || 0
    sumTotalMxn += u.totalComisionesMxn || 0

    const isEven = idx % 2 === 0
    const rowFillColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

    const dRow = wsResumen.addRow([
      u.nombreCompleto,
      u.roles.join(', ') || '—',
      u.tipoContrato === 'ASALARIADO' ? 'Asalariado' : 'Sin Salario',
      u.totalVentasBrutasUsd || 0,
      -(u.totalImpuestoUsd || 0),
      u.totalBaseNetaUsd || 0,
      u.comisionFotografoUsd || 0,
      u.comisionVendedorUsd || 0,
      u.comisionOtrasUsd || 0,
      u.totalComisionesUsd || 0,
      u.totalComisionesMxn || 0,
      u.estadoGeneral,
    ])
    dRow.height = 22

    for (let c = 1; c <= 12; c++) {
      const cell = dRow.getCell(c)
      cell.border = BORDER_THIN
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowFillColor },
      }
      cell.font = { size: 9.5, color: { argb: 'FF0F172A' } }
      cell.alignment = { vertical: 'middle' }

      if (c === 1) {
        cell.font = { size: 9.5, bold: true, color: { argb: 'FF0F172A' } }
      } else if (c === 2 || c === 3 || c === 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (c >= 4 && c <= 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }

      // Formatos numéricos de moneda
      if (c === 4 || c === 6 || c === 7 || c === 8 || c === 9) {
        cell.numFmt = '"$"#,##0.00'
      } else if (c === 5) {
        cell.numFmt = '-"$"#,##0.00;-"$"#,##0.00;"$0.00"'
        cell.font = { size: 9.5, color: { argb: 'FFDC2626' } } // Rojo tenue para retenciones
      } else if (c === 10) {
        cell.numFmt = '"$"#,##0.00'
        cell.font = { size: 9.5, bold: true, color: { argb: 'FF16A34A' } } // Verde fuerte
      } else if (c === 11) {
        cell.numFmt = '"$"#,##0.00'
        cell.font = { size: 9.5, bold: true, color: { argb: 'FF2563EB' } } // Azul fuerte
      }
    }
  })

  // Fila de Totales de la tabla principal
  const rTotal1 = wsResumen.addRow([
    'TOTAL GENERAL',
    '',
    '',
    sumVentasBrutas,
    -sumImpuesto,
    sumBaseNeta,
    sumFoto,
    sumVenta,
    sumOtras,
    sumTotalUsd,
    sumTotalMxn,
    '',
  ])
  rTotal1.height = 26
  for (let c = 1; c <= 12; c++) {
    const cell = rTotal1.getCell(c)
    cell.border = BORDER_TOTAL
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // Slate 200
    }
    cell.font = { size: 10, bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { vertical: 'middle' }

    if (c >= 4 && c <= 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
      if (c === 5) {
        cell.numFmt = '-"$"#,##0.00;-"$"#,##0.00;"$0.00"'
      } else {
        cell.numFmt = '"$"#,##0.00'
      }
    }
  }

  // ==========================================
  // TAB 2: DETALLES DE COMISIONES POR COLABORADOR
  // ==========================================
  const wsDetalle = workbook.addWorksheet('Detalle por Colaborador', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 4 }],
  })

  wsDetalle.columns = [
    { key: 'folio', width: 22 },
    { key: 'fecha', width: 14 },
    { key: 'hotel', width: 18 },
    { key: 'cliente', width: 28 },
    { key: 'rol', width: 14 },
    { key: 'tasa', width: 11 },
    { key: 'ventas', width: 18 },
    { key: 'impuesto', width: 18 },
    { key: 'base', width: 18 },
    { key: 'comisionUsd', width: 18 },
    { key: 'comisionMxn', width: 18 },
    { key: 'estado', width: 15 },
  ]

  // Fila 1: Título de detalles
  const rTitle2 = wsDetalle.addRow(['JJ STUDIO — COMPENDIO DE VENTAS Y COMISIONES POR COLABORADOR'])
  rTitle2.height = 30
  rTitle2.font = { bold: true, size: 13, color: { argb: 'FF0F172A' } }
  rTitle2.alignment = { vertical: 'middle', horizontal: 'left' }
  wsDetalle.mergeCells(1, 1, 1, 12)

  // Fila 2: Metadatos
  const rMeta2 = wsDetalle.addRow([
    `Periodo: ${periodLabel}   |   Tipo de Cambio: ${tcLabel}   |   Hoteles: ${hotelsLabel}   |   Colaboradores: ${usuarios.length}`,
  ])
  rMeta2.height = 20
  rMeta2.font = { italic: true, size: 9.5, color: { argb: 'FF64748B' } }
  rMeta2.alignment = { vertical: 'middle', horizontal: 'left' }
  wsDetalle.mergeCells(2, 1, 2, 12)

  // Fila 3: Espaciador
  const rBlank2 = wsDetalle.addRow([])
  rBlank2.height = 8

  // Fila 4: Cabecera global de columnas para la vista detallada
  const rHeader2 = wsDetalle.addRow([
    'Folio / Misc.',
    'Fecha',
    'Hotel',
    'Cliente / Concepto',
    'Rol',
    'Tasa (%)',
    'Ventas Brutas USD',
    'Retención USD',
    'Base Neta USD',
    'Comisión USD',
    'Comisión MXN',
    'Estado',
  ])
  rHeader2.height = 26
  rHeader2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }
  rHeader2.alignment = { vertical: 'middle', horizontal: 'center' }

  for (let c = 1; c <= 12; c++) {
    const cell = rHeader2.getCell(c)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }, // Slate 700
    }
    cell.border = BORDER_THIN
    if (c === 1 || c === 3 || c === 4) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
    } else if (c >= 6 && c <= 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
    }
  }

  // 2. Iterar por cada usuario para crear su bloque
  for (const u of usuarios) {
    const detalles = getDetalleData(u)

    // Fila Banner del Usuario (con foto en Col A y nombre/metadatos en B-L)
    const uBannerRow = wsDetalle.addRow([
      '', // Col A: Espacio reservado para la foto / avatar
      `👤 ${u.nombreCompleto}   |   Roles: ${u.roles.join(', ') || 'N/A'}   |   Contrato: ${u.tipoContrato === 'ASALARIADO' ? 'Asalariado' : 'Sin Salario'}   |   Hoteles: ${u.hoteles.join(', ') || 'Todos'}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
    uBannerRow.height = 42

    const bannerRowIndex = uBannerRow.number
    wsDetalle.mergeCells(bannerRowIndex, 2, bannerRowIndex, 12)

    for (let c = 1; c <= 12; c++) {
      const cell = uBannerRow.getCell(c)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }, // Slate 100
      }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: c === 1 ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : undefined,
        right: c === 12 ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : undefined,
      }
    }

    const cellName = uBannerRow.getCell(2)
    cellName.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } }
    cellName.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    // Insertar avatar del usuario en celda A
    const avatarData = avatarMap.get(u.usuarioId)
    if (avatarData && avatarData.base64) {
      try {
        const imageId = workbook.addImage({
          base64: avatarData.base64,
          extension: avatarData.extension,
        })
        wsDetalle.addImage(imageId, {
          tl: { col: 0.2, row: bannerRowIndex - 1 + 0.1 },
          ext: { width: 34, height: 34 },
          editAs: 'oneCell',
        })
      } catch (e) {
        console.warn(`No se pudo incrustar el avatar para ${u.nombreCompleto}`, e)
      }
    }

    // Filas de detalle del usuario
    detalles.forEach((item, itemIdx) => {
      // 1. Caso fila de separación para Bonos
      if (item.isSeparator) {
        const sepRow = wsDetalle.addRow([
          '★ PREMIOS Y BONOS DEL PERIODO',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ])
        sepRow.height = 22
        const sepIndex = sepRow.number
        wsDetalle.mergeCells(sepIndex, 1, sepIndex, 12)
        const cell = sepRow.getCell(1)
        cell.font = { bold: true, size: 9, color: { argb: 'FFB45309' } } // Amber 700
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }, // Amber 100
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = BORDER_THIN
        return
      }

      // 2. Fila de Bono
      if (item.isBonus) {
        const bRow = wsDetalle.addRow([
          item.numeroMiscelaneo || 'Bono',
          item.fechaVenta || '—',
          item.hotelNombre || '—',
          item.bonusDescripcion || item.clienteNombre || 'Bono alcanzado',
          'BONO',
          '—',
          '—',
          '—',
          '—',
          item.importeComisionUsd || 0,
          item.importeComisionMxn != null
            ? item.importeComisionMxn
            : (item.importeComisionUsd || 0) * (item.tipoCambio || tipoCambio || 1),
          item.estado || 'APROBADA',
        ])
        bRow.height = 20
        for (let c = 1; c <= 12; c++) {
          const cell = bRow.getCell(c)
          cell.border = BORDER_THIN
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' }, // Amber 50
          }
          cell.font = { size: 9, color: { argb: 'FF0F172A' } }
          cell.alignment = { vertical: 'middle' }

          if (c === 2 || c === 5 || c === 6 || c === 12) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else if (c >= 7 && c <= 11) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' }
          }

          if (c === 10) {
            cell.numFmt = '"$"#,##0.00'
            cell.font = { size: 9, bold: true, color: { argb: 'FFB45309' } }
          } else if (c === 11) {
            cell.numFmt = '"$"#,##0.00'
            cell.font = { size: 9, bold: true, color: { argb: 'FF2563EB' } }
          }
        }
        return
      }

      // 3. Fila de Venta Estándar
      const isEven = itemIdx % 2 === 0
      const rowFill = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

      const vBruta = item.esVentaDuplicada ? null : (item.totalVentaUsd ?? 0)
      const vImp = item.esVentaDuplicada
        ? null
        : item.impuestoMontoUsd
          ? -item.impuestoMontoUsd
          : 0
      const vBase = item.esVentaDuplicada ? null : (item.baseCalculoUsd ?? 0)
      const vUsd = item.importeComisionUsd ?? 0
      const vMxn =
        item.importeComisionMxn != null
          ? item.importeComisionMxn
          : (item.importeComisionUsd || 0) * (item.tipoCambio || tipoCambio || 1)

      const sRow = wsDetalle.addRow([
        item.numeroMiscelaneo || 'S/F',
        item.fechaVenta ? item.fechaVenta.slice(0, 10) : '—',
        item.hotelNombre || '—',
        item.clienteNombre || '—',
        item.rolEnVenta || '—',
        item.porcentajeAplicado != null ? item.porcentajeAplicado / 100 : '',
        vBruta,
        vImp,
        vBase,
        vUsd,
        vMxn,
        item.estado || 'PENDIENTE',
      ])
      sRow.height = 20

      for (let c = 1; c <= 12; c++) {
        const cell = sRow.getCell(c)
        cell.border = BORDER_THIN
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowFill },
        }
        cell.font = { size: 9, color: { argb: 'FF0F172A' } }
        cell.alignment = { vertical: 'middle' }

        if (c === 2 || c === 5 || c === 12) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else if (c === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.numFmt = '0.0%'
        } else if (c >= 7 && c <= 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
          if (c === 8) {
            cell.numFmt = '-"$"#,##0.00;-"$"#,##0.00;"$0.00"'
            cell.font = { size: 9, color: { argb: 'FFDC2626' } }
          } else {
            cell.numFmt = '"$"#,##0.00'
            if (c === 10) {
              cell.font = { size: 9, bold: true, color: { argb: 'FF16A34A' } }
            } else if (c === 11) {
              cell.font = { size: 9, bold: true, color: { argb: 'FF2563EB' } }
            }
          }
        }
      }
    })

    // Fila Subtotal por Usuario
    const subtotalRow = wsDetalle.addRow([
      `Subtotal ${u.nombreCompleto}`,
      '',
      '',
      '',
      '',
      '',
      u.totalVentasBrutasUsd || 0,
      -(u.totalImpuestoUsd || 0),
      u.totalBaseNetaUsd || 0,
      u.totalComisionesUsd || 0,
      u.totalComisionesMxn || 0,
      u.estadoGeneral,
    ])
    subtotalRow.height = 22

    for (let c = 1; c <= 12; c++) {
      const cell = subtotalRow.getCell(c)
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }, // Slate 100
      }
      cell.font = { size: 9.5, bold: true, color: { argb: 'FF0F172A' } }
      cell.alignment = { vertical: 'middle' }

      if (c === 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (c >= 7 && c <= 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        if (c === 8) {
          cell.numFmt = '-"$"#,##0.00;-"$"#,##0.00;"$0.00"'
        } else {
          cell.numFmt = '"$"#,##0.00'
        }
      }
    }

    // Fila de separación estética entre colaboradores
    const gapRow = wsDetalle.addRow([])
    gapRow.height = 14
  }

  // Fila de Gran Total Detallado al final de Tab 2
  const rGrandTotal2 = wsDetalle.addRow([
    'GRAN TOTAL GENERAL (TODOS LOS COLABORADORES)',
    '',
    '',
    '',
    '',
    '',
    sumVentasBrutas,
    -sumImpuesto,
    sumBaseNeta,
    sumTotalUsd,
    sumTotalMxn,
    '',
  ])
  rGrandTotal2.height = 26
  for (let c = 1; c <= 12; c++) {
    const cell = rGrandTotal2.getCell(c)
    cell.border = BORDER_TOTAL
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // Slate 200
    }
    cell.font = { size: 10, bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { vertical: 'middle' }

    if (c >= 7 && c <= 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
      if (c === 8) {
        cell.numFmt = '-"$"#,##0.00;-"$"#,##0.00;"$0.00"'
      } else {
        cell.numFmt = '"$"#,##0.00'
      }
    }
  }

  // 3. Generar buffer y descargar en el navegador
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const filenameDate =
    dateFrom && dateTo ? `${dateFrom}_a_${dateTo}` : new Date().toISOString().slice(0, 10)
  const filename = `Liquidacion_Comisiones_${filenameDate}.xlsx`

  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(downloadUrl)
}
