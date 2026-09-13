# Pyramid Portfolio — Mevcut Durum ve İyileştirme Analizi

**İnceleme tarihi:** 12 Eylül 2026  
**Kapsam:** Çalışma dizinindeki mevcut kaynak kod, yapılandırmalar, bağımlılıklar, statik içerik ve üretim derlemesi. Commit edilmemiş ve Git tarafından henüz izlenmeyen dosyalar da incelenmiştir.

## 1. Genel değerlendirme

Uygulama, **derlenebilen bir portföy arayüzü ve başlangıç seviyesinde yönetim paneli prototipi** durumundadır. Vue bileşen ayrımı, TypeScript kullanımı ve genel sayfa düzeni iyi bir başlangıç oluşturuyor. Ancak içerik yönetimi uçtan uca çalışmıyor; bazı görünür kontroller işlevsiz, kategori verileri tutarsız ve birkaç sayfa yalnızca başlıktan oluşuyor.

**Mevcut haliyle içerik yönetimi yapılabilen tamamlanmış bir ürün olarak yayına hazır değildir.** Yalnızca statik portföy olarak yayınlanması düşünülüyorsa bile kategori hatası, boş sayfalar, bozuk bağlantılar ve içerik eksikleri önce giderilmelidir. Yönetim paneli kullanılacaksa kalıcı kayıt ve yetkilendirme ayrıca tamamlanmalıdır.

Derlemenin başarılı olması, iş akışlarının doğru çalıştığı anlamına gelmiyor. İncelemede tespit edilen başlıca sorunlar derleme hatalarından çok veri tutarlılığı, eksik işlevler ve çalışma zamanı kaynak yönetimiyle ilgilidir.

## 2. Mimari ve işlev envanteri

| Alan                  | Mevcut yapı / durum                                                                 |
| --------------------- | ----------------------------------------------------------------------------------- |
| Ön yüz                | Vue 3, Composition API, Single File Component, TypeScript                           |
| Derleme               | Vite; `build` önce `vue-tsc -b`, ardından `vite build` çalıştırıyor                 |
| Yönlendirme           | Vue Router, HTML5 history; public ve admin layout ayrımı                            |
| Veri                  | `src/data/projects.ts` içinde 3 proje, `src/data/categories.ts` içinde 7 kategori   |
| Sunucu / kalıcılık    | İncelenen depoda API, veritabanı ve kalıcı kayıt uygulaması bulunmuyor              |
| Ana sayfa             | Hero ve dizideki ilk 3 projeyi gösteren bölüm mevcut                                |
| Proje listesi         | Kartlar ve kategori filtresi mevcut; kategori verileri uyuşmuyor, arama bağlı değil |
| Proje detayı          | Başlık, açıklama, metadata, ana görsel ve büyütme penceresi mevcut                  |
| Galeri / video        | Veri ve form alanları var; detay sayfasında sunumları yok                           |
| Diğer public sayfalar | Animasyonlar, Referanslar, Hakkımızda, İletişim yalnızca başlık içeriyor            |
| Yönetim paneli        | Statik sayaçlar, proje tablosu, yeni proje formu ve görsel önizlemeleri             |
| Proje işlemleri       | Kaydet yalnızca konsola yazıyor; Düzenle ve Sil işlevsiz                            |
| Oturum / erişim       | Giriş, oturum ve route guard bulunmuyor                                             |
| Kalite araçları       | TypeScript ve Prettier var; test ve lint komutları, depoda CI iş akışı yok          |

İnceleme ortamında Node.js `v22.23.2`, npm `10.9.8`; kurulu temel paketler Vue `3.5.42`, Vue Router `5.3.1`, Vite `8.3.0`, TypeScript `6.0.3` ve vue-tsc `3.3.11` olarak görüldü. Bunlar yerel kurulumun sürümleridir; paketlerin güncelliği veya güvenlik durumu hakkında bir onay değildir.

### Korunması gereken güçlü taraflar

- Public/admin layout ayrımı ve tekrar kullanılan `ProjectCard`, `CategorySidebar` bileşenleri mevcut.
- Yeni proje ekranı temel bilgiler, medya alanları ve composable olarak ayrılmış.
- `Project` ve `ProjectFormData` ile görüntüleme modeli ve dosya seçim modeli ayrılmış.
- Uygulama TypeScript ayarları, genişlettiği Vue yapılandırmasından `strict: true` alıyor; kullanılmayan değişken ve parametre kontrolleri açık.
- Proje detayı `computed` ile route parametresini izliyor; geçersiz proje slug'ı için kullanıcıya mesaj gösteriyor.
- Görsel büyütme penceresinde native `dialog`, erişilebilir isimler, Escape işleme ve kaydırmayı geri yükleme mantığı bulunuyor.
- Çeşitli ekran genişlikleri için CSS kırılım noktaları ve ortak tasarım değişkenleri mevcut.

## 3. Yapılan kontroller ve sınırlar

