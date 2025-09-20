#!/bin/bash
# Fix all inconsistent opacity values in dark theme

cd frontend/src

# Replace all /25 with /30
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:bg-\([a-z]*\)-600\/25/dark:bg-\1-600\/30/g' {} \;
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:bg-\([a-z]*\)-900\/25/dark:bg-\1-900\/30/g' {} \;

# Replace all /20 with /30
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:bg-\([a-z]*\)-600\/20/dark:bg-\1-600\/30/g' {} \;
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:bg-\([a-z]*\)-900\/20/dark:bg-\1-900\/30/g' {} \;

# Replace all /10 with /30
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:bg-\([a-z]*\)-600\/10/dark:bg-\1-600\/30/g' {} \;
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:bg-\([a-z]*\)-900\/10/dark:bg-\1-900\/30/g' {} \;

# Also fix hover states /35 to /40
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/dark:hover:bg-\([a-z]*\)-600\/35/dark:hover:bg-\1-600\/40/g' {} \;

echo "Fixed opacity values successfully!"