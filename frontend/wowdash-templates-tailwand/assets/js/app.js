// sidebar submenu collapsible js
document.querySelectorAll(".sidebar-menu .dropdown").forEach((dropdown) => {
  dropdown.addEventListener("click", function () {
    // Close all sibling dropdowns
    this.parentNode.querySelectorAll(".dropdown").forEach((sibling) => {
      if (sibling !== this) {
        sibling.querySelector(".sidebar-submenu").style.display = "none"
        sibling.classList.remove("dropdown-open")
        sibling.classList.remove("open")
      }
    })

    // Toggle the current dropdown
    const submenu = this.querySelector(".sidebar-submenu")
    submenu.style.display = submenu.style.display === "block" ? "none" : "block"

    this.classList.toggle("dropdown-open")
  })
})

// Toggle sidebar visibility and active class
const sidebarToggle = document.querySelector(".sidebar-toggle")
if (sidebarToggle) {
  sidebarToggle.addEventListener("click", function () {
    this.classList.toggle("active")
    document.querySelector(".sidebar").classList.toggle("active")
    document.querySelector(".dashboard-main").classList.toggle("active")
  })
}

// Open sidebar in mobile view and add overlay
const sidebarMobileToggle = document.querySelector(".sidebar-mobile-toggle")
if (sidebarMobileToggle) {
  sidebarMobileToggle.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.add("sidebar-open")
    document.body.classList.add("overlay-active")
  })
}

// Close sidebar and remove overlay
const sidebarColseBtn = document.querySelector(".sidebar-close-btn")
if (sidebarColseBtn) {
  sidebarColseBtn.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.remove("sidebar-open")
    document.body.classList.remove("overlay-active")
  })
}

//to keep the current page active
document.addEventListener("DOMContentLoaded", () => {
  const nk = window.location.href
  const links = document.querySelectorAll("ul#sidebar-menu a")

  links.forEach((link) => {
    if (link.href === nk) {
      link.classList.add("active-page") // anchor
      let parent = link.parentElement
      parent.classList.add("active-page") // li

      // Traverse up the DOM tree and add classes to parent elements
      while (parent && parent.tagName !== "BODY") {
        if (parent.tagName === "LI") {
          parent.classList.add("show")
          parent.classList.add("open")
        }
        parent = parent.parentElement
      }
    }
  })
})

// On page load or when changing themes, best to add inline in `head` to avoid FOUC
if (
  localStorage.getItem("color-theme") === "dark" ||
  (!("color-theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark")
} else {
  document.documentElement.classList.remove("dark")
}

// light dark version js
const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon")
const themeToggleLightIcon = document.getElementById("theme-toggle-light-icon")

// Change the icons inside the button based on previous settings
if (themeToggleDarkIcon || themeToggleLightIcon) {
  if (
    localStorage.getItem("color-theme") === "dark" ||
    (!("color-theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    themeToggleLightIcon.classList.remove("hidden")
  } else {
    themeToggleDarkIcon.classList.remove("hidden")
  }
}

const themeToggleBtn = document.getElementById("theme-toggle")

if (themeToggleDarkIcon || themeToggleLightIcon || themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    // toggle icons inside button
    themeToggleDarkIcon.classList.toggle("hidden")
    themeToggleLightIcon.classList.toggle("hidden")

    // if set via local storage previously
    if (localStorage.getItem("color-theme")) {
      if (localStorage.getItem("color-theme") === "light") {
        document.documentElement.classList.add("dark")
        localStorage.setItem("color-theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("color-theme", "light")
      }

      // if NOT set via local storage previously
    } else {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("color-theme", "light")
      } else {
        document.documentElement.classList.add("dark")
        localStorage.setItem("color-theme", "dark")
      }
    }
  })
}
