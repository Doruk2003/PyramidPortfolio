# Supabase veri ve medya kurulumu — Adım 10

## Hazırlanan yapı

`supabase/migrations/202609120001_portfolio.sql` tek transaction içinde aşağıdaki yapıyı oluşturur. SQL yerel PostgreSQL motorunda (PGlite) test edilir; bu, canlı Supabase projesine uygulandığı anlamına gelmez.

| Yapı                           | Sorumluluk                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `categories`                   | Yedi mevcut sistem kategorisi; sayısal ID ve benzersiz slug.                                                      |
| `projects`                     | Başlık, slug, kategori ilişkisi, açıklama, konum, yıl, durum, kayıt isteği ID'si ve oluşturan kullanıcının ID'si. |
| `project_media`                | Projeye bağlı medya türü, sırası ve Storage yolu. Kalıcı URL saklanmaz.                                           |
| `project-media` bucket         | JPEG/PNG/WebP görseller ve MP4/WebM videolar için herkese açık portföy medyası.                                   |
| `create_portfolio_project` RPC | Oturum, alanlar ve yüklenmiş medya doğrulandıktan sonra proje ve medya satırlarını atomik kaydeder.               |

Örnek üç proje uzak veritabanına taşınmaz; bunlar örnek modunda kalır. Supabase'e geçildiğinde katalog ilk gerçek proje kaydına kadar boş olur. Yedi kategori SQL ile eklenir.

## Kurulum sırası

1. Supabase Dashboard'da doğru projeyi açın; **SQL Editor → New query** bölümüne migration dosyasının tamamını yapıştırıp bir kez çalıştırın. Dosya mevcut aynı adlı tabloları/bucket'ı silmez veya üzerine yazmaz; çakışma varsa hata verir ve transaction geri alınır. Başarılı migration tekrar çalıştırılmaz; sonraki değişiklikler ayrı migration olmalıdır.
2. `supabase/verify.sql` içeriğini çalıştırın. Kategoriler yedi satır olmalı; üç tabloda `rowsecurity = true`, `anon_can_create = false`, `admin_can_create = true`, `direct_insert_allowed = false` görülmelidir. `project-media` bucket'ı public olmalı; 104857600 bayt üst sınırı ve beş MIME türü bulunmalıdır.
3. Terminalde `npm run supabase:verify` çalıştırın. Bu komut yalnızca okuma yapar: açık kaydın kapalı olduğunu, kategorileri ve proje/kategori/medya ilişkilerinin public API üzerinden okunabildiğini kontrol eder. Yönetici yazmasını ve Storage bucket ayarlarını doğrulamaz.
4. Kontrollerden sonra mevcut `.env` dosyasına `VITE_DATA_SOURCE=supabase` ekleyin ve geliştirme sunucusunu yeniden başlatın. Yayın ortamında da bu build değişkenini ayarlayıp yeniden derleyin. Bağlantı için mevcut `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` kullanılır; tarayıcıya secret/service_role anahtarı eklenmez.
5. Gerçek yönetici hesabıyla `/admin/login` üzerinden giriş yapın; bir kategori, benzersiz başlık ve küçük bir JPEG/PNG/WebP ana görselle proje kaydedin. Başarıdan sonra admin listesinde ve public proje detayında kaydı doğrulayın; sayfayı yenileyip kalıcı olduğunu kontrol edin. Galeri sırasını, uygulama fotoğraflarını ve video bağlantısını ayrıca sınayın.
6. Oturumu kapatın: public katalog okunabilmeli, admin alanına giriş gerekmelidir. Supabase'de açık kayıt kapalı kalmalıdır. Canlı Storage yükleme/silme ve yetkisiz yazma sonuçları yerel testlerden ayrı doğrulanmalıdır.

## Veri kaynağı seçimi

