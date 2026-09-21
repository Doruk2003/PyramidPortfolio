# Pyramid Portfolio — Teknik İnceleme ve Arayüz Geliştirme Önerileri

Tarih: 14 Eylül 2026

Durum: P01 onaylandı ve uygulandı; diğer maddeler onay bekliyor. İlk inceleme bulguları aşağıda tarihsel durum olarak korunmuştur.

## 1. Değerlendirme özeti ve kapsam

Proje, Vue 3 + TypeScript + Vite üzerinde, ziyaretçi arayüzü ile yönetim panelini ayıran, Supabase destekli bir portföy uygulaması. Servisler, composable'lar, tipler ve bileşenler arasındaki ayrım geliştirmeye elverişli. Baştan yazma veya framework değiştirme gerektiren bir bulgu yok.

Öncelikli ihtiyaçlar: başlık düzeyinde kalan dört sayfayı tamamlamak, proje aramasını çalışır hale getirmek, mevcut medya verisini ziyaretçiye daha kapsamlı sunmak ve ana sayfadaki tasarım dilini ortak bir sisteme dönüştürmek.

İnceleme; kaynak kodu, router, stiller, veri servisleri, bazı SQL yetkilendirme tanımları ve mevcut test/derleme sonuçlarına dayanır. Tarayıcı bağlantısı kurulamadı; depodaki eski önizleme PNG'leri de ortam erişim hatası nedeniyle görüntülenemedi. Dolayısıyla tasarım tespitleri CSS ve şablon incelemesidir; canlı ekran, gerçek cihaz, Lighthouse veya erişilebilirlik denetimi sonucu değildir. Canlı Supabase yapılandırması ve politikaların sunucuya uygulanmış olması doğrulanmadı. `.env` içeriği okunmadı.

### Çalıştırılan kontroller

| Kontrol                            | Sonuç                                                           |
| ---------------------------------- | --------------------------------------------------------------- |
| `npm test`                         | 19 test dosyası, 168 test başarılı; yaklaşık 66 saniye          |
| `npm run build`                    | TypeScript/Vue derlemesi ve Vite üretim çıktısı başarılı        |
| Üretilen ana JavaScript            | 407,72 kB; gzip 121,40 kB                                       |
| Üretilen CSS                       | 40,67 kB; gzip 8,46 kB                                          |
| Paketlenen hero JPEG               | 470,24 kB                                                       |
| Canlı arayüz ve gerçek ağ ölçümü   | Yapılmadı                                                       |
| `test:typecheck` ve `format:check` | Ayrı çalıştırılmadı; tam `npm run check` sonucu iddia edilmiyor |

Derleme boyutları mevcut çıktının ölçümüdür; tek başına sitenin yavaş olduğunu kanıtlamaz. Derleme `dist` çıktısını yeniler; uygulama kaynaklarında değişiklik yapılmadı.

## 2. Teknik inceleme

### Korunması gereken güçlü yönler

- Ziyaretçi ve yönetim sayfaları ayrı layout'larda; veri erişimi servis katmanında.
- Örnek katalog ile Supabase kataloğu açık bir yapılandırma üzerinden seçiliyor.
- `useAsyncData` ve `AsyncState` ortak yükleme, hata ve yeniden deneme davranışı sağlıyor.
- Yönetim yönlendirmelerinde oturum kontrolü, oturum kaybında erişimin kapatılması ve güvenli geri dönüş adresi bulunuyor.
- Görsel hazırlama servisinde çözünürlük/boyut sınırları ve WebP dönüşümü mevcut.
- Ana sayfa videosunda poster, duraklatma, görünürlük kontrolü, mobil ve hareket azaltma tercihleri zaten ele alınmış.
- Proje düzenlemede kaydedilmemiş değişiklik uyarısı, medya önizlemesi ve yükleme ilerlemesi mevcut.
- Testler veri, auth, router, formlar, medya ve veritabanı davranışlarını kapsıyor. Test yapılandırması geliştiricinin Supabase ortam değerlerini yüklemiyor.

### Kanıtlı bulgular ve öneriler

