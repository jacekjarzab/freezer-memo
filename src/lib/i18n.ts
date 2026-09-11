import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      hero: {
        eyebrow: 'Offline-first freezer tracker',
        title: 'Know what is in the freezer before you cook or shop.',
        subtitle:
          'Fast add flow, searchable inventory, and no account nonsense for the MVP.',
      },
      app: {
        name: 'Freezer Memo',
      },
      actions: {
        addItem: 'Add item',
        addSameAgain: 'Add same again',
        back: 'Back',
        close: 'Close',
        cancel: 'Cancel',
        retry: 'Retry',
        done: 'Done',
        edit: 'Edit',
        next: 'Next',
        saveItem: 'Save item',
        saveChanges: 'Save changes',
        takeOut: 'Take out',
        restore: 'Restore',
        undo: 'Undo',
        clearSearch: 'Clear search',
        resetFilters: 'Reset filters',
        pin: 'Pin',
        unpin: 'Unpin',
        use: 'Use',
      },
      storage: {
        loading: 'Loading local freezer data…',
        errors: {
          loadTitle: 'Freezer data could not be loaded.',
          load: 'Could not read local freezer data. Try again.',
          save: 'Could not save the change locally. Check storage and try again.',
        },
      },
      edit: {
        eyebrow: 'Item details',
        title: 'Review and correct this item',
        subtitle:
          'Fix labels, quantity, or notes without removing the item first.',
        previewLabel: 'Updated preview',
        saved: 'Changes saved locally.',
        discardConfirm: 'Discard your unsaved changes?',
        errors: {
          invalidQuantity: 'Enter a valid quantity before saving changes.',
        },
      },
      settings: {
        eyebrow: 'App settings',
        title: 'Settings',
        subtitle: 'Manage language and local freezer data.',
        language: 'Language',
        languageDescription: 'Choose the language used across the app.',
        data: 'Data',
        open: 'Settings',
      },
      account: {
        title: 'Shared household (optional)',
        sharingUnavailableTitle: 'Household sharing is unavailable',
        sharingUnavailableCopy: 'Household sharing isn’t enabled in this build. Your local freezer remains available.',
        invitationExpires: 'Invitation expires {{date}}',
        memberLabel: 'Member ···{{id}}',
        subtitle: 'Sign in only when you want to share inventory. Local-only mode stays unchanged until you migrate it.',
        email: 'Email', requestMagicLink: 'Send magic link', magicLinkSent: 'Check your email for the sign-in link.',
        signedInAs: 'Signed in as {{email}}', signOut: 'Sign out', householdName: 'Household name', createHousehold: 'Create household', householdCreated: 'Household created. Local data is still local until migration.', householdReady: 'Household connected. Sync migration is ready to be started.', migrationReady: 'Shared household is connected. Local inventory remains unchanged until you explicitly migrate it.', migrateInventory: 'Migrate local inventory', migrationComplete: 'Inventory migrated and shared sync is active.', syncFailed: 'Shared sync needs attention. Local inventory is still available on this device.', syncStatus: { offline: 'Shared sync is offline.', syncing: 'Shared sync in progress.', up_to_date: 'Shared sync is up to date.', retrying: 'Shared sync will retry when the connection is available.', error: 'Shared sync needs attention; local data is preserved.' },
        inviteToken: 'Invite token', acceptInvite: 'Accept invite', createInvite: 'Create invite', copyInvite: 'Copy token', revokeInvite: 'Revoke invite', members: 'Members', removeMember: 'Remove member', memberRemoved: 'Member removed.', inviteCreated: 'Invite created.', inviteCopied: 'Invite token copied.', inviteRevoked: 'Invite revoked.', inviteAccepted: 'Invite accepted.', signedOut: 'Signed out.', working: 'Working…', migrationConfirm: 'Migrate this device’s local inventory to the shared household? This cannot be undone offline.', signOutConfirm: 'Sign out of shared household?', revokeConfirm: 'Revoke this invitation?', removeMemberConfirm: 'Remove this member from the household?',
        errors: { missingConfiguration: 'Shared mode is not configured on this device.', forbidden: 'You no longer have access to this household. Sign in again or accept a new invite.', invite_invalid: 'That invite is invalid, expired, or revoked.', unavailable: 'The service is unavailable. Check your connection and retry.', invalid: 'That request was rejected. Check the details and retry.', clipboard: 'Copy was blocked. Select and copy the invite token manually.', generic: 'The shared-household request failed. Retry.' },
      },
      pwa: {
        eyebrow: 'PWA status',
        title: 'Keep the app ready on your phone',
        installHint:
          'Install it to your home screen for faster access and a more native feel.',
        offlineReady:
          'Offline cache is ready. The app shell should work without network now.',
        installedState: 'Installed mode is active on this device.',
        updateAvailable:
          'A newer version is ready. Refresh to load the latest app shell.',
        installButton: 'Install app',
        refreshButton: 'Refresh app',
        cachedBadge: 'Offline ready',
        installSuccess: 'App installed successfully on this device.',
      },
      backup: {
        eyebrow: 'Backup and restore',
        title: 'Keep a copy of your freezer data',
        subtitle: 'Export everything locally or restore from a backup file.',
        exportButton: 'Export backup',
        importButton: 'Import backup',
        replaceTitle: 'Import replaces the local inventory',
        replaceCopy:
          'This restore clears the current device data first, then imports the backup file.',
        importConfirm:
          'Importing this backup will replace the current freezer data on this device. Continue?',
        exportSuccess_one: 'Backup exported with {{count}} item.',
        exportSuccess_other: 'Backup exported with {{count}} items.',
        importSuccess_one: 'Backup restored with {{count}} item.',
        importSuccess_other: 'Backup restored with {{count}} items.',
        errors: {
          invalid_json: 'That file is not valid JSON.',
          invalid_shape: 'That backup file does not match the expected format.',
          invalid_items:
            'Some imported items are invalid, so the restore was stopped.',
          invalid_presets:
            'Some imported presets are invalid, so the restore was stopped.',
          generic: 'Import failed. Try another backup file.',
        },
      },
      summary: {
        title: 'Inventory summary',
        items: 'Items in freezer',
        emptyLabel: 'Ready to start',
        emptyValue: 'No items yet',
        moreCategories: 'More categories'
      },
      add: {
        stepLabel: 'Guided add flow',
        title: 'Add freezer item',
        subtitle:
          'Pick the cut first, then quantity, freezer, and any searchable note.',
        progressLabel: 'Add flow progress',
        stepCounter: 'Step {{current}} of {{total}}',
        stepDone: 'Saved',
        previewLabel: 'Current selection',
        quantityPreviewHelp: 'Lock the amount before the final save step.',
        reviewLabel: 'Ready to save',
        cutHelper: 'Tap the closest match',
        successBadge: 'Saved offline',
        successTitle: 'Item added to your freezer.',
        successCopy: 'You can close this flow or repeat the same item fast.',
        discardConfirm: 'Discard your unsaved changes?',
        categoryHints: {
          chicken: 'Breasts, thighs, wings, whole birds',
          beef: 'Steaks, ribs, roasts, burger packs',
          pork: 'Ribs, loin, shoulder, sausage',
          lamb: 'Chops, leg, shank, ground meat',
          wild_boar: 'Loin, stew meat, sausage, ground',
          turkey: 'Breast, thigh, ground, whole bird',
          fish: 'Fillets, steaks, smoked fish',
          duck: 'Breast, legs, whole duck',
          other: 'Fallback for anything outside the default catalog',
        },
        quantityHints: {
          weight: 'Best for gram or kilo labels',
          packs: 'Great for bags, trays, or vacuum packs',
          pieces: 'Use when counting portions or cuts',
        },
        steps: {
          category: {
            title: 'Choose the main category',
            description: 'Start broad so the rest of the flow stays fast.',
          },
          cut: {
            title: 'Pick the cut or part',
            description:
              'Show the closest real-life label you would look for later.',
          },
          quantityType: {
            title: 'How do you count it?',
            description: 'Use whatever matches the package in the freezer.',
          },
          quantityValue: {
            title: 'Set the amount',
            description:
              'Keep this dead simple so adding stock stays painless.',
          },
          notes: {
            title: 'Add an optional note',
            description:
              'Choose the freezer first, then add notes only when they help future-you search faster.',
          },
        },
      },
      fields: {
        category: 'Category',
        cut: 'Cut / part',
        freezer: 'Freezer',
        quantityType: 'Quantity type',
        quantityValue: 'Amount',
        quantityPlaceholder: '1',
        quantityUnit: 'Unit',
        notes: 'Notes',
        notesPlaceholder: 'Marinated, for ramen, vacuum packed...',
      },
      freezers: {
        home: 'Home',
        basement: 'Basement',
        away: 'Away',
      },
      inventory: {
        eyebrow: 'Search in',
        title: 'Freezer',
        searchPlaceholder: 'Search by type, cut, note, or quantity',
        emptyTitle: 'No items found.',
        emptyCopy: 'Add an item or adjust the view.',
        firstUseTitle: 'Your freezer is ready for its first item.',
        firstUseCopy: 'Track what you freeze so you can find it before shopping.',
        noSearchResultsTitle: 'No items match “{{query}}”.',
        noSearchResultsCopy: 'Try another search or clear it to see all items.',
        noFilterResultsTitle: 'No items in this category.',
        noFilterResultsCopy: 'Reset the filter to see all freezer items.',
        takeOutSaved: 'Item taken out.',
      },
      history: {
        eyebrow: 'Taken-out',
        title: 'History',
        modeLabel: 'Inventory view',
        currentView: 'Current',
        historyView: 'History',
        searchPlaceholder:
          'Search taken-out items by type, cut, note, or quantity',
        emptyTitle: 'No taken-out items matched this view.',
        emptyCopy: 'Use the freezer a bit or loosen the filters.',
        removedOn: 'Removed'
      },
      recent: {
        title: 'Quick add again',
      },
      presets: {
        title: 'Pinned presets',
        empty: 'Pin a frequent combination to keep it here.',
        pinned: 'Pinned locally',
        duplicate: 'That combination is already pinned.',
        saved: 'Preset pinned locally.',
        removed: 'Preset unpinned.',
        used: 'Preset ready to add.',
      },
      validation: {
        positiveQuantity: 'Enter an amount greater than 0.',
      },
      filters: {
        allCategories: 'All categories',
        category: 'Category filter',
        sortBy: 'Sort by',
        sortOptions: {
          newest: 'Newest first',
          oldest: 'Oldest first',
          category: 'Category',
          recentRemoval: 'Recently removed',
          oldestRemoval: 'Oldest removal',
        },
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
        title:
          'Wiesz, co jest w zamrażarce, zanim zaczniesz gotować albo zrobisz zakupy.',
        subtitle:
          'Szybkie dodawanie, przeszukiwalny stan i zero pieprzenia się z kontem w MVP.',
      },
      app: {
        name: 'Freezer Memo',
      },
      actions: {
        addItem: 'Dodaj produkt',
        addSameAgain: 'Dodaj to samo',
        back: 'Wstecz',
        close: 'Zamknij',
        cancel: 'Anuluj',
        done: 'Gotowe',
        edit: 'Edytuj',
        next: 'Dalej',
        saveItem: 'Zapisz produkt',
        saveChanges: 'Zapisz zmiany',
        takeOut: 'Wyjmij',
        restore: 'Przywróć',
        undo: 'Cofnij',
        clearSearch: 'Wyczyść wyszukiwanie',
        resetFilters: 'Resetuj filtry',
        pin: 'Przypnij',
        unpin: 'Odepnij',
        use: 'Użyj',
      },
      storage: {
        errors: {
          load: 'Nie udało się odczytać lokalnych danych. Spróbuj ponownie.',
          save: 'Nie udało się lokalnie zapisać zmiany. Sprawdź pamięć i spróbuj ponownie.',
        },
      },
      edit: {
        eyebrow: 'Szczegóły produktu',
        title: 'Sprawdź i popraw ten wpis',
        subtitle:
          'Popraw etykiety, ilość albo notatkę bez wyjmowania produktu.',
        previewLabel: 'Podgląd po zmianach',
        saved: 'Zmiany zapisane lokalnie.',
        discardConfirm: 'Odrzucić niezapisane zmiany?',
        errors: {
          invalidQuantity: 'Podaj poprawną ilość przed zapisaniem zmian.',
        },
      },
      settings: {
        eyebrow: 'Ustawienia aplikacji',
        title: 'Ustawienia',
        subtitle: 'Zarządzaj językiem i lokalnymi danymi zamrażarki.',
        language: 'Język',
        languageDescription: 'Wybierz język używany w całej aplikacji.',
        data: 'Dane',
        open: 'Ustawienia',
      },
      account: {
        title: 'Wspólne gospodarstwo (opcjonalnie)',
        sharingUnavailableTitle: 'Współdzielenie gospodarstwa jest niedostępne',
        sharingUnavailableCopy: 'Współdzielenie nie jest włączone w tej wersji. Lokalna zamrażarka nadal działa.',
        invitationExpires: 'Zaproszenie wygasa {{date}}',
        memberLabel: 'Członek ···{{id}}',
        subtitle: 'Zaloguj się tylko wtedy, gdy chcesz współdzielić stan. Tryb lokalny pozostaje bez zmian do czasu migracji.',
        email: 'E-mail', requestMagicLink: 'Wyślij link logowania', magicLinkSent: 'Sprawdź skrzynkę, aby zalogować się przez link.',
        signedInAs: 'Zalogowano jako {{email}}', signOut: 'Wyloguj', householdName: 'Nazwa gospodarstwa', createHousehold: 'Utwórz gospodarstwo', householdCreated: 'Gospodarstwo utworzone. Lokalne dane nadal są lokalne do czasu migracji.', householdReady: 'Gospodarstwo połączone. Migracja synchronizacji jest gotowa do uruchomienia.', migrationReady: 'Wspólne gospodarstwo jest połączone. Lokalne dane pozostają bez zmian do czasu jawnej migracji.', migrateInventory: 'Migruj lokalne zapasy', migrationComplete: 'Zapasy zmigrowane, współdzielona synchronizacja jest aktywna.', syncFailed: 'Wspólna synchronizacja wymaga uwagi. Lokalne dane nadal są dostępne na tym urządzeniu.', syncStatus: { offline: 'Wspólna synchronizacja jest offline.', syncing: 'Wspólna synchronizacja trwa.', up_to_date: 'Wspólna synchronizacja jest aktualna.', retrying: 'Synchronizacja ponowi próbę po przywróceniu połączenia.', error: 'Synchronizacja wymaga uwagi; lokalne dane są zachowane.' },
        inviteToken: 'Token zaproszenia', acceptInvite: 'Akceptuj zaproszenie', createInvite: 'Utwórz zaproszenie', copyInvite: 'Kopiuj token', revokeInvite: 'Unieważnij zaproszenie', members: 'Członkowie', removeMember: 'Usuń członka', memberRemoved: 'Członek został usunięty.', inviteCreated: 'Zaproszenie utworzone.', inviteCopied: 'Token skopiowany.', inviteRevoked: 'Zaproszenie unieważnione.', inviteAccepted: 'Zaproszenie zaakceptowane.', signedOut: 'Wylogowano.', working: 'Przetwarzanie…', migrationConfirm: 'Przenieść lokalny inwentarz tego urządzenia do wspólnego gospodarstwa?', signOutConfirm: 'Wylogować ze wspólnego gospodarstwa?', revokeConfirm: 'Odwołać to zaproszenie?', removeMemberConfirm: 'Usunąć tego członka z gospodarstwa?',
        errors: { missingConfiguration: 'Tryb współdzielenia nie jest skonfigurowany na tym urządzeniu.', forbidden: 'Nie masz już dostępu do tego gospodarstwa. Zaloguj się ponownie lub przyjmij nowe zaproszenie.', invite_invalid: 'To zaproszenie jest nieprawidłowe, wygasło albo zostało unieważnione.', unavailable: 'Usługa jest niedostępna. Sprawdź połączenie i spróbuj ponownie.', invalid: 'Żądanie zostało odrzucone. Sprawdź dane i spróbuj ponownie.', clipboard: 'Kopiowanie zostało zablokowane. Zaznacz token i skopiuj go ręcznie.', generic: 'Żądanie współdzielenia nie powiodło się. Spróbuj ponownie.' },
      },
      pwa: {
        eyebrow: 'Status PWA',
        title: 'Miej apkę gotową na telefonie',
        installHint:
          'Dodaj ją do ekranu głównego, żeby odpalała się szybciej i bardziej jak natywna apka.',
        offlineReady:
          'Cache offline jest gotowy. Shell aplikacji powinien już działać bez sieci.',
        installedState:
          'Tryb zainstalowanej aplikacji jest aktywny na tym urządzeniu.',
        updateAvailable:
          'Czeka nowsza wersja. Odśwież, żeby wczytać aktualny shell aplikacji.',
        installButton: 'Zainstaluj apkę',
        refreshButton: 'Odśwież apkę',
        cachedBadge: 'Offline gotowe',
        installSuccess: 'Aplikacja została zainstalowana na tym urządzeniu.',
      },
      backup: {
        eyebrow: 'Backup i przywracanie',
        title: 'Trzymaj kopię JSON danych z zamrażarki',
        subtitle:
          'Wyeksportuj wszystko lokalnie albo przywróć dane z pliku backupu.',
        exportButton: 'Eksportuj backup',
        importButton: 'Importuj backup',
        replaceTitle: 'Import nadpisuje lokalny stan',
        replaceCopy:
          'Przywracanie najpierw czyści dane na tym urządzeniu, a potem wgrywa plik backupu.',
        importConfirm:
          'Import tego backupu zastąpi aktualne dane zamrażarki na tym urządzeniu. Kontynuować?',
        exportSuccess_one: 'Wyeksportowano backup z {{count}} produktem.',
        exportSuccess_few: 'Wyeksportowano backup z {{count}} produktami.',
        exportSuccess_many: 'Wyeksportowano backup z {{count}} produktami.',
        exportSuccess_other: 'Wyeksportowano backup z {{count}} produktami.',
        importSuccess_one: 'Przywrócono backup z {{count}} produktem.',
        importSuccess_few: 'Przywrócono backup z {{count}} produktami.',
        importSuccess_many: 'Przywrócono backup z {{count}} produktami.',
        importSuccess_other: 'Przywrócono backup z {{count}} produktami.',
        errors: {
          invalid_json: 'Ten plik nie jest poprawnym JSON-em.',
          invalid_shape: 'Ten backup nie ma oczekiwanego formatu.',
          invalid_items:
            'Część pozycji w backupie jest niepoprawna, więc import został zatrzymany.',
          invalid_presets:
            'Część przypiętych zestawów w backupie jest niepoprawna, więc import został zatrzymany.',
          generic: 'Import się wywalił. Spróbuj z innym plikiem backupu.',
        },
      },
      summary: {
        title: 'Podsumowanie zapasów',
        items: 'Wszystkie Produkty',
        emptyLabel: 'Gotowe na start',
        emptyValue: 'Brak produktów',
        moreCategories: 'Więcej kategorii'
      },
      add: {
        stepLabel: 'Prowadzone dodawanie',
        title: 'Dodaj produkt',
        subtitle:
          'Najpierw wybierz rodzaj, potem ilość, zamrażarkę i opcjonalną notatkę.',
        progressLabel: 'Postęp dodawania',
        stepCounter: 'Krok {{current}} z {{total}}',
        stepDone: 'Zapisane',
        previewLabel: 'Aktualny wybór',
        quantityPreviewHelp:
          'Ustal ilość, zanim przejdziesz do końcowego zapisu.',
        reviewLabel: 'Gotowe do zapisu',
        cutHelper: 'Kliknij najbardziej pasujący wariant',
        successBadge: 'Zapisano offline',
        successTitle: 'Produkt wylądował w zamrażarce.',
        successCopy: 'Możesz zamknąć flow albo szybko dodać dokładnie to samo.',
        discardConfirm: 'Odrzucić niezapisane zmiany?',
        categoryHints: {
          chicken: 'Piersi, uda, skrzydełka, cały drób',
          beef: 'Steki, żeberka, pieczenie, burgery',
          pork: 'Żeberka, schab, łopatka, kiełbasa',
          lamb: 'Kotlety, udziec, gicz, mięso mielone',
          wild_boar: 'Polędwica, gulasz, kiełbasa, mielone',
          turkey: 'Pierś, udo, mielone, cały indyk',
          fish: 'Filety, dzwonka, ryba wędzona',
          duck: 'Pierś, nogi, cała kaczka',
          other: 'Awaryjna opcja dla rzeczy spoza katalogu',
        },
        quantityHints: {
          weight: 'Najlepsze dla gramów i kilogramów',
          packs: 'Dobre dla tacek, worków i paczek',
          pieces: 'Użyj przy porcjach albo pojedynczych kawałkach',
        },
        steps: {
          category: {
            title: 'Wybierz główną kategorię',
            description: 'Zacznij szeroko, żeby reszta flow była szybka.',
          },
          cut: {
            title: 'Wybierz część albo rodzaj',
            description: 'Pokaż nazwę, której naprawdę będziesz potem szukać.',
          },
          quantityType: {
            title: 'Jak to liczysz?',
            description:
              'Wybierz to, co najlepiej pasuje do opakowania w zamrażarce.',
          },
          quantityValue: {
            title: 'Ustaw ilość',
            description:
              'Ma być banalnie proste, żeby dodawanie nie wkurwiało.',
          },
          notes: {
            title: 'Dodaj opcjonalną notatkę',
            description:
              'Najpierw wybierz zamrażarkę, a notatkę dodaj tylko wtedy, gdy pomoże szybciej to potem znaleźć.',
          },
        },
      },
      fields: {
        category: 'Kategoria',
        cut: 'Część / rodzaj',
        freezer: 'Zamrażarka',
        quantityType: 'Typ ilości',
        quantityValue: 'Ilość',
        quantityPlaceholder: '1',
        quantityUnit: 'Jednostka',
        notes: 'Notatki',
        notesPlaceholder: 'Marynowane, na ramen, vacuum...',
      },
      freezers: {
        home: 'Dom',
        basement: 'Piwnica',
        away: 'Magazyn',
      },
      inventory: {
        eyebrow: 'Szukaj w',
        title: 'Zamrażarka',
        searchPlaceholder: 'Szukaj po typie, części, notatce albo ilości',
        emptyTitle: 'Brak produktów.',
        emptyCopy: 'Dodaj produkt albo zmień widok.',
        firstUseTitle: 'Twoja zamrażarka czeka na pierwszy produkt.',
        firstUseCopy: 'Zapisuj mrożonki, żeby znaleźć je przed kolejnymi zakupami.',
        noSearchResultsTitle: 'Brak produktów pasujących do „{{query}}”.',
        noSearchResultsCopy: 'Spróbuj innego hasła albo wyczyść wyszukiwanie.',
        noFilterResultsTitle: 'Brak produktów w tej kategorii.',
        noFilterResultsCopy: 'Zresetuj filtr, żeby zobaczyć całą zamrażarkę.',
        takeOutSaved: 'Produkt wyjęty.',
      },
      history: {
        eyebrow: 'Wyjęte',
        title: 'Historia',
        modeLabel: 'Widok listy',
        currentView: 'Aktualne',
        historyView: 'Historia',
        searchPlaceholder:
          'Szukaj wyjętych rzeczy po typie, części, notatce albo ilości',
        emptyTitle: 'Żadne wyjęte produkty nie pasują do tego widoku.',
        emptyCopy: 'Najpierw coś wyjmij albo poluzuj filtry.',
        removedOn: 'Wyjęto'
      },
      recent: {
        title: 'Dodaj ponownie',
      },
      presets: {
        title: 'Przypięte zestawy',
        empty: 'Przypnij często używaną kombinację, żeby mieć ją tutaj.',
        pinned: 'Przypięte lokalnie',
        duplicate: 'Ta kombinacja jest już przypięta.',
        saved: 'Zestaw przypięty lokalnie.',
        removed: 'Zestaw odpięty.',
        used: 'Zestaw gotowy do dodania.',
      },
      validation: {
        positiveQuantity: 'Podaj ilość większą od 0.',
      },
      filters: {
        allCategories: 'Wszystkie kategorie',
        category: 'Filtr kategorii',
        sortBy: 'Sortowanie',
        sortOptions: {
          newest: 'Najnowsze najpierw',
          oldest: 'Najstarsze najpierw',
          category: 'Kategoria',
          recentRemoval: 'Najnowsze wyjęcia',
          oldestRemoval: 'Najstarsze wyjęcia',
        },
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
} as const;

const savedLanguage = window.localStorage.getItem('freezer-memo-language');

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage === 'pl' ? 'pl' : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
