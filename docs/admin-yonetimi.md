# Pyramid Admin — Proje yönetimi

Kullanıcı ilk gerçek proje kaydının başarılı olduğunu doğruladı. Bu geliştirme, kayıt akışını düzenleme/silme ve çoklu sistem kategorileriyle genişletir.

## Kullanım

- Sitenin altındaki **Yönetici Girişi / Yönetim Paneli** bağlantısıyla panele ulaşılır.
- **Genel bakış:** proje, sistem, görsel ve video sayıları; son güncellenen projeler; yeni proje ve düzenleme bağlantıları.
- **Projeler:** başlık, adres, konum veya sistem adıyla arama; sistem ve durum filtresi; güncelleme/ad/yıl sıralaması; onarlı sayfalama; sitede görüntüleme, düzenleme ve silme.
- **Yeni proje / Düzenle:** bir veya birden fazla sistem kutucuğu seçilir. Mevcut projede başlık değişse bile yayımlanmış adres korunur. Kayıtlı görselleri yeniden seçmek gerekmez. Ana görsel değiştirilebilir; galeriye/uygulama grubuna görseller eklenebilir veya kayıtlı öğeler kaldırılabilir; video eklenebilir/değiştirilebilir/kaldırılabilir. Ana görsel tamamen kaldırılamaz: yerine yenisi gerekir. Değişiklikler kaydedilene kadar uzak kayıt etkilenmez.
- **Sil:** proje adıyla birlikte kalıcı silme onayı gösterilir. Vazgeçmek hiçbir işlem yapmaz; devam eden işlemde ikinci silme isteği engellenir.
- **Sistemler:** yedi sistemin proje sayıları ve ilgili proje listesine bağlantılar. Kategori sözlüğünü değiştirme/silme özelliği bu kapsamda eklenmedi; projelerin sistem atamaları yönetilir.
- **Medya:** projelere bağlı görseller/video, proje adı ve tür filtresi; ilgili projede düzenleme bağlantısı; bekleyen dosya temizliğini tekrar çalıştırma.

Panel masaüstünde sabit yan menü, mobilde üstte dört sekme kullanır. Dar ekranda proje tablosu kendi alanında yatay kaydırılır; sayfa yatay taşmaz. Metin etiketleri, klavye odağı, alan hataları ve modal silme onayı korunur.

## Çoklu kategori modeli

