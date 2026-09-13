# Veri erişimi ve sorumluluk sınırları

## Sorumluluklar

| Katman         | Sorumluluk                                                                                         | Sınır                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `views/`       | Route bağlamı, sayfa verisi, yükleniyor/hata/boş durumları ve kullanıcı işlemlerinin koordinasyonu | Veri sağlayıcısının ayrıntıları servis katmanında tutulur                            |
| `layouts/`     | Ortak sayfa iskeleti ve navigasyon                                                                 | Proje sorgusu ve form iş kuralları içermez                                           |
| `components/`  | Props ile aldığı veriyi göstermek, kullanıcı etkileşimlerini tipli event'lerle bildirmek           | Örnek veri, servis veya sağlayıcı istemcisini doğrudan import etmez                  |
| `composables/` | Form, filtre, önizleme ve ortak oturum gibi reaktif davranışlar                                    | Sağlayıcı SDK'sına doğrudan bağlanmaz; veri gerekiyorsa servis sözleşmesini kullanır |
| `services/`    | Veri alma/kaydetme ve oturum sağlayıcısıyla iletişim                                               | Vue bileşeni, DOM, router yönlendirmesi veya kullanıcı mesajı içermez                |
| `types/`       | Katmanların paylaştığı veri sözleşmeleri                                                           | Vue bileşenine ve veri sağlayıcısına bağımlı olmaz                                   |
| `data/`        | Geliştirme amaçlı örnek veriler                                                                    | Servis geçişi tamamlanınca yalnızca servisler tarafından okunur                      |
| `styles/`      | Ortak tasarım değişkenleri ve temel yerleşim                                                       | Bileşene özel görünüm mümkün olduğunca bileşende tutulur                             |

Servis metotları sağlayıcı bağımsız uygulama tipleri döndürür. Veri sağlayıcısının tablo adları, sorgu nesneleri ve yanıt formatları sayfalara taşınmaz. Yalnızca ihtiyaç olan soyutlamalar oluşturulur; boş klasörler ve kullanılmayan servisler eklenmez.

## Hedef veri akışı

```text
Sayfa / işlem composable'ı → Servis → Örnek veri veya Supabase
           ↓
     Props ile bileşen
           ↓
     Tipli kullanıcı olayı → Sayfa / form composable'ı
```

Sayfalar servislerden veri ister ve gösterim için hazırlar. Bileşenler bu verinin örnek dosyadan mı uzak sunucudan mı geldiğini bilmez. İşlem composable'ları ihtiyaç olduğunda eklenir; her servis çağrısı için ek bir katman zorunlu değildir.

## Adım 1 — Tamamlanan sınır düzenlemeleri

- `Category` tipi örnek veri dosyasından `types/Category.ts` içine ayrıldı.
- `CategorySidebar`, kategori ve proje dosyalarını okumak yerine kategori seçeneklerini, sayaçları ve toplamı props ile alıyor. Kullanıcı seçimini `change` olayıyla bildiriyor.
- `ProjectsView`, kategori sayaçlarını bir geçişte hesaplayıp sidebar'a aktarıyor. Sayaçlar arama sonucunu değil, mevcut veri kümesindeki kategori toplamlarını temsil ediyor.
- `ProjectBasicInfoForm` kategori seçeneklerini sayfadan alıyor; kategori etkileşimini `category-change` olayıyla bildiriyor.
- `ProjectMediaForm` dosya seçimi işlemlerini callback props yerine tipli event'lerle sayfaya iletiyor. Önizleme ve dosya durumu `useProjectForm` içinde kalıyor.

### Geçiş sırasında mevcut durum

Sayfalar örnek veriyi servisler üzerinden alıyor. Kategori seçenekleri sayfadan form bileşenine aktarılıyor; `useProjectForm` yalnızca seçilen kategori kimliğini tutuyor ve veri kaynağına erişmiyor. Üçüncü adımda örnek projeler yedi sistem kategorisiyle eşleştirildi.

Temel bilgi alanları, üst sayfanın sahibi olduğu reaktif `form` nesnesinin alanlarını `v-model` ile düzenliyor. Bu, mevcut iki form bölümünün paylaştığı açık form sözleşmesidir; bileşen kayıt işlemi başlatmaz. Form/kayıt ayrımının ve doğrulamanın tamamlanması sekizinci adımdadır. Dosya event'leri mevcut işleyicilerle uyumlu olmak için şimdilik DOM `Event` taşıyor.