Öncelik: **P1** temel deneyim/yayın öncesi; **P2** kalite ve verimlilik; **P3** isteğe bağlı farklılaşma. İş yükü: **K** yaklaşık yarım–bir gün, **O** iki–üç gün, **B** dört–yedi gün. Bunlar içerik hazırken geliştirme ve ilgili doğrulama için kaba tahminlerdir; toplanarak kesin takvim oluşturulmamalıdır.

| Kod | Mevcut bulgu ve kaynak                                                                                                                   | Yapılabilecek geliştirme                                                                                    | Öncelik / iş yükü           | Kabul ölçütü                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| T01 | `CategorySidebar.vue`: arama input'u model/event ile filtreye bağlı değil                                                                | Türkçe harfleri gözeten başlık araması; görünür label, temizleme, sonuç sayısı                              | P1 / K                      | Arama ve kategori birlikte çalışır; boş sorgu listeyi geri getirir; klavye odağı görünür                             |
| T02 | `index.html`: dil `en`, başlık `pyramidportfolio`; sayfa bazlı meta yönetimi görülmedi                                                   | Türkçe dil tanımı; benzersiz title/description, canonical ve paylaşım görselleri                            | P1 / O                      | Proje slug'ına göre metadata değişir; doğrudan açılışta paylaşım botlarının aldığı HTML ayrıca doğrulanır            |
| T03 | `router/index.ts`: genel 404 rotası ve scrollBehavior yok                                                                                | Tasarımla uyumlu 404, yeni sayfada üste çıkma, geri dönüşte konum ve hash davranışı                         | P1 / K                      | Bilinmeyen URL açıklayıcı sayfa açar; geri/ileri gezinme ve bölüm bağlantıları çalışır                               |
| T04 | Router tüm ziyaretçi ve admin sayfalarını statik import ediyor                                                                           | Route bazında dinamik import; yönetim sayfalarının kodunu talep anında yükleme                              | P2 / O                      | Build çıktısında route parçaları oluşur; ziyaretçi ilk yüklemesinde admin sayfa kodları alınmaz; auth testleri geçer |
| T05 | `ProjectCard.vue`: kapak CSS background olarak sunuluyor                                                                                 | İçerik görsellerini `img`/`picture`, boyut, uygun alt metin, `srcset/sizes` ve lazy loading ile sunma       | P1 / O                      | Uygun görsel boyutu indirilir; kartlar yüklemede sıçramaz; ilk ekran görselleri gereksiz gecikmez                    |
| T06 | `supabaseCatalog.ts`: 100'lük sorgularla tüm katalog ve ilişkili medya toplanıyor; sayfa düzeyinde talep sınırlaması yok                 | Liste için hafif veri modeli, gerçek sunucu filtreleme/sayfalama; ana sayfada yalnız gerekli projeleri alma | P2 / B                      | Büyük veri kümesinde ilk ekran tüm kataloğun bitmesini beklemez; sayaçlar toplam veriyi doğru temsil eder            |
| T07 | `PublicLayout.vue` içinde `main`, dört taslak sayfada yeniden `main`; `base.css` global smooth scroll, kartta hareket azaltma kuralı yok | Tek ana içerik bölgesi, içeriğe atla bağlantısı, genel focus ve reduced-motion kuralları                    | P1 / O                      | Klavyeyle menü, filtre, galeri ve formlar kullanılabilir; hareket azaltma tercihi tüm ilgili alanlarda uygulanır     |
| T08 | Token'lar, public layout override'ları ve sayfa içi sabit değerler birlikte kullanılıyor                                                 | Ortak renk/boşluk/yazı/köşe/odak token'ları; tekrar eden başlık, link ve kart stillerinin ortaklaştırılması | P1 / O                      | Ortak token değişikliği hedef sayfalara tutarlı yansır; admin okunabilirliği korunur                                 |
| T09 | `ProjectDetailView.vue` galeri ve videoyu gösteriyor; modeldeki `applicationImages` için bölüm yok                                       | Uygulama fotoğraflarını ayrı başlık ve açıklamalarla gösterme                                               | P1 / O                      | Uygulama medyası bulunan projede görünür; boş projede gereksiz başlık oluşmaz                                        |
| T10 | Mevcut guard oturum kontrol ediyor; incelenen SQL örneklerinde giriş yapmış kullanıcı denetimi var                                       | Hesap modelini doğrulama; yönetici dışı kullanıcılar olacaksa sunucu tarafında rol yetkilendirmesi          | P1 doğrulama / uygulama O–B | Yetkisiz hesap okuma/yazma sınırlarını aşamaz; yalnız arayüzde gizlemeye dayanılmaz                                  |