`VITE_DATA_SOURCE=example` (veya değişkenin tanımlı olmaması), mevcut örnek kataloğu ve “Formu Kontrol Et” akışını korur. `supabase`, gerçek okuma/yazma adaptörlerini seçer. Geçersiz kaynak adı veya eksik Supabase bağlantısı hata durumuna gider. Supabase bağlantı/tablo hatası olduğunda örnek verilere sessizce dönülmez.

Veri kaynağı yalnızca `services/catalog/index.ts` içinde seçilir; sayfalar mevcut proje/kategori servislerini çağırmaya devam eder. `catalog/exampleCatalog.ts` örnek veri erişimini, `catalog/supabaseCatalog.ts` uzak kayıtların UI modeline dönüşümünü yönetir. Projeler anahtar üzerinden 100'lük sayfalarla okunur; ilk API sayfasından sonraki kayıtlar kaybolmaz. Mevcut ekranlar sonuçların tamamını bekler; çok büyük katalog için ekran seviyesinde sayfalama ayrıca yapılmalıdır.

`types/Database.ts` migration sözleşmesinin elle yazılmış istemci tipidir. Doğrudan tablo Insert/Update tipleri bilerek `never` tutulur; istemci kayıt için RPC kullanır. Şema değişikliklerinde tipler güncellenmeli; CLI ile üretilecek tiplerde bu uygulama sınırı korunmalıdır.

## Yetki ve bütünlük