`projects.category_id` yerine `project_categories(project_id, category_id)` ilişki tablosu kullanılır. Birleşik anahtar aynı kategorinin aynı projeye tekrar bağlanmasını engeller; yabancı anahtarlar geçersiz kategorileri reddeder. Her projede en az bir kategori olması kayıt RPC'sinde kontrol edilir. Bu yapı [Supabase'in çoktan çoğa ilişki modeliyle](https://supabase.com/docs/guides/database/joins-and-nesting) uyumludur.

İstemci `categoryIds: number[]` ve çözülmüş `categories: Category[]` taşır. Önceki tek kategori alanları UI/servis modelinden kaldırıldı. Public proje kartları ve detayları tüm sistemleri gösterir; kategori filtresi projenin herhangi bir kategorisiyle eşleşir. Bir proje birden çok kategoride sayılabildiği için kategori sayılarının toplamı toplam proje sayısından büyük olabilir.

## Veritabanı geçişi

Yeni dosya: `supabase/migrations/202609130001_admin_management.sql`.

İlk kurulum migration'ından sonra **bir kez** uygulanır. Mevcut proje-kategori bağlantıları önce ilişki tablosuna taşınır, ardından tek kategori kolonu kaldırılır. Proje ID'si, adresi, alanları ve medyası korunur. Eski `create_portfolio_project` RPC'si yeni kayıt fonksiyonunu çağırır; eski tek kategorili kayıt gövdesini de dönüştürür. Eski kolonla okuma yapan eski frontend sürümü desteklenmez; frontend ve migration birlikte güncellenmelidir.

Bu çalışmada yeni kolonlar ve ilişki sorgusu canlı public API'den başarıyla okundu; `npm run supabase:verify` açık kaydın kapalı olduğunu ve `supabase` veri kaynağını da doğruladı. Migration'ı tekrar çalıştırmayın. Yönetim anahtarı bu çalışma ortamında olmadığı için SQL yürütmesi buradan yapılmadı; uzak fonksiyon yetkilerinin SQL kontrolü için `supabase/verify.sql` kullanılabilir.

## Düzenleme ve silmenin sınırları

- `save_portfolio_project`: alanlar, kategori kümesi ve medya listesini tek transaction'da oluşturur/günceller. Yeni dosyalar kullanıcı/istek klasöründen gelmelidir; kayıtlı medya yalnızca düzenlenen projeye zaten bağlıysa korunabilir.
- `version` her güncellemede artar. Formun okuduğu sürüm güncel değilse güncelleme/silme `40001` ile reddedilir; eski form yeni değişiklikleri ezmez. `updated_at` liste sıralamasında kullanılır.
- Düzenlemede adres değiştirme sunucuda da reddedilir. Adres değişimi ve yönlendirme yönetimi ayrıca tasarlanması gereken bir özelliktir.
- `delete_portfolio_project`: projeyi ve kategori/medya ilişkilerini atomik siler. Silinecek Storage yolları aynı transaction'da `media_cleanup` kuyruğuna eklenir. Güncellemede kaldırılan eski medya da kuyruğa alınır.
- Gerçek dosya silme **Storage API** üzerinden yapılır. Sadece `storage.objects` satırını silmek fiziksel dosyayı silmez; uygulama bunu yapmaz. [Supabase dosya silme açıklaması](https://supabase.com/docs/guides/storage/management/delete-objects).
- Kuyruk en fazla 100 dosyalık gruplarla işlenir. Başarılı API temizliği sonrası kuyruk kayıtları kaldırılır. Hata varsa tekrar denenebilir; proje kaydı/silme başarısı dosya temizliğinin başarısıyla karıştırılmaz.
- Tüm Auth kullanıcıları yönetici kuralı devam eder. Her yönetici bir başka yöneticinin projesini düzenleyebilir/silebilir. Storage politikası yalnızca kendi kullanılmayan yüklemelerini veya kuyruktaki kullanılmayan dosyaları silmesine izin verir; hâlâ projeye bağlı dosyalar korunur.
- Ağ yanıtı kaybolursa kayıt, işlem ID'siyle geri okunmaya çalışılır. Sonuç belirsizken yüklenmiş dosyalar silinmez. Silme yanıtı kaybolduğunda kaydın gerçekten bulunmadığı kontrol edilir; doğrulanamıyorsa başarı bildirilmez.
- SQL doğrudan tablo yazma yetkisi vermez. `save_portfolio_project` ve `delete_portfolio_project` yalnızca Auth kullanıcısına açıktır ve ayrıca oturum kontrolü yapar.

Kuyruk, mevcut projeden kaldırılan/silinen dosyaları kapsar. Kayıttan önce tarayıcının kapanmasıyla bırakılmış, hiçbir projeye bağlanmamış tüm eski yüklemeleri tarayan zamanlanmış bir iş değildir. Büyük videolarda devam ettirilebilir yükleme henüz yoktur. Proje listesi UI'da sayfalansa da servis mevcut kataloğun tamamını yükler; çok büyük katalogda sunucudan filtreli sayfalama ayrıca geliştirilmelidir.

## Doğrulama

- PostgreSQL/PGlite: ilk şemadaki gerçek bir test kaydını yeni şemaya taşıma; çoklu kategori, geçersiz/tekrarlanan/boş seçim, alan kısıtları, sürüm çakışması, adres koruma, başka yöneticinin güncellemesi, medya kuyruğu ve silme.
- Servis testleri: korunmuş medya için tekrar yükleme yapılmaması; güncelleme çakışmasında yalnızca yeni dosyaların temizlenmesi; belirsiz ağ sonuçları.
- Vue ekran testleri: çoklu kategori gösterimi/arama/filtre, çalışan düzenleme bağlantısı, silmeden önce onay/vazgeçme, başarılı silme sonrası liste, sürüm çakışması, form yükleme ve mevcut medyayla güncelleme.
- Gerçek Chrome: canlı backend istekleri yerine kontrollü test yanıtlarıyla masaüstü, mobil ve düzenleme görünümü kontrol edildi; örnek test oturumu uygulama koduna eklenmedi, canlı kayıtlar değiştirilmedi.
- Canlı read-only kontrol: çoklu kategori ilişki sorgusu, sürüm kolonları, public katalog erişimi ve açık kaydın kapalı olması doğrulandı.

Gerçek yönetici hesabıyla **güncelleme → yenileme → public detay kontrolü** ve silinebilecek bir deneme projesiyle **silme → liste/Storage kontrolü** son kabul kontrolüdür. İlk gerçek oluşturma kullanıcı tarafından doğrulandı; yeni güncelleme/silmenin canlıda çalıştırıldığı henüz iddia edilmez.

## Yükleme öncesi görsel hazırlama

Yeni seçilen görseller, kayıt isteğinden önce tarayıcıda sırayla hazırlanır. Ana görsel ve gerçek uygulama fotoğraflarında en uzun kenar 2560 piksele kadar küçültülür; küçük görseller büyütülmez. Tasarım/3D Render Galerisi çözünürlüğü korunur. JPEG ve WebP için fotoğraflarda 0.88, tasarımda 0.95 kalite parametresiyle WebP denenir. Bu parametreler kalite yüzdesi garantisi değildir. PNG, şeffaflığını ve kayıpsız kodlamasını korumak için PNG kalır; fotoğraf alanında boyut küçültme yine uygulanabilir.

Çıktı özgün dosyadan daha küçükse kullanılır. Aksi durumda, desteklenmeyen tarayıcıda, kodlama hatasında veya 40 milyon piksel üzerindeki görüntülerde özgün dosya korunur ve formda açıklama gösterilir. Piksel sınırı decode sonrasında ek canvas belleğini sınırlamaya yöneliktir; ilk decode belleğini sınırlamaz. İnce çizgi ve yazılar için kaydetmeden önce önizleme kontrol edilmelidir. Bu özellik CAD/PDF yükleme, sürüm yönetimi veya video sıkıştırma değildir.

- Form, seçilen görsellerin önceki/sonraki boyutunu ve küçülme oranını gösterir.
- Hazırlık sırasında yeni medya seçimi ve kayıt devre dışıdır. Sayfadan ayrılınca geç tamamlanan hazırlık forma uygulanmaz.
- Mevcut 10 MB kaynak görsel sınırı devam eder; limit üzerindeki dosyalar sıkıştırmaya alınmadan reddedilir.
- Bilgisayardaki özgün dosya ve daha önce yüklenen medya değiştirilmez. Kayıt sırasında yalnızca seçili sonuç dosyası Storage'a gönderilir; veritabanında dosyanın kendisi yerine yol ve ilişki bilgileri tutulur. Storage kullanımı sıfırlanmaz.
- Otomatik testler boyutlandırma, PNG, hata durumunda özgün dosyayı koruma, dosya adı/MIME eşleşmesi, tekrar seçimin çoğalmaması ve sayfa kapanışını kapsar.

Kullanıcı gerçek proje düzenlemesinin çalıştığını doğruladı. Canlı silme ve bu yeni hazırlama akışından sonraki Storage kaydı ayrıca kullanıcı kabul kontrolüne tabidir.

## Tasarım galerisi ve kompakt genel bakış

Genel bakıştaki bilgi kartları tek satırlı kompakt düzendedir. Son proje kartları tek kayıt olduğunda tüm satıra yayılmaz; görsel yüksekliği 110–160 px ile sınırlıdır ve görsel kırpılmadan gösterilir. Uzun içerik, küçük ekran veya çok sayıda proje varsa doğal sayfa kaydırması devam eder; bilgiler gizlenmez.

Projeyi düzenle → 3D Render Galerisi alanında mevcut ve yeni çizimler tek listede gösterilir. İsteğe bağlı başlık (120 karakter), açıklama (1000 karakter), yukarı/aşağı sıralama ve büyük önizleme bulunur. Başlıksız çizimler ziyaretçi tarafında “Tasarım 1” gibi gösterilir. Tam boyut bağlantısı ayrı sekmede açılır. Değişiklikler proje kaydıyla tek transaction içinde kalıcılaşır; sıralama veya metin düzenlemesi mevcut görselleri tekrar yüklemez.

### Çalışan Supabase için gereken SQL

Yeni migration dosyası oluşturulmadı. Mevcut kurulum SQL'i yeni kurulumlar için güncellendi. **Daha önce çalıştırdığınız migration dosyasının tamamını yeniden çalıştırmayın.** Deneme projesini silmeniz yeni başlık/açıklama kolonlarını oluşturmaz. Aşağıdaki SQL'i Supabase SQL Editor'da bir kez çalıştırın; mevcut projeleri silmez. Bu ortamdan canlı şema değişikliği uygulanmadı.

Yeni uygulama kayıt işlemlerinde `save_portfolio_project_gallery` kullanır: SQL uygulanmamışsa metinleri sessizce kaybetmek yerine kayıt başarısız olur. Public okuma eski kolonlar olmadan da devam eder.

```sql
begin;
-- Design gallery fields; no binary files are stored in these columns.
alter table public.project_media add column if not exists title text not null default '' check (char_length(title) <= 120);
alter table public.project_media add column if not exists description text not null default '' check (char_length(description) <= 1000);

create or replace function public.save_portfolio_project_gallery(
  p_project_id integer, p_expected_version integer, p_request_id uuid, p_project jsonb, p_media jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id integer;
  v_existing public.projects%rowtype;
  v_ids jsonb;
  v_item jsonb;
  v_path text;
  v_kind text;
  v_meta jsonb;
  v_bytes bigint;
  v_total bigint := 0;
  v_mime text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_request_id is null or jsonb_typeof(p_project) is distinct from 'object'
    or jsonb_typeof(p_media) is distinct from 'array' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
  if p_project_id is null then
    select id into v_id from public.projects where request_id = p_request_id and created_by = v_user;
    if found then return v_id; end if;
  else
    select * into v_existing from public.projects where id = p_project_id for update;
    if not found then raise exception 'Project no longer exists' using errcode = 'P0002'; end if;
    if v_existing.request_id = p_request_id then return p_project_id; end if;
    if p_expected_version is distinct from v_existing.version then
      raise exception 'Project changed; reload before saving' using errcode = '40001';
    end if;
    if p_project->>'slug' is distinct from v_existing.slug then
      raise exception 'Published project address cannot change' using errcode = '22023';
    end if;
  end if;
  v_ids := p_project->'category_ids';
  if jsonb_typeof(v_ids) is distinct from 'array' then
    raise exception 'Select categories' using errcode = '22023';
  end if;
  if jsonb_array_length(v_ids) = 0 or jsonb_array_length(v_ids) > 100
    or exists (select 1 from jsonb_array_elements(v_ids) c where jsonb_typeof(c) <> 'number' or c::text !~ '^[0-9]+$')
    or (select count(*) from jsonb_array_elements(v_ids)) <> (select count(distinct c) from jsonb_array_elements(v_ids) c) then
    raise exception 'Invalid categories' using errcode = '22023';
  end if;
  if jsonb_array_length(p_media) not between 1 and 26
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'main') <> 1
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'video') > 1
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'gallery') > 12
      or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'application') > 12 then
    raise exception 'Invalid media count' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_media) loop
    if (v_item ? 'title' and jsonb_typeof(v_item->'title') <> 'string')
      or (v_item ? 'description' and jsonb_typeof(v_item->'description') <> 'string') then
      raise exception 'Invalid gallery text' using errcode = '22023';
    end if;
    v_path := v_item->>'object_path';
    v_kind := v_item->>'kind';
    if v_path is null or v_kind is null or v_kind not in ('main', 'gallery', 'application', 'video')
        or not (
          (split_part(v_path, '/', 1) = v_user::text and split_part(v_path, '/', 2) = p_request_id::text)
          or exists (select 1 from public.project_media where project_id = p_project_id and object_path = v_path)
        ) then
      raise exception 'Invalid media path' using errcode = '22023';
    end if;
    -- Lock the actual object: do not trust size/MIME sent by the browser.
    select metadata into v_meta from storage.objects
      where bucket_id = 'project-media' and name = v_path for update;
    if not found then raise exception 'Media not uploaded' using errcode = '22023'; end if;
    v_bytes := (v_meta->>'size')::bigint;
    v_mime := v_meta->>'mimetype';
    if v_bytes is null or v_bytes <= 0 or v_mime is null then
      raise exception 'Invalid media metadata' using errcode = '22023';
    end if;
    if v_kind = 'video' then
      if v_bytes > 104857600 or not (
        (v_mime = 'video/mp4' and v_path ~ '\.mp4$') or
        (v_mime = 'video/webm' and v_path ~ '\.webm$')
      ) then raise exception 'Invalid video' using errcode = '22023'; end if;
    else
      if v_bytes > 10485760 or not (
        (v_mime = 'image/jpeg' and v_path ~ '\.jpg$') or
        (v_mime = 'image/png' and v_path ~ '\.png$') or
        (v_mime = 'image/webp' and v_path ~ '\.webp$')
      ) then raise exception 'Invalid image' using errcode = '22023'; end if;
    end if;
    v_total := v_total + v_bytes;
  end loop;
  if v_total > 157286400 then raise exception 'Media total exceeded' using errcode = '22023'; end if;

  if p_project_id is null then
    insert into public.projects (request_id, created_by, title, slug, description, location, year, status)
    values (p_request_id, v_user, btrim(p_project->>'title'), p_project->>'slug',
      btrim(coalesce(p_project->>'description', '')), btrim(coalesce(p_project->>'location', '')),
      (p_project->>'year')::integer, p_project->>'status') returning id into v_id;
  else
    v_id := p_project_id;
    insert into public.media_cleanup (object_path)
      select object_path from public.project_media where project_id = v_id
      and object_path not in (select m->>'object_path' from jsonb_array_elements(p_media) m)
      on conflict do nothing;
    update public.projects set title = btrim(p_project->>'title'), description = btrim(coalesce(p_project->>'description', '')),
      location = btrim(coalesce(p_project->>'location', '')), year = (p_project->>'year')::integer,
      status = p_project->>'status', request_id = p_request_id, version = version + 1, updated_at = now()
      where id = v_id;
    delete from public.project_categories where project_id = v_id;
    delete from public.project_media where project_id = v_id;
  end if;
  insert into public.project_categories (project_id, category_id)
    select v_id, c::text::integer from jsonb_array_elements(v_ids) c;
  insert into public.project_media (project_id, kind, position, object_path, title, description)
    select v_id, m->>'kind', (m->>'position')::integer, m->>'object_path', btrim(coalesce(m->>'title', '')), btrim(coalesce(m->>'description', '')) from jsonb_array_elements(p_media) m;
  return v_id;
end;
$$;
revoke all on function public.save_portfolio_project_gallery(integer,integer,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_portfolio_project_gallery(integer,integer,uuid,jsonb,jsonb) to authenticated;

-- Compatibility endpoint for callers without gallery metadata.
create or replace function public.save_portfolio_project(
  p_project_id integer, p_expected_version integer, p_request_id uuid, p_project jsonb, p_media jsonb
) returns integer language sql security invoker set search_path = '' as $$
  select public.save_portfolio_project_gallery(p_project_id, p_expected_version, p_request_id, p_project, p_media);
$$;
revoke all on function public.save_portfolio_project(integer,integer,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_portfolio_project(integer,integer,uuid,jsonb,jsonb) to authenticated;


notify pgrst, 'reload schema';
commit;
```

## Büyük kaynak görselleri hazırlama

Kaynak JPEG/PNG/WebP dosyaları artık 100 MB'a kadar seçilebilir. Kaynak boyutu kontrolü ile Storage'a gönderilecek dosyanın 10 MB sınırı ayrıdır. Özellikle 50 MB PNG dosyaları hazırlamadan önce reddedilmez: önce PNG, gerekirse yüksek kaliteli WebP denenir ve çözünürlük kademeli azaltılır. Şeffaflık desteklenir; WebP dönüşümü kayıplı olabilir. Tasarım çizgileri ve küçük yazılar kayıt öncesi büyük önizlemede kontrol edilmelidir.

Fotoğraf hedefi en uzun kenarda 2560 pikseldir. Tasarım canvas'ı en fazla 40 milyon piksel ve kenar başına 8192 pikseldir; kaynak görüntü 100 milyon pikseli aşarsa işlem yapılmaz. İlk decode bellek kullanımı tarayıcıya bağlıdır. En fazla yedi boyut denemesi yapılır. Hazırlama başarısızsa veya sonuç hâlâ 10 MB üzerindeyse dosya forma eklenmez; önceki geçerli seçim korunur. Yeni SQL gerekmez; Storage/RPC sınırları değiştirilmedi.

Bu bölüm, yukarıdaki ilk sürümün 10 MB kaynak sınırı ve PNG/çözünürlüğün her zaman korunması açıklamalarının yerini alır. Bilgisayardaki özgün dosya değişmez.

## Medya işlem göstergesi

Formun altındaki sabit işlem alanı görsel hazırlama, dosya yükleme, proje kaydı ve kayıt doğrulama aşamalarını gösterir. Hazırlama/yüklemede dosya adı ve tamamlanan dosya sayısı bulunur; çubuk bayt yüzdesini veya kalan süreyi temsil etmez. Bir dosya tamamlanana kadar sayaç değişmez, bekleme simgesi görünür. Hata durumunda gösterge kapanır ve mevcut hata mesajı gösterilir. Hareket azaltma tercihi olan tarayıcılarda simge animasyonu kapalıdır. SQL değişikliği gerekmez.

## YouTube ve Storage video seçenekleri

Proje formundaki video kaynağı yeni projelerde YouTube olarak başlar; dosya yükleme seçeneği MP4/WebM ve mevcut 100 MB sınırıyla korunur. YouTube bağlantısı isteğe bağlıdır. Standart watch, youtu.be, shorts, live ve embed video adreslerinden yalnızca doğrulanmış 11 karakterlik video kimliği saklanır. Bu biçim doğrulaması videonun yayında olduğunu veya yerleştirmeye izin verildiğini garanti etmez. Videoyu kanala yükleme kullanıcı tarafından YouTube üzerinden yapılır; API anahtarı gerekmez.

Kaynak seçimi formdaki diğer taslağı hemen silmez; kayıt sözleşmesi yalnızca etkin kaynağı gönderir. YouTube seçildiğinde eski Storage videosu proje kaydında çıkarılır ve mevcut temizleme kuyruğuyla silinir. Dosya kaynağı seçildiğinde YouTube kimliği temizlenir. YouTube'daki asıl video uygulamadan silinmez. YouTube bağlantısını boşaltıp kaydetmek projeden YouTube videosunu kaldırır.

Ziyaretçi sayfasında YouTube oynatıcısı ancak kapak düğmesine tıklanınca `youtube-nocookie.com` üzerinden yüklenir. Video çalışmazsa YouTube'da aç bağlantısı bulunur. Dosya videosu yerel oynatıcıda `preload="none"` kullanır. Ana sayfa açılış videosu bu çalışmanın kapsamına alınmadı.

**Kurulum:** Önceki galeri kurulumu yapılmış mevcut Supabase projesinde [video-kaynaklari-kurulumu.sql](../supabase/video-kaynaklari-kurulumu.sql) dosyasının tamamını SQL Editor'da çalıştırın. Yeni kurulumlarda portföy ve admin migration'larından sonra bu dosyayı uygulayın. Uygulama artık `save_portfolio_project_video` çağırır; SQL uygulanana kadar kayıt/güncelleme yapılamaz, mevcut katalog okuması devam eder. Canlı SQL bu ortamdan çalıştırılmadı.

## Proje detayının açılış içeriği

Medya bölümündeki “Proje açılışında göster” seçimi ana fotoğraf veya YouTube videosudur. Varsayılan fotoğraftır. Ana fotoğraf iki durumda da zorunludur ve liste kartlarında kapak olarak kullanılır. YouTube açılışı seçilirse geçerli YouTube kaynağı/bağlantısı gerekir; bağlantıyı kaldırırken veya Storage'a geçerken açılış seçimini fotoğrafa döndürmek gerekir. Bu kural hem formda hem kayıt fonksiyonunda doğrulanır.

Video açılışında üst alanda doğrudan YouTube oynatıcısı yüklenir; otomatik oynatma veya ses başlatılmaz. Aynı video aşağıda ikinci kez gösterilmez. Fotoğraf seçildiğinde mevcut üst görsel ve ayrı video bölümü korunur. Bu seçimde oynatıcı, önceki kapak tıklamasını beklemeden YouTube'a bağlanır.

Canlı kurulum için [proje-acilis-medya-kurulumu.sql](../supabase/proje-acilis-medya-kurulumu.sql) dosyasının tamamını Supabase SQL Editor'da çalıştırın. Mevcut projeler varsayılan fotoğrafla devam eder. Uygulama `save_portfolio_project_presentation` fonksiyonunu kullanır; SQL uygulanmadan kayıt/güncelleme yapılamaz. Canlı şema bu ortamdan değiştirilmedi.