T02 için: yalnız istemcide meta etiketlerini değiştirmek her paylaşım botu için yeterli olmayabilir. Ön üretim veya sunucuda render ihtiyacı yayın altyapısına göre seçilmelidir; framework taşıma kararı bu incelemenin sonucu değildir. T03'te gerçek HTTP 404 ve history fallback davranışı da barındırma katmanında doğrulanmalıdır.

T10 bir doğrulanmış canlı güvenlik açığı bildirimi değildir. Tek yönetici hesabı varsayımı, kayıt açma ayarları ve kullanılan SQL sürümü kontrol edilmelidir. İleride taslak/yayın ayrımı eklenirse mevcut herkese açık okuma politikaları da bu modele uyarlanmalıdır.

## 3. Tasarım yönü

### Önerilen ana yaklaşım: sıcak, editoryal mimari portföy

Ana sayfadaki kırık beyaz, koyu yeşil, büyük görüntü, serif vurgulu başlık ve asimetrik seçili işler düzeni iyi bir temel. `PublicLayout.vue` diğer sayfalara renkleri kısmen taşıyor; dolayısıyla sorun tamamen farklı paletler değil, tipografi, kartlar, içerik yoğunluğu ve boşluk ritminin henüz birlikte yönetilmemesi.

- Büyük, iyi seçilmiş fotoğraflar; teknik çizimlerde kırpılmayan gösterim.
- Başlıklarda karakterli bir serif, metin ve kontrollerde Türkçe karakter destekli okunaklı sans-serif. Font seçimi, lisans ve yükleme bütçesi uygulama öncesinde netleşmeli.
- Masaüstünde 12 kolon düşüncesine dayalı esnek düzen; mobilde doğal okuma sırası.
- Gövde metninde yaklaşık 16–18 px, 1,5–1,7 satır aralığı; uzun metinlerde 60–75 karakter civarında satır uzunluğu.
- Kırık beyaz yüzey, kömür/orman tonunda metin, ölçülü zeytin vurgusu. Renkler kontrast ölçümüyle kesinleşmeli.
- Ana çağrı: “Projenizi konuşalım”; portföyü keşfetme ve iletişime geçme yolları her önemli akışta görünür olmalı.

**İçerik kararı:** Ana sayfa mimari tasarım ve 3D görselleştirme anlatıyor; kategori verisi pergola, gölgelendirme ve cam sistemlerinden oluşuyor. Tasarım uygulamasından önce ana hedefin “tasarım stüdyosu”, “sistem/uygulama portföyü” veya ikisini birleştiren bir sunum olması seçilmeli. Örneğin sistem portföyü ağırlığında “Mekânınıza uygun sistemi, tasarımdan uygulamaya keşfedin” daha açıklayıcı olabilir. Bu bir öneridir; marka iddiası olarak kabul edilmemelidir.

### Güncel yaklaşımlardan projeye uygun seçimler

| Yaklaşım                               | Uygulama önerisi                                                  | Karar                                                               |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Editoryal tipografi ve geniş görseller | Ana sayfa dilini proje listesi, detay ve kurumsal sayfalara yayma | Birinci tercih                                                      |
| Asimetrik/modüler grid                 | Seçili işler ve hizmet özetinde kontrollü boyut çeşitliliği       | P2; mobil DOM sırası korunmalı                                      |
| Sinematik sunum                        | Mevcut video altyapısını iyi poster ve kısa kurgu ile güçlendirme | Altyapı zaten var; içerik kalitesi öncelikli                        |
| View Transitions                       | Karttan detaya kısa görsel süreklilik                             | P3; destek kontrolü, normal geçiş alternatifi ve reduced-motion ile |
| Kaydırmaya bağlı küçük hareketler      | Bölüm girişinde kısa opacity/transform geçişi                     | P3; içerik animasyon olmadan da görünür olmalı                      |
| Tasarım/uygulama karşılaştırması       | Aynı açıdaki render ile tamamlanmış fotoğrafı karşılaştırma       | P3; uygun görsel eşleri varsa                                       |
| Etkileşimli 3D/360°                    | Tek bir seçili projede kullanıcı isteğiyle açılabilen deneyim     | P3; ayrı varlık üretimi ve performans bütçesi gerekir               |