| Kontrol                         | Sonuç                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run build`                 | Başarılı; TypeScript ve üretim derlemesi geçti                                                         |
| `npm run format:check`          | İnceleme başlangıcındaki proje dosyaları için başarılı                                                 |
| `npm ls --depth=0`              | Başarılı; üst düzey bağımlılıklarda eksik/geçersiz paket raporlanmadı                                  |
| Proje-kategori eşleştirmesi     | 3 projenin tamamının kategori slug'ı tanımlı kategoriler dışında                                       |
| Kategori sayaçları              | 7 kategorinin tamamında 0; tüm projeler sayısı 3                                                       |
| Router eşleşme kontrolü         | `/admin/kategoriler`, `/admin/medya`, `/olmayan-sayfa` için 0 eşleşme                                  |
| Slug kontrolü                   | `!!!` ve yalnızca boşluk içeren başlık boş slug üretiyor; `A B` ile `A-B` aynı slug'ı üretiyor         |
| Önizleme yaşam döngüsü kontrolü | Üç medya grubunda üçer seçimle 9 URL oluşturuldu; effect scope kapatıldıktan sonra da revoke çağrısı 0 |
| Görsel SHA-256 kontrolü         | Dört JPEG dosyası byte düzeyinde aynı                                                                  |
| CSS renk hesabı                 | Küçük metinlerde kullanılan iki kombinasyonda yaklaşık 3,25:1 ve 3,37:1 kontrast                       |

Üretim çıktısı: JavaScript **110,34 kB / gzip 40,72 kB**, CSS **18,99 kB / gzip 4,13 kB**, tekilleştirilmiş JPEG **470,24 kB**. Bu değerler dosya boyutlarıdır; gerçek yükleme süresi veya Core Web Vitals ölçümü değildir.

Veri ve composable kontrolleri, kaynak TypeScript'in geçici olarak bellekte JavaScript'e çevrilmesiyle çalıştırıldı. Router kontrolünde gerçek route tanımları, boş bileşenler ve memory history kullanıldı. Önizleme kontrolünde URL fonksiyonlarına sayaç yerleştirildi; bu, temizleme çağrısının eksikliğini gösterir, gerçek tarayıcı bellek tüketimini ölçmez.

Tarayıcıda görsel inceleme, uçtan uca kullanıcı testi, ekran okuyucu testi, Lighthouse, gerçek sunucuda HTTP durum/başlık kontrolü ve bağımlılık güvenlik taraması yapılmadı. Bu nedenle mobil taşma ve hosting davranışı gibi konular aşağıda **risk** olarak işaretlendi. `npm audit` çalıştırılmadığı için bilinen açık bulunmadığı yönünde bir sonuç çıkarılmamalıdır.

## 4. Öncelik tanımları

- **P1 — Yüksek:** Temel kullanım bozuk veya ilgili özellik yayına alınmadan giderilmesi gerekiyor.
- **P2 — Orta:** Kullanılabilirlik, erişilebilirlik, kaynak yönetimi veya sürdürülebilirlik sorunu; yakın geliştirme planına alınmalı.
- **P3 — Düşük:** Mevcut ölçekte engel olmayan, bakım veya büyüme için iyileştirme.

Her bulguda mevcut hata, eksik özellik ve geleceğe bağlı risk ayrı belirtilmiştir. Sunucu tarafı bulunmadığından bu rapor doğrulanmış bir sunucu güvenlik açığı veya veri ihlali iddiası içermez.

## 5. Ayrıntılı bulgular

### B01 — Projeler tanımlı kategorilerle eşleşmiyor

**Öncelik:** P1 · **Tür:** Doğrulanmış veri/işlev hatası  
**Konum:** `src/data/projects.ts:13`, `:36`, `:58`; `src/data/categories.ts:7`; `src/views/ProjectsView.vue:11`; `src/components/projects/CategorySidebar.vue:15`.

Projelerde `villa`, `interior`, `commercial` kullanılırken kategori listesinde sistem kategorileri bulunuyor. Üç proje de kategori sözlüğü dışında. Kullanıcı herhangi bir tanımlı kategoriye bastığında liste boşalıyor; bütün kategori sayaçları 0 görünüyor.

- [ ] İş alanına uygun kategori sözlüğünü kesinleştirip mevcut projeleri gerçek kategorilere bağla; anlamsız rastgele eşleştirme yapma.
- [ ] Kategori ilişkisinde tek otorite kullan: örneğin `categoryId`; adı ve slug'ı kategori kaydından türet.
- [ ] Veri kontrolünde geçersiz kategori referansını hata olarak yakala.

**Kabul ölçütü:** Her proje geçerli bir kategoriye bağlı; her kategori sayacı, filtrelenmiş proje sayısıyla aynı; kategori değiştirildiğinde ilgili projeler görünüyor.

### B02 — Kaydet, düzenle ve sil akışları tamamlanmamış

**Öncelik:** P1 · **Tür:** Eksik temel özellik  
**Konum:** `src/views/admin/NewProjectView.vue:20`; `src/views/admin/ProjectsAdminView.vue:68`; `src/data/projects.ts:7`.

`handleSubmit` sadece `console.log` çağırıyor. Veri kaynağına ekleme, dosya yükleme veya sunucu isteği yok. Düzenle/Sil düğmelerinde olay işleyici bulunmuyor. Kullanıcı kaydetmeye bastıktan sonra yeni proje oluşmuyor; sayfa yenilemesinde form kayboluyor.

- [ ] Ürün kararını netleştir: yalnızca statik portföy ise içerikleri dosyadan yönet ve kullanılamayan admin akışını yayından çıkar; admin kullanılacaksa kalıcı veri/medya servisi kur.
- [ ] Oluşturma, düzenleme ve silme işlemlerini ortak veri erişim katmanına bağla.
- [ ] Kayıt sırasında bekleme, başarı ve hata durumları; yinelenen gönderimi önleme; silmede geri alma veya onay akışı ekle.
- [ ] Başarılı işlemden sonra liste ve dashboard verisini güncelle; üretim kayıt yolundaki form logunu kaldır.

**Kabul ölçütü:** Oluşturulan proje yenilemeden sonra da bulunuyor; düzenleme kalıcı; silinen kayıt listeden kalkıyor; başarısız işlem kullanıcıya açıklanıyor.

### B03 — Yönetim paneline erişim koruması yok

**Öncelik:** P1, yönetim özellikleri yayına alınmadan önce · **Tür:** Mevcut eksiklik ve entegrasyon riski  
**Konum:** `src/router/index.ts:65`; `src/layouts/AdminLayout.vue:1`; `src/main.ts:6`.

Admin rotaları giriş gerektirmeden eşleşiyor. Oturum veya yetki kontrolü bulunmuyor. Şu an kalıcı yazma işlemi olmadığı için bu bulgu tek başına veritabanına yetkisiz müdahalenin mümkün olduğunu göstermiyor; B02 uygulanırken erişim kontrolü eklenmezse risk büyür.

- [ ] Admin işlevleri kullanılacaksa kimlik doğrulama ve oturum yaşam döngüsü ekle.
- [ ] İstemcide korumalı rota davranışı kur; sunucuda her yönetim isteği için yetki kontrolü uygula.
- [ ] Oturumsuz, yetkisiz ve oturumu sona ermiş kullanıcı senaryolarını test et.

**Kabul ölçütü:** Oturumsuz kullanıcı yönetim ekranına alınmıyor; istemci koruması atlansa bile API yetkisiz okuma/yazma işlemini reddediyor.

### B04 — Proje arama alanı işlevsiz

**Öncelik:** P1 · **Tür:** Doğrulanmış işlev hatası  
**Konum:** `src/components/projects/CategorySidebar.vue:25`; `src/views/ProjectsView.vue:9`.

Arama input'unda model veya olay bağlantısı yok. `filteredProjects` yalnızca kategoriye bakıyor; metin yazılması sonuçları değiştirmiyor.

- [ ] Arama değerini liste ekranına bağla ve kategori filtresiyle birlikte uygula.
- [ ] Aranacak alanları belirle; boşluk temizleme ve Türkçe büyük/küçük harf davranışını tutarlı uygula.
- [ ] Erişilebilir etiket ve arama sonucuna uygun boş durum mesajı ekle.

**Kabul ölçütü:** Başlığın bir bölümü yazıldığında ilgili projeler kalıyor; temizlendiğinde seçili kategorinin tamamı geri geliyor.

### B05 — Menüde olmayan rotalara bağlantı var; genel 404 ekranı yok

**Öncelik:** P1 · **Tür:** Doğrulanmış yönlendirme hatası  
**Konum:** `src/layouts/AdminLayout.vue:11`; `src/router/index.ts:21`; `src/App.vue:2`.

`/admin/kategoriler` ve `/admin/medya` menüde var fakat route tanımı yok. Genel bir catch-all rota da yok. Eşleşmeyen adreste kök `RouterView` gösterecek bileşen bulamıyor. Geçersiz proje slug'ında gösterilen mesaj, bütün bilinmeyen adresleri kapsamıyor.

- [ ] İlgili ekranları ve rotalarını tamamla veya uygulanana kadar menü bağlantılarını kaldır.
- [ ] Genel bir 404 ekranı ve ana sayfaya dönüş bağlantısı ekle.
- [ ] Menü bağlantılarının tamamının route eşleşmesini kontrol et.

**Kabul ölçütü:** Menüdeki her hedef kullanılabilir; rastgele URL boş uygulama yerine anlaşılır hata ekranı gösteriyor.

### B06 — İletişim ve üç içerik sayfası yalnızca başlıktan oluşuyor

**Öncelik:** P1 · **Tür:** Eksik ürün içeriği  
**Konum:** `src/views/ContactView.vue:1`, `AboutView.vue:1`, `AnimationsView.vue:1`, `ReferencesView.vue:1`.

Ana sayfadaki “İletişime Geç” bağlantısı yalnızca başlık içeren sayfaya götürüyor. Telefon, e-posta veya başka iletişim yöntemi yok. Diğer üç sayfa da içerik sunmuyor.

- [ ] Doğrulanmış şirket bilgileriyle iletişim ve hakkımızda içeriklerini tamamla.
- [ ] Referanslar ve animasyonlar için gerçek içerik veya açıklayıcı boş durum sun.
- [ ] Yayına hazır olmayan sayfaları görünür navigasyonda tamamlanmış özellik gibi sunma.

**Kabul ölçütü:** Ziyaretçi iletişim sayfasından gerçek bir iletişim kanalına ulaşabiliyor; menüdeki diğer sayfalar amaçlarına uygun içerik sunuyor.

### B07 — Önizleme URL'leri serbest bırakılmıyor

**Öncelik:** P2 · **Tür:** Doğrulanmış kaynak yönetimi hatası  
**Konum:** `src/composables/useProjectForm.ts:76`.

Ana görsel, galeri ve uygulama görselleri için `URL.createObjectURL` çağrılıyor; hiçbir yerde `URL.revokeObjectURL` bulunmuyor. Dosya değişimleriyle eski URL'ler kalıyor. Uzun oturumda büyük görsellerin tekrar seçilmesi gereksiz bellek tutulmasına yol açabilir. `computed` her render'da yeni URL üretmez; sorun, bağımlılık değiştiğinde üretilen eski URL'nin temizlenmemesidir.

- [ ] Önizleme üretimini açık yaşam döngüsü yönetimine taşı; değiştirilmiş ve kaldırılmış dosyaların eski URL'lerini serbest bırak.
- [ ] Bileşen/scope kapanışında kalan URL'leri temizle; ekranda kullanılan URL'yi erken iptal etme.
- [ ] Dosya değiştirme, temizleme ve sayfadan ayrılma senaryolarında kaynak temizliğini test et.

**Kabul ölçütü:** Kullanımı biten her URL için tam bir temizleme çağrısı var. Kullanılmayan nesne URL'lerinin serbest bırakılması tarayıcı API'sinin öngördüğü kullanımdır. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static), [Vue yaşam döngüsü](https://vuejs.org/api/composition-api-lifecycle.html#onunmounted).

### B08 — Slug ve form doğrulaması yetersiz

**Öncelik:** P1, kalıcı kayıt uygulanmadan önce · **Tür:** Doğrulanmış kenar durum ve veri bütünlüğü riski  
**Konum:** `src/composables/useProjectForm.ts:26`; `src/components/admin/projects/ProjectBasicInfoForm.vue:20`; `src/types/ProjectForm.ts:10`.

`!!!` ve boşluklardan oluşan başlık boş slug üretiyor. `A B` ile `A-B` aynı `a-b` sonucunu veriyor. Slug readonly ve benzersizlik kontrolü yok. Yıl alanı zorunlu değil; boşaltıldığında `.number` kullanılmasına rağmen boş string oluşabilir. TypeScript'teki `number` beyanı çalışma zamanı doğrulaması sağlamaz. [Vue form bağlama davranışı](https://vuejs.org/guide/essentials/forms.html#number).

Başlığa bağlı watcher her değişiklikte slug'ı yeniden yazıyor. Aynı mantık düzenleme ekranına taşınırsa yayımlanmış projenin adresi başlık değişikliğiyle istemeden değişebilir.

- [ ] Başlık için trim sonrası boşluk, makul uzunluk ve slug için boş olmama/biçim kontrolü uygula.
- [ ] Slug benzersizliğini kalıcı veri katmanında garanti et; çakışmayı kullanıcıya bildir veya belirlenmiş kuralla çöz.
- [ ] Yılı sayısal, tam sayı ve belirlenen aralıkta doğrula; opsiyonelse boş değeri açıkça modelle.
- [ ] Yayındaki slug'ı sabit tut; değiştirilecekse eski bağlantıların yönlendirilmesini tasarla.

**Kabul ölçütü:** Boş veya çakışan slug kaydedilemiyor; yıl alanı modelle uyumlu; başlık düzenlemek mevcut bağlantıyı habersiz bozmuyor.

### B09 — Medya seçiminde boyut, adet ve içerik kontrolü yok

**Öncelik:** P2; sunucuya yükleme açılmadan önce zorunlu · **Tür:** Eksik doğrulama  
**Konum:** `src/components/admin/projects/ProjectMediaForm.vue:27`; `src/composables/useProjectForm.ts:52`.

Dosya alanları `accept="image/*"` ve `accept="video/*"` kullanıyor. İşleyiciler gelen dosyaları doğrudan forma aktarıyor. Boyut, toplam adet, çözünürlük ve desteklenen format kontrolü yok. `accept` dosya seçiciye ipucu sağlar; dosya içeriğinin geçerliliğini garanti etmez. [MDN accept açıklaması](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept).

- [ ] Kabul edilen formatları, tek dosya/toplam boyut ve adet sınırlarını ürün ihtiyacına göre belirle.
- [ ] Önizlemeden önce istemcide sınırları denetle; yükleme servisinde bağımsız içerik doğrulaması uygula.
- [ ] Bozuk veya desteklenmeyen dosya için alan bazlı hata göster.
- [ ] Görselin zorunlu olup olmadığını netleştir; zorunlu değilse görüntüleme modelinde fallback tanımla.

**Kabul ölçütü:** Uygun olmayan dosya anlaşılır nedenle reddediliyor; istemci kontrolü atlandığında servis de reddediyor.

### B10 — Medya seçimini yönetmek ve formdan güvenli ayrılmak eksik

**Öncelik:** P2 · **Tür:** Kullanılabilirlik eksikliği  
**Konum:** `src/composables/useProjectForm.ts:58`; `src/components/admin/projects/ProjectMediaForm.vue:53`; `src/views/admin/NewProjectView.vue:54`.

Yeni galeri seçimi önceki diziyi tamamen değiştiriyor. Tek bir görseli kaldırma, sıralama veya seçime ekleme kontrolü yok. Form değişiklikleri varken İptal ya da başka rota bağlantısı taslağı kaybettiriyor; ayrılma koruması yok.

- [ ] Galeriye ekleme/değiştirme davranışını açıklaştır; kaldırma ve gerekiyorsa sıralama ekle.
- [ ] Formun değişmiş olma durumunu takip et ve kaydedilmemiş veriyle ayrılmayı yönet.
- [ ] Taslak saklama eklenecekse `File` ve nesne URL'lerini kalıcı medya adresi gibi saklama.

**Kabul ölçütü:** Kullanıcı tek bir hatalı görseli kaldırabiliyor ve kaydedilmemiş değişiklikler habersiz kaybolmuyor.

### B11 — Galeri, uygulama görselleri ve video detay sayfasında kullanılmıyor

**Öncelik:** P2 · **Tür:** Eksik özellik  
**Konum:** `src/types/Project.ts:16`; `src/data/projects.ts:24`; `src/views/ProjectDetailView.vue:35`.

Projelerde galeri ve uygulama fotoğrafı dizileri bulunmasına rağmen detay ekranı yalnızca `project.image` gösteriyor. Video alanı da render edilmiyor. Mevcut örneklerin video adresleri boş; bu, şu an bozuk video oynatımı olduğu anlamına gelmez.

- [ ] Dolu medya gruplarını ayrı bölümlerde göster; boş grupları gizle veya açıklayıcı durum sun.
- [ ] Galeriyi mevcut görsel büyütme davranışına bağla.
- [ ] Video eklenecekse desteklenen kaynak/format, kontroller ve yükleme davranışını belirle.

**Kabul ölçütü:** Bir projeye eklenen ve yayımlanan her medya grubu ziyaretçiye ulaşabiliyor; boş gruplar kırık alan oluşturmuyor.

### B12 — Statik diziler dinamik içerik yönetimine hazır değil

**Öncelik:** P2 · **Tür:** Gelecekteki entegrasyon riski  
**Konum:** `src/data/projects.ts:7`; `src/views/HomeView.vue:7`; `src/views/admin/DashboardView.vue:6`; `src/components/projects/CategorySidebar.vue:4`; `src/types/Project.ts:6`.

Ekranlar veri dosyalarını doğrudan import ediyor. Düz diziyi `computed` içinde okumak diziyi reaktif yapmaz. Daha sonra diziye `push` eklenmesi, mevcut computed değerlerin güvenilir biçimde güncellenmesini sağlamaz. Kategori adı ve slug'ının hem projede hem kategori kaydında tutulması da tutarsızlığı kolaylaştırıyor.

- [ ] Tek bir veri erişim katmanı ve ihtiyaç kadar ortak reaktif durum oluştur; bu ölçek için büyük bir state kütüphanesi zorunlu değil.
- [ ] Form modeli → kayıt isteği → görüntüleme modeli dönüşümünü açık tanımla; dosyaları medya kimliği/URL'sine dönüştür.
- [ ] Kategori ve durum değerlerini merkezileştir; `status: string` yerine tanımlı değer kümesini kullan.
- [ ] Uzak veri geldiğinde çalışma zamanı doğrulaması uygula.

**Kabul ölçütü:** Tek kayıt değişikliği liste, sayaç ve detay ekranlarına tutarlı yansıyor; kategori adı değişikliği projelerde kopya veri bırakmıyor.

### B13 — Dört görsel dosyası aynı; görsel sayacının anlamı belirsiz

**Öncelik:** P2 · **Tür:** Doğrulanmış içerik durumu ve ölçüm belirsizliği  
**Konum:** `src/assets/images/`; `src/views/admin/DashboardView.vue:10`; `src/data/projects.ts:3`.

`hero.jpeg`, `project-1.jpeg`, `project-2.jpeg`, `project-3.jpeg` dosyalarının her biri **470.245 byte** ve SHA-256 değerleri aynı. Yani dört isim altında tek görsel içeriği kullanılıyor. Dashboard görsel sayacı **9 kullanım referansı** sayıyor; veri modelinde 3 ayrı proje görsel yolu, dosya içeriği açısından ise 1 benzersiz görsel var.

Bu, sayacın kesinlikle yanlış olduğu anlamına gelmez: amaç kullanım sayısını göstermekse hesap tutarlı, fakat “Görsel” etiketi benzersiz medya sayısı izlenimi verebilir. Vite mevcut derlemede aynı içerikleri tek JPEG çıktısına indirdi; üretimde dört ayrı indirme yapıldığı iddia edilmemelidir.

- [ ] Projeler ve hero için uygun gerçek görseller kullan.
- [ ] Sayacın kullanım sayısı mı, benzersiz medya sayısı mı olduğunu belirle ve etiketi buna göre düzenle.
- [ ] Medya yönetimi kurulacaksa dosyaları kimlik üzerinden tekilleştir.

**Kabul ölçütü:** Görseller proje içeriğini doğru temsil ediyor; sayaç tanımlanan ölçüme göre test ediliyor.

### B14 — Sayfa paketleme ve görsel yükleme büyümeye göre iyileştirilmeli

**Öncelik:** P2 · **Tür:** Ölçeklenme riski / optimizasyon  
**Konum:** `src/router/index.ts:3`; `src/components/projects/ProjectCard.vue:10`; `src/views/HomeView.vue:76`; `src/style.css:4`.

Tüm sayfalar, admin dahil, statik import ediliyor. Admin form CSS'i de global girişten yükleniyor. Mevcut JS gzip boyutu yaklaşık 40,72 kB olduğu için bugünkü paket çok büyük olarak nitelendirilemez; yönetim paneli büyüdükçe ziyaretçi sayfasının başlangıç yükü de artar.

Proje kartlarında CSS arka plan görseli var; `img` tabanlı `loading`, `srcset` ve `sizes` davranışları kullanılmıyor. Hero görseli yaklaşık 470 kB; gerçek bağlantı performansı ölçülmedi.

- [ ] Özellikle admin sayfalarını route seviyesinde dinamik import ile ayır. [Vue Router lazy loading](https://router.vuejs.org/guide/advanced/lazy-loading.html).
- [ ] Kart görsellerinde uygun boyutlu varyantlar, modern formatlar ve ekran altındaki görseller için gecikmeli yükleme uygula.
- [ ] İlk ekrandaki ana görselin önceliğini ayrı değerlendir; bütün görsellere körlemesine lazy loading uygulama.
- [ ] Proje sayısı arttığında sayfalama ekle; kategori sayaçlarını her kategori için tekrar filtrelemek yerine ortak hesapla.

**Kabul ölçütü:** Public girişte admin JavaScript'i yüklenmiyor; gerçek farklı görsellerle mobil ağ ölçümü yapılıyor; liste büyüdüğünde gereksiz medya indirmesi sınırlanıyor.

### B15 — Temel erişilebilirlik eksikleri var

**Öncelik:** P2 · **Tür:** Doğrulanmış işaretleme ve renk sorunları  
**Konum:** `index.html:2`; `src/layouts/PublicLayout.vue:10`; dört başlık sayfası; `src/components/projects/CategorySidebar.vue:25`; `src/styles/tokens.css:8`; `src/components/projects/ProjectCard.vue:55`.

Türkçe içeriğe rağmen belge dili `en`. Dört içerik sayfasındaki `main`, public layout'un `main` öğesinin içine giriyor. Arama alanının bağımsız etiketi yok; seçili kategori yalnızca CSS ile belirtiliyor. Kartlardaki görseller arka plan olarak kullanıldığı için alternatif açıklamaları yok; görsel bilgi taşıyorsa bu içerik yardımcı teknolojilere aktarılmıyor.

`#888888` metnin kart zemini `#f5f5f5` üzerindeki kontrastı yaklaşık **3,25:1**, detay zemini `#faf9f6` üzerinde **3,37:1**. İlgili 11–13 px metinler normal metin için kullanılan **4,5:1** AA eşiğinin altında. [W3C kontrast açıklaması](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

