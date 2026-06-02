export const GEO_CATEGORIES = [
    {id: 'baupotenzial', title: '🏗️ Baupotenzial & Baurecht', defaultActive: true},
    {id: 'umwelt', title: '🌍 Umwelt & Energie', defaultActive: true},
    {id: 'infrastruktur', title: '🚌 Infrastruktur & Lebensqualität', defaultActive: true},
    {id: 'natur', title: '🌲 Natur & Gefahren', defaultActive: true},
    {id: 'restriktionen', title: '🏛️ Spezielle Restriktionen', defaultActive: false}
];

export const GEO_SCHEMA = [
    // --- Baupotenzial & Baurecht ---
    {
        id: 'grundnutzung',
        product_id: 'ZONPLANX_COL_V3_MP',
        layer: 'esri:Grundnutzung',
        category: 'baupotenzial',
        title: 'Bauzonen / Grundnutzung',
        fields: [
            {key: 'Bezeichnung_Zonentyp_Gemeinde', label: 'Zonentyp'},
            {key: 'Ausnützungsziffer__nach_altem_PBG_', label: 'Ausnützungsziffer (altes PBG)'},
            {key: 'Überbauungsziffer_1__maximal_', label: 'Überbauungsziffer (max)'},
            {key: 'Annahme_Überbauungsziffer_1__max._', label: 'Annahme Überbauungsziffer'},
            {key: 'Gesamthöhe__maximal___m_', label: 'Gesamthöhe max (m)'},
            {key: 'Annahme_Gesamthöhe__max._', label: 'Annahme Gesamthöhe'},
            {key: 'Lärmempfindlichkeitsstufe__ES_', label: 'Lärmempfindlichkeitsstufe (ES)'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'landwerte',
        product_id: 'LANDWERT_DS_V2_MP',
        layer: 'esri:Landwertzone__innerhalb_Bauzone',
        category: 'baupotenzial',
        title: 'Landwerte (Innerhalb Bauzone)',
        fields: [
            {key: 'Landwertzone', label: 'Landwertzone'},
            {key: 'Landwert_Einfamilienhaus__CHF_m2_', label: 'Wert EFH (CHF/m²)'},
            {key: 'Landwert_Stockwerkeigentum__CHF_m2_', label: 'Wert Stockwerkeigentum (CHF/m²)'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'gebaeudehoehen',
        product_id: 'GEBHOHEN_DS_V5_MP',
        layer: 'esri:Blockmodelle_Gebäude',
        category: 'baupotenzial',
        title: 'Gebäudehöhen',
        fields: [
            {key: 'relative_Gebäudehöhe__m_', label: 'Relative Höhe (m)'},
            {key: 'Maximale_Gebäudedachhöhe__m.ü.M._', label: 'Max Dachhöhe (m.ü.M.)'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },

    // --- Umwelt & Energie ---
    {
        id: 'altlasten',
        product_id: 'KBSTANDO_DS_V3_MP',
        layer: 'esri:Kataster_der_belasteten_Standorte__Betriebsstandorte',
        category: 'umwelt',
        title: 'Altlasten (Betriebsstandorte)',
        fields: [
            {key: 'Bezeichnung', label: 'Standortbezeichnung'},
            {key: 'Standorttyp', label: 'Standorttyp'},
            {key: 'Status_nach_Altlastenverordnung', label: 'Status Altlastenverordnung'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'grundwasser',
        product_id: 'GRWASXXX_COL_V4_MP',
        layer: 'esri:Grundwasser__Randgebiete',
        category: 'umwelt',
        title: 'Grundwasserschutz',
        fields: [
            {key: 'Name_des_Grundwasservorkommens', label: 'Vorkommen'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'solarpotenzial',
        product_id: 'SOLPKT18_DS_V2_MP',
        layer: 'esri:Solarpotentialkataster_2018__Teildachflächen',
        category: 'umwelt',
        title: 'Solarpotenzial (Dächer)',
        fields: [
            {key: 'Eignung', label: 'Eignung'},
            {key: 'Photovoltaikertrag_pro_Jahr__kWh_a_', label: 'PV Ertrag (kWh/Jahr)'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'erdwaerme',
        product_id: 'EWNUTZXX_COL_V3_MP',
        layer: 'esri:Erdwärmenutzung_zulässig',
        category: 'umwelt',
        title: 'Erdwärmenutzung (Erdsonden)',
        fields: [
            {key: 'Bewertungskriterium', label: 'Zulässigkeit'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'energieplanung',
        product_id: 'ENERPLAN_COL_V5_MP',
        layer: 'esri:Kommunale_Energieplanungen',
        category: 'umwelt',
        title: 'Kommunale Energieplanung',
        fields: [
            {key: 'Name_kommunale_Energieplanung', label: 'Planungsname'},
            {key: 'Planungsstand_kommunale_Energieplanung', label: 'Planungsstand'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },

    // --- Infrastruktur & Lebensqualität ---
    {
        id: 'kantonsstrassen',
        product_id: 'STRWXXXX_COL_V3_MP',
        layer: 'esri:Kantonsstrassen',
        category: 'infrastruktur',
        title: 'Kantonsstrassen (Verkehr/Lärm)',
        fields: [
            {key: 'Kantonsstrassen-Bezeichnung', label: 'Strassenbezeichnung'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'oev_haltestellen',
        product_id: 'OEVXXXXX_COL_V4_MP',
        layer: 'esri:Öffentlicher_Verkehr__Haltestellen',
        category: 'infrastruktur',
        title: 'ÖV Haltestellen',
        fields: [
            {key: 'Haltestellenname', label: 'Haltestelle'},
            {key: 'Verkehrsmittel', label: 'Verkehrsmittel'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'schulen',
        product_id: 'BILUKDVX_COL_V4_MP',
        layer: 'esri:Bauinventar__Punkte_',
        category: 'infrastruktur',
        title: 'Schulen & Bildung',
        fields: [
            {key: 'Objektname', label: 'Objektname'},
            {key: 'Baugattung', label: 'Baugattung'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'glasfaser',
        product_id: 'GLFSERSC_DS_V2_MP',
        layer: 'esri:Glasfasererschliessung',
        category: 'infrastruktur',
        title: 'Glasfaser-Erschliessung',
        fields: [
            {key: 'FTTH-Ausbaugrad_aktuell', label: 'Ausbaugrad Aktuell'},
            {key: 'FTTH-Ausbaugrad_in_24_Monaten', label: 'Ausbaugrad in 24 Monaten'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'wanderwege',
        product_id: 'WANDRWEG_DS_V1_MP',
        layer: 'esri:Wanderwege',
        category: 'infrastruktur',
        title: 'Wanderwege (Naherholung)',
        fields: [
            {key: 'Wanderweg', label: 'Wanderweg'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },

    // --- Natur & Gefahren ---
    {
        id: 'gefahrenkarte',
        product_id: 'GHKXXXXX_COL_V1_MP',
        layer: 'esri:Gefahrenhinweiskarte__Perimeter',
        category: 'natur',
        title: 'Gefahrenhinweiskarte (Überschwemmung/Rutsch)',
        fields: [
            {key: 'Datum_Integration', label: 'Datum Integration'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'waldgrenzen',
        product_id: 'STWALDGR_DS_V2_MP',
        layer: 'esri:Statische_Waldgrenzen',
        category: 'natur',
        title: 'Statische Waldgrenzen',
        fields: [
            {key: 'Inkraftsetzungsdatum', label: 'Inkraftsetzungsdatum'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'gewaesserraum',
        product_id: 'GWRMBRXX_COL_V1_MP',
        layer: 'esri:Gewässerraumbreite_der_Fliessgewässer__theoretisch',
        category: 'natur',
        title: 'Gewässerraum (Bauverbotszone)',
        fields: [
            {key: 'Gewässerraumbreite__m_', label: 'Breite (m)'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },

    // --- Spezielle Restriktionen ---
    {
        id: 'archaeologie',
        product_id: 'ARCHFSTL_DS_V1_MP',
        layer: 'esri:Archäologische_Fundstellen',
        category: 'restriktionen',
        title: 'Archäologische Fundstellen',
        fields: [
            {key: 'Zonenart', label: 'Zonenart'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'luftschutz',
        product_id: 'LUFTSCHR_DS_V3_MP',
        layer: 'esri:Schutzbauten_Zivilschutz__Punkte_',
        category: 'restriktionen',
        title: 'Luftschutzräume',
        fields: [
            {key: 'Schutzraum_Kategorie', label: 'Kategorie'},
            {key: 'Schutzraumplätze', label: 'Plätze'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    },
    {
        id: 'schiessanlagen',
        product_id: 'SLAEXXXX_COL_V1_MP',
        layer: 'esri:Schiessanlage',
        category: 'restriktionen',
        title: 'Schiessanlagen-Lärm',
        fields: [
            {key: 'Name_der_Anlage', label: 'Name'},
            {key: 'Status_der_Schiessanlage', label: 'Status'},
            {key: 'Distanz_zum_Standort_m', label: 'Distanz zum Pin (m)'}
        ]
    }
];
