// Yasar's Reel Studio — the settings screen. Its own text follows the creator's language: Arabic (written in neutral
// White Arabic, so every dialect reads it comfortably) or English. The samples on each page use the chosen dialect.
const token = new URLSearchParams(location.search).get('token');
const content = document.querySelector('#content');
const actions = document.querySelector('#actions');
const errorBox = document.querySelector('#error');

const STRINGS = {
  ar: {
    steps: ['اللغة', 'بياناتك', 'ستايل الفيديو', 'الكلام على الفيديو', 'الخطوط والأرقام', 'وصف المنشور', 'الألوان والنهاية', 'راجع واحفظ'],
    studioOf: name => `استوديو ${name}`, setupTitle: 'إعداد الاستوديو', local: 'على جهازك فقط',
    stepOf: (n, total) => `الخطوة ${n.toLocaleString('ar')} من ${total.toLocaleString('ar')}`,
    ready: 'جاهز لاختياراتك', unsaved: 'هناك اختيارات لم تُحفظ بعد', saved: 'إعداداتك محفوظة ✓', saving: 'جارٍ الحفظ…',
    genericError: 'حدثت مشكلة. حاول مرة أخرى.',
    auto: 'تلقائي حسب كل فيديو', fixed: 'أختار بنفسي وأثبّت', modeGroup: 'تلقائي أو ثابت', paletteGroup: 'اختيار الألوان',
    back: 'رجوع', next: 'التالي', saveStart: 'احفظ وابدأ', saveMine: 'احفظ إعداداتي', edit: 'تعديل', minutes: 'حوالي دقيقتين لضبط ذوقك',
    langTitle: 'بأي لغة نشتغل؟', langLead: 'المساعد يتكلم معك بها، ووصف المنشور يُكتب بها، والتفريغ الصوتي يسمع لها. تقدر تغيّرها لفيديو واحد متى شئت.',
    langNote: 'شاشة الإعدادات تظهر بالعربية لكل اللهجات، وبالإنجليزية عند اختيار English.',
    welcomeNew: "أهلًا بك في Yasar's Reel Studio.", welcomeBack: 'أهلًا من جديد. اضبط أسلوبك.',
    welcomeLead: 'اضبط ذوقك مرة واحدة، والمساعد يستخدمه في فيديوهاتك القادمة. ثبّت أي اختيار أو اتركه تلقائيًا حسب المحتوى.',
    introStrong: 'اختياراتك هي نقطة البداية.', introBody: 'تريد شيئًا مختلفًا لفيديو واحد؟ اطلبه من المساعد، وتبقى إعداداتك الأساسية كما هي.',
    nameLabel: 'اسمك أو اسم البراند', nameHint: 'الاسم الذي يظهر في كروت الفيديو.',
    handleLabel: 'حسابك على المنصات (اختياري)', handleHint: 'مثل @yourname. اتركه فارغًا إن لم تحتج كارت متابعة.',
    platformsTitle: 'أين تنشر؟', platformsNote: 'ستحصل على وصف منشور منفصل لكل منصة تختارها.',
    styleTitle: 'كيف تحب أن تبدو فيديوهاتك؟', styleLead: 'اختر شكلًا يعجبك، أو اترك الاستوديو يرشّح المناسب لفكرة كل فيديو.',
    styleArtNote: 'هذه رسوم توضيحية للستايلات. المونتاج النهائي يُصمَّم على محتوى فيديوك.',
    styleAutoNote: 'الاختيار التلقائي يبدأ بالستايلين الأساسيين، ويضيف الستايلات الأخرى عندما تناسبها مشاهد فيديوك.',
    styleTag: 'فكرة تستحق المشاهدة', receiptsLine: 'الدليل في التفاصيل', deckLine: '١. ابدأ بالفكرة',
    looksTitle: 'تأثير اختياري على الفيديو كله', looksLine: 'فكرة واضحة',
    looksNote: 'هذا شكل توضيحي. تختار التأثير لفيديو واحد من تبويب «المظهر» في المحرر أو بطلبك من المساعد، ولا يُحفظ ضمن إعداداتك. الكابشن يبقى فوق التأثير وواضحًا.',
    captionsTitle: 'الكلام الذي يظهر مع صوتك.', captionsLead: 'شكل الكلام على الفيديو وترتيبه. الكلام المسجَّل نفسه يبقى كما قلته.',
    groupingTitle: 'كم كلمة تظهر معًا؟', presentationTitle: 'وما شكلها؟', captionsGroup: 'اختيارات الكابشن',
    captionSample: 'مثال توضيحي للكابشن', captionNote: 'مثال توضيحي بلغتك. التوقيت يُضبط على صوتك، والاختيار التلقائي يتغيّر حسب الفيديو.',
    skinTitle: 'سكين الكابشن', skinBasic: 'الشكل الأساسي', skinNote: 'السكين يحدد رسم الكابشن بدل الشكل الأساسي. «الشكل الأساسي» يرجع إلى اختيارك أعلاه.',
    fontsTitle: 'اختر الخط الذي يشبهك.', fontsLead: 'كل هذه الخطوط تدعم العربية وتُنزَّل مع الاستوديو. اختيارك يُطبَّق على عناوين الفيديو والكابشن.',
    fontReady: 'معاينة بالخط الحقيقي على جهازك', fontWaiting: 'اختره الآن، وتظهر المعاينة بعد تنزيل الخطوط.', fontPending: 'الخط قيد التجهيز',
    fontsNote: 'التلقائي يختار خطًا مناسبًا للستايل. إذا ثبّتَّ خطًا يبقى الأساس لكل فيديو.',
    digitsTitle: 'شكل الأرقام على الشاشة', digitsGroup: 'شكل الأرقام',
    digitsNote: 'هذا الاختيار يغيّر شكل الأرقام على الشاشة وفي الكابشن أيضًا. «كما هو» يترك كل مشهد كما كان.',
    writingTitle: 'وكيف يُكتب وصف المنشور؟', writingLead: 'هذا هو النص الذي يُنشر تحت الفيديو على المنصات التي اخترتها. اختر طريقتك، أو اتركها حسب فكرة كل فيديو.',
    writingGroup: 'طريقة وصف المنشور', writingTag: 'مثال للتوضيح', writingNote: 'المساعد يكتب الوصف من محتوى الفيديو الحقيقي وبلغتك، مع كلمة التعليق التي تختارها.',
    endingTitle: 'ألوانك، وآخر انطباع.', endingLead: 'استخدم ألوانك في الجرافيك، أو اترك كل ستايل بألوانه. وحدّد كيف ينتهي الفيديو.',
    primary: 'اللون الأساسي', accent: 'لون التمييز', moreColours: 'لون الخلفية والكلام (اختياري)', background: 'الخلفية', textColour: 'الكلام',
    colourCode: label => `كود ${label}`, colourNote: 'اترك الكود فارغًا ليختار الاستوديو لونًا مناسبًا.',
    ctaLabel: 'كلمة التعليق (اختياري)', ctaHint: 'مثل «مونتاج». تقدر تغيّرها لفيديو واحد.',
    signoffLabel: 'جملة الختام التي تقولها (اختياري)', signoffHint: 'إن كانت لديك جملة ختام ثابتة، اكتبها كما تقولها.',
    followCard: 'كارت متابعة بحسابي في النهاية', followUses: handle => `الكارت سيستخدم ${handle}.`, followNeeds: 'لكارت المتابعة، أضف حسابك في خطوة «بياناتك».',
    reviewTitle: 'هذا أسلوبك. جاهز نبدأ؟', reviewLead: 'راجع اختياراتك. ستُحفظ للفيديوهات القادمة، وأي اختيار تلقائي يحدده المساعد حسب المحتوى.',
    sumLanguage: 'اللغة', sumIdentity: 'بياناتك', noName: 'لم تكتب الاسم بعد', sumStyle: 'ستايل الفيديو', sumGrouping: 'ترتيب الكابشن', sumPresentation: 'شكل الكابشن',
    sumSkin: 'سكين الكابشن', sumFont: 'الخط', sumDigits: 'الأرقام', sumWriting: 'وصف المنشور', sumColours: 'الألوان', sumEnding: 'النهاية',
    autoEach: 'تلقائي لكل فيديو', autoStyle: 'تلقائي حسب الستايل', autoContent: 'تلقائي حسب المحتوى', styleColours: 'ألوان الستايل', brandColours: 'ألوان البراند الخاصة بك',
    withFollow: 'كارت متابعة', noFollow: 'بدون كارت متابعة', ctaWord: word => `كلمة: ${word}`, noCta: 'بدون كلمة تعليق ثابتة',
    saveNote: 'تريد التعديل لاحقًا؟ اطلب من المساعد «افتح إعداداتي». ولفيديو واحد فقط: «هذا الفيديو بستايل الكولاج» مثلًا.',
    savedTitle: 'تم حفظ إعداداتك.', savedLead: 'المساعد يعرف ذوقك الآن. ارجع إلى المحادثة عندما ينتهي التجهيز ليكمل فحص الاستوديو معك.',
    reviewMine: 'راجع إعداداتي', continueSetup: 'أكمل تجهيز الاستوديو', checking: 'نراجع التجهيز…',
    setupDone: 'اكتمل التجهيز ✓', setupRunning: 'نجهّز الاستوديو على جهازك', setupNeeds: 'التجهيز يحتاج إلى إكمال', stagesDone: 'مراحل التجهيز المكتملة',
    doneLine: 'ارجع إلى المساعد ليفحص النظام. الحفظ والتجهيز اكتملا.',
    runningLine: (done, total) => `${done.toLocaleString('ar')} من ${total.toLocaleString('ar')} مراحل اكتملت. أول تجهيز قد يستغرق ١٥–٣٠ دقيقة حسب سرعة الإنترنت.`,
    stuckLine: 'اطلب من المساعد «أكمل تجهيز الاستوديو» إذا واجهت مشكلة.',
    stageDone: 'اكتملت', stageActive: 'تعمل الآن', stageWaiting: 'في الانتظار',
    failedAt: (stage, error) => `توقف التجهيز عند «${stage}»: ${error}. إعداداتك محفوظة، حاول الإكمال أو ارجع إلى المساعد.`, start: 'البداية', stepProblem: 'هناك مشكلة في هذه الخطوة',
    incomplete: 'بعض المراحل لم تُجهَّز بعد. اضغط «أكمل تجهيز الاستوديو» لإكمالها.',
    loadFailed: 'تعذّر فتح إعداداتك.', loadFailedLead: 'إعداداتك محفوظة. اطلب من المساعد مراجعة المشكلة، أو أعد فتح الشاشة.', retry: 'حاول مرة أخرى',
    needName: 'اكتب اسمك أو اسم البراند أولًا.', badHandle: 'الحساب يبدأ بـ @ وبعده حروف إنجليزية أو أرقام أو _ أو نقطة.', needPlatform: 'اختر منصة واحدة على الأقل.',
    followNeedsHandle: 'كارت المتابعة يحتاج حسابك على المنصات.', badColour: key => `راجع اللون ${key}. اكتبه بالشكل #RRGGBB.`,
  },
  en: {
    steps: ['Language', 'About you', 'Video style', 'On-screen words', 'Fonts and numbers', 'Post description', 'Colours and ending', 'Review and save'],
    studioOf: name => `${name}'s studio`, setupTitle: 'Studio setup', local: 'Only on your computer',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    ready: 'Ready for your choices', unsaved: 'You have unsaved choices', saved: 'Your settings are saved ✓', saving: 'Saving…',
    genericError: 'Something went wrong. Try again.',
    auto: 'Automatic for each video', fixed: "I'll choose and keep it", modeGroup: 'Automatic or fixed', paletteGroup: 'Colour choice',
    back: 'Back', next: 'Next', saveStart: 'Save and start', saveMine: 'Save my settings', edit: 'Edit', minutes: 'About two minutes to set your taste',
    langTitle: 'Which language do we work in?', langLead: 'The assistant talks to you in it, post descriptions are written in it and transcription listens for it. You can switch for a single video any time.',
    langNote: 'This screen appears in Arabic for every Arabic dialect, and in English when you choose English.',
    welcomeNew: "Welcome to Yasar's Reel Studio.", welcomeBack: 'Welcome back. Tune your style.',
    welcomeLead: 'Set your taste once and the assistant uses it in every video you make next. Keep any choice fixed, or leave it automatic for each video.',
    introStrong: 'Your choices are the starting point.', introBody: 'Want something different for one video? Ask the assistant; your saved settings stay as they are.',
    nameLabel: 'Your name or brand', nameHint: 'The name shown on video cards.',
    handleLabel: 'Your social handle (optional)', handleHint: 'Like @yourname. Leave it empty if you do not need a follow card.',
    platformsTitle: 'Where do you post?', platformsNote: 'You get a separate post description for each platform you pick.',
    styleTitle: 'How should your videos look?', styleLead: 'Pick a look you like, or let the studio suggest the right one for each video.',
    styleArtNote: 'These are illustrations of the styles. The final edit is designed around your own footage.',
    styleAutoNote: 'Automatic starts with the two core styles and brings in the others when a scene in your video suits them.',
    styleTag: 'An idea worth seeing', receiptsLine: 'Proof is in the details', deckLine: '1. Start with the idea',
    looksTitle: 'Optional look for the whole video', looksLine: 'A clear idea',
    looksNote: 'An illustration only. You pick a look for one video in the editor\'s Look tab or by asking the assistant; it is never saved here. Captions always stay readable on top.',
    captionsTitle: 'The words that appear with your voice.', captionsLead: 'How on-screen words look and group. What you actually said is always kept as said.',
    groupingTitle: 'How many words at a time?', presentationTitle: 'And how do they look?', captionsGroup: 'Caption choices',
    captionSample: 'Caption example', captionNote: 'An example in your language. Timing follows your voice, and automatic changes with each video.',
    skinTitle: 'Caption skin', skinBasic: 'Basic look', skinNote: 'A skin replaces the basic caption drawing. "Basic look" returns to your choice above.',
    fontsTitle: 'Pick the font that feels like you.', fontsLead: 'Every font here supports Arabic and Latin and is downloaded with the studio. It is used for titles and captions.',
    fontReady: 'Previewed with the real font on your computer', fontWaiting: 'Pick it now; the preview appears once fonts are downloaded.', fontPending: 'Font is downloading',
    fontsNote: 'Automatic picks a font that suits the style. A fixed font becomes the base for every video.',
    digitsTitle: 'How numbers look on screen', digitsGroup: 'Number style',
    digitsNote: 'This changes numbers on screen and in captions. "As written" leaves every scene as it was.',
    writingTitle: 'How should the post description read?', writingLead: 'This is the text posted under the video on the platforms you picked. Choose your way, or let it follow each video.',
    writingGroup: 'Post description style', writingTag: 'Example', writingNote: 'The assistant writes from what the video really says, in your language, with the comment keyword you choose.',
    endingTitle: 'Your colours, and the last impression.', endingLead: 'Use your brand colours in the graphics, or keep each style\'s own. Then decide how a video ends.',
    primary: 'Primary colour', accent: 'Accent colour', moreColours: 'Background and text colours (optional)', background: 'Background', textColour: 'Text',
    colourCode: label => `${label} code`, colourNote: 'Leave a code empty and the studio picks a suitable colour.',
    ctaLabel: 'Comment keyword (optional)', ctaHint: 'Like "edit". You can change it for one video.',
    signoffLabel: 'Your spoken sign-off (optional)', signoffHint: 'If you always end with the same line, write it exactly as you say it.',
    followCard: 'End with a follow card showing my handle', followUses: handle => `The card will use ${handle}.`, followNeeds: 'For a follow card, add your handle in "About you".',
    reviewTitle: 'This is your style. Ready?', reviewLead: 'Check your choices. They are saved for your next videos; anything automatic is decided per video by the assistant.',
    sumLanguage: 'Language', sumIdentity: 'About you', noName: 'No name yet', sumStyle: 'Video style', sumGrouping: 'Caption grouping', sumPresentation: 'Caption look',
    sumSkin: 'Caption skin', sumFont: 'Font', sumDigits: 'Numbers', sumWriting: 'Post description', sumColours: 'Colours', sumEnding: 'Ending',
    autoEach: 'Automatic for each video', autoStyle: 'Automatic for the style', autoContent: 'Automatic for the content', styleColours: 'Style colours', brandColours: 'Your brand colours',
    withFollow: 'Follow card', noFollow: 'No follow card', ctaWord: word => `Keyword: ${word}`, noCta: 'No fixed comment keyword',
    saveNote: 'Want to change things later? Ask the assistant to "open my settings". For one video only: "make this one a collage", for example.',
    savedTitle: 'Your settings are saved.', savedLead: 'The assistant knows your taste now. Go back to the chat when setup finishes so it can check the studio with you.',
    reviewMine: 'Review my settings', continueSetup: 'Continue studio setup', checking: 'Checking setup…',
    setupDone: 'Setup complete ✓', setupRunning: 'Setting up the studio on your computer', setupNeeds: 'Setup needs to continue', stagesDone: 'Completed setup stages',
    doneLine: 'Go back to the assistant for a system check. Saving and setup are done.',
    runningLine: (done, total) => `${done} of ${total} stages done. The first setup can take 15–30 minutes depending on your connection.`,
    stuckLine: 'Ask the assistant to "continue studio setup" if something goes wrong.',
    stageDone: 'Done', stageActive: 'Running', stageWaiting: 'Waiting',
    failedAt: (stage, error) => `Setup stopped at "${stage}": ${error}. Your settings are saved; continue, or go back to the assistant.`, start: 'the start', stepProblem: 'this step has a problem',
    incomplete: 'Some stages are not ready yet. Press "Continue studio setup" to finish them.',
    loadFailed: 'Your settings could not open.', loadFailedLead: 'Your settings are safe. Ask the assistant to look at the problem, or open the screen again.', retry: 'Try again',
    needName: 'Write your name or brand first.', badHandle: 'A handle starts with @ followed by English letters, digits, _ or dots.', needPlatform: 'Pick at least one platform.',
    followNeedsHandle: 'A follow card needs your handle.', badColour: key => `Check the ${key} colour. Write it as #RRGGBB.`,
  },
};