- Kullanıcının kararı gereği tüm Supabase Auth kullanıcıları yönetici kabul edilir. Rol tablosu yoktur. Herkese açık kayıt kapalı tutulur.
- Üç tabloda RLS etkindir. Ziyaretçiler ve oturum açmış kullanıcılar portföyü okuyabilir; doğrudan tablo yazma yetkileri verilmez. Kategori düzenleme ve proje düzenleme/silme bu adımın uygulama API'sinde yoktur.
- Kayıt fonksiyonu yalnızca `authenticated` rolüne açılır; ayrıca `auth.uid()` kontrol eder. `SECURITY DEFINER` yalnızca doğrulanmış transaction'ın tabloya yazabilmesi içindir. `search_path` boş ve tablo/fonksiyon başvuruları şema adlarıyla sabittir; genel/anon çalıştırma yetkisi kaldırılır. [Supabase fonksiyon güvenliği](https://supabase.com/docs/guides/database/functions).
- Slug için UNIQUE, kategori için FK ve alan uzunlukları/yıl/durum için CHECK kısıtları uygulanır. RPC tam bir ana görsel, en fazla bir video, galeri/uygulama grubu başına 12 öğe ve toplam 150 MB sınırını kontrol eder. Medya satırı hatası proje satırını da geri alır.
- Dosyalar `kullanıcı-uuid/istek-uuid/tür-sıra.uzantı` biçiminde yüklenir. Dosya adı kullanıcı girdisinden türetilmez; overwrite/upsert kullanılmaz. RPC, yolların mevcut kullanıcıya/isteğe ait olduğunu ve Storage kayıtlarının varlığını kontrol eder. Boyut ve MIME bilgisi istemciden değil Storage metadata'sından okunur. MIME/uzantı denetimi dosyanın gerçek içeriğinin analiz edildiği anlamına gelmez.
- Bucket 100 MB dosya üst sınırı uygular; RPC görselleri ayrıca 10 MB ile sınırlar. Public bucket dosyaları URL'lerini bilen ziyaretçilere sunar; dosya yükleme ve temizleme RLS'ye tabidir. [Storage erişim kuralları](https://supabase.com/docs/guides/storage/security/access-control).
- Yükleme yalnızca kullanıcının kendi klasörüne yapılır. Temizleme yalnızca kendi klasöründeki henüz projeye bağlanmamış nesneleri silebilir; kayda bağlanmış medya üzerine yazılamaz/silinemez. Gelecekteki düzenleme/silme akışı ayrıca kontrollü bir işlem gerektirir.

## Kayıt ve hata davranışı

Form verisi yeniden doğrulanır, kullanıcı Auth üzerinden kontrol edilir, dosyalar sırayla yüklenir ve proje/medya kaydı RPC ile tek transaction'da tamamlanır. Başarı ancak kaydedilen proje geri okunabildiğinde arayüze döner.

Storage yüklemesi ve PostgreSQL transaction'ı tek ortak transaction değildir:

- Yükleme veya kesin SQL doğrulama/benzersizlik hatasında yüklenmesi denenmiş nesneler temizlenmeye çalışılır. Temizleme başarısızsa kullanıcıya ayrı hata gösterilir.
- RPC cevabı ağda kaybolduysa aynı istek ID'siyle kayıt aranır. Kayıt bulunursa işlem başarılı kabul edilir. Sonuç doğrulanamıyorsa dosyalar silinmez; kullanıcıdan tekrar göndermeden önce Projeler listesini kontrol etmesi istenir.
- Aynı istek ID'sinin RPC'ye tekrar gönderilmesi aynı proje ID'sini döndürür. Formdan yeni bir gönderim yeni istek ID'si üretir; slug ön kontrolü ve veritabanı UNIQUE kısıtı ikinci kaydı engeller.
- Tarayıcının kapanması, bağlantının kopması veya temizleme hatası kullanılmayan dosya bırakabilir. Otomatik periyodik artık dosya temizleyicisi bu adımda kurulmadı; belirsiz işlemlerin dosyaları kayıtla ilişki kontrolü yapılmadan silinmemelidir.
- Mevcut SDK standart yükleme kullanılır; parçalı/devam ettirilebilir yükleme eklenmedi. Büyük videolarda kesinti sonrası yeniden yükleme gerekebilir. Supabase, 6 MB üzerindeki dosyalarda daha güvenilir aktarım için resumable upload önerir; bu, sonraki medya iyileştirmesidir. [Yükleme kılavuzu](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## Yerel doğrulama

`npm run check` mevcut testlerle birlikte şu senaryoları çalıştırır:

- PGlite üzerinde gerçek migration, kategori seed'i, tablo izinleri, RPC çalıştırma yetkisi, RLS, slug/kategori/medya sınırları ve transaction geri alma.
- Uzak okuyucuda ilişki dönüşümü, medya sırası, sayfalama, kayıt bulunmaması ve hata yayılımı.
- Yazma koordinasyonunda dosyaların önce yüklenmesi, alan/oturum kontrolü, SQL hatasında temizleme, belirsiz commit, geç okuma hatası ve temizleme başarısızlığı.

PGlite testleri Supabase'in `auth`/`storage` şemalarını minimal test karşılıklarıyla temsil eder; canlı Storage HTTP servisini veya gerçek JWT doğrulamasını taklit etmez. Canlı kurulum ve gerçek hesapla uçtan uca kayıt ayrıca doğrulanmalıdır.

## Bu çalışma sırasındaki canlı kontrol

Public anahtarla yapılan salt okunur kontrolde yedi kategori ve uygulamanın ihtiyaç duyduğu proje/kategori/medya kolonları başarıyla okundu; açık kayıt kapalı (`signupDisabled: true`). Bunun ardından yerel `.env` içinde `VITE_DATA_SOURCE=supabase` seçildi; mevcut bağlantı değerleri korundu. Geliştirme sunucusunun ortam değişikliğini alması için yeniden başlatılması gerekir.

Bu kontrol tablo okumasını doğrular. Uzak bucket ayarları ve fonksiyon yetkileri için `supabase/verify.sql` çıktısı, gerçek hesapla yükleme/kayıt için tarayıcı testi hâlâ gereklidir. Yönetici kimlik bilgileri veya yönetim bağlantısı bu çalışma ortamında bulunmadığından bunların başarılı olduğu iddia edilmez. Okuma kontrolü geçtiği için migration'ı yeniden çalıştırmayın; önce doğrulama sorgusunu kullanın.
