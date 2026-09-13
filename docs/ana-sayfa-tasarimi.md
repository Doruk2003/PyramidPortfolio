# Ana sayfa — ilk tasarım

Sıcak kırık beyaz, antrasit ve zeytin tonlarında; görselleri öne çıkaran ana sayfa tasarımı. Büyük başlıklarda sade sans-serif ve seçili ifadelerde serif kullanıldı. Yeni yazı tipi indirmesi veya ek paket gerektirmez.

- Açılış alanı masaüstünde 74svh, 440–760 px aralığında. Mobilde en az 480 px; metin büyüdüğünde alan genişleyebilir.
- Mevcut hero.jpeg kullanılıyor. Fotoğraf yatayda ve mobilde farklı kadrajlanıyor; kaynak dosya değiştirilmedi.
- İlk üç katalog projesi bir geniş ve iki küçük yerleşimde gösteriliyor. Yeni bir admin “öne çıkar” ayarı eklenmedi; mevcut veri seçimi korundu.
- Menü, yaklaşım ve iletişim alanları ana sayfayla uyumlu düzenlendi. Ortak ziyaretçi menüsü ve ziyaretçi renk değişkenleri diğer public sayfalara da uygulanır.
- Mevcut kompakt footer düzeni ve ortalanmış telif metni korundu. Admin ekranlarının teması değiştirilmedi.
- İlk tasarımın ardından [ana sayfa fotoğraf/video yönetimi](ana-sayfa-medya.md) eklendi. Aşağıdaki önizlemeler ilk tasarım sürümüne aittir.

## Önizlemeler

Ekran görüntüleri gerçek Chrome'da kontrollü örnek proje yanıtlarıyla alındı. Canlı Supabase verileri değiştirilmedi; önizlemedeki proje adları ve sayısı test verisidir.

- [Masaüstü, tam sayfa](onizlemeler/ana-sayfa-masaustu.png)
- [Mobil, açılış](onizlemeler/ana-sayfa-mobil.png)

153 test, TypeScript kontrolü, üretim derlemesi ve biçim kontrolü geçti. 1440/1366 px masaüstü ve 390/320 px mobil genişliklerde yatay taşma görülmedi. Mobil menü açma/kapama ve Escape kontrolü geçti; tarayıcı çalışma zamanı hatası görülmedi.
