# WowDash HTML/Tailwind Template Reference [LLM-OPTIMIZED]

## SYSTEM CONTEXT
- TEMPLATE_SOURCE: `./wowdash-templates-tailwand/`
- TOTAL_FILES: 83 HTML files (4 layouts + 79 pages)
- PURPOSE: Extract Tailwind classes and patterns from HTML templates → Create React components

## CRITICAL RULES
1. NEVER copy @@include syntax - it's for static HTML only
2. CHECK assets/scss/ for class definitions before converting
3. JS FILES ARE REFERENCE ONLY - all have warning comments at top
4. NEVER copy jQuery, Bootstrap JS, vanilla DOM patterns from JS files
5. EXTRACT ONLY business logic concepts from JS, implement with React patterns
6. REPLACE iconify-icon → lucide-react icons
7. REPLACE ApexCharts → recharts (extract config patterns only)
8. NO Bootstrap/jQuery - pure React + Tailwind only
9. ALWAYS include dark: variants from templates
10. **NEVER USE WowDash CSS class names** (like `.card`, `.btn`, `.table`, `.alert`) - use ONLY the Tailwind utilities from their @apply definitions

## WHERE_TO_WORK
- READ_ONLY: `./wowdash-templates-tailwand/pages/` (HTML templates)
- READ_ONLY: `./wowdash-templates-tailwand/assets/scss/` (CSS class definitions)  
- READ_ONLY: `./wowdash-templates-tailwand/assets/js/` (JS logic reference - WARNING COMMENTS ADDED)
- CREATE_HERE: `./src/components/` (ALL NEW COMPONENTS)

## TAILWIND CONFIGURATION
**Location:** `frontend/tailwind.config.js`

### COLOR_TOKENS (from tailwind.config.js)
```
primary: #487FFF (600, DEFAULT)
success: #45B369 (DEFAULT)
danger: #EF4A00 (DEFAULT) 
warning: #FF9F29 (600, DEFAULT)
info: #2563EB (600, DEFAULT)
purple: #8252E9 (DEFAULT)
cyan: #00b8f2 (DEFAULT)
neutral: 50-900 scale
dark-1: #1B2431
dark-2: #273142  
dark-3: #323D4E
```

### BREAKPOINTS
```
sm: 576px
md: 768px
lg: 992px
xl: 1200px
2xl: 1400px
3xl: 1650px
```

## FILE_MAP

### LAYOUTS [4 files]
```
layouts/_sidebar.html    → Sidebar navigation with collapsible menu
layouts/_nav.html        → Top navigation bar with search, notifications, profile
layouts/_breadcrumb.html → Breadcrumb navigation component
layouts/_footer.html     → Simple footer with copyright
```

### DASHBOARDS [9 files]
```
pages/index.html    → AI Dashboard: gradient cards, charts, tables
pages/index-2.html  → CRM Dashboard: revenue charts, campaign progress
pages/index-3.html  → eCommerce: inventory, customer analytics
pages/index-4.html  → Cryptocurrency: candlestick charts, trading
pages/index-5.html  → Investment: portfolio donut, gauge charts
pages/index-6.html  → LMS: student metrics, course cards
pages/index-7.html  → NFT Gaming: marketplace cards, ETH charts
pages/index-8.html  → Medical: doctor/patient cards, appointments
pages/index-9.html  → Analytics: KPIs, geographic maps
```

