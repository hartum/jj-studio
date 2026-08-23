<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import logoImg from '@/assets/logoJJ.png'
import bgImg from '@/assets/login_bg.jpg'

const router = useRouter()

const email = ref('')
const isLoading = ref(false)
const isSubmitted = ref(false)

async function handleForgotPassword() {
  if (!email.value || !email.value.includes('@')) {
    ElMessage.warning('Por favor introduce un correo electrónico válido')
    return
  }

  isLoading.value = true
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Error al procesar la solicitud')
    }

    isSubmitted.value = true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al solicitar el enlace'
    ElMessage.error(message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-fullscreen">
    <!-- Columna Izquierda: Formulario a pantalla completa -->
    <div class="login-left-side">
      <div class="form-wrapper">
        <!-- Logo de la empresa -->
        <div class="logo-container">
          <img :src="logoImg" alt="JJ Studio" class="company-logo" />
        </div>

        <div v-if="!isSubmitted" class="content-block">
          <div class="header-text">
            <h1 class="form-title">Recuperar Contraseña</h1>
            <p class="form-subtitle">
              Introduce tu correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña.
            </p>
          </div>

          <!-- Formulario -->
          <el-form class="recovery-form" @submit.prevent="handleForgotPassword">
            <el-form-item>
              <el-input
                v-model="email"
                type="email"
                autocomplete="email"
                name="email"
                placeholder="Correo electrónico"
                :prefix-icon="Message"
                size="large"
                class="login-input"
                @keyup.enter="handleForgotPassword"
              />
            </el-form-item>

            <div class="form-actions-row">
              <el-button
                type="primary"
                size="large"
                native-type="submit"
                :loading="isLoading"
                class="submit-button"
                @click="handleForgotPassword"
              >
                ENVIAR ENLACE
              </el-button>
            </div>

            <div class="form-footer-links">
              <router-link to="/login" class="back-link">
                <el-icon><ArrowLeft /></el-icon>
                <span>Volver al inicio de sesión</span>
              </router-link>
            </div>
          </el-form>
        </div>

        <!-- Estado de Éxito / Correo Enviado -->
        <div v-else class="success-block">
          <div class="success-icon-wrapper">
            <el-icon :size="48" color="#10b981"><Message /></el-icon>
          </div>
          <h2 class="success-title">¡Revisa tu bandeja de entrada!</h2>
          <p class="success-description">
            Si el correo <strong>{{ email }}</strong> está registrado en JJ Studio, recibirás un enlace de recuperación en los próximos minutos.
          </p>
          <div class="success-note">
            ⏱️ El enlace caduca en <strong>30 minutos</strong>. Si no lo encuentras, revisa tu carpeta de spam.
          </div>

          <div class="form-actions-row" style="margin-top: 2rem;">
            <el-button
              size="large"
              class="back-btn"
              @click="router.push('/login')"
            >
              Volver al Login
            </el-button>
          </div>
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

/* Columna Izquierda */
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

.recovery-form {
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
  margin-bottom: 1.5rem;
}

.submit-button {
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.submit-button:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.back-btn {
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
}

.form-footer-links {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #3b82f6;
}

/* Éxito */
.success-block {
  text-align: center;
}

.success-icon-wrapper {
  margin-bottom: 1rem;
}

.success-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-bottom: 0.75rem;
}

.success-description {
  font-size: 0.9rem;
  color: var(--nav-link-color, #475569);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.success-note {
  font-size: 0.8rem;
  color: #64748b;
  background-color: #f1f5f9;
  border-radius: 8px;
  padding: 10px 14px;
  text-align: left;
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