Bu adımda Supabase, oturum veya kalıcı kayıt eklenmedi. Servisler tanımlanmadan önce bileşenlerin veri kaynağına bağımlılığı kaldırıldı.

## Adım 2 — Veri erişim katmanı

| Servis metodu            | Sonuç                      | Sözleşme                                                            |
| ------------------------ | -------------------------- | ------------------------------------------------------------------- |
| `listProjects()`         | `Promise<Project[]>`       | Kayıt yoksa boş dizi; erişim hatasında rejected Promise             |
| `getProjectBySlug(slug)` | `Promise<Project \| null>` | Kayıt yoksa `null`; erişim hatası bulunamadı sonucuna dönüştürülmez |
| `listCategories()`       | `Promise<Category[]>`      | Kayıt yoksa boş dizi; erişim hatasında rejected Promise             |

Şimdilik servisler `data/` dosyalarını okur. Sonuçlar kaynak nesnelerden ayrılmış kopyalardır; proje galerisi ve uygulama görselleri dizileri de kopyalanır. UI'da sonuç değiştirmek örnek veri kaynağını değiştirmez. Kalıcı kayıt veya Supabase bağlantısı bu adımın kapsamında değildir.

- Ana sayfa, public proje listesi/detayı, admin proje listesi, dashboard ve yeni proje sayfası servisleri kullanır.
- `useAsyncData` yükleniyor/başarı/hata durumunu ve yeniden denemeyi yönetir. Her kullanım kendi durumunu oluşturur; ortak cache veya veri deposu değildir.
- Son başlayan istek geçerlidir. Önceki isteğin geç tamamlanması veya sayfadan ayrılma, güncel veriyi değiştiremez. Bu koruma isteği ağ seviyesinde iptal etmez.
- `AsyncState` yalnızca durum metnini ve tekrar dene düğmesini gösterir; servis çağırmaz. Kullanıcıya sağlayıcının ham hata ayrıntıları gösterilmez.
- Proje listesi ve dashboard, proje/kategori isteklerini birlikte başlatır; iki veri kümesi de gelmeden içerik göstermez. Birinin hatası ekranın yükleme hatası olarak ele alınır.
- Detay sayfası slug değişiminde yeniden yüklenir ve varsa açık görsel penceresini kapatır. Yükleme hatası ile bulunamayan kayıt farklı gösterilir.
- Yeni proje sayfası kategori seçenekleri yüklenmeden veya kategori yokken formu açmaz. Üçüncü adım itibarıyla seçim doğrudan `form.categoryId` alanında tutulur; kategori adı kopyalama callback'i kaldırılmıştır.
- Veri yenilenirken önceki sonuç bellekte kalır, fakat ekranlarda yükleniyor/hata sırasında gösterilmez. Filtre sayaçları servisten gelen reaktif veri üzerinden hesaplanır.

Kalıcı kayıt, auth ve form doğrulaması sonraki onaylı adımlarda uygulanacaktır.

## Adım 3 — Kategori ilişkisi ve proje durumları

- `ProjectRecord` kaynak/kayıt modelidir. Yalnızca `categoryId` tutar; kategori adı ve slug'ı projeye kopyalanmaz.
- `Project`, servisin döndürdüğü okuma modelidir: kayıt alanlarına ek olarak kategori sözlüğünden çözümlenen `category: Category` nesnesini içerir. Bu nesne kaynak kayıtta saklanmaz.
- Liste ve detay servisi kategori ilişkisini çözümler. Kategori adı/slug'ı değiştiğinde sonraki servis çağrısı yeni bilgiyi döndürür; mevcut ekranları otomatik yenileyen gerçek zamanlı bir yapı henüz yoktur.
- Geçersiz kategori referansı, tanımsız durum ve tekrarlı kategori ID/slug'ı servis hatası üretir. Bozuk veri sessizce başka kategoriye atanmaz.
- Kategori filtreleri ve sayaçları sayısal kategori ID'si kullanır; ad/slug değişikliği ilişkileri bozmaz. Form seçimi `number | null` değerindedir; başlangıçta `null` olur.
- `useProjectForm` artık kategori listesini almaz. Kategori adını kopyalayan `handleCategoryChange` ve bileşenin `category-change` olayı kaldırılmıştır. Kategori seçimi ortak form modelinin `categoryId` alanını günceller.
- `constants/projectStatuses.ts` durum kodlarının, Türkçe etiketlerin, seçeneklerin, varsayılanın ve durum doğrulamasının tek kaynağıdır. Kaynak ve form modelleri `ProjectStatus` tipiyle sınırlandırılır.

