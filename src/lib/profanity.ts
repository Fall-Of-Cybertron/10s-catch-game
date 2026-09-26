export const BANNED_WORDS = [
  "amk", "aq", "sik", "siktir", "orospu", "pic", "piç", "yarrak", 
  "amcik", "amcık", "göt", "got", "yarak", "kahpe", "kaltak", "pezevenk",
  "ibne", "puşt", "yavşak", "yavsak", "sg", "oc", "oç"
];

export function isProfane(text: string): boolean {
  // Boşlukları ve özel karakterleri silerek bitişik yazılanları da yakalayalım
  const normalized = text.toLowerCase().replace(/[^a-zçğıöşü]/g, '');
  
  // Kelimenin içinde yasaklı kök geçiyor mu kontrol et
  return BANNED_WORDS.some(word => normalized.includes(word));
}