Bu liste evrensel bir “2026 trend sıralaması” değildir; güncel örnekler ve teknik olanaklardan projeye uygun tasarım seçimidir. Radish Lab'in HLW çalışmasında büyük fotoğraflar, esnek proje anlatımı ve farklı portföy görünümleri somut bir örnektir. [HLW proje incelemesi](https://www.radishlab.com/work/web-design-hlw/)

View Transitions için aynı belge ve belgeler arası geçişlerin destek kapsamları farklı değerlendirilmelidir. Bu Vue SPA'da ilgili başlangıç noktası aynı belge geçişleridir; uygulama sırasında hedef tarayıcı desteği yeniden kontrol edilmelidir. [Chrome teknik güncellemesi](https://developer.chrome.com/blog/view-transitions-in-2025), [Baseline](https://web.dev/baseline)

Yoğun blur/cam efektleri, zorunlu yatay gezinme, özel imleç, uzun açılış animasyonu ve otomatik ses bu portföyün ilk geliştirme paketinde önerilmiyor. Önce görüntünün kalitesi ve projenin anlaşılması iyileştirilmeli.

## 4. Sayfa bazında onaylanabilir geliştirmeler

Her kod bağımsız onaylanabilir. Altındaki kapsam o kodun parçasıdır; yeni veri alanı veya servis gereksinimi ayrıca belirtilmiştir.

### Ortak menü ve footer

- [ ] **G01 — Ortak sayfa iskeleti (P1 / O).** T08 ile birlikte başlık, açıklama, içerik genişliği ve bölüm boşluklarını standartlaştırma. Mevcut 1344 px üst bölüm ile 1200 px içerik ölçülerinin ilişkisini bilinçli kurma. Kabul: kenar hizaları ve metin ölçeği tüm ziyaretçi sayfalarında tutarlı.
- [ ] **G02 — İletişim odaklı gezinme (P2 / K).** Menüde iletişimi belirgin çağrıya dönüştürme; mevcut aktif sayfa, mobil aç/kapa ve Escape davranışlarını koruma. Footer'a doğrulanmış iletişim/sosyal bağlantılar ve kısa marka açıklaması ekleme. Kabul: 320 px genişlikte taşma ve kapatmayı engelleyen yerleşim yok.
- [ ] **G03 — Ortak geri bildirim tasarımı (P2 / O).** `AsyncState` üzerine sayfaya uygun sabit alanlı yükleme iskeletleri, boş sonuç eylemleri ve tutarlı hata metinleri. Kabul: kullanıcı hata ile boş içeriği ayırt edebilir; yeniden deneme çalışır.

### Ana sayfa — `/`

Mevcut: hero fotoğraf/video, seçili işler, yaklaşım ve iletişim çağrısı var. `featuredProjects`, gelen listenin ilk üç kaydı; bağımsız editoryal seçim değil.

- [ ] **H01 — Ana mesajı netleştirme (P1 / K).** Hedef iş modeline göre başlık, alt metin ve hizmet adlarını düzenleme. Kabul: ziyaretçi sunulan hizmeti ve sonraki adımı ilk ekranda anlayabilir. Bağımlılık: marka odağı kararı.
- [ ] **H02 — Seçili proje yönetimi (P2 / O).** Ana sayfada gösterilecek projeleri ve sırasını admin'den seçme. Kabul: yeni proje eklemek seçili işleri kendiliğinden değiştirmez; silinen seçim güvenli karşılanır. Bağımlılık: kalıcı seçim/sıra modeli ve admin ekranı.
- [ ] **H03 — Medya kompozisyonu (P2 / O).** Masaüstü/mobil kırpma önizlemesi, odak noktası seçimi ve poster üstünde gerçek başlık önizlemesi. Kabul: ana konu ve başlık farklı ekran oranlarında korunur. Mevcut oynat/duraklat ve mobil tercih davranışları geliştirilerek korunur.
- [ ] **H04 — Güven ve çalışma süreci (P2 / O).** Doğrulanmış referanslardan kısa şerit; görüşme → tasarım → görselleştirme/uygulama gibi gerçek iş akışı. Kabul: tüm iddia, logo ve sayılar gerçek içerikle desteklenir.