| Kaydedilen durum kodu | UI etiketi   |
| --------------------- | ------------ |
| `design`              | Tasarım      |
| `in_progress`         | Devam Ediyor |
| `completed`           | Tamamlandı   |

### Örnek veri kararı

Kullanıcının tercihiyle mevcut yedi sistem kategorisi korundu; üç örnek projenin başlığı ve açıklaması bu sistemlere uygun hale getirildi. Önceki proje slug'ları bağlantıları bozmamak için korundu. Görseller mevcut örnek görsellerdir; yeni sistemlere özel görsel üretimi yapılmadı.

| Örnek proje               | Kategori ID | Kategori               | Korunan proje slug'ı   |
| ------------------------- | ----------- | ---------------------- | ---------------------- |
| Villa Bioclimatic Pergola | 1           | Bioclimatic Sistemleri | `modern-villa-projesi` |
| Residence Cam Balkon      | 6           | Cam Balkon Sistemleri  | `residence-ic-mekan`   |
| Ofis Giyotin Cam Sistemi  | 4           | Giyotin Sistemleri     | `modern-ofis-tasarimi` |

Bu üç kategorinin her birinde bir proje, diğer dört kategoride sıfır proje bulunur. Kategori adları yalnızca kategori sözlüğünde, durum etiketleri yalnızca ortak durum tanımında yönetilir. Supabase'e geçildiğinde kategori referansı ve durum kısıtları ayrıca veritabanı düzeyinde uygulanmalıdır; mevcut kontroller ön yüz veri erişim katmanındadır.

## Adım 4 — Supabase için auth altyapısı

Mock giriş adımı kullanıcının isteğiyle kaldırıldı. Uygulamaya test hesabı, sahte oturum veya yerel başarılı giriş eklenmedi. Supabase SDK'sı ve bağlantı ayarları bu adımda kurulmadı.

### Dosyalar ve sorumluluklar

| Dosya                     | Sorumluluk                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `types/Auth.ts`           | Kullanıcı/oturum/kimlik bilgisi tipleri, durum ve hata kodları, sağlayıcı sözleşmesi                |
| `services/authService.ts` | Sağlayıcıya erişim, yapılandırılmamış bağlantı davranışı ve tipli hata sınırı                       |
| `composables/useAuth.ts`  | Uygulama genelinde tek oturum durumu, başlatma, giriş/çıkış koordinasyonu ve abonelik yaşam döngüsü |
| `main.ts`                 | Paylaşılan oturumu uygulama başlangıcında başlatır; public sayfaların açılmasını bekletmez          |

`useAuth()` her çağrıda aynı nesneyi döndürür. `createAuthState(service)` bağımsız yaşam döngüsü oluşturmak ve sözleşme kontrolleri yapmak için ayrılmıştır; uygulama bileşenlerinde yeni durum oluşturmak yerine `useAuth()` kullanılır. Yapı mevcut istemci taraflı SPA içindir; gelecekte SSR eklenirse istek başına durum gerekir.

### Sağlayıcı sözleşmesi

- `getSession(): Promise<AuthSession | null>` mevcut oturumu döndürür; `null` yalnızca oturum bulunmadığını ifade eder, bağlantı hatasını değil.
- `signIn(credentials): Promise<AuthSession>` başarılı girişte oturum döndürür; başarısızlıkta hata fırlatır.
- `signOut(): Promise<void>` sağlayıcıda çıkış tamamlanınca çözülür.
- `subscribe(listener): () => void` oturum değişikliklerini bildirir ve abonelik temizleme fonksiyonu döndürür. Listener yalnızca senkron durum güncellemesi yapar. Temizleme fonksiyonu hata fırlatmamalıdır.
- Adaptör bilinen sağlayıcı hatalarını `AuthServiceError` kodlarına çevirir. UI kodları kullanıcı mesajına dönüştürür; sağlayıcının ham hata metni gösterilmez.

Supabase bağlantı adımında gerçek adaptör `createAuthService(supabaseProvider)` ile `authService.ts` içindeki tek servis örneğine bağlanacak. Adaptör SDK oturumunu UI için yalnızca `user.id` ve `user.email` alanlarına dönüştürecek. Parola ortak durumda tutulmaz; access/refresh token ve kalıcılık SDK sorumluluğunda kalır.

Supabase tarafındaki karşılıklar `signInWithPassword`, `getSession`, `signOut` ve `onAuthStateChange` olacaktır. Abonelik callback'i içinde yeni asenkron auth çağrısı yapılmaz; dönen subscription uygulama yaşam döngüsünde temizlenir. [Supabase oturum olayları](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [parolalı giriş](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).