### UI_COMPONENTS [26 files]
```
pages/alert.html        → Alert boxes with icons and close buttons
pages/avatar.html       → Avatar sizes, groups, status indicators
pages/badges.html       → Status badges, pill badges, counters
pages/button.html       → Primary, outline, rounded, soft buttons
pages/card.html         → Card structure with header, body, footer
pages/carousel.html     → Image sliders with navigation dots
pages/colors.html       → Color palette showcase
pages/dropdown.html     → Dropdown menus with Flowbite
pages/gallery.html      → Image grid with lightbox
pages/list.html         → Lists with icons, badges
pages/notification.html → Toast notifications
pages/notification-alert.html → Alert notifications page
pages/pagination.html   → Page navigation with numbers
pages/progress.html     → Progress bars, striped, animated
pages/star-rating.html  → 5-star rating component
pages/starred.html      → Starred items page
pages/switch.html       → Toggle switches
pages/tabs.html         → Tab navigation with content panels
pages/tags.html         → Tag pills with remove buttons
pages/tooltip.html      → Tooltips with Flowbite
pages/typography.html   → Heading styles, text utilities
pages/videos.html       → Video grid layout
pages/widgets.html      → Dashboard widget collection
pages/calendar.html     → Calendar component showcase
pages/radio.html        → Radio button groups
```

### FORMS [7 files]
```
pages/form.html            → Input fields with icons, selects, textareas
pages/form-layout.html     → Form grid layouts
pages/form-validation.html → Validation states and messages
pages/image-upload.html    → File upload with preview
pages/wizard.html          → Multi-step form wizard
```

### TABLES_CHARTS [5 files]
```
pages/table-basic.html  → Basic responsive tables
pages/table-data.html   → Data tables with actions
pages/line-chart.html   → Line chart examples
pages/column-chart.html → Column/bar charts
pages/pie-chart.html    → Pie and donut charts
```

### AUTHENTICATION [3 files]
```
pages/sign-in.html         → Login page with social auth
pages/sign-up.html         → Registration with password strength
pages/forgot-password.html → Password reset form
```

### USER_MANAGEMENT [5 files]
```
pages/users-list.html   → User table with actions
pages/users-grid.html   → User cards in grid
pages/add-user.html     → Add/edit user form
pages/view-profile.html → User profile with tabs
pages/veiw-details.html → View details page (typo in filename)
```

### AI_FEATURES [7 files]
```
pages/text-generator.html     → Chat interface for text AI
pages/text-generator-new.html → New text generator UI
pages/code-generator.html     → Code generation with syntax highlight
pages/code-generator-new.html → New code generator UI
pages/image-generator.html    → Image generation with options
pages/voice-generator.html    → Voice synthesis interface
pages/video-generator.html    → Video generation UI
```

### APPLICATIONS [10 files]
```
pages/calendar-main.html → FullCalendar integration
pages/kanban.html        → Drag-drop kanban board
pages/email.html         → Email client interface
pages/chat-message.html  → Chat messaging UI
pages/chat-empty.html    → Empty chat state
pages/chat-profile.html  → Chat profile view
pages/invoice-list.html  → Invoice listing
pages/invoice-preview.html → Invoice preview/print
pages/invoice-add.html   → Create invoice
pages/invoice-edit.html  → Edit invoice
pages/wallet.html        → Crypto wallet interface
```

### SETTINGS [6 files]
```
pages/company.html         → Company info settings
pages/theme.html           → Theme customization
pages/language.html        → Language management
pages/currencies.html      → Currency settings
pages/payment-gateway.html → Payment gateway config
```

### SPECIAL_PAGES [4 files]
```
pages/error.html           → 404/500 error pages
pages/faq.html             → FAQ accordion
pages/pricing.html         → Pricing tables
pages/terms-condition.html → Terms and conditions
```

## EXTRACTION_PATTERNS

⚠️ **IMPORTANT**: The patterns below show WowDash SCSS class definitions. DO NOT use the class names (`.btn`, `.card`, etc.) in your React code - use ONLY the Tailwind utilities from the @apply directives!

### BUTTON_PATTERN
```
SOURCE: pages/button.html + assets/scss/components/_button.scss

HTML IN WOWDASH: <button class="btn btn-primary-600">Click</button>

SCSS DEFINITION:
  .btn { @apply rounded-lg py-3 px-6 inline-flex transition; }
  .btn-primary-600 { @apply bg-primary-600 text-white hover:bg-primary-700; }

❌ WRONG (DO NOT USE): className="btn btn-primary-600"
✅ CORRECT: className="rounded-lg py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700"

REACT EXAMPLE:
<button className="rounded-lg py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700">
  Click
</button>

VARIANTS: outline (border border-{color}-600), rounded-full, soft (bg-{color}-100 dark:bg-{color}-600/25)
```