### Projeler — `/projeler`

Mevcut: kategori filtreleri ve sayaçlar çalışacak şekilde bağlı; masaüstünde 280 px sidebar ve iki kolon, 900 px altında tek kolon tanımlı. Arama alanı bağlı değil.

- [x] **P01 — Arama ve paylaşılabilir filtreler (P1 / O).** T01'i kapsar; kategori ve aramayı URL query'sine taşıma, temizleme ve sonuç sayısı. Kabul: filtreli URL yeniden açıldığında aynı seçim oluşur; geri tuşu beklenen duruma döner.
- [ ] **P02 — Portföy kartlarını güçlendirme (P1 / O).** T05 ile birlikte daha büyük kapak, sade metin alanı, konum/yıl ve tutarlı etkileşim. Kabul: uzun başlıklar taşmaz; hover olmadan tüm temel bilgi okunur.
- [ ] **P03 — Mobil filtre düzeni (P2 / O).** Uzun kategori listesini açılır filtre paneline veya erişilebilir chip düzenine dönüştürme; tablette uygun genişlikte iki kolon. Kabul: filtreler ilk projeyi gereksiz yere aşağı itmez; aktif seçim erişilebilir biçimde belirtilir.
- [ ] **P04 — Sıralama ve kontrollü daha fazla göster (P2 / O; T06 hariç).** Yeni/yıl/isim seçenekleri; boş kategoride tüm projelere dönme. Kabul: sıralama arama ile birlikte çalışır. Büyük veri için T06 gerekir; yalnız istemcide dilimlemek ağ yükünü azaltmaz.

### Proje detayı — `/projeler/:slug`

Mevcut: başlık, açıklama, konum/yıl/durum/kategori, kapak, tasarım galerisi, video ve büyütme pencereleri var. Kapak masaüstünde sağ kolonda ve en fazla 420 px yüksekliğinde. Kapak ve galeri farklı dialog uygulamaları kullanıyor.

- [ ] **D01 — Projeyi hikâye olarak anlatma (P1 / O).** Başlık ve kısa özet → geniş kapak → proje künyesi → ihtiyaç/çözüm → galeri → iletişim sırası. Kabul: mobilde aynı mantıksal sıra korunur; boş içerik alanı üretilmez. Yapılandırılmış ihtiyaç/çözüm metinleri istenirse yeni veri alanları gerekir.
- [ ] **D02 — Tasarım ve uygulama bölümleri (P1 / O).** T09'u kapsar; teknik çizimlerde `contain`, fotoğraflarda kontrollü kırpma. Kabul: mevcut uygulama görselleri görünür; çizimin kenarları kesilmez.
- [ ] **D03 — Birleşik galeri görüntüleyici (P2 / O).** Mevcut büyütmeyi önceki/sonraki, sayaç, ok tuşları ve odağı açan elemana dönüş ile geliştirme. Kabul: Escape kapatır; ilk/son görüntü davranışı açıktır; klavye erişimi korunur.
- [ ] **D04 — Sonraki proje ve ilgili başvuru (P2 / K).** İlgili proje bağlantıları ve “Bu proje hakkında konuşalım” çağrısı. Kabul: iletişim formuna proje bağlamı taşınır; proje silinmişse güvenli varsayılan kullanılır.
- [ ] **D05 — Render/uygulama karşılaştırması (P3 / O).** Uygun eşleşen görseller için karşılaştırma kontrolü. Kabul: klavye ve dokunmayla çalışır; eşleşme yoksa normal galeri gösterilir. Bağımlılık: eşleştirme verisi ve fotoğraflar.

### Animasyonlar — `/animasyonlar`