### Durum ve işlem davranışı

| Durum             | Anlam                                                                |
| ----------------- | -------------------------------------------------------------------- |
| `idle`            | Oturum henüz başlatılmadı                                            |
| `initializing`    | Sağlayıcıdan ilk oturum bilgisi bekleniyor                           |
| `authenticated`   | Sağlayıcıdan oturum alındı; tek başına admin yetkisi anlamına gelmez |
| `unauthenticated` | Başlatma tamamlandı; oturum yok                                      |
| `unavailable`     | Sağlayıcı yapılandırılmamış; giriş kullanılamaz                      |
| `error`           | İlk oturum bilgisi alınamadı; başlatma yeniden denenebilir           |

- Mevcut bağlantısız servis `isConfigured: false` döndürür. Başlatma `unavailable` durumuna geçer; giriş/çıkış istekleri `not_configured` hatasıyla reddedilir.
- Paralel `initialize()` çağrıları aynı Promise'i bekler ve tek abonelik açar. Başlatma hatası durum koduna yansır; guard daha sonra yalnızca `initialize()` tamamlandı diye erişim vermemelidir.
- `session`, `status`, `errorCode` ve işlem durumu dışarıya salt okunur açılır. Kullanıcı ve oturum verileri sağlayıcı nesnesinden kopyalanır.
- `operation` giriş/çıkış sırasında tutulur. İkinci işlem `busy` hatasıyla reddedilir; giriş/çıkış hataları çağıran ekran tarafından yakalanmalıdır.
- Başarısız çıkış mevcut oturumu başarılı çıkış gibi silmez. Sağlayıcıdan daha yeni bir oturum olayı gelmişse geç tamamlanan istek bu olayı ezmez.
- `dispose()` aboneliği temizler ve geç gelen olay/istek sonuçlarını geçersiz kılar. Vue bileşeni kapanırken ortak auth kapatılmaz; geliştirmede modül yenilendiğinde HMR temizliği çalışır.
- Oturum yenileme ve diğer sekmelerdeki giriş/çıkış değişiklikleri ileride gerçek sağlayıcının aboneliği üzerinden aktarılır; şu anda Supabase üzerinde doğrulanmış değildir.

Bu adım rota koruması veya yönetici yetkilendirmesi eklemez. Gerçek yönetici erişim politikası Supabase entegrasyonunda sunucu/veritabanı yetkileriyle birlikte kurulacaktır.

### Doğrulama

Yerel, bellekte çalışan sözleşme kontrolleri; yapılandırılmamış bağlantıyı, tekil başlatmayı, hata/yeniden denemeyi, eşzamanlı işlemleri, salt okunur oturumu, geç yanıt/olay sırasını ve abonelik temizliğini kapsar. Kontrollerin sağlayıcı benzetimleri yalnızca geçici test ortamında çalışır; uygulamada mock giriş yolu yoktur. Gerçek Supabase bağlantısı ve tarayıcı giriş akışı henüz test edilmedi.

## Adım 5 — Yönetici giriş sayfası

`/admin/login` rotası `AdminLoginView.vue` ile bağımsız olarak tanımlandı. Public veya admin layout içinde değildir; admin menüsü giriş ekranında gösterilmez.

- Sayfa `useAuth()` üzerinden ortak oturumu kullanır. Bağlantı yapılandırılmamışsa giriş hizmetinin henüz açılmadığını gösterir; form alanları ve gönderim düğmesi devre dışıdır. Programatik gönderim de engellenir.
- Oturum kontrolü sırasında bekleme durumu, başlatma hatasında tekrar deneme düğmesi gösterilir.
- E-posta için boşluk temizleme ve temel biçim kontrolü yapılır. Parolada yalnızca boş olmama kontrolü vardır; giriş parolasına kayıt ekranındaki gibi yeni uzunluk koşulu uygulanmaz, parola kırpılmaz.
- Alanlar etiket, autocomplete, hata açıklaması bağlantısı ve `aria-invalid` taşır. İlk hatalı alana odaklanılır. Hata mesajları ve işlem durumu yardımcı teknolojilere bildirilir.
- Bilinen auth hatalarının Türkçe karşılıkları `constants/authMessages.ts` içinde tutulur. Kullanıcıya sağlayıcının ham hata ayrıntısı gösterilmez.
- Giriş sürerken ikinci gönderim engellenir. İşlem tamamlandığında veya sayfadan ayrılırken yerel parola alanı temizlenir.
- Sağlayıcıdan başarılı giriş dönmesi yanında ortak oturumun hâlâ açık olması da kontrol edilir. Daha yeni bir çıkış olayı gelmişse yönetim paneline yönlendirme yapılmaz.
- Başarılı girişin hedefi altıncı adım itibarıyla `getSafeAdminRedirect` ile doğrulanan admin adresidir; geçersiz veya eksik hedefte `/admin` kullanılır.
- Sayfadan ayrıldıktan sonra tamamlanan giriş işlemi eski ekran üzerinden yönlendirme yapmaz. Ortak auth yaşam döngüsü bileşen kapandığında sonlandırılmaz.
- Oturum zaten açıksa giriş formu yerine yönetim paneline geçiş bağlantısı gösterilir. Altıncı adımda login rotasına oturumlu erişimde otomatik yönlendirme de eklenmiştir.

