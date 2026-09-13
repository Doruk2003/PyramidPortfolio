<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { AUTH_ERROR_MESSAGES } from '../../constants/authMessages'
import { getAuthErrorCode } from '../../services/authService'
import { getSafeAdminRedirect } from '../../router/authRedirect'

const router = useRouter()
const route = useRoute()
const destination = computed(() => getSafeAdminRedirect(router, route.query.redirect))
const auth = useAuth()
const { status, isConfigured, isAuthenticated, isInitializing, isBusy } = auth
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const message = ref('')
const submitting = ref(false)
const emailInput = ref<HTMLInputElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)
let active = true

const waiting = computed(() => submitting.value || isBusy.value || isInitializing.value)
const formDisabled = computed(
  () => !isConfigured || waiting.value || status.value !== 'unauthenticated',
)

async function initialize() {
  message.value = ''
  try {
    await auth.initialize()
  } catch (error) {
    if (active) message.value = AUTH_ERROR_MESSAGES[getAuthErrorCode(error)]
  }
}

async function handleSubmit() {
  if (formDisabled.value) return
  message.value = ''
  form.email = form.email.trim()
  errors.email = !form.email
    ? 'E-posta adresinizi girin.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ? ''
      : 'Geçerli bir e-posta adresi girin.'
  errors.password = form.password.length ? '' : 'Parolanızı girin.'

  if (errors.email || errors.password) {
    if (errors.email) emailInput.value?.focus()
    else passwordInput.value?.focus()
    return
  }

  submitting.value = true
  try {
    await auth.signIn({ email: form.email, password: form.password })
    if (!active) return
    if (!isAuthenticated.value) {
      message.value = 'Oturum açılamadı veya sonlandırıldı. Lütfen tekrar giriş yapın.'
      return
    }
    await router.replace(destination.value)
  } catch (error) {
    if (active) message.value = AUTH_ERROR_MESSAGES[getAuthErrorCode(error)]
  } finally {
    form.password = ''
    if (active) submitting.value = false
  }
}

onMounted(() => void initialize())
onBeforeUnmount(() => {
  active = false
  form.password = ''
})
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <RouterLink to="/" class="login-brand">Pyramid Portfolio</RouterLink>
      <p class="login-kicker">Yönetim Paneli</p>
      <h1 id="login-title">Giriş yap</h1>
      <p class="login-description">İçeriklerinizi yönetmek için hesabınızla giriş yapın.</p>

      <p v-if="!isConfigured" id="login-unavailable" class="login-notice" role="status">
        {{ AUTH_ERROR_MESSAGES.not_configured }}
      </p>
      <p v-else-if="isInitializing" class="login-notice" role="status">
        Oturum bilgisi kontrol ediliyor…
      </p>
      <div v-else-if="status === 'error'" class="login-notice" role="alert">
        <p>Oturum bilgisi alınamadı. Lütfen tekrar deneyin.</p>
        <button type="button" class="login-retry" @click="initialize">Tekrar dene</button>
      </div>
      <div v-else-if="isAuthenticated" class="login-notice" role="status">
        <p>Hesabınızla giriş yapılmış.</p>
        <RouterLink :to="destination">Yönetim paneline git</RouterLink>
      </div>

      <form
        v-if="!isAuthenticated"
        class="login-form"
        novalidate
        :aria-busy="waiting"
        :aria-describedby="!isConfigured ? 'login-unavailable' : undefined"
        @submit.prevent="handleSubmit"
      >
        <fieldset :disabled="formDisabled">
          <legend class="visually-hidden">Hesap bilgileri</legend>
          <div class="login-field">
            <label for="login-email">E-posta</label>
            <input
              id="login-email"
              ref="emailInput"
              v-model="form.email"
              name="email"
              type="email"
              inputmode="email"
              autocomplete="username"
              autocapitalize="none"
              :spellcheck="false"
              required
              :aria-invalid="Boolean(errors.email)"
              :aria-describedby="errors.email ? 'login-email-error' : undefined"
              @input="errors.email = ''"
            />
            <p v-if="errors.email" id="login-email-error" class="login-error" role="alert">
              {{ errors.email }}
            </p>
          </div>
          <div class="login-field">
            <label for="login-password">Parola</label>
            <input
              id="login-password"
              ref="passwordInput"
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              :aria-invalid="Boolean(errors.password)"
              :aria-describedby="errors.password ? 'login-password-error' : undefined"
              @input="errors.password = ''"
            />
            <p v-if="errors.password" id="login-password-error" class="login-error" role="alert">
              {{ errors.password }}
            </p>
          </div>
          <button type="submit" class="login-submit" :disabled="formDisabled">
            {{ waiting ? 'Lütfen bekleyin…' : 'Giriş yap' }}
          </button>
        </fieldset>
      </form>
      <p v-if="submitting" class="login-description" role="status">Giriş yapılıyor…</p>
      <p v-if="message" class="login-error login-message" role="alert">{{ message }}</p>

      <RouterLink to="/" class="login-back">← Ana sayfaya dön</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background: var(--color-surface);
}

.login-card {
  width: 100%;
  max-width: 460px;
  min-width: 0;
  padding: clamp(24px, 5vw, 40px);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.login-brand {
  display: inline-block;
  margin-bottom: 36px;
  font-size: 19px;
  font-weight: 700;
  text-decoration: none;
}

.login-kicker {
  margin: 0 0 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 34px;
}

.login-description,
.login-notice {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.login-notice {
  margin-block: 24px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.login-notice p {
  margin: 0 0 12px;
}

.login-form fieldset {
  min-width: 0;
  margin: 24px 0;
  padding: 0;
  border: 0;
}

.login-field {
  margin-bottom: 20px;
}

.login-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.login-field input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 16px;
}

.login-field input[aria-invalid='true'] {
  border-color: #a12a2a;
}

.login-submit,
.login-retry {
  min-height: 48px;
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  background: var(--color-dark);
  color: var(--color-light);
  font-weight: 600;
  cursor: pointer;
}

.login-submit {
  width: 100%;
}

.login-submit:disabled {
  background: #dddddd;
  color: #555555;
  cursor: not-allowed;
}

.login-field input:disabled {
  background: var(--color-surface);
}

.login-error {
  margin: 8px 0 0;
  color: #a12a2a;
  font-size: 14px;
  line-height: 1.6;
}

.login-message {
  margin-bottom: 20px;
}

.login-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
