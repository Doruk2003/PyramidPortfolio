# Ana sayfa fotoğraf/video yönetimi

## Kurulum

1. Supabase SQL Editor'de [ana-sayfa-medya-kurulumu.sql](../supabase/ana-sayfa-medya-kurulumu.sql) dosyasının tamamını çalıştırın. Bu işlem ana sayfa ayarlarını, kayıt fonksiyonunu, temizlik kuyruğunu ve `homepage-media` Storage bucket'ını oluşturur.
2. Yönetici panelinde **Ana sayfa** bölümünü açın.
3. Fotoğraf veya video modunu seçin; kapak fotoğrafını ve video kullanılacaksa video dosyasını yükleyip kaydedin.

SQL canlı Supabase üzerinde bu geliştirme sırasında çalıştırılmadı. Kurulum yapılana kadar ziyaretçi ana sayfası mevcut varsayılan fotoğrafla açılır; admin ekranı kurulum ihtiyacını bildirir. Proje kayıtları ayrı tutulur.

## Kullanım ve sınırlar

- Kapak fotoğrafı hem fotoğraf modunda hem video başlamadan önce gösterilir. Kapak seçilmezse uygulamadaki varsayılan fotoğraf kullanılır.
- Fotoğraf hazırlığı 100 MB'a kadar kaynak görselleri kabul eder; otomatik küçültme sonrasında yüklenen görsel en fazla 10 MB olabilir.
- Videolar MP4 veya WebM, en fazla 20 MB olabilir. Video otomatik sıkıştırılmaz. Açılış için kısa, sessiz bir video tercih edin.
- Masaüstünde uygun koşullarda video sessiz ve döngü halinde oynar. Açılış alanı ekran dışına çıktığında veya sekme gizlendiğinde durur. Kullanıcı oynatmayı duraklatabilir.
- Mobilde, azaltılmış hareket tercihinde ve tarayıcının desteklediği veri tasarrufu modunda video kendiliğinden indirilmez/başlatılmaz; kapak ve oynatma düğmesi gösterilir.
- Video yüklenemezse kapak görünür kalır ve yeniden deneme düğmesi sunulur.

## Depolama ve kayıt güvenliği

- Veritabanında dosyaların kendileri yerine Storage yolları ve seçim bilgileri saklanır.
- Ayrı bucket ek ücretsiz kota sağlamaz; Supabase projesinin mevcut depolama ve trafik kotasını kullanır. Önbellekleme tekrar indirmeleri azaltabilir, ancak video oynatma trafiğini ortadan kaldırmaz.
- Fotoğraf moduna geçiş kaydedilince eski video kaldırılmak üzere kuyruğa alınır. Değiştirilen kapaklar da aynı şekilde temizlenir. Halen kullanımda olan dosyaların silinmesi engellenir.
- Temizlik tamamlanamazsa kayıt korunur; yönetici **Eski dosyaları temizle** işlemini tekrar çalıştırabilir.
- Eşzamanlı düzenlemelerde sürüm kontrolü eski formun yeni kaydı ezmesini engeller. Sonucu belirsiz kayıt isteklerinde yeni dosyalar hemen silinmez.
- Kuyruk, kaydedilmiş ayarlardan çıkarılan dosyaları kapsar. Yükleme sırasında tarayıcının kapanması gibi durumlarda oluşabilecek tüm sahipsiz dosyalar için zamanlanmış genel temizlik henüz yoktur.
- Mevcut yetki modeli korunur: Supabase Auth kullanıcıları yönetici kabul edilir; ziyaretçiler yalnızca yayımlanan ayarları okuyabilir.

## Doğrulama

TypeScript, 168 test, üretim derlemesi ve biçim kontrolü geçti. Veritabanı testleri yerel test ortamında yürütüldü. Gerçek Chrome'da kontrollü test verisiyle masaüstü video oynatma, ekran dışında duraklatma, mobilde tıklamadan video indirilmemesi ve admin ekranı kontrol edildi; çalışma zamanı hatası görülmedi. Canlı Supabase üzerinde kayıt veya silme yapılmadı.