### CARD_PATTERN
```
SOURCE: pages/card.html + assets/scss/components/_card.scss

HTML IN WOWDASH:
<div class="card">
  <div class="card-header">Title</div>
  <div class="card-body">Content</div>
</div>

SCSS DEFINITIONS:
  .card { @apply bg-white dark:bg-dark-2 rounded-lg border border-neutral-600; }
  .card-header { @apply border-b border-neutral-200 dark:border-neutral-600 px-4 md:px-6 py-3; }
  .card-body { @apply px-6 py-5; }

❌ WRONG (DO NOT USE): className="card", className="card-header", className="card-body"
✅ CORRECT: Use the Tailwind utilities from @apply

REACT EXAMPLE:
<div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-600">
  <div className="border-b border-neutral-200 dark:border-neutral-600 px-4 md:px-6 py-3">Title</div>
  <div className="px-6 py-5">Content</div>
</div>
```

### FORM_INPUT_PATTERN
```
SOURCE: pages/form.html + assets/scss/components/_form.scss

HTML IN WOWDASH:
<select class="form-select form-select-sm">...</select>
<input class="form-control" type="text">

SCSS DEFINITIONS:
  .form-control { @apply border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full; }
  .form-select { @apply border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full; }
  .form-select-sm { @apply ps-3 pe-5 py-1.5 text-sm; }

❌ WRONG (DO NOT USE): className="form-control", className="form-select form-select-sm"
✅ CORRECT: Use the Tailwind utilities from @apply

REACT EXAMPLES:
<input
  type="text"
  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full"
/>

<select
  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent ps-3 pe-5 py-1.5 text-sm w-full"
>
  <option>Option 1</option>
</select>
```

### TABLE_PATTERN
```
SOURCE: pages/table-basic.html + assets/scss/components/_table.scss

HTML IN WOWDASH:
<div class="table-responsive">
  <table class="table">
    ...
  </table>
</div>

SCSS DEFINITIONS:
  .table-responsive { @apply overflow-x-auto; }
  .table { @apply w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600; }

❌ WRONG (DO NOT USE): className="table-responsive", className="table"
✅ CORRECT: Use the Tailwind utilities from @apply

REACT EXAMPLE:
<div className="overflow-x-auto">
  <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600">
    ...
  </table>
</div>

TABLE ACTION BUTTONS:
ACTIONS: view (primary), edit (success), delete (danger)
BUTTON: className="w-8 h-8 bg-{color}-50 dark:bg-{color}-600/25 text-{color}-600 rounded-full inline-flex items-center justify-center"
```

### BADGE_PATTERN
```
SOURCE: pages/badges.html
EXTRACT: bg-{color}-100 dark:bg-{color}-600/25 text-{color}-600 dark:text-{color}-400 px-6 py-1.5 rounded-full font-medium text-sm
REACT: <span className="bg-success-100 dark:bg-success-600/25 text-success-600 dark:text-success-400 px-6 py-1.5 rounded-full font-medium text-sm">
```

### ALERT_PATTERN
```
SOURCE: pages/alert.html

HTML IN WOWDASH: <div class="alert alert-success">...</div>

❌ WRONG (DO NOT USE): className="alert alert-success"
✅ CORRECT: Use only Tailwind utilities

REACT EXAMPLE:
<div className="bg-success-100 dark:bg-success-600/25 text-success-600 dark:text-success-400 border border-success-200 dark:border-success-600/50 px-4 py-3 rounded-lg">
  Alert message
</div>
```

### DROPDOWN_PATTERN
```
SOURCE: pages/dropdown.html
FLOWBITE_REQUIRED: true
TRIGGER: data-dropdown-toggle="dropdownId"
MENU: z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow-2xl w-44 dark:bg-gray-700
ITEM: block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600
```

