# Otomatik testler

9. adımda kritik uygulama davranışları Vitest, Vue Test Utils ve jsdom ile projede tekrar çalıştırılabilir hale getirildi. Testler `tests/` altında, üretim kodundan ayrı tutulur; uygulamaya sahte giriş veya yerel kayıt özelliği eklenmez.

## Çalıştırma

Test bağımlılıkları için Node.js 22.22.2+ (22.x), 24.15.0+ (24.x) veya 26+ ve npm gerekir. Kilit dosyasındaki bağımlılıkları `npm ci` ile kurduktan sonra:

| Komut                    | Amaç                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `npm test`               | Tüm otomatik testleri bir kez çalıştırır.                                                              |
| `npm run test:watch`     | Geliştirme sırasında değişen dosyalarla ilişkili testleri tekrar çalıştırır.                           |
| `npm run test:typecheck` | Uygulama, testler ve test yapılandırmasını TypeScript ile kontrol eder.                                |
| `npm run check`          | Test tip kontrolü, testler, üretim derlemesi ve biçim kontrolünü sırayla çalıştırır; ilk hatada durur. |

Tek dosya örneği: `npm test -- tests/router.test.ts`.

## Kapsam

- `auth.test.ts`: yapılandırma yokken erişimin kapalı olması, ortak başlatma isteği, geç oturum yanıtları, yeniden deneme, başarısız çıkış, eşzamanlı işlem engeli ve abonelik temizliği.
- `router.test.ts`: herkese açık rotalar, oturum geri yüklemesini bekleme, girişe/dönüş adresine yönlendirme, oturum kaybı, navigasyon sırasında son kontrol ve zararlı dönüş adresleri. Guard, bellek router'ındaki küçük bir rota kümesiyle sınanır; tüm üretim rota ağacının uçtan uca testi değildir.
- `supabase-provider.test.ts`: SDK sınırında kontrollü yanıtlarla gerçek adaptörün sınanması; geri yüklenen kullanıcının Auth üzerinden doğrulanması, güvenli hata eşlemesi, başlangıç olayları ve yerel çıkış kapsamı.
- `login.test.ts`: gerçek giriş bileşeninin alan hataları, odak, devre dışı durumu, parola temizliği, başarılı yönlendirme ve bileşen kapandıktan sonra gelen sonuç.
- `data.test.ts`: yedi kategoriyle örnek katalog tutarlılığı, birbirinden bağımsız veri kopyaları, eski isteğin yeni sonucu ezmemesi, hata sonrası tekrar deneme ve scope kapandıktan sonra gelen yanıtlar.
- `form.test.ts`: alan/medya doğrulaması, kayıt isteği dönüşümü, dosya seçimi/tekrarları/boyutları, önizleme URL temizliği, değişiklik takibi, eksik kayıt sağlayıcısı, slug çakışması ve çift gönderim.
- `new-project.test.ts`: gerçek form ve alt bileşenleriyle doğrulama/odak, geçerli formda kaydedilmediğinin açık gösterimi, ayrılma uyarısı, oturum kaybında çıkışın engellenmemesi ve `beforeunload` temizliği.

`tests/helpers.ts` sadece testlerde kullanılan servis yanıtları, ertelenebilir Promise, Vue scope ve router yardımcılarını içerir. `tsconfig.test.json`, test kodunu da uygulamayla aynı katı tip kontrollerine tabi tutar.

## Ortam ve sınırlar

`vitest.config.ts` `.env` dosyalarını yüklemez; Supabase ortam değerlerini boş olarak tanımlar. Test kurulumu `fetch` çağrılarını hata ile engeller. Gerçek Supabase hesabı, anahtarı, tablosu veya Storage bucket'ı gerekmez; testler uzak veri yazmaz. Auth/SDK test karşılıkları yalnızca test dosyalarında kullanılır.

Testler tek worker ile çalışır; jsdom ortamlarının aynı anda açılmasından kaynaklanan bellek tüketimi sınırlanır. Dosyalar arası test izolasyonu korunur. `createObjectURL` ve `revokeObjectURL`, jsdom bunları sağlamadığı için test içinde değiştirilir; çağrıların doğru yaşam döngüsünde yapıldığı kontrol edilir.

Bu testler gerçek tarayıcı yerleşimini, dosya seçicisini, gerçek bellek kullanımını veya Supabase sunucusunun izinlerini doğrulamaz. Canlı hesapla giriş/çıkış, RLS, Storage ve kalıcı kayıt akışının entegrasyon kontrolleri veri altyapısı kurulduktan sonra ayrıca yapılmalıdır. Kapsam yüzdesi ölçümü yapılmadı; senaryo sayısı tüm hataların yakalandığı anlamına gelmez.

## Adım 10 ekleri

`database.test.ts`, PGlite PostgreSQL motorunda migration ve RLS/RPC kurallarını test eder. `remote-catalog.test.ts` gerçek SDK sorgu oluşturma akışını kontrollü HTTP yanıtlarıyla sınar. `remote-writer.test.ts` yükleme, atomik kayıt, temizleme ve sonucu belirsiz ağ hatalarını kapsar. Bunlar canlı Supabase entegrasyon testinin yerine geçmez.

## Admin yönetimi testleri

`admin-projects.test.ts` silme onayı, kategori filtreleri ve liste güncellemelerini; `edit-project.test.ts` mevcut projenin çoklu kategori/medyayla düzenlenmesini kapsar. PostgreSQL testlerine mevcut kaydın ikinci migration ile korunması, sürüm çakışmaları, güncelleme/silme yetkileri ve temizleme kuyruğu eklendi.
