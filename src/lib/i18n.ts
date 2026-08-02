import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      hero: {
        eyebrow: 'Offline-first freezer tracker',
        title: 'Know what is in the freezer before you cook or shop.',
        subtitle:
          'Fast add flow, searchable inventory, and no account nonsense for the MVP.',
      },
      actions: {
        addItem: 'Add item',
        close: 'Close',
        cancel: 'Cancel',
        saveItem: 'Save item',
        takeOut: 'Take out',
        restore: 'Restore',
      },
      settings: {
        language: 'Language',
      },
      summary: {
        title: 'Inventory summary',
        items: 'Items in freezer',
        emptyLabel: 'Ready to start',
        emptyValue: 'No items yet',
      },
      add: {
        stepLabel: 'Guided add flow',
        title: 'Add freezer item',
        subtitle: 'Pick the cut first, then quantity and any searchable note.',
      },
      fields: {
        category: 'Category',
        cut: 'Cut / part',
        quantityType: 'Quantity type',
        quantityValue: 'Amount',
        quantityUnit: 'Unit',
        notes: 'Notes',
        notesPlaceholder: 'Marinated, for ramen, vacuum packed...',
      },
      inventory: {
        eyebrow: 'Search inventory',
        title: 'Current stock',
        searchPlaceholder: 'Search by type, cut, note, or quantity',
        emptyTitle: 'Nothing matched the current search.',
        emptyCopy: 'Add your first pack or loosen the filters.',
      },
      recent: {
        title: 'Quick add again',
      },
      filters: {
        showTakenOut: 'Show history',
        hideTakenOut: 'Hide history',
      },
      statuses: {
        in_freezer: 'In freezer',
        taken_out: 'Taken out',
      },
      quantities: {
        types: {
          weight: 'Weight',
          packs: 'Packs',
          pieces: 'Pieces',
        },
        compact: {
          packs_one: '{{value}} pack',
          packs_other: '{{value}} packs',
          pieces_one: '{{value}} piece',
          pieces_other: '{{value}} pieces',
        },
      },
      catalog: {
        categories: {
          chicken: 'Chicken',
          beef: 'Beef',
          pork: 'Pork',
          lamb: 'Lamb',
          wild_boar: 'Wild boar',
          turkey: 'Turkey',
          fish: 'Fish',
          duck: 'Duck',
          other: 'Other',
        },
        cuts: {
          chicken: {
            breast: 'Breast',
            thigh: 'Thigh',
            wings: 'Wings',
            drumsticks: 'Drumsticks',
            whole: 'Whole chicken',
            ground: 'Ground chicken',
            other: 'Other',
          },
          beef: {
            steak: 'Steak',
            antricot: 'Antricot',
            ribs: 'Ribs',
            roast: 'Roast',
            ground: 'Ground beef',
            burger: 'Burger patties',
            other: 'Other',
          },
          pork: {
            ribs: 'Ribs',
            loin: 'Loin',
            shoulder: 'Shoulder',
            neck: 'Neck',
            bacon: 'Bacon',
            sausage: 'Sausage',
            ground: 'Ground pork',
            other: 'Other',
          },
          lamb: {
            chops: 'Chops',
            leg: 'Leg',
            shoulder: 'Shoulder',
            shank: 'Shank',
            ground: 'Ground lamb',
            other: 'Other',
          },
          wild_boar: {
            loin: 'Loin',
            shoulder: 'Shoulder',
            sausage: 'Sausage',
            stew_meat: 'Stew meat',
            ground: 'Ground wild boar',
            other: 'Other',
          },
          turkey: {
            breast: 'Breast',
            thigh: 'Thigh',
            ground: 'Ground turkey',
            whole: 'Whole turkey',
            other: 'Other',
          },
          fish: {
            fillet: 'Fillet',
            steak: 'Fish steak',
            whole: 'Whole fish',
            smoked: 'Smoked fish',
            other: 'Other',
          },
          duck: {
            breast: 'Breast',
            legs: 'Legs',
            whole: 'Whole duck',
            other: 'Other',
          },
          other: {
            custom: 'Custom item',
          },
        },
      },
    },
  },
  pl: {
    translation: {
      hero: {
        eyebrow: 'Offline-first tracker do zamrażarki',
        title: 'Wiesz, co jest w zamrażarce, zanim zaczniesz gotować albo zakupy.',
        subtitle:
          'Szybkie dodawanie, przeszukiwalny stan i zero pieprzenia się z kontem w MVP.',
      },
      actions: {
        addItem: 'Dodaj produkt',
        close: 'Zamknij',
        cancel: 'Anuluj',
        saveItem: 'Zapisz produkt',
        takeOut: 'Wyjmij',
        restore: 'Przywróć',
      },
      settings: {
        language: 'Język',
      },
      summary: {
        title: 'Podsumowanie zapasów',
        items: 'Produkty w zamrażarce',
        emptyLabel: 'Gotowe na start',
        emptyValue: 'Brak produktów',
      },
      add: {
        stepLabel: 'Prowadzone dodawanie',
        title: 'Dodaj produkt',
        subtitle: 'Najpierw wybierz rodzaj, potem ilość i opcjonalną notatkę.',
      },
      fields: {
        category: 'Kategoria',
        cut: 'Część / rodzaj',
        quantityType: 'Typ ilości',
        quantityValue: 'Ilość',
        quantityUnit: 'Jednostka',
        notes: 'Notatki',
        notesPlaceholder: 'Marynowane, na ramen, vacuum...',
      },
      inventory: {
        eyebrow: 'Szukaj w zamrażarce',
        title: 'Aktualny stan',
        searchPlaceholder: 'Szukaj po typie, części, notatce albo ilości',
        emptyTitle: 'Nic nie pasuje do aktualnego wyszukiwania.',
        emptyCopy: 'Dodaj pierwszy pakunek albo poluzuj filtry.',
      },
      recent: {
        title: 'Dodaj ponownie',
      },
      filters: {
        showTakenOut: 'Pokaż historię',
        hideTakenOut: 'Ukryj historię',
      },
      statuses: {
        in_freezer: 'W zamrażarce',
        taken_out: 'Wyjęte',
      },
      quantities: {
        types: {
          weight: 'Waga',
          packs: 'Paczki',
          pieces: 'Sztuki',
        },
        compact: {
          packs_one: '{{value}} paczka',
          packs_few: '{{value}} paczki',
          packs_many: '{{value}} paczek',
          packs_other: '{{value}} paczki',
          pieces_one: '{{value}} sztuka',
          pieces_few: '{{value}} sztuki',
          pieces_many: '{{value}} sztuk',
          pieces_other: '{{value}} sztuki',
        },
      },
      catalog: {
        categories: {
          chicken: 'Kurczak',
          beef: 'Wołowina',
          pork: 'Wieprzowina',
          lamb: 'Jagnięcina',
          wild_boar: 'Dziczyzna',
          turkey: 'Indyk',
          fish: 'Ryba',
          duck: 'Kaczka',
          other: 'Inne',
        },
        cuts: {
          chicken: {
            breast: 'Pierś',
            thigh: 'Udo',
            wings: 'Skrzydełka',
            drumsticks: 'Pałki',
            whole: 'Cały kurczak',
            ground: 'Mielony kurczak',
            other: 'Inne',
          },
          beef: {
            steak: 'Stek',
            antricot: 'Antrykot',
            ribs: 'Żeberka',
            roast: 'Pieczeń',
            ground: 'Mielona wołowina',
            burger: 'Burgery',
            other: 'Inne',
          },
          pork: {
            ribs: 'Żeberka',
            loin: 'Schab',
            shoulder: 'Łopatka',
            neck: 'Karkówka',
            bacon: 'Boczek',
            sausage: 'Kiełbasa',
            ground: 'Mielona wieprzowina',
            other: 'Inne',
          },
          lamb: {
            chops: 'Kotlety',
            leg: 'Udziec',
            shoulder: 'Łopatka',
            shank: 'Gicz',
            ground: 'Mielona jagnięcina',
            other: 'Inne',
          },
          wild_boar: {
            loin: 'Polędwica',
            shoulder: 'Łopatka',
            sausage: 'Kiełbasa',
            stew_meat: 'Mięso gulaszowe',
            ground: 'Mielony dzik',
            other: 'Inne',
          },
          turkey: {
            breast: 'Pierś',
            thigh: 'Udo',
            ground: 'Mielony indyk',
            whole: 'Cały indyk',
            other: 'Inne',
          },
          fish: {
            fillet: 'Filet',
            steak: 'Dzwonko',
            whole: 'Cała ryba',
            smoked: 'Wędzona ryba',
            other: 'Inne',
          },
          duck: {
            breast: 'Pierś',
            legs: 'Nogi',
            whole: 'Cała kaczka',
            other: 'Inne',
          },
          other: {
            custom: 'Własny produkt',
          },
        },
      },
    },
  },
} as const

const savedLanguage = window.localStorage.getItem('freezer-memo-language')

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage === 'pl' ? 'pl' : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