Mevcut: yalnız başlık var; projelerde YouTube ve video URL altyapısı mevcut.

- [ ] **A01 — Film portföyü (P1 / O).** Video içeren projelerden posterli liste; proje adı, kısa açıklama ve detay bağlantısı. Kabul: video olmayan projeler listelenmez; boş durum açıklayıcıdır.
- [ ] **A02 — Odaklı oynatma (P2 / O).** Mevcut `ProjectVideo` üzerinden kullanıcı tıklamasıyla oynatma, tutarlı geniş gösterim. Kabul: listedeki tüm videolar aynı anda yüklenmez/oynamaz; konuşmalı içerikte altyazı kaynağı sağlanır. Süre bilgisi gösterilecekse yeni metadata gerekir.

### Referanslar — `/referanslar`

Mevcut: yalnız başlık var.

- [ ] **R01 — Doğrulanmış referans vitrini (P1 / O).** Tutarlı boyutta müşteri logoları, ilgili projeler ve kısa iş birliği açıklamaları. Kabul: her logo gerçek iş ilişkisine dayanır; tıklanabilir olanlar anlamlı hedefe gider. Bağımlılık: logo dosyaları ve kullanılabilir içerik.
- [ ] **R02 — Müşteri deneyimi (P2 / O).** Onaylı alıntılar ve isim/rol; varsa vaka bağlantısı. Kabul: uydurma alıntı ve sayı yok; içerik azsa gereksiz carousel kullanılmaz. Admin'den yönetim istenirse ayrı içerik modeli gerekir.

### Hakkımızda — `/hakkimizda`

Mevcut: yalnız başlık var.

- [ ] **B01 — Kimlik, uzmanlık ve süreç (P1 / O).** Gerçek kişi/stüdyo fotoğrafı, kısa tanıtım, uzmanlık alanları, çalışma biçimi ve iletişim çağrısı. Kabul: içerik marka odağıyla uyumlu; mobilde anlaşılır tek kolon akışı var. Bağımlılık: onaylı biyografi ve fotoğraf.
- [ ] **B02 — Süreç görselleri (P2 / O).** Çizim, render ve uygulamadan seçili karelerle anlatım. Kabul: her görsel açıklayıcı bağlama sahip; yapay başarı istatistikleri kullanılmaz.

### İletişim — `/iletisim`

Mevcut: başlık ve kişi adı var; iletişim kanalı/form yok.

- [ ] **C01 — Kullanılabilir iletişim sayfası (P1 / K).** Doğrulanmış e-posta/telefon, varsa adres ve sosyal bağlantılar; sade iki kolon düzen. Kabul: e-posta ve telefon ilgili uygulamayı açar; mobilde bilgiler rahat okunur.
- [ ] **C02 — Proje başvuru formu (P1 / B).** Ad, e-posta, ihtiyaç/sistem türü, mesaj; telefon isteğe bağlı. Sunucu tarafında doğrulama, gönderim servisi, tekrar gönderim kontrolü ve spam sınırlaması. Kabul: gerçek kayıt/gönderim tamamlanmadan başarı gösterilmez; hata halinde yazılanlar korunur. Bağımlılık: alıcı adresi, servis ve veri saklama kararı. Aydınlatma metni gerçek veri akışına göre hazırlanmalı.
- [ ] **C03 — Bağlama uygun başvuru (P2 / K).** D04'ten gelen proje bilgisi ve isteğe bağlı basit hizmet seçimi. Kabul: kullanıcı ön seçimi değiştirebilir; form gereksiz zorunlu alanlarla uzamaz.

### Yönetim paneli

Mevcut: dashboard, arama/filtre/sıralama içeren proje yönetimi, proje ekle/düzenle, kategori özeti, medya kütüphanesi, ana sayfa medya yönetimi ve giriş ekranı mevcut. Kategori sayfası kategori düzenleyicisi değil; özet ve proje bağlantıları sunuyor.