Üretim derlemesi ve yerel Vue render kontrolleri; bağlantısız formu, alan doğrulamasını, hata/yeniden denemeyi, işlem sırasında beklemeyi, yinelenen gönderimi, geç sonuçları ve bağımsız route eşleşmesini kapsar. Gerçek Supabase girişi ve tarayıcıda görsel/klavye incelemesi henüz yapılmadı.

Beşinci adım yalnızca giriş sayfasını eklemiştir; `/admin` koruması aşağıdaki altıncı adımda tamamlanmıştır.

## Adım 6 — Oturum gerektiren rotalar ve güvenli dönüş

- `/admin` üst rotasına `meta.requiresAuth: true` eklendi. Guard eşleşen üst/alt rotaları kontrol eder; dashboard, proje listesi ve yeni proje ekranı bu korumayı devralır.
- `/admin/login` bağımsız kalır. Public rotalar oturumun yüklenmesini beklemez.
- `router/authGuard.ts` içindeki `beforeEach`, korunan sayfalar ve login için ortak `initialize()` sonucunu bekler. Başlatmanın bitmesi tek başına erişim vermez; oturumun açık olması gerekir. Hata veya bağlantısızlık durumunda login açılır.
- `beforeResolve` son aşamada oturumu tekrar kontrol eder. Diğer guard'lar veya sayfa yüklenmesi sırasında oturum kapanırsa erişim reddedilir.
- Oturumsuz erişimde hedef `redirect` query parametresine alınır. Geçerli admin adreslerinin query/hash bölümleri korunur.
- `router/authRedirect.ts` hedefin tek bir string olmasını, izin verilen admin yol biçimini ve gerçekten korunan bir rotayla eşleşmesini kontrol eder. Dış/protokol adresleri, çift slash, ters slash, kontrol karakterleri, path traversal, kodlanmış yol bölümleri, bilinmeyen rotalar, public sayfalar ve login'in kendisi kabul edilmez. Geçersiz hedefin dönüşü `/admin` olur.
- Login sayfası ve guard aynı dönüş doğrulama fonksiyonunu kullanır. Oturumlu kullanıcı login'e giderse doğrulanmış hedefe yönlendirilir; login döngüsü oluşmaz.
- Oturumun kapanması ortak durum üzerinden izlenir. Kullanıcı admin sayfasındaysa login'e geçilir; public sayfadaysa bulunduğu sayfa korunur.
- `AdminLayout`, oturum açık değilse menü ve alt sayfayı render etmez. Bu, yönlendirme tamamlanana kadar veya yönlendirme başarısız olursa admin içeriğinin ekranda kalmasını engeller.
- Guard ve oturum izleyicisi için temizleme fonksiyonu ve HMR temizliği vardır. Provider'ın senkron callback'i içinde router işlemi yapılmaz; Vue izleyicisiyle ele alınır.

**Bağlantısız davranış:** Yapılandırma eksik veya geçersizse admin sayfaları giriş ekranına yönlendirilir. Yedinci adımda gerçek adaptör bağlanmıştır; geçerli yapılandırmayla Supabase kullanıcıları giriş yapabilir. UI içinde bypass veya mock giriş yoktur.

Yerel memory-router kontrolleri public gezinme, bekleyen oturum, oturumsuz yönlendirme, oturumlu login, geçersiz dönüş adresleri, oturum kaybı ve guard'lar arasında oturum kapanmasını doğruladı. Login render kontrolleri de yeni dönüş hedefiyle tekrar çalıştırıldı. Gerçek tarayıcı yenilemesi/hosting fallback'i ve gerçek Supabase oturumu bu kontrollerin kapsamında değildir.

