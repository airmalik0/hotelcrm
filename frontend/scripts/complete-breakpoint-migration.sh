#!/bin/bash
# Script to complete the breakpoint migration by removing lg-plus
# Run this after 1-2 weeks of testing

echo "🔄 Starting final breakpoint migration cleanup..."

# Files that need lg-plus: replaced with xl:
FILES_TO_UPDATE=(
  "src/layouts/MainLayout.tsx"
  "src/components/booking-grid/GridHeader.tsx"
  "src/components/booking-grid/GridControls.tsx"
)

# Backup current state
echo "📦 Creating backup..."
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Replace lg-plus with xl in specified files
echo "🔧 Replacing lg-plus: with xl: in critical components..."
for file in "${FILES_TO_UPDATE[@]}"; do
  if [ -f "$file" ]; then
    echo "  Processing $file..."
    sed -i 's/lg-plus:/xl:/g' "$file"
  fi
done

# Update tailwind.config.js
echo "🎨 Updating tailwind.config.js..."
cat > tailwind.config.update.js << 'EOF'
// Remove lg-plus line from screens
// Remove lg-plus line from container.screens
EOF

# Update GridZoomContext.tsx
echo "📐 Updating GridZoomContext..."
sed -i 's/LG_PLUS_BREAKPOINT: 1200/\/\/ LG_PLUS_BREAKPOINT removed - use XL_BREAKPOINT/g' src/contexts/GridZoomContext.tsx
sed -i 's/LAYOUT_CONSTANTS\.LG_PLUS_BREAKPOINT/LAYOUT_CONSTANTS.XL_BREAKPOINT/g' src/contexts/GridZoomContext.tsx

# Remove from constants/breakpoints.ts
echo "📊 Cleaning up constants..."
sed -i '/TRANSITION_BREAKPOINTS/,/^}/d' src/constants/breakpoints.ts
sed -i '/lg-plus/d' src/constants/breakpoints.ts

# Remove from index.css
echo "🎨 Cleaning up CSS variables..."
sed -i '/--breakpoint-lg-plus/d' src/index.css
sed -i '/--legacy-/d' src/index.css

echo "✅ Migration cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Test all breakpoints thoroughly"
echo "3. If everything works: git add -A && git commit -m 'chore: complete breakpoint migration, remove lg-plus'"
echo "4. If issues occur, restore from backup: rm -rf src && mv src.backup.* src"