- [ ] **Y01 — İçerik hazırlık özeti (P2 / O).** Dashboard'a eksik açıklama, uygulama görseli veya iletişim içeriği gibi eyleme dönük göstergeler. Kabul: göstergeler gerçek kayıtlardan hesaplanır; eksik içeriğin düzenleme sayfasına gider.
- [ ] **Y02 — Proje formunda yayın görünümü (P2 / O).** Var olan medya önizlemesini tüm sayfanın masaüstü/mobil önizlemesiyle tamamlama; uzun form için bölüm bağlantıları ve erişilebilir kayıt alanı. Kabul: önizleme kalıcı kayıt yapmaz; kaydedilmemiş değişiklik uyarıları korunur.
- [ ] **Y03 — Genişletilmiş ana sayfa editörü (P2 / O; H02/H03 ile ortak).** Başlık, alt metin, çağrı metni, seçili projeler ve odak noktası yönetimi. Kabul: önizleme ile yayın çıktısı aynı bileşen dilini kullanır. Yeni alanlar için veri modeli ve doğrulama gerekir.
- [ ] **Y04 — Medya bilgisini zenginleştirme (P2 / O).** Mevcut arama/tür filtresine boyut, çözünürlük ve kullanım bilgisi ekleme. Kabul: bilgi gerçek metadata'dan gelir; her dosyayı yeniden indirmek gerekmez. Gerekiyorsa metadata yükleme sırasında saklanır.
- [ ] **Y05 — Taslak/yayın ayrımı (P2 / B).** Projenin uygulama durumundan bağımsız yayın durumu. Kabul: taslak public API ve sayfalardan erişilemez; mevcut kayıtların geçiş politikası açıktır. Bağımlılık: SQL/RLS, servis, form ve test güncellemeleri. Önizleme yetkilendirmesi de bu kapsamda tasarlanır.
- [ ] **Y06 — Giriş ekranı görsel tutarlılığı (P2 / K).** Mevcut doğrulama ve hata davranışlarını koruyarak ortak marka ölçeği, odak ve form boşlukları. Kabul: klavye ve parola yöneticisi kullanımı korunur.

## 5. Kabul ve kalite hedefleri

- 320, 375, 768, 1024 ve 1440 px genişliklerde yatay taşma; uzun Türkçe başlıklar; boş ve çok sayıda proje; portre/yatay görsel senaryoları kontrol edilmeli.
- Mobilde hover gerektiren temel işlem olmamalı; yüzde 200 yakınlaştırmada içerik ve kontroller kullanılabilir kalmalı.
- WCAG 2.2 AA temel hedefi: normal metinde en az 4,5:1, büyük metinde 3:1 kontrast; görünür klavye odağı. Dokunma hedefleri tasarımda mümkün olduğunca 44×44 CSS px seçilmeli; WCAG 2.2 AA minimum hedef boyutu ölçütü istisnalarıyla 24×24 CSS px'dir. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Hedef boyutu açıklaması](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- Performans hedefleri mobil/masaüstü gerçek ziyaretlerin 75. yüzdeliğinde LCP ≤ 2,5 sn, INP ≤ 200 ms, CLS ≤ 0,1. Bunlar mevcut ölçüm değil, geliştirme sonrası hedeftir. Lighthouse tek başına gerçek kullanıcı INP sonucunu vermez. [Web Vitals](https://web.dev/articles/vitals)
- Yeni filtre, form gönderimi, galeri gezinmesi ve taslak erişimi için anlamlı davranış testleri eklenmeli; mevcut testler ve ilgili build/typecheck kontrolleri korunmalı.
- Meta, paylaşım önizlemesi ve doğrudan alt sayfa açılışı yayın ortamında doğrulanmalı.
- Görsel tasarım kabulü, tarayıcı erişimi sağlandığında gerçek ekran görüntüleri üzerinden ayrıca yapılmalı.

## 6. Önerilen uygulama sırası

1. **Temel işlev ve dil:** Marka odağı, T01–T03, T07–T09, G01, H01, P01–P02, D02. Aynı işi tanımlayan teknik ve sayfa kodları tek iş olarak uygulanır.
2. **Eksik sayfalar:** C01, B01, A01 ve gerçek içerik hazırsa R01; başvuru servisi seçilince C02.
3. **Portföy sunumu:** D01, D03–D04, P03, H02–H04 ve ilgili Y02–Y03.
4. **Büyüme ve yönetim:** T04–T06, Y01, Y04–Y06. T10'un hesap modeli doğrulaması yayın öncesinde yapılmalı; ihtiyaç varsa yetkilendirme uygulaması bu aşamayı beklememeli.
5. **İsteğe bağlı yenilikler:** View Transitions, sınırlı bölüm hareketleri, D05 veya tek projelik 3D/360° pilotu. Görsel içerik ve performans sonucu uygun olduğunda.

