# Vue 3 + TypeScript + Vite

Projenin katman sorumlulukları ve onayla ilerleyen düzenleme planı: [Mimari ve veri erişimi](docs/mimari.md).

Supabase ortam ayarları, giriş/çıkış ve yönetici erişim kuralı: [Supabase bağlantısı](docs/supabase.md).

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Doğrulama

Bağımlılıklar kurulduktan sonra `npm run check` ile test tip kontrolünü, otomatik testleri, üretim derlemesini ve biçim kontrolünü çalıştırın. Geliştirme sırasında `npm run test:watch` kullanılabilir.

Test kapsamı, ortam izolasyonu ve sınırlar: [Otomatik testler](docs/testler.md).

Supabase tabloları, Storage, RLS ve gerçek kayda geçiş: [Veri kurulumu](docs/supabase-veri-kurulumu.md). SQL uygulandıktan sonra `npm run supabase:verify` ile public bağlantıyı kontrol edin.

Admin paneli, çoklu sistem seçimi, düzenleme/silme ve ikinci migration: [Admin yönetimi](docs/admin-yonetimi.md).
