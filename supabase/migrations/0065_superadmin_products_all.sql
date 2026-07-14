-- Superadmin can manage products across all venues (needed for AI photo search while impersonating)
CREATE POLICY "superadmin_products_all" ON products
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Also categories and zones for completeness
CREATE POLICY "superadmin_categories_all" ON categories
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "superadmin_zones_all" ON venue_zones
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
