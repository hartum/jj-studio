<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import logoImg from '@/assets/logoJJ.png'
import bgImg from '@/assets/login_bg.jpg'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)

onMounted(() => {
  const savedEmail = localStorage.getItem('remembered_email')
  if (savedEmail) {
    email.value = savedEmail
    rememberMe.value = true
  }
})

async function handleLogin() {
  if (!email.value || !password.value) {
    ElMessage.warning('Por favor introduce tu correo electrónico y contraseña')
    return
  }

  isLoading.value = true
  try {
    await authStore.login(email.value, password.value)

    if (rememberMe.value) {
      localStorage.setItem('remembered_email', email.value)
    } else {
      localStorage.removeItem('remembered_email')
    }

    ElMessage.success('¡Sesión iniciada correctamente!')
    router.push('/inicio')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
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

        <!-- Formulario -->
        <el-form class="login-form" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input
              v-model="email"
              type="email"
              autocomplete="email"
              name="email"
              placeholder="Correo electrónico"
              :prefix-icon="User"
              size="large"
              class="login-input"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-input
              v-model="password"
              type="password"
              show-password
              autocomplete="current-password"
              name="password"
              placeholder="Contraseña"
              :prefix-icon="Lock"
              size="large"
              class="login-input"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="form-actions-row">
            <el-checkbox v-model="rememberMe" class="remember-checkbox"> Recordarme </el-checkbox>

            <el-button
              type="primary"
              size="large"
              native-type="submit"
              :loading="isLoading"
              class="login-button"
              @click="handleLogin"
            >
              INICIAR SESIÓN
            </el-button>
          </div>

          <div class="form-footer-links">
            <router-link to="/forgot-password" class="footer-link">¿Olvidaste tu contraseña?</router-link>
          </div>
        </el-form>
      </div>
    </div>

    <!-- Columna Derecha: Imagen a pantalla completa sin márgenes ni tarjeta -->
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
  margin-bottom: 2.5rem;
}

.company-logo {
  max-height: 90px;
  width: auto;
  object-fit: contain;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

.form-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  margin-bottom: 1.5rem;
}

.remember-checkbox {
  color: var(--nav-link-color, #64748b);
}

.login-button {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 0 1.75rem;
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.login-button:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.form-footer-links {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.footer-link {
  font-size: 0.85rem;
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: #3b82f6;
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

  .form-actions-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .login-button {
    width: 100%;
  }
}
</style>
