// Directional transitions (whip, wipe, light scan) sweep the way the video reads: right to left for Arabic speech,
// left to right when the reviewed words are mostly Latin script (an English video). An explicit dir always wins.
const ARABIC_LETTER=/[\u0600-\u06FF]/, LATIN_LETTER=/[A-Za-z]/;
export const DIRECTIONAL=new Set<string>(['whip-pan','clip-wipe','light-scan']);
export function readingDirection(words: readonly {text: string}[] | undefined): 'rtl'|'ltr'{
  let arabic=0, latin=0;
  for(const word of words??[]){if(ARABIC_LETTER.test(word.text))arabic++;else if(LATIN_LETTER.test(word.text))latin++;}
  return latin>arabic?'ltr':'rtl';
}