- [ ] Belge dilini `tr` yap; sayfa içindeki ikinci `main` yerine uygun bölüm öğesi kullan.
- [ ] Aramaya etiket ve kategori düğmelerine seçimi bildiren uygun durum niteliği ekle.
- [ ] Küçük metin renklerini ölçerek koyulaştır; klavye odağını tüm kontrollerde kontrol et.
- [ ] Bilgi taşıyan proje görselleri için uygun alternatif metin sun.
- [ ] `prefers-reduced-motion` desteğini kart animasyonları ve global smooth scroll için de değerlendir.

**Kabul ölçütü:** Sayfada tek ana içerik bölgesi var; kontroller anlaşılır isim/durum taşıyor; ilgili metin kontrastları eşik üzerinde; temel akış klavyeyle tamamlanıyor. Bu, tek başına tam erişilebilirlik uygunluğu onayı değildir.

### B16 — SEO ve paylaşım bilgileri başlangıç seviyesinde

**Öncelik:** P2 · **Tür:** Eksik yayın hazırlığı  
**Konum:** `index.html:7`; `src/router/index.ts`; `public/`.

Tek ve genel bir başlık var. Sayfa/proje bazlı başlık, açıklama, canonical ve sosyal paylaşım metadatası tanımlanmıyor. Depoda sitemap veya robots dosyası bulunmuyor. Bunların yokluğu tek başına indekslenmenin imkânsız olduğu anlamına gelmez; içeriklerin anlaşılır sunumu ve paylaşım görünümü eksiktir.

