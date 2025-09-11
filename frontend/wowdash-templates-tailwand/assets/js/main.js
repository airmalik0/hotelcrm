/*
 * ⚠️  REFERENCE ONLY - DO NOT COPY CODE PATTERNS ⚠️
 *
 * This file is for understanding UI behavior and logic concepts.
 * DO NOT use jQuery, Bootstrap JS, or vanilla DOM manipulation patterns.
 *
 * For React components, use:
 * - React hooks (useState, useEffect) instead of jQuery
 * - React event handlers instead of addEventListener
 * - React state instead of DOM manipulation
 * - TanStack Query instead of $.ajax
 * - CSS classes instead of JS animations
 *
 * Extract ONLY the business logic and UI concepts, then implement in React way.
 */

window.addEventListener("DOMContentLoaded", () => {
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon")
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon",
  )

  // Change the icons inside the button based on previous settings
  if (
    localStorage.getItem("color-theme") === "dark" ||
    (!("color-theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    themeToggleLightIcon.classList.remove("hidden")
  } else {
    themeToggleDarkIcon.classList.remove("hidden")
  }

  const themeToggleBtn = document.getElementById("theme-toggle")

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
})
