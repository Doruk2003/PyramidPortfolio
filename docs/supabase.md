# Supabase bağlantısı ve yönetici erişimi

## Yerel bağlantı

`.env.example` dosyasını temel alarak `.env` içine `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini girin. İkinci değişken, adına rağmen yeni publishable key'i de kabul eder. Değişiklikten sonra Vite geliştirme sunucusunu yeniden başlatın.

`.env` dosyaları Git dışında bırakılmıştır. Vite'ın `VITE_` değişkenleri tarayıcı paketine girer; bu nedenle burada yalnızca publishable veya eski anon anahtarı kullanılmalıdır. Secret ve service_role anahtarları istemci yapılandırmasına konulmaz. İstemci oluşturma kodu bu anahtar türlerini kabul etmez.

`src/lib/supabase.ts`, tek SDK istemcisini oluşturur. Eksik/geçersiz yapılandırma uygulamayı çökertmek yerine bağlantıyı kullanılamaz bırakır. Giriş ekranı bu durumu açıkça gösterir. Bağlantı adresinin biçimsel geçerliliği ile canlı erişilebilirliği farklı kontrollerdir.

## Giriş ve çıkış

- Tüm public sayfaların alt bilgi alanındaki **Yönetici Girişi** bağlantısı giriş ekranını açar. Oturum açıksa aynı bağlantı **Yönetim Paneli** adını alır ve dashboard'a gider. Bağlantı mobilde ve klavyeyle erişilebilir; erişim denetimini mevcut route guard ve Supabase yetkileri yapar.
- `/admin/login` e-posta ve parolayı `authService` üzerinden `signInWithPassword` metoduna iletir.
- İlk oturum yüklemesinde kayıtlı oturum varsa kullanıcı `getUser` ile Auth sunucusundan kontrol edilir. Süresi/geçerliliği reddedilen oturum giriş yapılmış kabul edilmez; bağlantı hatası ayrıca gösterilir.
- SDK oturum saklama ve token yenilemesini yönetir. UI modelinde token veya parola tutulmaz.
- Giriş, yenileme, kullanıcı güncelleme ve çıkış olayları ortak oturuma aktarılır. İlk abonelik olayı, sunucudan yapılan başlangıç kontrolünü ezmemesi için atlanır.
- Admin menüsündeki çıkış düğmesi `scope: 'local'` ile mevcut oturumu kapatır. Diğer cihazlardaki oturumları kapatmayı amaçlamaz. Aynı tarayıcıdaki SDK oturum paylaşımı üzerinden diğer sekmeler de güncellenir.
- Uygulama şu an parolalı giriş içindir. URL'den OAuth/kurtarma oturumu algılama kapalıdır; parola sıfırlama veya OAuth eklenirse ilgili callback akışı ayrıca uygulanmalıdır.

## Kullanıcının seçtiği yetki kuralı

**Supabase Auth'taki tüm oturum açabilen kullanıcılar yönetici kabul edilir.** Ek bir rol tablosu veya `app_metadata.role` koşulu kullanılmaz.

Yalnızca Dashboard üzerinden oluşturulan hesapların erişmesi isteniyorsa Supabase Authentication ayarlarında **Allow new users to sign up** kapalı olmalıdır. Arayüzde kayıt düğmesi olmaması, Auth API üzerinden kayıt açılmasını engellemez. Ayarı kapatmak önceden oluşturulmuş hesapları silmez; mevcut kullanıcı listesi de bu kurala uygun olmalıdır.

İlk canlı kontrolde açık kayıt etkindi (`disable_signup: false`). Kullanıcı Dashboard üzerinden ayarı kapattı; sonraki canlı kontrolde `disable_signup: true` doğrulandı. Ayar kullanıcı tarafından değiştirildi; istemciden yönetim işlemi yapılmadı.

## Veri erişiminin sınırı

Auth bağlantısına ek olarak gerçek katalog okuma, proje kaydı ve medya yükleme adaptörleri hazırlandı. Veri kaynağı `VITE_DATA_SOURCE` ile açıkça seçilir; varsayılan değer `example` olmakla birlikte bu projede tablo okuma kontrolünün ardından yerel `.env` içinde `supabase` seçildi. SQL yerel PostgreSQL testlerinden geçti; uzak tabloların gerekli kolonları public API üzerinden okundu. Bucket ayarları, uzak yazma yetkileri ve gerçek hesapla kayıt ayrıca doğrulanmalıdır.

Kurulum SQL'i, RLS modeli, canlıya geçiş ve test sınırları: [Supabase veri kurulumu](supabase-veri-kurulumu.md). Route guard, veritabanı yetkilendirmesinin yerine geçmez.

## Doğrulama kaydı

- Yapılandırılmış gerçek projenin `/auth/v1/settings` uç noktası publishable key ile **HTTP 200** döndürdü; e-posta ile giriş etkin.
- Kullanıcının ayarı kapatmasının ardından tekrar yapılan canlı kontrolde **HTTP 200**, `disable_signup: true` ve e-posta girişi etkin sonucu alındı. Herkese açık kayıt kapalı; mevcut kullanıcıların e-posta girişi açık.
- Üretim derlemesi başarılı.
- Yerel kontrollerde adaptör dönüşümleri, sunucu kullanıcı doğrulama hataları, olaylar, abonelik temizliği, hata kodları, ortak oturum ve route guard davranışları geçti.
- Gerçek bir kullanıcı parolasıyla uçtan uca giriş/çıkış yapılmadı. Bu nedenle hesap bazlı giriş başarısı ve tarayıcıda oturumun yenileme sonrası korunması henüz canlı olarak doğrulanmış değildir.

Auth olay ve çıkış davranışları SDK sözleşmesine dayanır: [oturum olayları](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [çıkış kapsamı](https://supabase.com/docs/reference/javascript/auth-signout).

## Admin yönetimi güncellemesi

İlk gerçek proje kaydı kullanıcı tarafından doğrulandı. Çoklu kategori, düzenleme/silme ve medya temizleme akışları ikinci migration ile eklendi; yeni kolonlar/ilişkiler canlı API üzerinden okundu. Önceki tek kategori ve yalnızca oluşturma sınırı değişmiştir: [Güncel admin sözleşmesi](admin-yonetimi.md).
