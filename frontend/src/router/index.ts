import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { canAccessRoute } from '@/shared/permissions'
import LoginView from '@/features/auth/ui/LoginView.vue'
import ForgotPasswordView from '@/features/auth/ui/ForgotPasswordView.vue'
import ResetPasswordView from '@/features/auth/ui/ResetPasswordView.vue'
import InicioView from '@/features/home/ui/InicioView.vue'
import ConfiguracionView from '@/features/configuration/ui/ConfiguracionView.vue'
import UsuariosView from '@/features/users/ui/UsuariosView.vue'
import UsuarioFormView from '@/features/users/ui/UsuarioFormView.vue'
import HotelFormView from '@/features/hotels/ui/HotelFormView.vue'
import HotelCalendarView from '@/features/photo-sessions/ui/HotelCalendarView.vue'
import PhotoSessionFormView from '@/features/photo-sessions/ui/PhotoSessionFormView.vue'
import SaleAppointmentFormView from '@/features/sales/ui/SaleAppointmentFormView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/inicio',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { guestOnly: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
      meta: { guestOnly: true },
    },
    {
      path: '/inicio',
      name: 'inicio',
      component: InicioView,
      meta: { requiresAuth: true },
    },
    {
      path: '/agenda',
      name: 'agenda',
      component: HotelCalendarView,
      meta: { requiresAuth: true },
    },
    {
      path: '/agenda/nueva',
      name: 'sesion-nueva',
      component: PhotoSessionFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/agenda/:id/editar',
      name: 'sesion-editar',
      component: PhotoSessionFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/ventas/nueva',
      name: 'venta-nueva',
      component: SaleAppointmentFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/ventas/:id/editar',
      name: 'venta-editar',
      component: SaleAppointmentFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: ConfiguracionView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios/nuevo',
      name: 'usuario-nuevo',
      component: UsuarioFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios/:id/editar',
      name: 'usuario-editar',
      component: UsuarioFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/hoteles/nuevo',
      name: 'hotel-nuevo',
      component: HotelFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/hoteles/:id/editar',
      name: 'hotel-editar',
      component: HotelFormView,
      meta: { requiresAuth: true },
    },
  ],
})

// Guards de navegación del router
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Si no está registrado/autenticado, redirige al login
    return '/login'
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    // Si ya está autenticado e intenta ir a login o recuperar contraseña, redirige a /inicio
    return '/inicio'
  }

  if (to.meta.requiresAuth && authStore.user) {
    // Comprobar permisos según la matriz de roles
    if (!canAccessRoute(authStore.user.roleCode, to.path)) {
      return '/inicio'
    }
  }

  return true
})

export default router
