"""(Archived) Legacy production database setup script.

All property-centric initialization has been deprecated in favor of the
area metrics system. This stub remains only so historical deployment
instructions referencing this file do not break imports.

Safe to delete after full migration confidence.
"""

def setup_production_database():  # pragma: no cover - legacy stub
    print("Legacy production setup script is archived. No action taken.")
    return True

if __name__ == '__main__':  # pragma: no cover
    setup_production_database()