- [ ] Sayfa/proje bazlı başlık ve açıklama oluştur; canonical adresleri gerçek yayın alan adına göre belirle.
- [ ] Sosyal paylaşım başlığı, açıklaması ve görselini ekle.
- [ ] Yayınlanan projelerden sitemap üret; admin sayfalarının indeks politikasını belirle. İndeks engeli erişim kontrolünün yerine geçmez.
- [ ] Arama görünürlüğü ve paylaşım önizlemesi önemliyse public sayfalar için ön üretim veya sunucu render seçeneğini somut gereksinimle değerlendir.

**Kabul ölçütü:** Her public sayfa ayırt edilebilir metadata sunuyor; paylaşım botlarının aldığı HTML üzerinde sonuç doğrulanıyor.

### B17 — Hosting, alt dizin ve sayfa geçiş davranışları tanımlanmamış

**Öncelik:** P2 · **Tür:** Dağıtım ve kullanıcı deneyimi riski  
**Konum:** `src/router/index.ts:19`; `vite.config.ts:5`; `index.html:5`; `src/views/ProjectsView.vue:9`.

`createWebHistory()` kullanılıyor; depoda hosting fallback yapılandırması yok. Gerçek sunucu incelenmediğinden yenilemede kesin 404 oluştuğu söylenemez. Ancak sunucu SPA fallback sağlamazsa `/projeler/...` adresine doğrudan erişim başarısız olabilir. [Vue Router history dağıtım açıklaması](https://router.vuejs.org/guide/essentials/history-mode.html).

Kök yayın varsayımı var; alt dizinde yayınlanacaksa Vite base, router base ve kökten başlayan favicon adresi birlikte ele alınmalı. Ayrıca `scrollBehavior` yok; kategori seçimi yalnızca yerel ref'te duruyor, URL'de korunmuyor.

- [ ] Hedef sunucuda doğrudan route erişimi ve yenilemeyi test et; gerekli fallback'i kur.
- [ ] Alt dizin yayını gerekiyorsa Vite ve router taban yolunu aynı ayardan yönet.
- [ ] Yeni sayfaya geçiş ve geri/ileri gezinme için kaydırma davranışını tanımla.
- [ ] Arama/kategori durumunu URL query'sine taşı; paylaşma ve geri dönüşte koru.

**Kabul ölçütü:** Proje bağlantısı yeni sekmede ve yenilemede açılıyor; geri dönüşte filtre ve kaydırma beklenen duruma geliyor; yanlış URL kullanıcıya 404 ekranı gösteriyor.

### B18 — Dar ekranlarda boşluk ve medya grid'i taşma riski taşıyor

**Öncelik:** P2 · **Tür:** CSS incelemesine dayalı risk; tarayıcıda doğrulanmalı  
**Konum:** `src/layouts/AdminLayout.vue:74`; `src/styles/admin/project-form.css:8`, `:117`; `src/views/ProjectsView.vue:68`; `src/styles/layout.css:14`.

Admin içerikte iki yanda 40 px, form bölümünde ek 28 px boşluk var. 320 px ekranda bölümün iç kullanılabilir genişliği yaklaşık 182 px'e düşerken medya grid'inin alt sınırı 140 px; iç padding eklenen diğer kontroller ve doğal dosya input genişliği ayrıca denetlenmeli. Uzun dosya adları ve form kontrollerinin minimum içerik genişlikleri dar ekranda sorun çıkarabilir.

Public proje ve öne çıkan proje bölümlerinde dış bölümün 24 px padding'i, ortak container'ın 24 px padding'iyle toplanıyor; mobilde yatay içerik alanı gereksiz daralıyor. Hero yüksekliğinde 65 px navbar varsayımı var; mobil navbar yüksekliği ise içerikle değişiyor.

- [ ] 320, 375, 768 ve 1024 px genişliklerde uzun Türkçe içerik ve uzun dosya adlarıyla test et.
- [ ] Mobil padding'leri azalt; input ve grid öğelerinde gerektiğinde `min-width: 0` kullan.
- [ ] Yatay boşluk sorumluluğunu ortak container veya sayfa seviyesinde tutarlı belirle.
- [ ] Hero yüksekliğini gerçek navbar düzeni ve mobil viewport davranışıyla birlikte değerlendir.

**Kabul ölçütü:** Sayfa genelinde yatay taşma yok; medya ve form kontrolleri kullanılabilir; tablonun kendi yatay kaydırması sayfanın tamamını taşırmıyor.

### B19 — Otomatik davranış testleri ve hata gözlemlenebilirliği yok

**Öncelik:** P2 · **Tür:** Kalite güvencesi eksikliği  
**Konum:** `package.json:6`; `src/main.ts:6`; depo dosya envanteri.

Test/lint script'i ve test dosyaları bulunmuyor; depoda CI iş akışı yok. Prettier davranış hatalarını kontrol etmez. Uygulama düzeyinde hata yakalama/raporlama kurulmamış. Veri statikken ağ yükleme durumunun olmaması tek başına hata değildir; API eklendiğinde bu durumlar gerekli olur.

- [ ] Öncelikle kategori bütünlüğü, slug, URL temizliği ve route eşleşmesi için anlamlı otomatik kontroller ekle.
- [ ] Filtre, kayıt ve yetkilendirme gibi kritik kullanıcı akışlarını uçtan uca test et.
- [ ] CI içinde temiz kurulum, build, format kontrolü ve seçilen testleri çalıştır; gerekli Vue/TypeScript lint kurallarını ekle.
- [ ] API entegrasyonunda yükleniyor/boş/hata durumlarını ayır; beklenmeyen hataları uygun bağlamla raporla, form içeriğini gereksiz loglama.

**Kabul ölçütü:** Bu rapordaki temel hataların tekrar eklenmesi otomatik kontrolü bozuyor; beklenmeyen üretim hataları teşhis edilebiliyor.

### B20 — Kaynak teslimi, kurulum belgesi ve stil bakımı eksik

**Öncelik:** P2 kaynak teslimi için; P3 bakım işleri için · **Tür:** Mevcut süreç eksikliği  
**Konum:** `README.md:1`; `package.json`; `src/style.css:4`; `src/styles/admin/project-form.css:7`; inceleme anındaki `git status --short`.

README hâlâ başlangıç şablonu. Node sürümü için `engines` veya sürüm dosyası yok. İnceleme sırasında `src/views`, `src/router`, `src/components`, `src/data` ve başka temel klasörler Git tarafından henüz izlenmiyordu; mevcut yerel uygulama yalnızca commit edilmiş dosyalardan elde edilemiyor. Bu normal bir devam eden geliştirme hali olabilir, ancak teslim/dağıtım öncesinde ele alınmalıdır.

Admin form stilleri global ve `.form-section`, `.form-group` gibi genel adlar kullanıyor. Başka formlar eklendiğinde stil çakışması oluşabilir. Admin renkleri ve bazı başlık stilleri birçok dosyada tekrarlanıyor. Alt bileşenlerin `form` nesnesinin iç alanlarını değiştirmesi Vue'da mümkün olsa da veri değişiminin kaynağını takip etmeyi zorlaştırıyor; şu an tek başına çalışma hatası değildir.

- [ ] README'ye gerçek kurulum, komutlar, veri kaynağı, eksik özellikler ve yayın adımlarını yaz.
- [ ] Desteklenen Node sürümünü belirle; lockfile ile temiz `npm ci` kurulumu üzerinden build'i doğrula.
- [ ] Teslim öncesi gerekli kaynak dosyalarının tamamını bilinçli olarak sürüm kontrolüne al; mevcut yerel çalışmaları kaybetmeden temiz checkout doğrulaması yap.
- [ ] Admin stillerini admin/form kökü altında sınırla; ortak renk ve boşluk değişkenlerini kullan.
- [ ] Form büyüdüğünde veri akışını `emit`/açık model sözleşmesiyle sadeleştir; sırf soyutlama için mevcut küçük bileşenleri karmaşıklaştırma.

**Kabul ölçütü:** Yeni geliştirici yalnızca repository ve README ile uygulamayı kurup derleyebiliyor; public forma admin CSS'i sızmıyor.

## 6. Uygulama sırası

### Aşama 1 — Görünür hataları ve içerik boşluklarını kapat

- [ ] **B01:** Kategori sözlüğünü düzelt ve projelerle eşleştir.
- [ ] **B04:** Aramayı kategori filtresiyle birlikte çalıştır.
- [ ] **B05:** Bozuk menü hedeflerini düzelt ve genel 404 ekranı ekle.
- [ ] **B06:** İletişim ve diğer boş sayfaları yayın kapsamına göre tamamla.
- [ ] **B13:** Gerçek görselleri yerleştir ve sayaç anlamını netleştir.
- [ ] **B20:** Mevcut kaynakların eksiksiz teslim edilebildiğini doğrula.

### Aşama 2 — Yönetim panelini uçtan uca tamamla

Bu aşama admin üzerinden içerik yönetimi isteniyorsa gereklidir; yalnızca statik portföy için backend kurmak zorunlu değildir.

- [ ] **B12:** Veri modeli, kategori ilişkisi ve veri erişim katmanını belirle.
- [ ] **B03:** Yazma uçları dışarı açılmadan kimlik doğrulama ve sunucu yetki kontrollerini kur.
- [ ] **B08–B09:** Form ve medya doğrulama kurallarını istemci/sunucu tarafında uygula.
- [ ] **B02:** Kalıcı oluşturma, düzenleme, silme ve medya yüklemeyi tamamla.
- [ ] **B07–B10:** Önizleme temizliği, medya seçimi ve kaydedilmemiş değişiklik davranışlarını düzelt.
- [ ] **B11:** Galeri, uygulama fotoğrafları ve videoyu public detay ekranına bağla.

### Aşama 3 — Yayın kalitesi ve sürdürülebilirlik

- [ ] **B15:** Dil, semantik, etiket, kontrast ve klavye erişimini düzelt.
- [ ] **B16–B17:** Metadata, doğrudan bağlantı erişimi, base, 404 ve geri/ileri gezinmeyi doğrula.
- [ ] **B18:** Gerçek tarayıcıda mobil kontrolleri tamamla.
- [ ] **B14:** Admin paketini ayır ve gerçek görsellerle performans ölç.
- [ ] **B19:** Kritik kontrolleri CI'a taşı ve hata gözlemlenebilirliği ekle.
- [ ] **B20:** Kurulum belgesini ve stil kapsamlarını tamamla.

## 7. Asgari kabul senaryoları

| Senaryo                                              | Beklenen sonuç                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Her kategoriye sırayla tıklama                       | İlgili projeler ve doğru sayaç; veri uyuşmazlığı yok                       |
| Türkçe başlık arama + kategori seçme                 | İki koşul birlikte uygulanır; temizlemede doğru liste döner                |
| Bilinen/bilinmeyen proje ve rastgele URL açma        | Doğru detay veya anlamlı bulunamadı ekranı                                 |
| Menüdeki bütün hedefleri açma                        | Eşleşmeyen veya işlevsiz hedef yok                                         |
| Oturumsuz admin erişimi ve doğrudan API isteği       | Admin devredeyse ekran ve servis tarafında erişim reddedilir               |
| Proje oluşturma, yenileme, düzenleme, silme          | Her işlem kalıcı ve listeler/sayaçlar tutarlı                              |
| Boş başlık, noktalama başlığı, aynı slug, boş yıl    | Tanımlı doğrulama; geçersiz kayıt oluşmaz                                  |
| Büyük/bozuk dosya ve tekrarlı medya seçimi           | Açık hata, sınırların uygulanması ve eski URL'lerin temizliği              |
| Formda değişiklik yapıp ayrılma                      | Kaydedilmemiş verinin kaybı açık şekilde yönetilir                         |
| Galeri/video içeren proje açma                       | Yayımlanan medya grupları gösterilir; boş kaynak kırık oynatıcı oluşturmaz |
| 320 px ekran ve yalnızca klavye kullanımı            | Kontroller erişilebilir, sayfa genelinde yatay taşma yok                   |
| Üretim sunucusunda detay URL'sini yenileme           | Uygulama açılır; gerçek sunucu fallback davranışı doğru                    |
| Temiz checkout + desteklenen Node + `npm ci` + build | Yerel izlenmeyen dosyaya ihtiyaç duymadan başarı                           |

## 8. İnceleme sonucunun sınırı

Bu çalışma kapsamında uygulama kaynak koduna düzeltme uygulanmadı; analiz raporu oluşturuldu. Build komutu yeniden üretim çıktısı oluşturdu. İnceleme öncesindeki yerel değişiklikler korunmuştur.

En yüksek değer sağlayacak sıra; önce kategori, arama, rota ve içerik hatalarını düzeltmek, ardından admin kullanılacaksa yetkilendirilmiş kalıcı kayıt akışını kurmaktır. Performans ve mimari genişletmeler mevcut küçük veri boyutuna göre ölçülü tutulmalıdır. Tam yeniden yazım gerektiren bir bulgu yok; mevcut bileşen yapısı üzerinde aşamalı iyileştirme yapılabilir.