### MODAL_PATTERN
```
SOURCE: Multiple files use modals
FLOWBITE_REQUIRED: true
TRIGGER: data-modal-target="modalId"
BACKDROP: fixed inset-0 z-50 bg-black bg-opacity-50
CONTENT: relative bg-white rounded-lg shadow dark:bg-gray-700
```

### AVATAR_PATTERN
```
SOURCE: pages/avatar.html
SIZES: w-8 h-8, w-10 h-10, w-12 h-12
SHAPE: rounded-full
GROUP: flex -space-x-4
STATUS: absolute w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full
```

### TAG_PATTERN
```
SOURCE: pages/tags.html
EXTRACT: inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-{color}-100 text-{color}-800 dark:bg-{color}-800/30 dark:text-{color}-500
CLOSE_BTN: flex-shrink-0 h-4 w-4 inline-flex items-center justify-center rounded-full
```

### SWITCH_PATTERN
```
SOURCE: pages/switch.html
WRAPPER: inline-flex items-center cursor-pointer
INPUT: sr-only peer
TOGGLE: relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600
```

### PROGRESS_PATTERN
```
SOURCE: pages/progress.html
WRAPPER: w-full bg-gray-200 rounded-full dark:bg-gray-700
BAR: bg-primary-600 text-xs font-medium text-white text-center p-0.5 leading-none rounded-full
WIDTH: style="width: {percentage}%"
```

## GLOBAL_DESIGN_SYSTEM

### STATE_CLASSES
```
DEFAULT: bg-{color}-600 text-white
HOVER: hover:bg-{color}-700 hover:text-white
FOCUS: focus:ring-4 focus:ring-{color}-300 focus:outline-none
DISABLED: disabled:opacity-75 peer-disabled:opacity-75 cursor-not-allowed
ACTIVE: bg-{color}-700
DARK_MODE: dark:bg-{color}-600/25 dark:text-{color}-400
```

### COLOR_PATTERNS
```
# Light Mode
Background: bg-{color}-100 or bg-{color}-50
Text: text-{color}-600
Border: border-{color}-200

# Dark Mode
Background: dark:bg-{color}-600/25 or dark:bg-{color}-800/30
Text: dark:text-{color}-400 or dark:text-{color}-500
Border: dark:border-{color}-600/50
```

### SPACING_SYSTEM
```
CARD_BODY: p-6
CARD_HEADER: py-4 px-6
BUTTON_STANDARD: px-5 py-[11px]
BUTTON_SMALL: px-4 py-2
BUTTON_LARGE: px-8 py-4
INPUT_PADDING: py-2.5 px-4
GRID_GAP: gap-6
INLINE_GAP: gap-2
SECTION_MARGIN: mb-6
```

### BORDER_RADIUS
```
rounded-lg: buttons, inputs, cards (primary)
rounded-xl: modals, large cards
rounded-full: avatars, icon buttons, badges
rounded-md: small elements
rounded-none: tables
```

### SHADOWS
```
shadow: standard cards (not used much)
shadow-lg: hover states, elevated elements
shadow-2xl: dropdowns, modals
shadow-none: flat elements
```

### Z-INDEX_LAYERS
```
z-10: dropdowns, tooltips
z-50: modals, overlays
z-[60]: toasts (higher than modals)
z-[100]: critical overlays
```

### TRANSITIONS
```
transition: basic transition
transition-all: all properties
duration-300: standard duration
duration-1000: slow animations
ease-out: standard easing
after:transition-all: for pseudo elements
```

### RESPONSIVE_PREFIXES
```
sm: ≥576px
md: ≥768px
lg: ≥992px
xl: ≥1200px
2xl: ≥1400px
3xl: ≥1650px
```

### RTL_SUPPORT
```
rtl:peer-checked:after:-translate-x-full (for switches)
start-4 / end-4 (instead of left/right)
ps-4 / pe-4 (padding start/end)
ms-4 / me-4 (margin start/end)
```

## CONVERSION_RULES