const labels = {
  captionsGrouping: {compact: 'كلمات قصيرة', clauses: 'جمل هادئة', single: 'كلمة في كل مرة'},
  captionsPresentation: {pill: 'كبسولة واضحة', minimal: 'كلام بلا خلفية', 'ink-strip': 'شريط داكن'},
  captionsSkin: {'spoken-box': 'صندوق الكلمة المنطوقة', karaoke: 'كاريوكي', 'bold-outline': 'حدود عريضة', 'soft-shadow': 'ظل ناعم', 'paper-tag': 'قصاصة ورق'},
  font: {Cairo: 'Cairo', Tajawal: 'Tajawal', 'Noto Naskh Arabic': 'نسخ عربي', 'Plex Display': 'Plex Display', 'Grid Sans': 'Grid Sans', 'Noto Kufi Arabic': 'كوفي', 'Readex Pro': 'Readex', 'El Messiri': 'المسيري', Lalezar: 'لالزار', 'Aref Ruqaa': 'عارف رقعة', 'Aref Ruqaa Ink': 'عارف رقعة حبر', 'Reem Kufi': 'ريم كوفي', Amiri: 'أميري', Alexandria: 'الإسكندرية', Marhey: 'مرحي'},
  writingStyle: {short: 'مختصر ومباشر', educational: 'شرح ونقاط عملية', storytelling: 'حكاية قصيرة'},
};
const labelsEn = {
  captionsGrouping: {compact: 'Short groups', clauses: 'Calm phrases', single: 'One word at a time'},
  captionsPresentation: {pill: 'Clear pill', minimal: 'Words, no background', 'ink-strip': 'Dark strip'},
  captionsSkin: {'spoken-box': 'Spoken-word box', karaoke: 'Karaoke', 'bold-outline': 'Bold outline', 'soft-shadow': 'Soft shadow', 'paper-tag': 'Paper tag'},
  font: {'Noto Naskh Arabic': 'Naskh', 'Noto Kufi Arabic': 'Kufi', 'Readex Pro': 'Readex', 'El Messiri': 'El Messiri', 'Aref Ruqaa': 'Aref Ruqaa', 'Aref Ruqaa Ink': 'Aref Ruqaa Ink', 'Reem Kufi': 'Reem Kufi'},
  writingStyle: {short: 'Short and direct', educational: 'Explainer with steps', storytelling: 'A short story'},
};
const sampleWriting = {
  short: 'فكرتك تستحق أن تُرى.\nرتّب الكلام، ووضّح الفكرة، ودع الصورة تساعدك.',
  educational: 'كيف تجعل فكرتك أوضح؟\n• ابدأ بالنقطة التي تهم جمهورك.\n• قسّم الشرح إلى خطوات بسيطة.\n• استخدم صورة توضّح كل خطوة.',
  storytelling: 'كانت الفكرة واضحة في ذهني، لكن الفيديو كان مزدحمًا.\nعندما قسّمت الشرح، واستخدمت صورة لكل نقطة، صار الكلام أسهل في الفهم.\nكل فكرة تحتاج مساحة.',
};
const sampleWritingEn = {
  short: 'Your idea deserves to be seen.\nOrder the words, make the point clear, and let the picture help.',
  educational: 'How do you make an idea clearer?\n• Start with the point your audience cares about.\n• Split the explanation into simple steps.\n• Show one picture for each step.',
  storytelling: 'The idea was clear in my head, but the video was crowded.\nOnce I split it up and gave each point its own picture, it finally made sense.\nEvery idea needs room.',
};
// The three digit states. tests/settings-arabic.test.mjs pins these strings to DIGIT_LABELS_AR in preference-options.ts.
const digitLabels = {auto: 'كما هو', latin: '1 2 3', 'arabic-indic': '١ ٢ ٣'};
const digitSamples = {auto: 'كل مشهد كما كان', latin: '3 خطوات · 2025', 'arabic-indic': '٣ خطوات · ٢٠٢٥'};
const digitLabelsEn = {auto: 'As written', latin: '1 2 3', 'arabic-indic': '١ ٢ ٣'};
const digitSamplesEn = {auto: 'Every scene as it was', latin: '3 steps · 2025', 'arabic-indic': '٣ steps · ٢٠٢٥'};
const PLATFORM_LABELS = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube Shorts']];
const TOTAL_STEPS = 8;
let catalog, draft, etag, existing = false, dirty = false, busy = false, step = 0, setup, pollTimer;

