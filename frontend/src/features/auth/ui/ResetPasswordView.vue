<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import logoImg from '@/assets/logoJJ.png'
import bgImg from '@/assets/login_bg.jpg'

const route = useRoute()
const router = useRouter()

const token = ref('')
const isCheckingToken = ref(true)
const isTokenValid = ref(false)
const tokenError = ref('')
const userEmail = ref('')
const userName = ref('')

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const isCompleted = ref(false)

onMounted(async () => {
  const queryToken = route.query.token as string
  if (!queryToken) {
    isCheckingToken.value = false
    isTokenValid.value = false
    tokenError.value = 'No se ha proporcionado un token de recuperación válido.'
    return
  }

  token.value = queryToken

  try {
    const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(queryToken)}`)
    const data = await res.json()

    if (res.ok && data.valid) {
      isTokenValid.value = true
      userEmail.value = data.email || ''
      userName.value = data.nombre || ''
    } else {
      isTokenValid.value = false
      tokenError.value = data.error || 'El enlace de recuperación es inválido o ha expirado.'
    }
  } catch (err: unknown) {
    isTokenValid.value = false
    tokenError.value = 'Error al verificar el enlace de recuperación.'
  } finally {
    isCheckingToken.value = false
  }
})

async function handleResetPassword() {
  if (!password.value) {
    ElMessage.warning('Por favor introduce tu nueva contraseña')
    return
  }

  if (password.value.length < 6) {
    ElMessage.warning('La contraseña debe tener al menos 6 caracteres')
    return
  }

  if (password.value !== confirmPassword.value) {
    ElMessage.warning('Las contraseñas no coinciden')
    return
  }

  isLoading.value = true
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.value,
        password: password.value,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Error al restablecer la contraseña')
    }

    isCompleted.value = true
    ElMessage.success('¡Contraseña actualizada con éxito!')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
    ElMessage.error(message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-fullscreen">
    <!-- Columna Izquierda: Formulario -->
    <div class="login-left-side">
      <div class="form-wrapper">
        <!-- Logo -->
        <div class="logo-container">
          <img :src="logoImg" alt="JJ Studio" class="company-logo" />
        </div>

        <!-- Estado 1: Verificando Token -->
        <div v-if="isCheckingToken" class="loading-block">
          <div class="spinner"></div>
          <p class="loading-text">Verificando enlace de seguridad...</p>
        </div>

        <!-- Estado 2: Token Inválido o Expirado -->
        <div v-else-if="!isTokenValid" class="error-block">
          <div class="error-icon-wrapper">
            <el-icon :size="48" color="#ef4444"><WarningFilled /></el-icon>
          </div>
          <h2 class="error-title">Enlace no válido</h2>
          <p class="error-description">{{ tokenError }}</p>
          <div class="form-actions-row" style="margin-top: 1.5rem;">
            <el-button
              type="primary"
              size="large"
              class="action-button"
              @click="router.push('/forgot-password')"
            >
              Solicitar nuevo enlace
            </el-button>
          </div>
        </div>

        <!-- Estado 3: Éxito al cambiar contraseña -->
        <div v-else-if="isCompleted" class="success-block">
          <div class="success-icon-wrapper">
            <el-icon :size="48" color="#10b981"><CircleCheckFilled /></el-icon>
          </div>
          <h2 class="success-title">¡Contraseña restablecida!</h2>
          <p class="success-description">
            Tu nueva contraseña ha sido guardada correctamente. Ya puedes acceder a JJ Studio.
          </p>
          <div class="form-actions-row" style="margin-top: 2rem;">
            <el-button
              type="primary"
              size="large"
              class="action-button"
              @click="router.push('/login')"
            >
              INICIAR SESIÓN
            </el-button>
          </div>
        </div>

        <!-- Estado 4: Formulario de Nueva Contraseña -->
        <div v-else class="content-block">
          <div class="header-text">
            <h1 class="form-title">Nueva Contraseña</h1>
            <p v-if="userEmail" class="form-subtitle">
              Establece una nueva contraseña para la cuenta <strong>{{ userEmail }}</strong>.
            </p>
            <p v-else class="form-subtitle">
              Introduce y confirma tu nueva contraseña de acceso.
            </p>
          </div>

          <el-form class="reset-form" @submit.prevent="handleResetPassword">
            <el-form-item>
              <el-input
                v-model="password"
                type="password"
                show-password
                autocomplete="new-password"
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
                :prefix-icon="Lock"
                size="large"
                class="login-input"
              />
            </el-form-item>

            <el-form-item>
              <el-input
                v-model="confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
                placeholder="Confirmar nueva contraseña"
                :prefix-icon="Lock"
                size="large"
                class="login-input"
                @keyup.enter="handleResetPassword"
              />
            </el-form-item>

            <div class="form-actions-row">
              <el-button
                type="primary"
                size="large"
                native-type="submit"
                :loading="isLoading"
                class="action-button"
                @click="handleResetPassword"
              >
                GUARDAR CONTRASEÑA
              </el-button>
            </div>
          </el-form>
        </div>
      </div>
    </div>

    <!-- Columna Derecha: Imagen a pantalla completa -->
    <div class="login-right-side" :style="{ backgroundImage: `url(${bgImg})` }"></div>
  </div>
</template>

<style scoped>
.login-fullscreen {
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.login-left-side {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--toolbar-bg, #ffffff);
  box-sizing: border-box;
  padding: 2rem;
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
}

.company-logo {
  max-height: 80px;
  width: auto;
  object-fit: contain;
}

.header-text {
  text-align: center;
  margin-bottom: 1.75rem;
}

.form-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-bottom: 0.5rem;
}

.form-subtitle {
  font-size: 0.875rem;
  color: var(--nav-link-color, #64748b);
  line-height: 1.5;
  margin: 0;
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

.form-actions-row {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.action-button {
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.action-button:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

/* Spinner */
.loading-block {
  text-align: center;
  padding: 2rem 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 0.9rem;
  color: #64748b;
}

/* Estados */
.error-block,
.success-block {
  text-align: center;
}

.error-icon-wrapper,
.success-icon-wrapper {
  margin-bottom: 1rem;
}

.error-title,
.success-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-bottom: 0.75rem;
}

.error-description,
.success-description {
  font-size: 0.9rem;
  color: var(--nav-link-color, #475569);
  line-height: 1.6;
  margin-bottom: 1rem;
}

/* Columna Derecha */
.login-right-side {
  width: 50%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

@media (max-width: 768px) {
  .login-fullscreen {
    flex-direction: column;
  }

  .login-left-side {
    width: 100%;
    height: 100%;
    padding: 1.5rem;
  }

  .login-right-side {
    display: none;
  }
}
</style>