## 7. Onay biçimi ve gereken içerikler

Başlangıçta tüm kutular onaysızdı; P01 kullanıcı onayıyla uygulandı. Diğer kutular onaysızdır. “P1” etiketi uygulama izni anlamına gelmez. Örneğin **“G01, H01, P01, P02, D02 ve C01 onaylı; diğerleri beklesin”** şeklinde seçim yapılabilir. Seçilen maddenin teknik bağımlılıkları kapsamı belirler; daha geniş veri modeli değişiklikleri ilgili kodlarla birlikte değerlendirilir.

Uygulama sırasında gereken kararlar/içerikler:

- Ana marka odağı: tasarım stüdyosu, sistem/uygulama portföyü veya ikisini birleştiren anlatım.
- Onaylı logo, fotoğraflar, biyografi, hizmet metinleri ve referans içerikleri.
- Gerçek telefon/e-posta ve formun gönderileceği adres/servis.
- Ana sayfada öne çıkarılacak projeler; varsa render/uygulama eşleri.
- Taslak yayın ve birden fazla kullanıcı ihtiyacı.

**P01 kullanıcı onayıyla uygulandı. Diğer adımlara ayrı onay verilmeden geçilmez.**

## 8. Uygulama kaydı — P01

- Kullanıcı onayıyla proje adı araması ve kategori filtresi birlikte çalışacak şekilde uygulandı.
- Arama, Ara düğmesi veya Enter ile uygulanır. Her harf için geçmiş kaydı oluşturulmaz; uygulanan arama ve kategori seçimleri tarayıcı geçmişine eklenir.
- `q` ve `category` URL parametreleri paylaşılabilir; doğrudan açılış ve geri/ileri gezinme seçimleri geri yükler.
- Türkçe büyük/küçük harf ve Unicode eşdeğerliği gözetilir. Örneğin `IŞIK` → `ışık`, `İÇİN` → `için`. Türkçe harfleri ASCII'ye indirgeyen yaklaşık eşleşme uygulanmaz.
- Sonuç sayısı, aktif kategori için erişilebilir durum, görünür arama etiketi, odak stilleri, filtreleri temizleme ve açıklayıcı boş sonuç mesajı eklendi.
- Kategori sayaçları tüm katalogdaki sayıları temsil etmeye devam eder; bulunan proje sayısı ayrı gösterilir.
- Geçersiz veya yinelenen filtre parametreleri güvenli varsayılanla karşılanır; ilgisiz URL parametreleri ve hash korunur.
- Değişen kaynaklar: `src/views/ProjectsView.vue`, `src/components/projects/CategorySidebar.vue`. Davranış testleri: `tests/projects-search.test.ts`.
- Canlı tarayıcı/görsel doğrulama yapılmadı. Sonraki adım için ayrı kullanıcı onayı gerekir.

### P01 son doğrulama — 21 Eylül 2026

- Yarım kalan doğrulama tamamlandı; P01 tamamlandı. Diğer geliştirme maddeleri için onay bekleniyor.
- `npm run test:typecheck`: başarılı.
- `npm test`: 20 test dosyası, 178 test başarılı. Yeni arama/filtre dosyasında 10 test bulunuyor.
- `npm run build`: başarılı.
- `npm run check`: tip kontrolü, test ve derleme aşamaları geçti; genel `format:check`, P01 dışında kalan 113 dosyada biçim uyarısı nedeniyle başarısız oldu. Bu dosyalarda toplu biçimlendirme yapılmadı.
- P01 kaynak ve test dosyalarında hedefli Prettier kontrolü ile `git diff --check` ayrıca doğrulandı.
- Tarayıcıda görsel doğrulama yapılmadı; sonuçlar kod, bileşen/router testleri ve derleme doğrulamasına dayanıyor.
