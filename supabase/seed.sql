-- ============================================
-- AGENCY SETTINGS (default sor)
-- ============================================
insert into agency_settings (name)
values ('Ügynökségem');

-- ============================================
-- PLATFORMS (MVP: csak Google Ads aktív)
-- ============================================
insert into platforms (
  slug,
  display_name,
  windsor_connector,
  icon_color,
  icon_letter,
  is_active,
  sort_order,
  fields_config
)
values (
  'google_ads',
  'Google Ads',
  'google_ads',
  '#4285f4',
  'G',
  true,
  1,
  '{
    "api_fields": [
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "spend",
      "conversions",
      "cost_per_conversion",
      "conversion_value",
      "roas",
      "average_order_value",
      "search_impression_share",
      "top_impression_share"
    ],
    "account_query_exclude": [
      "average_order_value",
      "top_impression_share"
    ],
    "account_table": {
      "webshop": [
        {"field": "clicks", "label": "Kattintás", "format": "num", "group": "forgalom"},
        {"field": "impressions", "label": "Megjelenés", "format": "num", "group": "forgalom"},
        {"field": "ctr", "label": "Átl. CTR", "format": "pct", "group": "forgalom"},
        {"field": "cpc", "label": "CPC", "format": "huf", "inverse": true, "group": "forgalom"},
        {"field": "spend", "label": "Költés", "format": "huf", "group": "forgalom"},
        {"field": "conversions", "label": "Konverziók", "format": "num", "group": "konverziok"},
        {"field": "cost_per_conversion", "label": "Konverzió/költség", "format": "huf", "inverse": true, "group": "konverziok"},
        {"field": "average_order_value", "label": "Kosárérték", "format": "huf", "group": "konverziok"},
        {"field": "conversion_value", "label": "Bevétel", "format": "huf", "group": "konverziok"},
        {"field": "roas", "label": "ROAS", "format": "x", "group": "konverziok"},
        {"field": "search_impression_share", "label": "Keresési megj. arány", "format": "pct", "group": "pozicio"},
        {"field": "top_impression_share", "label": "Felső megj. arány", "format": "pct", "group": "pozicio"}
      ],
      "szolgaltato": [
        {"field": "clicks", "label": "Kattintás", "format": "num", "group": "forgalom"},
        {"field": "impressions", "label": "Megjelenés", "format": "num", "group": "forgalom"},
        {"field": "ctr", "label": "Átl. CTR", "format": "pct", "group": "forgalom"},
        {"field": "cpc", "label": "CPC", "format": "huf", "inverse": true, "group": "forgalom"},
        {"field": "spend", "label": "Költés", "format": "huf", "group": "forgalom"},
        {"field": "conversions", "label": "Konverziók", "format": "num", "group": "konverziok"},
        {"field": "cost_per_conversion", "label": "CPA", "format": "huf", "inverse": true, "group": "konverziok"},
        {"field": "search_impression_share", "label": "Keresési megj. arány", "format": "pct", "group": "pozicio"},
        {"field": "top_impression_share", "label": "Felső megj. arány", "format": "pct", "group": "pozicio"}
      ]
    },
    "campaign_table": {
      "webshop": [
        "campaign",
        "clicks",
        "impressions",
        "ctr",
        "cpc",
        "spend",
        "conversions",
        "cost_per_conversion",
        "average_order_value",
        "conversion_value",
        "roas"
      ],
      "szolgaltato": [
        "campaign",
        "clicks",
        "impressions",
        "ctr",
        "cpc",
        "spend",
        "conversions",
        "cost_per_conversion"
      ]
    },
    "campaign_level": true,
    "campaign_display": {
      "sort_by": "spend",
      "limit": 10
    }
  }'::jsonb
);

-- ============================================
-- GLOSSARY TERMS
-- ============================================
insert into glossary_terms (term, full_name, definition, sort_order) values
('CTR', 'Click-Through Rate / Átkattintási arány', 'Megmutatja, hogy a hirdetést látók hány százaléka kattintott rá.', 1),
('CPC', 'Cost Per Click / Kattintásonkénti költség', 'Ennyibe kerül átlagosan egy kattintás a hirdetésre.', 2),
('CPA', 'Cost Per Acquisition / Konverziónkénti költség', 'Ennyibe kerül átlagosan egy konverzió.', 3),
('ROAS', 'Return On Ad Spend / Hirdetési megtérülés', 'Minden elköltött 1 Ft hirdetésre mennyi bevétel jön vissza.', 4),
('Konverzió', null, 'Az ügyfél által meghatározott célművelet: vásárlás, ajánlatkérés, telefonhívás, regisztráció vagy más értékes aktivitás.', 5),
('Megjelenés', 'Impressions', 'Hányszor jelent meg a hirdetés.', 6),
('Elérés', 'Reach', 'Hány egyedi ember látta a hirdetést.', 7),
('Keresési megjelenítési részesedés', 'Search Impression Share', 'A hirdetés hányszor jelent meg ahhoz képest, ahányszor megjelenhetett volna.', 8),
('Kosárérték', 'Average Order Value', 'Egy átlagos vásárlás értéke forintban.', 9);
