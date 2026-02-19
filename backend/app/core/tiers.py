"""Plan tier definitions — single source of truth."""

# Ordered from lowest to highest
TIER_ORDER = ['free', 'basic', 'pro', 'enterprise']

# Set for fast membership checks (validation)
VALID_TIERS = set(TIER_ORDER)
