-- Discrete AdSense settings rows (replaces legacy ads_config JSON blob).
INSERT INTO app_settings (key, value, updated_at) VALUES
  ('adsense_enabled', 'false', now()),
  ('adsense_publisher_id', '', now()),
  ('adsense_slot_header', '', now()),
  ('adsense_slot_in_article', '', now()),
  ('adsense_slot_sidebar', '', now())
ON CONFLICT (key) DO NOTHING;