### HTML_TO_REACT
```
class       → className
for         → htmlFor
onclick     → onClick
onchange    → onChange
checked     → defaultChecked (uncontrolled) or checked (controlled)
value       → defaultValue (uncontrolled) or value (controlled)
style=""    → style={{}}
<!-- -->    → {/* */}
```

### JQUERY_TO_REACT_HOOKS
```
$(element).on('click')     → onClick handler
$(element).toggle()        → useState with conditional rendering
$(element).addClass()      → setState or className manipulation
$(element).val()           → controlled input with value={state}
$(element).show/hide()     → conditional rendering {show && <Component />}
$.ajax()                   → fetch() or axios
$(document).ready()        → useEffect(() => {}, [])
```

### ICON_REPLACEMENTS
```
iconify-icon icon="solar:home-smile-angle-outline" → import { Home } from 'lucide-react'
iconify-icon icon="mage:email"                    → import { Mail } from 'lucide-react'
iconify-icon icon="bi:chat-dots"                  → import { MessageCircle } from 'lucide-react'
iconify-icon icon="solar:calendar-outline"        → import { Calendar } from 'lucide-react'
```

### CHART_LIBRARY_CONVERSION
```
ApexCharts → recharts
new ApexCharts(element, options) → <LineChart data={data} />
chart.render() → automatic in React component
```

## COMPONENT_CREATION_WORKFLOW

### STEP_1_IDENTIFY
```
FIND: Locate HTML template file
READ: Extract className patterns
IGNORE: @@include directives, jQuery code
```

### STEP_2_EXTRACT
```
CLASSES: Copy all Tailwind classes exactly
STRUCTURE: Note component hierarchy
STATES: Identify hover, focus, dark variants
```

### STEP_3_CONVERT
```
CREATE: React functional component
PROPS: Define prop types
STATE: Add useState for interactive elements
EFFECTS: Add useEffect for side effects
```

### STEP_4_IMPLEMENT
```
APPLY: Tailwind classes to JSX
HANDLERS: Add event handlers
ICONS: Import from lucide-react
DARK_MODE: Include all dark: variants
```

## DO_NOT_LIST
```
DO_NOT: Copy @@include syntax
DO_NOT: Use jQuery code
DO_NOT: Add comments without request
DO_NOT: Use Iconify icons
DO_NOT: Forget dark mode classes
DO_NOT: Mix CommonJS and ES6
DO_NOT: Create files unless necessary
DO_NOT: Write documentation unless asked
```

## MUST_DO_LIST
```
MUST: Extract exact Tailwind classes
MUST: Convert to React components
MUST: Use lucide-react for icons
MUST: Use recharts for charts
MUST: Include dark mode support
MUST: Follow existing code style
MUST: Check file exists before referencing
MUST: Use ES6 module syntax in src/
```

## QUICK_REFERENCE

### FIND_COMPONENT
```bash
# Button styles
→ pages/button.html

# Card layouts
→ pages/card.html

# Form inputs
→ pages/form.html

# Table with actions
→ pages/table-data.html

# Dashboard layouts
→ pages/index.html through pages/index-9.html

# Authentication forms
→ pages/sign-in.html, pages/sign-up.html

# User interfaces
→ pages/users-list.html, pages/users-grid.html

# Chat interface
→ pages/chat-message.html

# Kanban board
→ pages/kanban.html

# Invoice system
→ pages/invoice-*.html

# Settings pages
→ pages/company.html, pages/theme.html
```

### COMMON_PATTERNS
```
# Metric card
card + icon + title + value + chart

# Data table
table-responsive + bordered-table + action buttons

# Form group
label + input + validation message

# Dashboard grid
grid grid-cols-12 gap-6 + responsive columns

# Sidebar item
dropdown + icon + text + badge + submenu

# Modal dialog
trigger button + backdrop + content + close button
```

## END_OF_REFERENCE

Total files: 83 (4 layouts + 79 pages)
Location: frontend/wowdash-templates-tailwand/
Purpose: Extract patterns → Create React components in src/components/