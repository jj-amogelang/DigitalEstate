Legacy Property System (Archived)
---------------------------------

These files were part of the original property-centric implementation and have been
archived after migration to the new area metrics architecture.

Archived components:
 - database_models.py (Property, EnhancedProperty, Valuation, Owner, Zoning, etc.)
 - excel_data_importer.py / excel_data_updater.py
 - seed_properties.py
 - production_database_setup.py / render_database_init.py
 - build.sh (legacy seeding script)

They are retained here temporarily for reference. They should not be imported by
runtime code any longer. Remove this directory entirely once confident no rollback
is required.
