import type { AuthErrorCode } from '../types/Auth'

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  not_configured: 'Giriş hizmeti henüz kullanıma açılmadı. Lütfen daha sonra tekrar deneyin.',
  invalid_credentials: 'E-posta adresi veya parola hatalı.',
  email_not_confirmed: 'Giriş yapmadan önce e-posta adresinizi doğrulayın.',
  rate_limited: 'Çok fazla deneme yapıldı. Bir süre bekleyip tekrar deneyin.',
  network_error: 'Giriş hizmetine ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.',
  unknown: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
  busy: 'Bir işlem devam ediyor. Lütfen tamamlanmasını bekleyin.',
  disposed: 'Oturum işlemi sonlandırıldı. Sayfayı yenileyip tekrar deneyin.',
}
