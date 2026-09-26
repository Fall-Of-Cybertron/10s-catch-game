export const BANNED_WORDS = [
  "amk", "aq", "a.q", "a.q.", "amq", "sik", "s1k", "s!k", "siktir", "s.ktir", 
  "orospu", "or0spu", "0rospu", "pic", "piç", "p1c", "yarrak", "yarak", "yarrk",
  "amcik", "amcık", "amck", "göt", "got", "g.t", "g0t", "kahpe", "kaltak", 
  "pezevenk", "pzv", "ibne", "1bne", "puşt", "pust", "yavşak", "yavsak", 
  "sg", "s.g", "oc", "oç", "o.c", "o.ç", "serefsiz", "şerefsiz", "piiç", 
  "amına", "amina", "sokam", "sokarım", "sokarim", "sokarm", "sokm", "yavş",
  "meme", "yarram", "yaram", "amkoyayim", "amkoyim", "amqoyim", "amq", "sie",
  "amkk", "a.m.k", "a m k", "a q", "s i k", "o c", "o ç", "s 1 k", "y a r",
  "g ö t", "g o t", "p i ç", "p i c", "p 1 ç", "amgg", "amg", "awq", "aw",
  "dalyarak", "dalyarak", "taşşak", "tassak", "tasak", "taşa", "tasşak", 
  "daşşak", "dassak", "çük", "cuk", "yarra", "yaraa", "s2ş", "sikiş", "sikis",
  "siki", "soktuğum", "soktugum", "skrm", "skeyim", "skeym", "sikeyim", "sike",
  "s1ke", "amciga", "amcığa", "amcığını", "amcigini", "gotveren", "götveren",
  "götten", "gotten", "amdan", "amciktan", "surtuk", "sürtük", "kavat", "qavat",
  "gavat", "kancık", "kancik", "fahişe", "fahise", "zina", "gay", "lez", "porno",
  "porn", "sex", "seks", "s3x", "am biti", "ambiti", "amcık ağızlı", "amcik agizli",
  "veled", "velet", "yarrağım", "yarragim", "yarak", "yarağım", "yaragim"
];

// Çok kullanılan harf değişimleri
const REPLACEMENTS: Record<string, string> = {
  "1": "i",
  "!": "i",
  "0": "o",
  "@": "a",
  "3": "e",
  "$": "s",
  "5": "s",
  "q": "g",
  "v": "u",
  "x": "ks",
  "w": "v"
};

export function isProfane(text: string): boolean {
  if (!text) return false;
  
  // Orijinal metni tamamen küçük harfe çevir (Türkçe karakterleri koruyarak)
  let lowerText = text.toLocaleLowerCase('tr-TR');
  
  // 1. KONTROL: Direkt orijinal metinde kelime var mı? (Örn: "a.q")
  if (BANNED_WORDS.some(word => lowerText.includes(word))) return true;

  // 2. KONTROL: L33T Speak ve Sembolleri Normalleştirme
  let normalized = lowerText;
  for (const [key, value] of Object.entries(REPLACEMENTS)) {
    normalized = normalized.split(key).join(value);
  }
  
  // 3. KONTROL: Boşlukları ve noktalama işaretlerini silerek tamamen birleşik kelimeyi kontrol et
  // Sadece a-z ve Türkçe karakterler kalsın (böylece "s i k", "a.m.k" gibi şeyler yakalanır)
  const stripped = normalized.replace(/[^a-zçğıöşü]/g, '');
  
  // Yanlış pozitifleri (Scunthorpe problemi) engellemek için isimlerde çok geçen istisnalar
  const FALSE_POSITIVES = ["isik", "ışık", "asik", "aşık", "siki", "basik", "eksik", "klasik", "kısık"];
  if (FALSE_POSITIVES.some(fp => lowerText.includes(fp))) {
    // Eğer metinde "ışık" geçiyorsa, sadece boşluklu/tam kelime küfürlerini kontrol edelim, 
    // boşluksuz agresif aramayı atlayalım ki "Ali Işık" ismi "sik" var diye banlanmasın.
    const words = lowerText.split(/\s+/);
    return words.some(w => BANNED_WORDS.includes(w));
  }
  
  if (BANNED_WORDS.some(word => stripped.includes(word.replace(/[^a-zçğıöşü]/g, '')))) {
    return true;
  }

  // 4. KONTROL: Art arda tekrar eden harfleri teke düşür (Örn: "siiiiikkkkk" -> "sik")
  const deduped = stripped.replace(/(.)\1+/g, '$1');
  if (BANNED_WORDS.some(word => deduped.includes(word.replace(/[^a-zçğıöşü]/g, '').replace(/(.)\1+/g, '$1')))) {
    return true;
  }

  return false;
}