Bu yapı istemci tarafında **oturum korumasıdır**, yönetici rolü veya veritabanı yetkilendirmesi değildir. Supabase bağlantı adımında gerçek yönetici erişim kuralı ve sunucu/veritabanı izinleri ayrıca ele alınacaktır.

## Adım 7 — Gerçek Supabase Auth bağlantısı

Kullanıcının oluşturduğu `src/lib/supabase.ts` ve ortam değişkenleri incelendi. Publishable key ile gerçek Auth ayarlarına yapılan salt okunur istek HTTP 200 döndürdü; e-posta girişi etkin.

- `supabaseAuthProvider.ts` gerçek SDK giriş/çıkış, oturum okuma ve oturum aboneliğini uygulama sözleşmesine dönüştürür.
- `authService` geçerli Supabase istemcisiyle bu adaptörü kullanır. Hata sınıfı `authErrors.ts` içine ayrılarak adaptör/servis arasında döngüsel import önlenmiştir.
- İlk oturumda kullanıcı Auth sunucusuyla doğrulanır; başlangıç abonelik olayı bu kontrolün sonucunu ezmez.
- Admin menüsüne çıkış işlemi ve hata gösterimi eklenmiştir. Çıkışın kapsamı mevcut oturumdur.
- `.env` sürüm kontrolü dışında tutulur; `.env.example` ve ortam tipleri eklendi. Eksik veya uygun olmayan istemci anahtarı uygulamayı çökertmez.
- Kullanıcının tercihi: **Tüm Supabase Auth kullanıcıları yönetici.** Ek rol koşulu eklenmedi. Bunun yalnızca kullanıcının oluşturduğu hesapları kapsaması için herkese açık kayıt kapatılmalıdır.
- Kullanıcı Dashboard üzerinden herkese açık kaydı kapattı. Sonraki canlı kontrolde HTTP 200, `disable_signup: true` ve e-posta girişinin etkin olduğu doğrulandı.

Auth bağlantı uygulaması ve yerel kontroller tamamlandı. Gerçek hesapla tarayıcı girişi henüz doğrulanmadı. Proje/kategori verileri hâlâ örnek dosyalarda; uzak tablo/Storage izinlerine müdahale edilmedi. Ayrıntılı bağlantı ve doğrulama kaydı: [Supabase](supabase.md).

## Adım 8 — Form doğrulama ve kayıt hazırlığı

Kullanıcı, Supabase proje/kategori tabloları ve Storage bucket'ı henüz oluşturmadığını belirtti; bu adımın form ve kayıt hazırlığıyla sınırlı kalmasını seçti. Uzak veri yapısı oluşturulmadı, gerçek kayıt veya dosya yükleme yapılmadı.

### Sorumluluklar

- `validation/projectForm.ts`: slug üretimi, saf alan/medya kontrolleri ve doğrulanmış formdan kayıt isteği oluşturma.
- `constants/projectFormRules.ts`: uzunluk, dosya boyutu/adet sınırları ve kabul edilen biçimler.
- `useProjectForm`: alanlar, hata durumu, dosya seçimleri, değişmiş olma bilgisi ve kaydedilmiş durumun işaretlenmesi.
- `useMediaPreviews`: URL oluşturma; seçim değiştiğinde ve scope kapandığında URL temizliği.
- `projectWriteService`: gelecekte kalıcı kayıt sağlayıcısının uygulayacağı `ProjectWriter.create(input)` sözleşmesi. Bağlantı yokken `isConfigured: false`; doğrudan kayıt isteği `not_configured` hatasıyla reddedilir.
- `useProjectSubmission`: mevcut katalogda slug ön kontrolü, çift gönderimi engelleme, kayıt sağlayıcısını çağırma, kullanıcı geri bildirimi ve sayfa kapandıktan sonra geç sonuçları yok sayma.
- `NewProjectView`: form kontrolünü başlatma, ilk hatalı alana odaklanma, ayrılma/yenileme uyarısı ve gerçek kayıt sonucu varsa listeye geçiş.

### Uygulanan kurallar

