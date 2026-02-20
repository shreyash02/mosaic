#!/bin/bash
# =============================================================================
# CSS Color Migration Script
# Replaces hardcoded hex colors with CSS custom properties in:
#   - App.css (legacy class rules only, lines 584+)
#   - NotificationCenter.css
#   - Toast.css
#
# USAGE:
#   chmod +x scripts/migrate-css-colors.sh
#   cd frontend
#   ./scripts/migrate-css-colors.sh
#
# After running, manually review the changes with: git diff
# Then delete the html.dark overrides in App.css (lines ~113-583)
# =============================================================================

set -e

echo "=== CSS Color Migration ==="
echo ""

# --- Helper: sed in-place (macOS compatible) ---
sedi() {
  sed -i '' "$@"
}

# =============================================================================
# 1. App.css — Legacy class rules (line 584 onward)
#    We create a temp file with just those lines, do replacements, then reassemble
# =============================================================================

echo "1/4  Migrating App.css legacy rules..."

FILE="src/App.css"

# Split file: lines 1-583 (variables + dark overrides) and 584+ (legacy rules)
head -n 583 "$FILE" > /tmp/app_css_head.css
tail -n +584 "$FILE" > /tmp/app_css_tail.css

# --- Grays / Neutral palette ---
# Legacy light grays → primary palette variables
sedi 's/#f7fafc/var(--color-primary-100)/g' /tmp/app_css_tail.css
sedi 's/#f5f7fa/var(--color-primary-100)/g' /tmp/app_css_tail.css
sedi 's/#edf2f7/var(--color-primary-200)/g' /tmp/app_css_tail.css
sedi 's/#e2e8f0/var(--color-primary-300)/g' /tmp/app_css_tail.css
sedi 's/#cbd5e0/var(--color-primary-400)/g' /tmp/app_css_tail.css
sedi 's/#a0aec0/var(--color-primary-500)/g' /tmp/app_css_tail.css
sedi 's/#718096/var(--color-primary-500)/g' /tmp/app_css_tail.css
sedi 's/#4a5568/var(--color-primary-600)/g' /tmp/app_css_tail.css
sedi 's/#2d3748/var(--color-primary-900)/g' /tmp/app_css_tail.css

# --- Blues ---
sedi 's/#4299e1/var(--color-info)/g' /tmp/app_css_tail.css
sedi 's/#3182ce/var(--color-info)/g' /tmp/app_css_tail.css
sedi 's/#2c5282/var(--color-info-text)/g' /tmp/app_css_tail.css
sedi 's/#bee3f8/var(--color-info-light)/g' /tmp/app_css_tail.css
sedi 's/#667eea/var(--color-info)/g' /tmp/app_css_tail.css

# --- Reds / Error ---
sedi 's/#e53e3e/var(--color-error)/g' /tmp/app_css_tail.css
sedi 's/#fc8181/var(--color-error)/g' /tmp/app_css_tail.css
sedi 's/#c53030/var(--color-error-text)/g' /tmp/app_css_tail.css
sedi 's/#9b2c2c/var(--color-error-text)/g' /tmp/app_css_tail.css
sedi 's/#fed7d7/var(--color-error-light)/g' /tmp/app_css_tail.css

# --- Greens / Success ---
sedi 's/#48bb78/var(--color-success)/g' /tmp/app_css_tail.css
sedi 's/#38a169/var(--color-success)/g' /tmp/app_css_tail.css
sedi 's/#22543d/var(--color-success-text)/g' /tmp/app_css_tail.css
sedi 's/#c6f6d5/var(--color-success-light)/g' /tmp/app_css_tail.css

# Reassemble
cat /tmp/app_css_head.css /tmp/app_css_tail.css > "$FILE"
rm /tmp/app_css_head.css /tmp/app_css_tail.css

echo "   Done. Replaced legacy hex colors with CSS variables."

# =============================================================================
# 2. NotificationCenter.css
# =============================================================================

echo "2/4  Migrating NotificationCenter.css..."

NC="src/components/NotificationCenter.css"

# These files use the DESIGN TOKEN hex values (not legacy), so mappings are direct
sedi 's/#ffffff/var(--color-primary-50)/g' "$NC"
sedi 's/#f9fafb/var(--color-primary-100)/g' "$NC"
sedi 's/#f3f4f6/var(--color-primary-200)/g' "$NC"
sedi 's/#e5e7eb/var(--color-primary-300)/g' "$NC"
sedi 's/#d1d5db/var(--color-primary-400)/g' "$NC"
sedi 's/#9ca3af/var(--color-primary-500)/g' "$NC"
sedi 's/#6b7280/var(--color-primary-600)/g' "$NC"
sedi 's/#374151/var(--color-primary-200)/g' "$NC"
sedi 's/#1f2937/var(--color-primary-100)/g' "$NC"
sedi 's/#1a1a2e/var(--color-primary-900)/g' "$NC"
sedi 's/#3b82f6/var(--color-info)/g' "$NC"
sedi 's/#2563eb/var(--color-info)/g' "$NC"
sedi 's/#60a5fa/var(--color-info)/g' "$NC"
sedi 's/#dbeafe/var(--color-info-light)/g' "$NC"
sedi 's/#eff6ff/var(--color-info-light)/g' "$NC"
sedi 's/#1e3a5f/var(--color-info-light)/g' "$NC"
sedi 's/#1e4976/var(--color-info-light)/g' "$NC"
sedi 's/#ef4444/var(--color-error)/g' "$NC"

echo "   Done."

# =============================================================================
# 3. Toast.css
# =============================================================================

echo "3/4  Migrating Toast.css..."

TOAST="src/components/Toast.css"

sedi 's/#ffffff/var(--color-primary-50)/g' "$TOAST"
sedi 's/#f9fafb/var(--color-primary-100)/g' "$TOAST"
sedi 's/#f3f4f6/var(--color-primary-200)/g' "$TOAST"
sedi 's/#e5e7eb/var(--color-primary-300)/g' "$TOAST"
sedi 's/#9ca3af/var(--color-primary-500)/g' "$TOAST"
sedi 's/#6b7280/var(--color-primary-600)/g' "$TOAST"
sedi 's/#374151/var(--color-primary-200)/g' "$TOAST"
sedi 's/#1f2937/var(--color-primary-100)/g' "$TOAST"
sedi 's/#1a1a2e/var(--color-primary-900)/g' "$TOAST"
sedi 's/#22c55e/var(--color-success)/g' "$TOAST"
sedi 's/#3b82f6/var(--color-info)/g' "$TOAST"
sedi 's/#ef4444/var(--color-error)/g' "$TOAST"

echo "   Done."

# =============================================================================
# 4. Summary
# =============================================================================

echo ""
echo "=== Migration complete ==="
echo ""
echo "NEXT STEPS:"
echo "  1. Review changes:  git diff src/App.css src/components/NotificationCenter.css src/components/Toast.css"
echo "  2. For NotificationCenter.css and Toast.css: delete all html.dark {} blocks"
echo "     (they are now redundant since CSS variables handle dark mode automatically)"
echo "  3. For App.css: delete lines ~113-583 (the html.dark override section)"
echo "     WARNING: Some html.dark rules may still be needed for:"
echo "       - Skeleton gradients (linear-gradient with multiple stops)"
echo "       - Status badge colors (specific dark-mode semantic colors)"
echo "       - Focus shadow rgba values"
echo "     Review carefully before deleting."
echo "  4. Test in browser: light mode AND dark mode"
echo "  5. Run: npx tsc --noEmit"
echo ""
