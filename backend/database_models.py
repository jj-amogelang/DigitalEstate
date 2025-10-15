"""Deprecated legacy property models module.

All functionality formerly provided here has been removed in favor of the
area-centric metrics system. The file is kept as a stub to avoid ImportErrors
for any still-unmigrated scripts. Do not add new code here.
"""

from db_core import db  # noqa: F401

__all__ = [
    'db'
]

