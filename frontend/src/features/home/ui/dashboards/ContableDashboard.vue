<script setup lang="ts">
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import {
  Money,
  Wallet,
  Tickets,
} from '@element-plus/icons-vue'

const {
  countryStore,
  hotelStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilter,
  yearsOptions,
  formatCurrency,
  globalMonthlyCommissions,
  handleUpdateCommissionStatus,
} = useDashboard()
</script>

<template>
  <div class="dashboard-section">
    <div class="section-header-row">
      <h2 class="section-title">Liquidación y Control de Comisiones</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilter"
          placeholder="Todos los Hoteles"
          clearable
          size="default"
          style="width: 220px"
        >
          <el-option v-for="h in hotelStore.hotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
        <el-select v-model="selectedMes" size="default" style="width: 140px">
          <el-option
            v-for="m in monthsOptions"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
        <el-select v-model="selectedAnio" size="default" style="width: 100px">
          <el-option v-for="y in yearsOptions" :key="y" :label="String(y)" :value="y" />
        </el-select>
      </div>
    </div>

    <!-- Tarjetas KPIs para Contable -->
    <el-row :gutter="20" class="stats-row mb-4">
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-success">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Comisiones a Liquidar (Mes)</span>
            <span class="stat-value text-success">{{
              formatCurrency(globalMonthlyCommissions)
            }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-primary">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Ventas Procesadas</span>
            <span class="stat-value">{{
              formatCurrency(commissionStore.resumen?.totalVentasUsd || 0)
            }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-warning">
            <el-icon><Tickets /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Comisiones Pendientes</span>
            <span class="stat-value text-warning">
              {{ commissionStore.comisiones.filter((c) => c.estado === 'PENDIENTE').length }}
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tabla de Liquidación de Comisiones -->
    <el-card
      class="dashboard-card mb-4"
      header="Listado de Comisiones por Venta y Usuario"
      shadow="hover"
    >
      <div v-if="commissionStore.comisiones.length === 0" class="empty-hint p-4">
        No hay registros de comisiones para el período seleccionado.
      </div>
      <el-table v-else :data="commissionStore.comisiones" stripe style="width: 100%">
        <el-table-column prop="fechaVenta" label="Fecha" width="110" />
        <el-table-column label="Beneficiario" min-width="170">
          <template #default="{ row }">
            <strong>{{ row.usuarioNombre }} {{ row.usuarioApellidos }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="Rol / Contrato" width="180">
          <template #default="{ row }">
            <div style="display: flex; gap: 4px; align-items: center">
              <el-tag size="small">{{ row.rolEnVenta }}</el-tag>
              <el-tag
                size="small"
                :type="row.tipoContrato === 'SIN_SALARIO' ? 'primary' : 'success'"
              >
                {{ row.tipoContrato === 'SIN_SALARIO' ? 'Sin Salario' : 'Asalariado' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="hotelNombre" label="Hotel" min-width="150" />
        <el-table-column label="Base Neta (tras imp.)" width="165" align="right">
          <template #default="{ row }">
            <span>{{ formatCurrency(row.baseCalculoUsd) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Tasa" width="90" align="center">
          <template #default="{ row }">
            <span>{{ row.porcentajeAplicado }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="Importe Comisión" width="140" align="right">
          <template #default="{ row }">
            <strong class="text-success">{{ formatCurrency(row.importeComisionUsd) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="Estado" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="
                row.estado === 'PAGADA'
                  ? 'success'
                  : row.estado === 'APROBADA'
                    ? 'warning'
                    : 'info'
              "
            >
              {{ row.estado }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Acciones" width="170" align="center" fixed="right">
          <template #default="{ row }">
            <div style="display: flex; gap: 4px; justify-content: center">
              <el-button
                v-if="row.estado === 'PENDIENTE'"
                type="warning"
                size="small"
                @click="handleUpdateCommissionStatus(row.id, 'APROBADA')"
              >
                Aprobar
              </el-button>
              <el-button
                v-if="row.estado !== 'PAGADA'"
                type="success"
                size="small"
                @click="handleUpdateCommissionStatus(row.id, 'PAGADA')"
              >
                Pagar
              </el-button>
              <span v-else class="text-xs text-muted">Liquidada</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Catálogo de Países y Áreas -->
    <el-card
      class="dashboard-card"
      header="Estructura de Hoteles por Países y Áreas"
      shadow="hover"
    >
      <el-collapse>
        <el-collapse-item
          v-for="pais in countryStore.countries"
          :key="pais.id"
          :title="`${pais.nombre} (${pais.areas?.length || 0} áreas)`"
        >
          <div class="pais-collapse-content">
            <div v-for="area in pais.areas" :key="area.id" class="area-item-box">
              <span class="area-title">{{ area.nombre }}</span>
              <el-table
                :data="area.hoteles || []"
                style="width: 100%; margin-top: 0.5rem"
                size="small"
              >
                <el-table-column prop="nombre" label="Hotel" />
                <el-table-column label="Cadena / Características">
                  <template #default="{ row }">
                    <span>{{ row.cadenaHotelera || 'Hotel Independiente' }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>
