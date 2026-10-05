import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'EN' | 'HI';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<string, { EN: string; HI: string }> = {
    // Agency
    'Agency Name': { EN: 'Agency Name', HI: 'एजेंसी का नाम' },
    'Dashboard': { EN: 'Dashboard', HI: 'डैशबोर्ड' },

    // Modules
    'Godown Stock': { EN: 'Godown Stock', HI: 'गोदाम स्टॉक' },
    "Staff's A/c": { EN: "Staff's A/c", HI: 'कर्मचारी खाता' },
    'Trip Log': { EN: 'Trip Log', HI: 'ट्रिप लॉग' },
    "Hawker's A/c": { EN: "Hawker's A/c", HI: 'हॉकर खाता' },
    'Cash/Balance A/c': { EN: 'Cash/Balance A/c', HI: 'रोकड़ / शेष खाता' },
    'Empty/Money Bal.': { EN: 'Empty/Money Bal.', HI: 'खाली / पैसा शेष' },
    'Summary': { EN: 'Summary', HI: 'सारांश' },
    'Reports & Exports': { EN: 'Reports & Exports', HI: 'रिपोर्ट और निर्यात' },
    'Staff & Vehicles': { EN: 'Staff & Vehicles', HI: 'कर्मचारी और वाहन' },
    'Add/Remove Employee': { EN: 'Add/Remove Employee', HI: 'कर्मचारी जोड़ें/हटाएं' },

    // Godown Actions
    'Mod Godown Schema': { EN: 'Mod Godown Schema', HI: 'गोदाम विवरण सम्पादन' },
    'Modify identity & core properties': { EN: 'Modify identity & core properties', HI: 'पहचान और कोर संपत्ति संशोधित करें' },
    'Cylinder': { EN: 'Cylinder', HI: 'सिलेंडर' },
    'Normal Item': { EN: 'Normal Item', HI: 'सामान्य आइटम' },
    'Identity Name': { EN: 'Identity Name', HI: 'आइटम का नाम' },
    'Asset Weight/Size': { EN: 'Asset Weight/Size', HI: 'वजन/आकार' },
    'Patch Schema': { EN: 'Patch Schema', HI: 'परिवर्तन सहेजें' },
    'Abort': { EN: 'Abort', HI: 'रद्द करें' },

    'Eradicate Schema': { EN: 'Eradicate Schema', HI: 'आइटम हटाएँ' },
    'Nuclear Warning': { EN: 'This will permanently rip out this item and all its historical godown snapshots from the database. This nuclear action cannot be cleanly undone.', HI: 'यह इस आइटम और इसके सभी ऐतिहासिक गोदाम स्नैपशॉट को डेटाबेस से स्थायी रूप से हटा देगा। इस कार्रवाई को वापस नहीं लिया जा सकता है।' },
    'Retreat': { EN: 'Retreat', HI: 'रद्द करें' },
    'Nuke It': { EN: 'Nuke It', HI: 'हटा दें' },

    // Common
    'Access Granted': { EN: 'Access Granted', HI: 'एक्सेस प्रदान किया गया' },
    'Restricted': { EN: 'Restricted', HI: 'प्रतिबंधित' },
};

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'EN',
            setLanguage: (lang) => set({ language: lang }),
            t: (key) => translations[key]?.[get().language] || key,
        }),
        {
            name: 'gams-language-storage',
        }
    )
);