| Alan                           | Kural                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Başlık                         | Trim sonrası zorunlu, en fazla 150 karakter                                     |
| Slug                           | Boş olmayan küçük harf/rakam ve tire biçimi, en fazla 180 karakter              |
| Kategori                       | Yüklenen kategori sözlüğünde bulunan sayısal ID                                 |
| Durum                          | Merkezi durum tanımındaki değerlerden biri                                      |
| Yıl                            | 2000–2100 arası tam sayı; boş alan tipi `number \| ''` olarak açıkça modellenir |
| Konum                          | İsteğe bağlı, en fazla 150 karakter                                             |
| Açıklama                       | İsteğe bağlı, en fazla 5000 karakter                                            |
| Ana görsel                     | Zorunlu; JPEG/PNG/WebP, en fazla 10 MB                                          |
| Galeri / uygulama fotoğrafları | Her grupta en fazla 12 dosya; her biri JPEG/PNG/WebP ve en fazla 10 MB          |
| Video                          | İsteğe bağlı MP4/WebM; en fazla 100 MB                                          |
| Toplam medya                   | Form doğrulamasında en fazla 150 MB                                             |

Dosya kontrolleri MIME bilgisi, uzantı, boş olmama ve boyut/adet üzerinden yapılır. Bunlar dosyanın gerçek içeriğinin güvenli/geçerli olduğunu kanıtlamaz; ileride yükleme tarafında bağımsız içerik doğrulaması ve sunucu kısıtları gerekir.

### Kullanım davranışı

- Yeni galeri seçimi mevcut dosyalara eklenir. Ad/boyut/tür/son değişiklik bilgileri aynı olan dosyalar tekrar eklenmez; bu içerik hash'iyle tekilleştirme değildir.
- Geçersiz tekli veya grup seçimi kabul edilmez; önceki geçerli seçim korunur. Dosya input'u sıfırlanır; aynı dosya tekrar seçilebilir.
- Ana görsel, video ve her galeri öğesi kaldırılabilir. Önizleme URL'leri yeni seçimde ve sayfa kapanışında temizlenir.
- Hatalar alanlarla `aria-describedby` üzerinden ilişkilidir. Formun ilk hatalı alanına odaklanılır; native doğrulamaya ek olarak uygulama kuralları çalışır.
- Başlık değişiminde slug senkron üretilir; gönderim başlık watcher'ından eski bir slug alamaz. Bu composable yeni proje içindir; yayımlanmış proje slug'ını düzenleme politikası değildir.
- Yerel katalogda aynı slug varsa kullanıcıya bildirilir. Bu kontrol gelecekteki eşzamanlı kayıt yarışını önlemez; veritabanında UNIQUE kısıtı ve `duplicate_slug` hata eşlemesi ayrıca gereklidir.
- Değişmiş formdan rota değişimi veya yenilemeyle ayrılma uyarılır. Değişiklik geri alınmışsa uyarı çıkmaz. Oturum kaybında güvenlik yönlendirmesi uyarıyla engellenmez.
- Kayıt kontrolü sürerken alanlar ve gönderim düğmesi devre dışıdır. Sayfadan ayrılma, gelecekte başlayacak gerçek yazma işlemini sunucuda iptal etmeyi garanti etmez.

**Şimdiki düğme: “Formu Kontrol Et”.** Başarılı kontrolde projenin kaydedilmediği açıkça belirtilir; form temizlenmez, kaydedilmiş sayılmaz ve listeye yönlendirilmez. `markSaved()` yalnızca gerçek yazma sağlayıcısından proje sonucu gelirse çağrılır. Örnek veriye push, localStorage kaydı veya sahte başarı eklenmedi.

Yerel kontroller alan/medya sınırlarını, yanlış dosyada mevcut seçimin korunmasını, galeri ekleme/çıkarma/tekrarlarını, URL temizliğini, değişmiş form durumunu, slug çakışmasını, çift gönderimi, eksik kayıt sağlayıcısını, geç sonuçları ve UI ayrılma uyarısını kapsar. Gerçek tarayıcı dosya seçicisi, bellek profili ve kalıcı Supabase kayıt akışı henüz test edilmedi.

## Adım 9 — Tekrarlanabilir otomatik kontroller

Önceki adımlardaki geçici kontrollerin kritik senaryoları `tests/` altında kalıcı testlere taşındı. Uygulama kaynakları, testler ve test yapılandırması ayrı TypeScript kontrolünden geçer. `npm run check`, tip kontrolünü, testleri, üretim derlemesini ve biçim kontrolünü sırayla çalıştırır. Test ortamı gerçek Supabase bağlantısı oluşturmaz. Ayrıntılar ve test sınırları: [Otomatik testler](testler.md).

### Tablolar ne zaman oluşturulacak?

