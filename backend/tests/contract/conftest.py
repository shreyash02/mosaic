"""Contract test fixtures.

Reuses the unit test conftest (DB, client, user fixtures) and adds
contract-specific helpers for validating response shapes against
frontend TypeScript type expectations.
"""
from tests.unit.conftest import *  # noqa: F401,F403