const lang = () => catalog?.languages?.find(item => item.code === draft?.language) ?? {code: 'ar-JO', ui: 'ar', dir: 'rtl', sample: 'فكرتك بتستاهل تنشاف', label: 'أردني', labelEn: 'Jordanian Arabic'};
const en = () => lang().ui === 'en';
const t = key => (en() ? STRINGS.en : STRINGS.ar)[key];

function el(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text !== null && text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}
function button(text, className, click, attrs = {}) {
  const node = el('button', text, {type: 'button', class: className, ...attrs});
  node.addEventListener('click', click); return node;
}
function showError(message) {errorBox.textContent = message; errorBox.hidden = !message;}
function changed() {dirty = true; document.querySelector('#save-state').textContent = t('unsaved');}
async function api(route, {method = 'GET', body} = {}) {
  const response = await fetch(`/api/${route}`, {method, headers: {'x-reel-studio-token': token, ...(draft && en() ? {'x-reel-studio-ui': 'en'} : {}), ...(body ? {'content-type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error ?? t('genericError'));
  return data;
}
const title = (heading, description) => {content.append(el('h2', heading, {id: 'page-title', tabindex: '-1'}), el('p', description, {class: 'lead'}));};
const note = text => el('p', text, {class: 'note'});
const styleInfo = id => (en() ? catalog.stylesEn?.[id] : null) ?? catalog.styles[id];
const prefLabel = (key, value) => key === 'style' ? styleInfo(value)?.label : (en() ? labelsEn[key]?.[value] : null) ?? labels[key]?.[value] ?? value;
const sampleWords = () => lang().sample;
const sampleFor = sample => el('span', sample, {dir: lang().dir, lang: lang().code});

function setPref(key, mode, value, focusId) {
  draft.preferences[key] = {mode, value: mode === 'auto' ? null : value}; changed(); render();
  if (focusId) document.getElementById(focusId)?.focus();
}
function modeChoice(key) {
  const box = el('div', null, {class: 'mode', role: 'group', 'aria-label': key === 'palette' ? t('paletteGroup') : t('modeGroup')});
  for (const [mode, text] of [['auto', t('auto')], ['fixed', t('fixed')]]) {
    const id = `mode-${key}-${mode}`;
    const label = el('label', null, {for: id});
    const input = el('input', null, {id, type: 'radio', name: `mode-${key}`, value: mode});
    input.checked = draft.preferences[key].mode === mode;
    input.addEventListener('change', () => setPref(key, mode, draft.preferences[key].value ?? catalog.choices[key][0], id));
    label.append(input, el('span', text)); box.append(label);
  }
  return box;
}
function pills(key) {
  const row = el('div', null, {class: 'radio-options', role: 'group', 'aria-label': key === 'writingStyle' ? t('writingGroup') : t('captionsGroup')});
  for (const value of catalog.choices[key]) {
    const id = `choice-${key}-${value}`;
    row.append(button(prefLabel(key, value), 'option-pill', () => setPref(key, 'fixed', value, id), {id, 'aria-pressed': String(draft.preferences[key].mode === 'fixed' && draft.preferences[key].value === value)}));
  }
  return row;
}
function setDigits(value, focusId) {
  if (value === 'auto') delete draft.preferences.digits; else draft.preferences.digits = {mode: 'fixed', value};
  changed(); render(); document.getElementById(focusId)?.focus();
}
function digitsSection() {
  const current = draft.preferences.digits ?? {mode: 'auto', value: null};
  const state = current.mode === 'fixed' ? current.value : 'auto';
  const row = el('div', null, {class: 'radio-options', role: 'group', 'aria-label': t('digitsGroup')});
  for (const value of ['auto', ...catalog.choices.digits]) {
    const id = `digits-${value}`;
    row.append(button((en() ? digitLabelsEn : digitLabels)[value], 'option-pill', () => setDigits(value, id), {id, 'aria-pressed': String(state === value)}));
  }
  const sample = el('p', (en() ? digitSamplesEn : digitSamples)[state], {class: 'sample-line'});
  sample.style.fontFamily = `"${draft.preferences.font.value ?? 'Readex Pro'}"`;
  return [el('h3', t('digitsTitle'), {class: 'section-title'}), row, sample, note(t('digitsNote'))];
}
function setCaptionSkin(value, focusId) {
  if (value === 'auto') delete draft.preferences.captionsSkin; else draft.preferences.captionsSkin = {mode: 'fixed', value};
  changed(); render(); document.getElementById(focusId)?.focus();
}
function captionSkinsSection() {
  const current = draft.preferences.captionsSkin;
  const state = current?.mode === 'fixed' ? current.value : 'auto';
  const row = el('div', null, {class: 'radio-options', role: 'group', 'aria-label': t('skinTitle')});
  for (const value of ['auto', ...catalog.choices.captionsSkin]) {
    const id = `caption-skin-${value}`;
    row.append(button(value === 'auto' ? t('skinBasic') : prefLabel('captionsSkin', value), 'option-pill', () => setCaptionSkin(value, id), {id, 'aria-pressed': String(state === value)}));
  }
  return [el('h3', t('skinTitle'), {class: 'section-title'}), row, note(t('skinNote'))];
}
function field(labelText, key, value, callback, {hint, max = 80, dir} = {}) {
  const label = el('label', null, {class: 'field', for: key}); label.append(el('span', labelText, {class: 'field-name'}));
  const input = el('input', null, {id: key, type: 'text', maxlength: max, ...(dir ? {dir} : {})}); input.value = value ?? '';
  input.addEventListener('input', () => {callback(input.value.trim()); changed();}); label.append(input);
  if (hint) label.append(el('span', hint, {class: 'hint'}));
  return label;
}
function validate({identityOnly = false} = {}) {
  if (!draft.name.trim()) return t('needName');
  if (draft.handle && !/^@[A-Za-z0-9_.]{1,30}$/.test(draft.handle)) return t('badHandle');
  if (!draft.platforms.length) return t('needPlatform');
  if (identityOnly) return null;
  if (draft.ending.followCard && !draft.handle) return t('followNeedsHandle');
  for (const [key, value] of Object.entries(draft.brand)) if (value !== null && !/^#[0-9a-f]{6}$/i.test(value)) return t('badColour')(key);
  return null;
}
function go(index) {
  if (busy) return;
  if (index > step && step <= 1 && index > 1 && validate({identityOnly: true})) {step = 1; render(); showError(validate({identityOnly: true})); return;}
  step = index; showError(''); render(); document.querySelector('#page-title')?.focus(); window.scrollTo({top: 0});
}

// Step 1: the language. Each card shows the same caption line as that dialect would say it.
function setLanguage(code) {
  const wasEnglish = en();
  draft.language = code; changed();
  // English creators usually want Latin digits; the choice stays editable on the fonts step.
  if (code === 'en' && !wasEnglish && draft.preferences.digits?.mode !== 'fixed') draft.preferences.digits = {mode: 'fixed', value: 'latin'};
  render(); document.getElementById(`language-${code}`)?.focus();
}
function languagePage() {
  title(t('langTitle'), t('langLead'));
  const grid = el('div', null, {class: 'language-grid', role: 'radiogroup', 'aria-label': t('langTitle')});
  for (const item of catalog.languages) {
    const selected = draft.language === item.code;
    const card = button('', 'language-card', () => setLanguage(item.code), {id: `language-${item.code}`, role: 'radio', 'aria-checked': String(selected), lang: item.code});
    const head = el('span', null, {class: 'language-head'});
    head.append(el('strong', item.label), el('small', item.ui === 'en' || en() ? item.labelEn : item.region, {dir: 'auto'}));
    const frame = el('span', null, {class: 'language-frame', 'aria-hidden': 'true'});
    frame.append(el('span', item.sample, {class: 'language-caption', dir: item.dir}));
    card.append(frame, head); grid.append(card);
  }
  content.append(grid, note(t('langNote')));
}
function identity() {
  title(existing ? t('welcomeBack') : t('welcomeNew'), t('welcomeLead'));
  const visual = el('div', null, {class: 'intro-visual'});
  const reel = el('div', null, {class: 'mini-reel', 'aria-hidden': 'true'}); reel.append(sampleFor(sampleWords()));
  const copy = el('div'); copy.append(el('strong', t('introStrong')), el('p', t('introBody'))); visual.append(reel, copy); content.append(visual);
  const grid = el('div', null, {class: 'form-grid'});
  grid.append(field(t('nameLabel'), 'name', draft.name, value => draft.name = value, {hint: t('nameHint')}),
    field(t('handleLabel'), 'handle', draft.handle, value => {draft.handle = value || null;}, {max: 31, dir: 'ltr', hint: t('handleHint')}));
  const platformBox = el('div', null, {class: 'wide'}); platformBox.append(el('h3', t('platformsTitle'), {class: 'section-title'}));
  const platforms = el('div', null, {class: 'platforms'});
  for (const [id, labelText] of PLATFORM_LABELS) {
    const label = el('label', null, {class: 'platform'}); const input = el('input', null, {type: 'checkbox', id}); input.checked = draft.platforms.includes(id);
    input.addEventListener('change', () => {draft.platforms = input.checked ? [...draft.platforms, id] : draft.platforms.filter(p => p !== id); changed();}); label.append(input, el('span', labelText, {dir: 'ltr'})); platforms.append(label);
  }
  platformBox.append(platforms, note(t('platformsNote'))); grid.append(platformBox); content.append(grid);
}
function stylePage() {
  title(t('styleTitle'), t('styleLead'));
  content.append(modeChoice('style'));
  const grid = el('div', null, {class: 'choice-grid'});
  for (const id of catalog.choices.style) {
    const selected = draft.preferences.style.mode === 'fixed' && draft.preferences.style.value === id;
    const card = button('', 'choice-card', () => setPref('style', 'fixed', id, `style-${id}`), {id: `style-${id}`, 'aria-pressed': String(selected)});
    const art = el('div', null, {class: `illustration ${id}`, 'aria-hidden': 'true'});
    art.append(el('span', t('styleTag')), el('b', id === 'calligraphic-receipts' ? t('receiptsLine') : id === 'section-deck' ? t('deckLine') : sampleWords(), {dir: 'auto'}));
    const bars = el('div', null, {class: 'bars'}); for (let i = 0; i < 3; i++) bars.append(el('i')); art.append(bars);
    const copy = el('div', null, {class: 'card-copy'}); copy.append(el('strong', styleInfo(id).label), el('small', styleInfo(id).description)); card.append(art, copy);
    if (selected) card.append(el('span', '✓', {class: 'selected', 'aria-hidden': 'true'})); grid.append(card);
  }
  content.append(grid, el('p', t('styleArtNote'), {class: 'sample-note'}), note(t('styleAutoNote')));
  content.append(looksPreview());
}
// Four whole-video looks, drawn with CSS only. They are illustrations: a look is chosen for one video (editor tab «المظهر» or a request to the assistant) and is never saved here.
const lookCards = {
  ar: [
    ['riso', 'طباعة ريزو', 'حبران وحبيبات وورق دافئ، كأن الفيديو مطبوع.'],
    ['blueprint', 'مخطط هندسي', 'ورق أزرق وخطوط بيضاء وشبكة، كأنه رسم تقني.'],
    ['film', 'حبيبات فيلم', 'حبيبات خفيفة تتحرك وتعتيم لطيف على الأطراف، كأنه شريط سينمائي.'],
    ['paper', 'ورق مطبوع', 'ملمس ورق دافئ فوق الصورة، كأن الفيديو مطبوع على ورقة.'],
  ],
  en: [
    ['riso', 'Riso print', 'Two inks, grain and warm paper, as if the video were printed.'],
    ['blueprint', 'Blueprint', 'Blue paper, white lines and a grid, like a technical drawing.'],
    ['film', 'Film grain', 'Light moving grain and a soft vignette, like a film strip.'],
    ['paper', 'Printed paper', 'A warm paper texture over the picture, as if printed on a page.'],
  ],
};
function looksPreview() {
  const box = el('div', null, {class: 'look-previews'});
  box.append(el('h3', t('looksTitle'), {class: 'section-title'}));
  const row = el('div', null, {class: 'look-grid'});
  for (const [id, label, description] of lookCards[en() ? 'en' : 'ar']) {
    const card = el('div', null, {class: 'look-card'});
    const art = el('div', null, {class: `look-art ${id}`, 'aria-hidden': 'true'});
    art.append(el('b', t('looksLine')), el('i'));
    const copy = el('div', null, {class: 'card-copy'});
    copy.append(el('strong', label), el('small', description));
    card.append(art, copy); row.append(card);
  }
  box.append(row, note(t('looksNote')));
  return box;
}
function captionsPage() {
  title(t('captionsTitle'), t('captionsLead'));
  content.append(el('h3', t('groupingTitle'), {class: 'section-title'}), modeChoice('captionsGrouping'), pills('captionsGrouping'),
    el('h3', t('presentationTitle'), {class: 'section-title'}), modeChoice('captionsPresentation'), pills('captionsPresentation'));
  const sample = el('div', null, {class: 'caption-preview', 'aria-label': t('captionSample')});
  content.append(...captionSkinsSection());
  const grouping = draft.preferences.captionsGrouping.value ?? 'compact'; const presentation = draft.preferences.captionsPresentation.value ?? 'pill';
  const words = sampleWords().split(' ');
  const text = grouping === 'single' ? words[0] : grouping === 'clauses' ? sampleWords() : words.slice(0, 3).join(' ');
  const skin = draft.preferences.captionsSkin?.mode === 'fixed' ? draft.preferences.captionsSkin.value : null;
  const caption = el('span', skin ? null : text, {class: `caption-sample ${skin ?? presentation}`, dir: lang().dir});
  if (skin) text.split(' ').forEach((word, index) => {
    if (index) caption.append(document.createTextNode(' '));
    caption.append(el('span', word, {class: index === 0 ? 'spoken' : ''}));
  });
  caption.style.fontFamily = `"${draft.preferences.font.value ?? 'Readex Pro'}"`; sample.append(caption);
  content.append(sample, el('p', t('captionNote'), {class: 'sample-note'}));
}
function fontsPage() {
  title(t('fontsTitle'), t('fontsLead')); content.append(modeChoice('font'));
  const grid = el('div', null, {class: 'choice-grid font-grid'});
  for (const family of catalog.choices.font) {
    const selected = draft.preferences.font.mode === 'fixed' && draft.preferences.font.value === family;
    const id = `font-${family.replaceAll(' ', '-')}`;
    const card = button('', 'choice-card', () => setPref('font', 'fixed', family, id), {id, 'aria-pressed': String(selected)});
    const ready = catalog.readyFonts.includes(family); const sample = el('div', ready ? sampleWords() : t('fontPending'), {class: 'font-sample', dir: ready ? lang().dir : 'auto'});
    if (ready) sample.style.fontFamily = `"${family}"`;
    if (ready && family === 'Grid Sans' && !en()) sample.textContent += ' · Your idea';
    const copy = el('div', null, {class: 'card-copy'}); copy.append(el('strong', prefLabel('font', family) ?? family), el('small', ready ? t('fontReady') : t('fontWaiting'), {class: ready ? '' : 'waiting'})); card.append(sample, copy);
    if (selected) card.append(el('span', '✓', {class: 'selected', 'aria-hidden': 'true'})); grid.append(card);
  }
  content.append(grid, note(t('fontsNote')), ...digitsSection());
}
function writingPage() {
  title(t('writingTitle'), t('writingLead'));
  content.append(modeChoice('writingStyle'), pills('writingStyle'));
  const value = draft.preferences.writingStyle.value ?? 'educational';
  content.append(el('span', t('writingTag'), {class: 'tag'}), el('p', (en() ? sampleWritingEn : sampleWriting)[value], {class: 'writing-demo'}), note(t('writingNote')));
}
function colourField(key, labelText) {
  const box = el('div', null, {class: 'colour-field'}); const id = `colour-${key}`; box.append(el('label', labelText, {for: id}));
  const controls = el('div', null, {class: 'colour-controls'});
  const color = el('input', null, {type: 'color', id, 'aria-label': labelText}); color.value = draft.brand[key] ?? (key === 'text' ? '#183D3A' : '#F7F7F2');
  const hex = el('input', null, {type: 'text', dir: 'ltr', maxlength: 7, 'aria-label': t('colourCode')(labelText)}); hex.value = draft.brand[key] ?? '';
  const disabled = draft.preferences.palette.mode === 'auto'; color.disabled = disabled; hex.disabled = disabled;
  color.addEventListener('input', () => {draft.brand[key] = color.value.toUpperCase(); hex.value = draft.brand[key]; changed();});
  hex.addEventListener('input', () => {draft.brand[key] = hex.value.trim() || null; if (/^#[0-9a-f]{6}$/i.test(hex.value)) color.value = hex.value; changed();});
  controls.append(color, hex); box.append(controls); return box;
}
function endingPage() {
  title(t('endingTitle'), t('endingLead'));
  content.append(modeChoice('palette'));
  const colors = el('div', null, {class: `colour-grid${draft.preferences.palette.mode === 'auto' ? ' auto' : ''}`});
  colors.append(colourField('primary', t('primary')), colourField('accent', t('accent'))); content.append(colors);
  const extra = el('details'); extra.append(el('summary', t('moreColours')));
  const advanced = el('div', null, {class: 'colour-grid'}); advanced.append(colourField('background', t('background')), colourField('text', t('textColour'))); extra.append(advanced, note(t('colourNote'))); content.append(extra);
  const grid = el('div', null, {class: 'form-grid'});
  grid.append(field(t('ctaLabel'), 'cta', draft.ending.ctaDefault, v => draft.ending.ctaDefault = v || null, {max: 20, hint: t('ctaHint')}),
    field(t('signoffLabel'), 'signoff', draft.ending.signOff, v => draft.ending.signOff = v || null, {max: 60, hint: t('signoffHint')}));
  const check = el('label'); const checkbox = el('input', null, {type: 'checkbox', id: 'follow-card'}); checkbox.checked = draft.ending.followCard;
  checkbox.addEventListener('change', () => {draft.ending.followCard = checkbox.checked; changed();}); check.append(checkbox, el('span', t('followCard')));
  const row = el('div', null, {class: 'check-row wide'}); row.append(check); grid.append(row); content.append(grid, note(draft.handle ? t('followUses')(draft.handle) : t('followNeeds')));
}
function summaryPage() {
  title(t('reviewTitle'), t('reviewLead'));
  const grid = el('div', null, {class: 'summary'});
  const p = draft.preferences;
  for (const [label, value, target] of [
    [t('sumLanguage'), `${lang().label}${lang().ui === 'en' ? '' : ` · ${lang().labelEn}`}`, 0],
    [t('sumIdentity'), `${draft.name || t('noName')}${draft.handle ? ` · ${draft.handle}` : ''}`, 1],
    [t('sumStyle'), p.style.mode === 'auto' ? t('autoEach') : prefLabel('style', p.style.value), 2],
    [t('sumGrouping'), p.captionsGrouping.mode === 'auto' ? t('autoEach') : prefLabel('captionsGrouping', p.captionsGrouping.value), 3],
    [t('sumPresentation'), p.captionsPresentation.mode === 'auto' ? t('autoEach') : prefLabel('captionsPresentation', p.captionsPresentation.value), 3],
    [t('sumSkin'), p.captionsSkin?.mode === 'fixed' ? prefLabel('captionsSkin', p.captionsSkin.value) : t('skinBasic'), 3],
    [t('sumFont'), p.font.mode === 'auto' ? t('autoStyle') : prefLabel('font', p.font.value), 4],
    [t('sumDigits'), (en() ? digitLabelsEn : digitLabels)[p.digits?.mode === 'fixed' ? p.digits.value : 'auto'], 4],
    [t('sumWriting'), p.writingStyle.mode === 'auto' ? t('autoContent') : prefLabel('writingStyle', p.writingStyle.value), 5],
    [t('sumColours'), p.palette.mode === 'auto' ? t('styleColours') : t('brandColours'), 6],
    [t('sumEnding'), [draft.ending.followCard ? t('withFollow') : t('noFollow'), draft.ending.ctaDefault ? t('ctaWord')(draft.ending.ctaDefault) : t('noCta')].join(' · '), 6],
  ]) {
    const item = el('div', null, {class: 'summary-item'}); item.append(el('small', label), el('strong', value, {dir: 'auto'}), button(t('edit'), 'link', () => go(target))); grid.append(item);
  }
  content.append(grid, el('p', t('saveNote'), {class: 'save-note'}));
}

// The step rail is drawn as a strip of clips on an edit timeline, with a playhead on the current step.
function renderRail() {
  const names = t('steps');
  const rail = document.querySelector('#steps');
  rail.replaceChildren(...names.map((text, index) => {
    const state = index < step ? 'past' : index === step ? 'current' : 'next';
    const clip = button('', `clip ${state}`, () => go(index), {'aria-label': `${index + 1}. ${text}`, ...(step === index ? {'aria-current': 'step'} : {})});
    clip.append(el('span', String(index + 1), {class: 'clip-number', dir: 'ltr'}), el('span', text, {class: 'clip-name'}));
    return clip;
  }));
  rail.style.setProperty('--playhead', String(Math.min(step, TOTAL_STEPS - 1)));
  rail.style.setProperty('--clips', String(TOTAL_STEPS));
}
function render() {
  const info = lang();
  document.documentElement.lang = info.ui === 'en' ? 'en' : 'ar';
  document.documentElement.dir = info.ui === 'en' ? 'ltr' : 'rtl';
  document.title = info.ui === 'en' ? "Your settings — Yasar's Reel Studio" : "إعداداتك — Yasar's Reel Studio";
  content.replaceChildren(); actions.replaceChildren();
  document.querySelector('#step-number').textContent = t('stepOf')(Math.min(step + 1, TOTAL_STEPS), TOTAL_STEPS);
  document.querySelector('#user-label').textContent = draft.name ? t('studioOf')(draft.name) : t('setupTitle');
  document.querySelector('#local-label').textContent = t('local');
  renderRail();
  if (step === TOTAL_STEPS) {successPage(); return;}
  [languagePage, identity, stylePage, captionsPage, fontsPage, writingPage, endingPage, summaryPage][step]();
  const back = step > 0 ? button(t('back'), 'secondary', () => go(step - 1)) : el('span', t('minutes'), {class: 'actions-note'});
  const last = step === TOTAL_STEPS - 1;
  const next = last ? button(busy ? t('saving') : existing ? t('saveMine') : t('saveStart'), 'primary', save) : button(t('next'), 'primary', () => go(step + 1));
  next.disabled = busy; actions.append(back, next);
}
async function save() {
  const error = validate(); if (error) {showError(error); return;}
  busy = true; showError(''); render();
  try {
    const saved = await api('profile', {method: 'PUT', body: {profile: draft, etag}});
    const wasNew = !existing; draft = saved.profile; etag = saved.etag; existing = true; dirty = false;
    draft.preferences.digits ??= {mode: 'auto', value: null};
    document.querySelector('#save-state').textContent = t('saved');
    step = TOTAL_STEPS; busy = false; render();
    if (wasNew) await beginSetup(); else await refreshStatus();
  } catch (error) {busy = false; showError(error.message); render();}
}
function successPage() {
  content.append(el('div', '✓', {class: 'success-icon', 'aria-hidden': 'true'}));
  title(t('savedTitle'), t('savedLead'));
  const region = el('div', null, {id: 'setup-progress', 'aria-live': 'polite'}); content.append(region); renderProgress();
  actions.append(button(t('reviewMine'), 'secondary', () => go(TOTAL_STEPS - 1)));
  if (!setup || !['done', 'running'].includes(setup.status)) actions.append(button(t('continueSetup'), 'primary', beginSetup));
}
const stageLabels = {folders: ['مجلدات العمل', 'Work folders'], packages: ['مكتبات المونتاج', 'Editing libraries'], browser: ['متصفح الرندر', 'Render browser'], ffmpeg: ['أدوات الفيديو', 'Video tools'], fonts: ['الخطوط', 'Fonts'], models: ['أدوات كشف الوجه', 'Face detection'], transcription: ['التفريغ الصوتي', 'Transcription']};
function renderProgress() {
  const region = document.querySelector('#setup-progress'); if (!region) return;
  region.replaceChildren(); if (!setup) {region.append(note(t('checking'))); return;}
  const stage = id => stageLabels[id]?.[en() ? 1 : 0];
  const total = Object.keys(stageLabels).length;
  const completed = Object.values(setup.done).filter(Boolean).length;
  region.append(el('h3', setup.status === 'done' ? t('setupDone') : setup.status === 'running' ? t('setupRunning') : t('setupNeeds'), {class: 'section-title'}));
  const track = el('div', null, {class: 'progress-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': completed, 'aria-label': t('stagesDone')});
  const bar = el('div'); bar.style.inlineSize = `${completed / total * 100}%`; track.append(bar); region.append(track);
  region.append(el('p', setup.status === 'done' ? t('doneLine') : setup.status === 'running' ? t('runningLine')(completed, total) : t('stuckLine'), {class: 'status-line'}));
  const list = el('ul', null, {class: 'progress-list'});
  for (const id of Object.keys(stageLabels)) {
    const done = setup.done[id]; const active = id === setup.step && setup.status === 'running'; const item = el('li', null, {class: done ? 'done' : active ? 'active' : ''});
    item.append(el('span', done ? '✓' : active ? '◉' : '○', {class: 'stage-icon', 'aria-hidden': 'true'}), el('span', stage(id)), el('small', done ? t('stageDone') : active ? t('stageActive') : t('stageWaiting'))); list.append(item);
  }
  region.append(list);
  if (setup.status === 'failed') region.append(note(t('failedAt')(stage(setup.step) ?? t('start'), setup.error ?? t('stepProblem'))));
  else if (setup.status === 'incomplete') region.append(note(t('incomplete')));
}
async function refreshStatus() {
  try {
    const previous = setup?.status; setup = (await api('status')).setup;
    if (step === TOTAL_STEPS) {if (previous !== setup.status) render(); else renderProgress();}
    if (setup.done.fonts && catalog.readyFonts.length < catalog.choices.font.length) {
      catalog = await api('catalog'); document.querySelector('#font-styles').href = `/fonts.css?token=${token}&v=${Date.now()}`;
      if (step === 4) render();
    }
  } catch (error) {showError(error.message);}
}
async function beginSetup() {
  if (busy) return; busy = true; showError('');
  for (const b of actions.querySelectorAll('button')) b.disabled = true;
  try {setup = (await api('setup', {method: 'POST', body: {}})).setup;}
  catch (error) {showError(error.message);}
  finally {busy = false; render();}
}
async function load() {
  try {
    const [options, state, progress] = await Promise.all([api('catalog'), api('profile'), api('status')]);
    catalog = options; draft = state.profile ?? structuredClone(catalog.defaults); etag = state.etag; existing = state.profile !== null; setup = progress.setup;
    draft.preferences.digits ??= {mode: 'auto', value: null};
    document.querySelector('#edition').textContent = catalog.edition ? `v${catalog.edition}` : '';
    document.querySelector('#save-state').textContent = state.notices?.length ? state.notices.join(' ') : existing ? t('saved') : t('ready');
    step = existing ? 1 : 0;
    render(); pollTimer = setInterval(refreshStatus, 3000);
  } catch (error) {
    content.replaceChildren(); title(STRINGS.ar.loadFailed, `${STRINGS.ar.loadFailedLead} — ${STRINGS.en.loadFailedLead}`); showError(error.message);
    actions.replaceChildren(button(STRINGS.ar.retry, 'primary', load));
  }
}
window.addEventListener('beforeunload', event => {if (dirty) {event.preventDefault(); event.returnValue = '';}});
window.addEventListener('pagehide', () => clearInterval(pollTimer));
load();