Veri ilişkileri ve kayıt sözleşmesi artık tanımlı; tabloları oluşturmak için uygun zaman bir sonraki adımdır. 10. adım için hazırlanan uygulamada önce tablo ilişkileri, UNIQUE/CHECK kısıtları ve medya yolu sözleşmesi hazırlanır. Ardından kategori/proje/medya tabloları, Storage ve herkese açık okuma/yönetici yazma politikaları birlikte kurulur. Mevcut karar gereği tüm Supabase Auth kullanıcıları yönetici kabul edilir ve herkese açık hesap oluşturma kapalı kalır. Gerçek okuma/kayıt/yükleme servisleri bu yapıya bağlanır; izinler ve hata durumları ayrıca doğrulanır. Bu adımda uzak tablo veya bucket oluşturulmadı.

## Onayla ilerleyen uygulama planı

Her adımdan sonra sonuç ve doğrulama paylaşılır; kullanıcı onayından sonra sıradaki adım uygulanır.

1. **Tamamlandı:** Katman sorumlulukları, bileşen props/event sınırları ve bu belge.
2. **Tamamlandı:** Promise döndüren proje/kategori servisleri; sayfaların ve form mantığının örnek verilere doğrudan bağımlılığının kaldırılması; yükleniyor/hata/boş durumları.
3. **Tamamlandı:** Proje-kategori ilişkisi ve merkezi durum değerleriyle veri tutarlılığı.
4. **Tamamlandı:** Supabase adaptörüne hazır auth tipleri, servis sözleşmesi ve tek ortak reaktif oturum durumu.
5. **Tamamlandı:** Admin layout dışında `/admin/login` sayfası; bağlantı kurulana kadar kullanılamayan girişin açık gösterimi.
6. **Tamamlandı:** Oturum başlatmasını bekleyen route guard ve güvenli dönüş adresi.
7. **Tamamlandı:** Gerçek Supabase adaptörü, SDK bağlantısı, giriş/çıkış ve oturum olayları; tüm Auth kullanıcıları yönetici kuralı. Herkese açık kaydın kapalı olduğu canlı olarak doğrulandı; gerçek hesapla tarayıcı giriş/çıkış testi henüz yapılmadı.
8. **Tamamlandı (form ve kayıt hazırlığı):** Form doğrulaması, kayıt koordinasyonu ve önizleme yaşam döngüsü.
9. **Tamamlandı:** Kritik veri, form, oturum ve guard akışları için Vitest/Vue Test Utils testleri; ayrı test tip kontrolü ve tek komutla doğrulama. Kapsam ve çalışma komutları: [Otomatik testler](testler.md).
10. **Uygulama hazır; canlı kayıt doğrulaması bekleniyor:** SQL migration, Storage/RLS kuralları, gerçek katalog/yazma adaptörleri ve veritabanı testleri hazırlandı. Uzak tabloların okunabildiği doğrulandı ve yerel veri kaynağı Supabase'e geçirildi. Uzak bucket/fonksiyon yetki kontrolü ile gerçek hesapla yükleme/kayıt doğrulaması bekleniyor. [Kurulum](supabase-veri-kurulumu.md).

`analiz.md`, ilk incelemenin tarihli bulgularıdır. Bu belge uygulama sınırlarını ve adım durumlarını takip eder.

## Adım 10 — Kalıcı veri adaptörleri

Veri kaynağı seçimi `services/catalog/index.ts` içine alındı. Yerel örnek katalog ayrı adaptörde tutulurken mevcut servis imzaları ve sayfaların sorumlulukları korundu. Supabase okuma adaptörü, SQL şemasıyla tiplenen RPC/Storage yazma adaptörü, kesin hata/sonucu belirsiz hata ayrımı ve yerel PostgreSQL testleri eklendi. Başlangıçta örnek modu korundu; uzak tablo/kolon okuma kontrolü geçtikten sonra yerel `.env` Supabase'e geçirildi. Uzak Storage/yazma yetkileri ve gerçek hesapla kayıt henüz doğrulanmadığından bu adım bütünüyle tamamlanmış sayılmaz. Ayrıntılar: [Supabase veri kurulumu](supabase-veri-kurulumu.md).

## Admin yönetimi ve çoklu kategori güncellemesi

İlk gerçek kayıt kullanıcı tarafından doğrulandı. Önceki tek kategori anlatımı, bu güncellemeyle `project_categories` ilişki tablosu ve çoklu seçim sözleşmesine geçti. Admin listesi, dashboard, sistem ve medya ekranları; güncelleme/silme RPC'leri, sürüm kontrolü ve tekrar denenebilir medya temizliği eklendi. Güncel kullanım, şema ve doğrulama sınırları: [Admin yönetimi](admin-yonetimi.md). Önceki adım açıklamaları uygulamanın gelişim geçmişini gösterir.
